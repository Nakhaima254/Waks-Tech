import React from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Calendar } from 'lucide-react';

export function CalendarPage() {
  const { tasks } = useProject();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="text-muted-foreground">View tasks by due date</p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No scheduled tasks</h3>
          <p className="text-muted-foreground max-w-md">
            Tasks with due dates will appear here. Create a project and add tasks to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.filter(t => t.dueDate).map(task => (
            <div
              key={task.id}
              className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">{task.title}</h3>
                <span className="text-sm text-muted-foreground">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
