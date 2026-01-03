import React, { useState, useMemo, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  parseISO,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  startOfDay,
  addDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, Status } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TimelineViewProps {
  projectId: string;
}

const DAY_WIDTH = 40;

export function TimelineView({ projectId }: TimelineViewProps) {
  const { tasks, setCurrentTaskId, teamMembers } = useProject();
  const [currentDate, setCurrentDate] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const projectTasks = useMemo(
    () => tasks.filter(t => t.projectId === projectId),
    [tasks, projectId]
  );

  // Calculate the timeline range (current month view)
  const timelineStart = startOfMonth(currentDate);
  const timelineEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: timelineStart, end: timelineEnd });

  // Prepare tasks with calculated positions
  const taskBars = useMemo(() => {
    return projectTasks
      .map(task => {
        // Use createdAt as start if no explicit start date
        const taskStart = startOfDay(parseISO(task.createdAt));
        // Use dueDate as end, or 3 days after start if no due date
        const taskEnd = task.dueDate 
          ? startOfDay(parseISO(task.dueDate))
          : addDays(taskStart, 3);

        // Calculate position relative to timeline
        const startOffset = differenceInDays(taskStart, timelineStart);
        const duration = Math.max(1, differenceInDays(taskEnd, taskStart) + 1);

        return {
          task,
          startOffset,
          duration,
          isVisible: startOffset + duration > 0 && startOffset < days.length,
        };
      })
      .filter(bar => bar.isVisible)
      .sort((a, b) => a.startOffset - b.startOffset);
  }, [projectTasks, timelineStart, days.length]);

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    // Scroll to today
    if (scrollRef.current) {
      const todayOffset = differenceInDays(new Date(), timelineStart);
      scrollRef.current.scrollLeft = Math.max(0, todayOffset * DAY_WIDTH - 200);
    }
  };

  const getTaskColor = (task: Task) => {
    const colors: Record<string, { bg: string; border: string }> = {
      development: { bg: 'bg-type-development', border: 'border-type-development' },
      research: { bg: 'bg-type-research', border: 'border-type-research' },
      gis: { bg: 'bg-type-gis', border: 'border-type-gis' },
      marketing: { bg: 'bg-type-marketing', border: 'border-type-marketing' },
      general: { bg: 'bg-muted-foreground', border: 'border-muted-foreground' },
    };
    return colors[task.type] || colors.general;
  };

  const getStatusStyle = (status: Status) => {
    if (status === 'done') return 'opacity-60';
    if (status === 'blocked') return 'opacity-80 bg-stripes';
    return '';
  };

  // Find dependent tasks for visualization
  const getDependencies = (task: Task) => {
    const deps: { from: Task; to: Task }[] = [];
    if (task.dependencies) {
      task.dependencies.forEach(depId => {
        const depTask = projectTasks.find(t => t.id === depId);
        if (depTask) {
          deps.push({ from: depTask, to: task });
        }
      });
    }
    if (task.blockedBy) {
      task.blockedBy.forEach(blockerId => {
        const blockerTask = projectTasks.find(t => t.id === blockerId);
        if (blockerTask) {
          deps.push({ from: blockerTask, to: task });
        }
      });
    }
    return deps;
  };

  return (
    <div className="h-full flex flex-col p-4 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-type-development" /> Development
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-type-research" /> Research
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-type-gis" /> GIS
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-type-marketing" /> Marketing
          </span>
        </div>
      </div>

      {/* Timeline container */}
      <div className="flex-1 flex min-h-0 border border-border rounded-lg overflow-hidden bg-card">
        {/* Left panel - Task list */}
        <div className="w-64 flex-shrink-0 border-r border-border bg-muted/30">
          {/* Header */}
          <div className="h-12 border-b border-border flex items-center px-4 bg-muted">
            <span className="text-sm font-medium text-foreground">Tasks</span>
            <span className="ml-auto text-xs text-muted-foreground">{taskBars.length}</span>
          </div>
          {/* Task list */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
            {taskBars.map(({ task }, index) => (
              <div
                key={task.id}
                className={cn(
                  'h-12 flex items-center px-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors',
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                )}
                onClick={() => setCurrentTaskId(task.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      task.status === 'done' ? 'bg-status-done' :
                      task.status === 'in-progress' ? 'bg-status-progress' :
                      task.status === 'blocked' ? 'bg-status-blocked' :
                      'bg-muted-foreground'
                    )} />
                    <span className="text-xs text-muted-foreground">{STATUS_LABELS[task.status]}</span>
                  </div>
                </div>
              </div>
            ))}
            {taskBars.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No tasks with dates in this month
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Timeline */}
        <div className="flex-1 overflow-hidden">
          {/* Days header */}
          <div className="h-12 border-b border-border flex bg-muted overflow-x-auto" ref={scrollRef}>
            <div className="flex" style={{ minWidth: days.length * DAY_WIDTH }}>
              {days.map(day => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex-shrink-0 flex flex-col items-center justify-center border-r border-border',
                    isToday(day) && 'bg-primary/10'
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {format(day, 'EEE')}
                  </span>
                  <span className={cn(
                    'text-sm font-medium',
                    isToday(day) ? 'text-primary' : 'text-foreground'
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task bars area */}
          <div 
            className="overflow-auto" 
            style={{ height: 'calc(100% - 48px)' }}
            onScroll={(e) => {
              // Sync scroll with header
              if (scrollRef.current) {
                scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            <div 
              className="relative"
              style={{ 
                minWidth: days.length * DAY_WIDTH,
                minHeight: taskBars.length * 48 || 200
              }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 flex">
                {days.map(day => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'flex-shrink-0 border-r border-border/50 h-full',
                      isToday(day) && 'bg-primary/5'
                    )}
                    style={{ width: DAY_WIDTH }}
                  />
                ))}
              </div>

              {/* Row backgrounds */}
              {taskBars.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    'absolute left-0 right-0 h-12 border-b border-border',
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                  )}
                  style={{ top: index * 48 }}
                />
              ))}

              {/* Today line */}
              {isSameMonth(new Date(), currentDate) && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-20"
                  style={{ left: differenceInDays(new Date(), timelineStart) * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              )}

              {/* Task bars */}
              {taskBars.map(({ task, startOffset, duration }, index) => {
                const colors = getTaskColor(task);
                const left = Math.max(0, startOffset * DAY_WIDTH);
                const width = Math.max(DAY_WIDTH, duration * DAY_WIDTH);
                const adjustedWidth = startOffset < 0 
                  ? width + startOffset * DAY_WIDTH 
                  : width;

                return (
                  <Tooltip key={task.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'absolute h-8 rounded-md cursor-pointer transition-all hover:scale-y-110 hover:z-10 flex items-center px-2 gap-1 shadow-sm border',
                          colors.bg,
                          colors.border,
                          getStatusStyle(task.status)
                        )}
                        style={{
                          left,
                          width: adjustedWidth,
                          top: index * 48 + 8,
                        }}
                        onClick={() => setCurrentTaskId(task.id)}
                      >
                        <span className="text-xs font-medium text-primary-foreground truncate">
                          {task.title}
                        </span>
                        {task.dependencies?.length || task.blockedBy?.length ? (
                          <ArrowRight className="h-3 w-3 text-primary-foreground/70 flex-shrink-0" />
                        ) : null}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1.5">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[task.type]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {STATUS_LABELS[task.status]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>Start: {format(parseISO(task.createdAt), 'MMM d, yyyy')}</p>
                          {task.dueDate && (
                            <p>Due: {format(parseISO(task.dueDate), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                        {task.assigneeIds.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Assigned to:{' '}
                            {task.assigneeIds
                              .map(id => teamMembers.find(m => m.id === id)?.name)
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                        {(task.dependencies?.length || task.blockedBy?.length) ? (
                          <p className="text-xs text-muted-foreground">
                            {task.dependencies?.length ? `${task.dependencies.length} dependencies` : ''}
                            {task.blockedBy?.length ? `Blocked by ${task.blockedBy.length} tasks` : ''}
                          </p>
                        ) : null}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Dependency lines */}
              <svg className="absolute inset-0 pointer-events-none z-10" style={{ 
                width: days.length * DAY_WIDTH,
                height: taskBars.length * 48 || 200
              }}>
                {taskBars.map(({ task }, toIndex) => {
                  const deps = getDependencies(task);
                  return deps.map(({ from }) => {
                    const fromIndex = taskBars.findIndex(b => b.task.id === from.id);
                    if (fromIndex === -1) return null;

                    const fromBar = taskBars[fromIndex];
                    const toBar = taskBars[toIndex];

                    const fromX = Math.max(0, fromBar.startOffset + fromBar.duration) * DAY_WIDTH;
                    const fromY = fromIndex * 48 + 24;
                    const toX = Math.max(0, toBar.startOffset) * DAY_WIDTH;
                    const toY = toIndex * 48 + 24;

                    const midX = (fromX + toX) / 2;

                    return (
                      <g key={`${from.id}-${task.id}`}>
                        <path
                          d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                          fill="none"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          opacity="0.5"
                        />
                        <circle cx={toX} cy={toY} r="3" fill="hsl(var(--muted-foreground))" opacity="0.5" />
                      </g>
                    );
                  });
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-4 flex-shrink-0 text-xs text-muted-foreground">
        <span>Bar length = task duration (creation → due date)</span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t-2 border-dashed border-muted-foreground" />
          Dependency link
        </span>
        <span className="flex items-center gap-1">
          <span className="w-0.5 h-4 bg-primary" />
          Today
        </span>
      </div>
    </div>
  );
}
