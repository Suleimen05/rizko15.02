/**
 * Workflow Context
 * Manages workflow persistence: save, load, auto-save, CRUD
 * Uses apiService (axios + auto-refresh) for all API calls.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { apiService } from '@/services/api';
import { toast } from 'sonner';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkflowListItem {
  id: number;
  name: string;
  description?: string;
  status: string;
  node_count: number;
  is_favorite: boolean;
  tags: string[];
  last_run_at?: string;
  updated_at: string;
}

export interface WorkflowData {
  id: number;
  name: string;
  description?: string;
  graph_data: { nodes: any[]; connections: any[] };
  node_configs: Record<string, any>;
  status: string;
  canvas_state: { zoom: number; panX: number; panY: number };
  tags: string[];
  is_favorite: boolean;
  last_run_at?: string;
  last_run_results: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface WorkflowContextType {
  workflows: WorkflowListItem[];
  currentWorkflow: WorkflowData | null;
  isDirty: boolean;
  isLoading: boolean;
  loadWorkflows: () => Promise<void>;
  createWorkflow: (name?: string) => Promise<WorkflowData | null>;
  loadWorkflow: (id: number) => Promise<void>;
  saveWorkflow: (data: {
    name?: string;
    graph_data?: { nodes: any[]; connections: any[] };
    node_configs?: Record<string, any>;
    canvas_state?: { zoom: number; panX: number; panY: number };
  }) => Promise<void>;
  deleteWorkflow: (id: number) => Promise<void>;
  duplicateWorkflow: (id: number) => Promise<void>;
  closeWorkflow: () => void;
  markDirty: () => void;
  setCurrentWorkflow: (wf: WorkflowData | null) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { tokens, isAuthenticated } = useAuth();
  const token = tokens?.accessToken;

  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowData | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Load all workflows
  // ---------------------------------------------------------------------------
  const loadWorkflows = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await apiService.getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // ---------------------------------------------------------------------------
  // Create new workflow
  // ---------------------------------------------------------------------------
  const createWorkflow = useCallback(
    async (name?: string): Promise<WorkflowData | null> => {
      if (!token) return null;
      try {
        const data = await apiService.createWorkflow({
          name: name || 'Untitled Workflow',
        });
        setCurrentWorkflow(data);
        setIsDirty(false);
        await loadWorkflows();
        return data;
      } catch (error) {
        console.error('Failed to create workflow:', error);
        toast.error('Failed to create workflow');
        return null;
      }
    },
    [token, loadWorkflows]
  );

  // ---------------------------------------------------------------------------
  // Load a specific workflow
  // ---------------------------------------------------------------------------
  const loadWorkflow = useCallback(
    async (id: number) => {
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await apiService.getWorkflow(id);
        setCurrentWorkflow(data);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to load workflow:', error);
        toast.error('Failed to load workflow');
      } finally {
        setIsLoading(false);
      }
    },
    [token]
  );

  // ---------------------------------------------------------------------------
  // Save workflow (creates if no current workflow)
  // ---------------------------------------------------------------------------
  const saveWorkflow = useCallback(
    async (data: {
      name?: string;
      graph_data?: { nodes: any[]; connections: any[] };
      node_configs?: Record<string, any>;
      canvas_state?: { zoom: number; panX: number; panY: number };
    }) => {
      if (!token) return;

      if (!currentWorkflow) {
        // Create new workflow first
        const newWf = await apiService.createWorkflow({
          name: data.name || 'Untitled Workflow',
          graph_data: data.graph_data,
          node_configs: data.node_configs,
          canvas_state: data.canvas_state,
        });
        setCurrentWorkflow(newWf);
        setIsDirty(false);
        await loadWorkflows();
        return;
      }

      try {
        const updated = await apiService.updateWorkflow(currentWorkflow.id, data);
        setCurrentWorkflow(updated);
        setIsDirty(false);
        // Update list item
        setWorkflows((prev) =>
          prev.map((wf) =>
            wf.id === currentWorkflow.id
              ? {
                  ...wf,
                  name: updated.name,
                  updated_at: updated.updated_at,
                  node_count: updated.graph_data?.nodes?.length || 0,
                }
              : wf
          )
        );
      } catch (error) {
        console.error('Failed to save workflow:', error);
        toast.error('Failed to save workflow');
      }
    },
    [token, currentWorkflow, loadWorkflows]
  );

  // Auto-save with debounce is handled inside saveWorkflow when markDirty() is called

  // ---------------------------------------------------------------------------
  // Mark as dirty (triggers auto-save)
  // ---------------------------------------------------------------------------
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Delete workflow
  // ---------------------------------------------------------------------------
  const deleteWorkflow = useCallback(
    async (id: number) => {
      if (!token) return;
      try {
        await apiService.deleteWorkflow(id);
        setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
        if (currentWorkflow?.id === id) {
          setCurrentWorkflow(null);
          setIsDirty(false);
        }
        toast.success('Workflow deleted');
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        toast.error('Failed to delete workflow');
      }
    },
    [token, currentWorkflow]
  );

  // ---------------------------------------------------------------------------
  // Duplicate workflow
  // ---------------------------------------------------------------------------
  const duplicateWorkflow = useCallback(
    async (id: number) => {
      if (!token) return;
      try {
        const newWf = await apiService.duplicateWorkflow(id);
        setCurrentWorkflow(newWf);
        setIsDirty(false);
        await loadWorkflows();
        toast.success('Workflow duplicated');
      } catch (error) {
        console.error('Failed to duplicate workflow:', error);
        toast.error('Failed to duplicate workflow');
      }
    },
    [token, loadWorkflows]
  );

  // ---------------------------------------------------------------------------
  // Close current workflow
  // ---------------------------------------------------------------------------
  const closeWorkflow = useCallback(() => {
    setCurrentWorkflow(null);
    setIsDirty(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Load workflows on auth
  useEffect(() => {
    if (isAuthenticated && token) {
      loadWorkflows();
    } else {
      setWorkflows([]);
      setCurrentWorkflow(null);
      setIsDirty(false);
    }
  }, [isAuthenticated, token, loadWorkflows]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        currentWorkflow,
        isDirty,
        isLoading,
        loadWorkflows,
        createWorkflow,
        loadWorkflow,
        saveWorkflow,
        deleteWorkflow,
        duplicateWorkflow,
        closeWorkflow,
        markDirty,
        setCurrentWorkflow,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}
