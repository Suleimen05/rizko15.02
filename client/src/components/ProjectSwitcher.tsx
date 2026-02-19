/**
 * Project Switcher — Dropdown for selecting the active project.
 * Used in Sidebar, UnifiedSidebar, and MobileSidebar.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, ChevronDown, Plus, Check, FolderX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';

interface ProjectSwitcherProps {
  compact?: boolean;
}

export function ProjectSwitcher({ compact: _compact }: ProjectSwitcherProps) {
  const { t } = useTranslation('projects');
  const navigate = useNavigate();
  const { projects, activeProject, setActiveProject } = useProject();
  const [open, setOpen] = useState(false);

  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div className="relative px-2 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200',
          'border border-border/50 hover:border-border hover:bg-secondary/50',
          activeProject && 'border-primary/30 bg-primary/5'
        )}
      >
        <span className="text-base flex-shrink-0">
          {activeProject?.icon || (activeProject ? '📁' : '📂')}
        </span>
        <span className="flex-1 text-left truncate font-medium text-foreground/80">
          {activeProject ? activeProject.name : t('switcher.noProject')}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute left-2 right-2 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl py-1.5 max-h-64 overflow-y-auto">
            {/* No project option */}
            <button
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-all',
                !activeProject && 'text-primary'
              )}
              onClick={() => {
                setActiveProject(null);
                setOpen(false);
              }}
            >
              <FolderX className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-left">{t('switcher.noProject')}</span>
              {!activeProject && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>

            {activeProjects.length > 0 && (
              <div className="border-t border-border/50 my-1" />
            )}

            {/* Project list */}
            {activeProjects.map(project => (
              <button
                key={project.id}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-all',
                  activeProject?.id === project.id && 'text-primary'
                )}
                onClick={() => {
                  setActiveProject(project);
                  setOpen(false);
                }}
              >
                <span className="text-base flex-shrink-0">{project.icon || '📁'}</span>
                <span className="flex-1 text-left truncate">{project.name}</span>
                {activeProject?.id === project.id && (
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                )}
              </button>
            ))}

            <div className="border-t border-border/50 my-1" />

            {/* New project */}
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOpen(false);
                navigate('/dashboard/projects/new');
              }}
            >
              <Plus className="h-4 w-4" />
              <span>{t('switcher.newProject')}</span>
            </button>

            {/* All projects link */}
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-all text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOpen(false);
                navigate('/dashboard/projects');
              }}
            >
              <FolderOpen className="h-4 w-4" />
              <span>{t('switcher.allProjects')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
