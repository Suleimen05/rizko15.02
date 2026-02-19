/**
 * Project Context
 * Manages content strategy projects: CRUD, active project, profile generation.
 * Active project is persisted in localStorage and injected into AI/search flows.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import type { Project } from '@/types';

// =============================================================================
// TYPES
// =============================================================================

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name: string, icon?: string) => Promise<Project | null>;
  updateProject: (id: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  setActiveProject: (project: Project | null) => void;
  generateQuestions: (
    id: number,
    formData: Record<string, any>
  ) => Promise<string[]>;
  generateProfile: (
    id: number,
    formData: Record<string, any>,
    descriptionText: string
  ) => Promise<Project | null>;
  transcribeAudio: (id: number, audioBlob: Blob) => Promise<string>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

const ACTIVE_PROJECT_KEY = 'rizko_active_project';

// =============================================================================
// PROVIDER
// =============================================================================

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Load projects ─────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await apiService.getProjects();
      setProjects(data);

      // Restore active project from localStorage
      const savedId = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (savedId) {
        const found = data.find((p: Project) => p.id === Number(savedId));
        if (found) {
          setActiveProjectState(found);
        } else {
          localStorage.removeItem(ACTIVE_PROJECT_KEY);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Auto-load on auth
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    } else {
      setProjects([]);
      setActiveProjectState(null);
    }
  }, [isAuthenticated, loadProjects]);

  // ─── Set active project ────────────────────────────────────
  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project);
    if (project) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, String(project.id));
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }, []);

  // ─── Create ────────────────────────────────────────────────
  const createProject = useCallback(async (name: string, icon?: string): Promise<Project | null> => {
    try {
      const created = await apiService.createProject({ name, icon });
      setProjects(prev => [created, ...prev]);
      return created;
    } catch (err: any) {
      console.error('Failed to create project:', err);
      toast.error(err?.response?.data?.detail || 'Failed to create project');
      return null;
    }
  }, []);

  // ─── Update ────────────────────────────────────────────────
  const updateProject = useCallback(async (id: number, data: Partial<Project>) => {
    // Optimistic update
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...data } : p))
    );
    if (activeProject?.id === id) {
      setActiveProjectState(prev => prev ? { ...prev, ...data } as Project : null);
    }

    try {
      const updated = await apiService.updateProject(id, data);
      setProjects(prev =>
        prev.map(p => (p.id === id ? updated : p))
      );
      if (activeProject?.id === id) {
        setActiveProjectState(updated);
      }
    } catch (err: any) {
      // Rollback
      await loadProjects();
      toast.error(err?.response?.data?.detail || 'Failed to update project');
    }
  }, [activeProject, loadProjects]);

  // ─── Delete ────────────────────────────────────────────────
  const deleteProject = useCallback(async (id: number) => {
    try {
      await apiService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete project');
    }
  }, [activeProject, setActiveProject]);

  // ─── Generate questions ────────────────────────────────────
  const generateQuestions = useCallback(async (
    id: number,
    formData: Record<string, any>
  ): Promise<string[]> => {
    try {
      const result = await apiService.generateProjectQuestions(id, {
        form_data: formData,
      });
      return result.questions || [];
    } catch (err: any) {
      console.error('Failed to generate questions:', err);
      toast.error(err?.response?.data?.detail || 'Failed to generate questions');
      return [];
    }
  }, []);

  // ─── Generate profile ──────────────────────────────────────
  const generateProfile = useCallback(async (
    id: number,
    formData: Record<string, any>,
    descriptionText: string
  ): Promise<Project | null> => {
    try {
      const updated = await apiService.generateProjectProfile(id, {
        form_data: formData,
        description_text: descriptionText,
      });
      setProjects(prev =>
        prev.map(p => (p.id === id ? updated : p))
      );
      if (activeProject?.id === id) {
        setActiveProjectState(updated);
      }
      return updated;
    } catch (err: any) {
      console.error('Failed to generate profile:', err);
      toast.error(err?.response?.data?.detail || 'Failed to generate profile');
      return null;
    }
  }, [activeProject]);

  // ─── Transcribe audio ──────────────────────────────────────
  const transcribeAudio = useCallback(async (id: number, audioBlob: Blob): Promise<string> => {
    try {
      const result = await apiService.transcribeProjectAudio(id, audioBlob);
      return result.text || '';
    } catch (err: any) {
      console.error('Transcription failed:', err);
      toast.error(err?.response?.data?.detail || 'Transcription failed');
      return '';
    }
  }, []);

  // ─── Value ─────────────────────────────────────────────────
  const value: ProjectContextType = {
    projects,
    activeProject,
    isLoading,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    setActiveProject,
    generateQuestions,
    generateProfile,
    transcribeAudio,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
