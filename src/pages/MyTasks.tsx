import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { CheckSquare } from 'lucide-react';

export function MyTasks() {
  const { tasks } = useProject();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-muted-foreground">View and manage your assigned tasks</p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
          <p className="text-muted-foreground max-w-md">
            Tasks assigned to you will appear here. Create a project and add tasks to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div
              key={task.id}
              className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
            >
              <h3 className="font-medium text-foreground">{task.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  task.status === 'done' ? 'bg-status-done/10 text-status-done' :
                  task.status === 'in-progress' ? 'bg-status-progress/10 text-status-progress' :
                  task.status === 'blocked' ? 'bg-status-blocked/10 text-status-blocked' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {task.status.replace('-', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
