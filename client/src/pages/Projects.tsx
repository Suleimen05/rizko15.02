import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Plus,
  MoreVertical,
  Pencil,
  Archive,
  Trash2,
  Users,
  Video,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import type { Project } from '@/types';

export function Projects() {
  const { t } = useTranslation('projects');
  const navigate = useNavigate();
  const {
    projects,
    activeProject,
    isLoading,
    setActiveProject,
    updateProject,
    deleteProject,
  } = useProject();

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleSetActive = (project: Project) => {
    setActiveProject(project);
  };

  const handleCardClick = (project: Project) => {
    setActiveProject(project);
  };

  const handleEdit = (project: Project) => {
    navigate(`/dashboard/projects/${project.id}/edit`);
  };

  const handleToggleArchive = async (project: Project) => {
    const newStatus = project.status === 'archived' ? 'active' : 'archived';
    await updateProject(project.id, { status: newStatus });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ─── Loading state ────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">{t('title')}...</p>
        </div>
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
        </div>

        {/* Empty state card */}
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t('noProjects')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('noProjectsDesc')}
              </p>
            </div>
            <Button onClick={() => navigate('/dashboard/projects/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('createFirst')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main content ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/dashboard/projects/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('newProject')}
        </Button>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const isActive = activeProject?.id === project.id;
          const isArchived = project.status === 'archived';
          const profile = project.profile_data;

          return (
            <Card
              key={project.id}
              className={cn(
                'group cursor-pointer transition-all duration-200 hover:shadow-lg',
                isActive && 'ring-2 ring-primary shadow-md',
                isArchived && 'opacity-75'
              )}
              onClick={() => handleCardClick(project)}
            >
              <CardContent className="p-5">
                {/* Top row: icon + name + menu */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0" role="img">
                      {project.icon || '📁'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base truncate">
                          {project.name}
                        </h3>
                        {isActive && (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0 flex-shrink-0"
                          >
                            {t('card.active')}
                          </Badge>
                        )}
                        {isArchived && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 flex-shrink-0"
                          >
                            {t('card.archived')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isActive && !isArchived && (
                        <DropdownMenuItem
                          onClick={() => handleSetActive(project)}
                        >
                          <Sparkles className="h-4 w-4" />
                          {t('card.setActive')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Pencil className="h-4 w-4" />
                        {t('card.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleArchive(project)}
                      >
                        <Archive className="h-4 w-4" />
                        {isArchived ? t('card.unarchive') : t('card.archive')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(project)}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('card.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Profile summary */}
                <div className="mt-4 space-y-2">
                  {profile?.niche && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-20 flex-shrink-0">
                        {t('card.niche')}
                      </span>
                      <span className="truncate font-medium">
                        {profile.niche}
                        {profile.sub_niche ? ` / ${profile.sub_niche}` : ''}
                      </span>
                    </div>
                  )}
                  {profile?.format && profile.format.length > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-20 flex-shrink-0">
                        {t('card.format')}
                      </span>
                      <span className="truncate font-medium">
                        {profile.format.join(', ')}
                      </span>
                    </div>
                  )}
                  {profile?.audience?.age && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-20 flex-shrink-0">
                        {t('card.audience')}
                      </span>
                      <span className="truncate font-medium">
                        {[profile.audience.age, profile.audience.gender]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats footer */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span>{project.competitors_count}</span>
                      <span className="hidden sm:inline">
                        {t('card.competitors')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Video className="h-3.5 w-3.5" />
                      <span>{project.favorites_count}</span>
                      <span className="hidden sm:inline">
                        {t('card.saved')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteConfirm.title')}</DialogTitle>
            <DialogDescription>{t('deleteConfirm.message')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              {t('deleteConfirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              {t('deleteConfirm.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Projects;
