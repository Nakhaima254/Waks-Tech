import React, { useState } from 'react';
import { X, Calendar, User, Tag, MessageSquare, Send, MoreHorizontal, Trash2, Paperclip, Loader2 } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { Task, Status, Priority, TaskType, STATUS_LABELS, PRIORITY_LABELS, TYPE_LABELS, ROLE_LABELS } from '@/types';
import { FileAttachments } from './FileAttachments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const { 
    tasks,
    projects,
    updateTask, 
    deleteTask, 
    getTaskComments, 
    addComment, 
    getTeamMember, 
    teamMembers 
  } = useProject();
  
  const task = tasks.find(t => t.id === taskId);
  const project = task ? projects.find(p => p.id === task.projectId) : undefined;
  const comments = getTaskComments(taskId);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || '');
  const [editedDescription, setEditedDescription] = useState(task?.description || '');
  const [isSendingComment, setIsSendingComment] = useState(false);

  if (!task) return null;

  const handleStatusChange = (status: Status) => {
    updateTask(taskId, { status });
  };

  const handlePriorityChange = (priority: Priority) => {
    updateTask(taskId, { priority });
  };

  const handleTypeChange = (type: TaskType) => {
    updateTask(taskId, { type });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    const currentAssignees = task.assigneeIds;
    const newAssignees = currentAssignees.includes(assigneeId)
      ? currentAssignees.filter(id => id !== assigneeId)
      : [...currentAssignees, assigneeId];
    updateTask(taskId, { assigneeIds: newAssignees });
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;
    
    setIsSendingComment(true);
    
    // Get current user info (using first team member as fallback)
    const currentUser = teamMembers[0];
    const commentAuthor = currentUser?.name || 'Team Member';
    
    addComment(taskId, newComment.trim(), currentUser?.id || 'tm-5');
    
    // Send email notifications to all assignees
    if (task.assigneeIds.length > 0) {
      const assignees = teamMembers
        .filter(m => task.assigneeIds.includes(m.id))
        .map(m => ({ name: m.name, email: m.email }));

      try {
        const { error } = await supabase.functions.invoke('send-comment-notification', {
          body: {
            assignees,
            taskTitle: task.title,
            projectName: project?.title || 'Project',
            commentAuthor,
            commentContent: newComment.trim(),
          },
        });

        if (error) {
          console.error('Error sending comment notification emails:', error);
        }
      } catch (error) {
        console.error('Error sending comment notification emails:', error);
      }
    }
    
    setNewComment('');
    setIsSendingComment(false);
  };

  const handleSaveEdits = () => {
    updateTask(taskId, { title: editedTitle, description: editedDescription });
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteTask(taskId);
    onClose();
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'backlog': return 'bg-status-backlog';
      case 'todo': return 'bg-status-todo';
      case 'in-progress': return 'bg-status-progress';
      case 'review': return 'bg-status-review';
      case 'blocked': return 'bg-status-blocked';
      case 'done': return 'bg-status-done';
    }
  };

  return (
    <div className="w-96 h-full border-l border-border bg-card flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', getStatusColor(task.status))} />
          <span className="text-sm font-medium text-muted-foreground">{TYPE_LABELS[task.type]}</span>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-6">
          {/* Title & Description */}
          <div>
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold"
                />
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  placeholder="Add description..."
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdits}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-foreground mb-2">{task.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {task.description || 'No description'}
                </p>
              </>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select value={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Priority</label>
            <Select value={task.priority} onValueChange={handlePriorityChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Type</label>
            <Select value={task.type} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Assignees</label>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map(member => {
                const isAssigned = task.assigneeIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => handleAssigneeChange(member.id)}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1 rounded-lg border text-sm transition-colors',
                      isAssigned 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-card border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                      {member.initials}
                    </div>
                    {member.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Due Date</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(task.dueDate), 'MMMM d, yyyy')}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tags</label>
              <div className="flex flex-wrap gap-1">
                {task.tags.map(tag => (
                  <span 
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Type-specific fields */}
          {task.type === 'development' && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground">Development Details</h3>
              {task.gitBranch && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Branch: </span>
                  <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">{task.gitBranch}</code>
                </div>
              )}
              {task.storyPoints && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Story Points: </span>
                  <span className="font-medium text-foreground">{task.storyPoints}</span>
                </div>
              )}
              {task.prLink && (
                <div className="text-sm">
                  <span className="text-muted-foreground">PR: </span>
                  <a href={task.prLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    View Pull Request
                  </a>
                </div>
              )}
            </div>
          )}

          {task.type === 'research' && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground">Research Details</h3>
              {task.protocolNumber && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Protocol: </span>
                  <span className="font-medium text-foreground">{task.protocolNumber}</span>
                </div>
              )}
              {task.ethicsApproval && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Ethics: </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs capitalize',
                    task.ethicsApproval === 'approved' && 'bg-success/10 text-success',
                    task.ethicsApproval === 'pending' && 'bg-warning/10 text-warning',
                    task.ethicsApproval === 'not-required' && 'bg-muted text-muted-foreground'
                  )}>
                    {task.ethicsApproval.replace('-', ' ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* File Attachments */}
          <div className="pt-4 border-t border-border">
            <FileAttachments taskId={taskId} />
          </div>

          {/* Comments */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments ({comments.length})
            </h3>
            
            <div className="space-y-3">
              {comments.map(comment => {
                const author = getTeamMember(comment.authorId);
                return (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {author?.initials || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{author?.name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add comment */}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                onKeyDown={(e) => e.key === 'Enter' && !isSendingComment && handleAddComment()}
                disabled={isSendingComment}
              />
              <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim() || isSendingComment}>
                {isSendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
