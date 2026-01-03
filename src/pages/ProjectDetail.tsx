import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Calendar as CalendarIcon, BarChart3, MoreHorizontal, Plus, Settings } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { ListView } from '@/components/tasks/ListView';
import { CalendarView } from '@/components/tasks/CalendarView';
import { TaskDetailPanel } from '@/components/tasks/TaskDetailPanel';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

type ViewType = 'kanban' | 'list' | 'calendar' | 'timeline';

const views: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'list', label: 'List', icon: List },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'timeline', label: 'Timeline', icon: BarChart3 },
];

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, currentTaskId, setCurrentTaskId, setCurrentProjectId, deleteProject } = useProject();
  
  const [currentView, setCurrentView] = useState<ViewType>('kanban');
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const project = projects.find(p => p.id === projectId);

  useEffect(() => {
    if (projectId) {
      setCurrentProjectId(projectId);
    }
    return () => setCurrentProjectId(null);
  }, [projectId, setCurrentProjectId]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Project not found</h2>
          <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleDeleteProject = () => {
    deleteProject(project.id);
    navigate('/');
  };

  return (
    <div className="h-full flex">
      {/* Main content */}
      <div className={cn(
        'flex-1 flex flex-col min-w-0 transition-all duration-300',
        currentTaskId ? 'mr-0' : 'mr-0'
      )}>
        {/* Project header */}
        <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-primary-foreground"
                style={{ backgroundColor: project.color }}
              >
                {project.title.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{project.title}</h1>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setCreateTaskOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}/settings`)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Project Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={handleDeleteProject}
                  >
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* View tabs */}
          <div className="flex items-center gap-1">
            {views.map(view => (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  currentView === view.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <view.icon className="h-4 w-4" />
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* View content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'kanban' && <KanbanBoard projectId={project.id} />}
          {currentView === 'list' && <ListView projectId={project.id} />}
          {currentView === 'calendar' && <CalendarView projectId={project.id} />}
          {currentView === 'timeline' && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Timeline view coming soon...
            </div>
          )}
        </div>
      </div>

      {/* Task detail panel */}
      {currentTaskId && (
        <TaskDetailPanel 
          taskId={currentTaskId} 
          onClose={() => setCurrentTaskId(null)} 
        />
      )}

      {/* Create task dialog */}
      <CreateTaskDialog 
        open={createTaskOpen} 
        onOpenChange={setCreateTaskOpen}
        projectId={project.id}
      />
    </div>
  );
}
