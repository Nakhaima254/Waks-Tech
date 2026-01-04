import { Project, Task, TeamMember, Comment, Notification } from '@/types';

// Empty initial data - no dummy data
export const teamMembers: TeamMember[] = [];

export const projects: Project[] = [];

export const tasks: Task[] = [];

export const comments: Comment[] = [];

export const notifications: Notification[] = [];

export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
