import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Project, Task, TeamMember, Comment, Notification, UserPreferences, Status } from '@/types';
import { generateId } from '@/data/mockData';

interface ProjectContextType {
  // Data
  projects: Project[];
  tasks: Task[];
  teamMembers: TeamMember[];
  comments: Comment[];
  notifications: Notification[];
  preferences: UserPreferences;
  
  // Current selections
  currentProjectId: string | null;
  currentTaskId: string | null;
  searchQuery: string;
  
  // Setters
  setCurrentProjectId: (id: string | null) => void;
  setCurrentTaskId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Project actions
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: Status) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (projectId: string, status: Status, taskIds: string[]) => void;
  
  // Comment actions
  addComment: (taskId: string, content: string, authorId: string) => Comment;
  
  // Notification actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  // Preferences
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  
  // Computed
  getCurrentProject: () => Project | undefined;
  getCurrentTask: () => Task | undefined;
  getProjectTasks: (projectId: string) => Task[];
  getTasksByStatus: (projectId: string, status: Status) => Task[];
  getTaskComments: (taskId: string) => Comment[];
  getTeamMember: (id: string) => TeamMember | undefined;
  getUnreadNotificationCount: () => number;
  searchTasks: (query: string) => Task[];
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEYS = {
  projects: 'waks-projects',
  tasks: 'waks-tasks',
  comments: 'waks-comments',
  notifications: 'waks-notifications',
  preferences: 'waks-preferences',
};

const defaultPreferences: UserPreferences = {
  defaultView: 'kanban',
  sidebarCollapsed: false,
  theme: 'light',
};

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on mount - start fresh with empty data
  useEffect(() => {
    const loadedProjects = localStorage.getItem(STORAGE_KEYS.projects);
    const loadedTasks = localStorage.getItem(STORAGE_KEYS.tasks);
    const loadedComments = localStorage.getItem(STORAGE_KEYS.comments);
    const loadedNotifications = localStorage.getItem(STORAGE_KEYS.notifications);
    const loadedPreferences = localStorage.getItem(STORAGE_KEYS.preferences);

    // Use empty arrays as defaults instead of mock data
    setProjects(loadedProjects ? JSON.parse(loadedProjects) : []);
    setTasks(loadedTasks ? JSON.parse(loadedTasks) : []);
    setComments(loadedComments ? JSON.parse(loadedComments) : []);
    setNotifications(loadedNotifications ? JSON.parse(loadedNotifications) : []);
    setPreferences(loadedPreferences ? JSON.parse(loadedPreferences) : defaultPreferences);
    setIsInitialized(true);
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
    }
  }, [projects, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
    }
  }, [tasks, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.comments, JSON.stringify(comments));
    }
  }, [comments, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
    }
  }, [notifications, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
    }
  }, [preferences, isInitialized]);

  // Project actions
  const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...projectData,
      id: generateId('proj'),
      createdAt: now,
      updatedAt: now,
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    ));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId !== id));
    if (currentProjectId === id) setCurrentProjectId(null);
  };

  // Task actions
  const addTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task => {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...taskData,
      id: generateId('task'),
      createdAt: now,
      updatedAt: now,
    };
    setTasks(prev => [...prev, newTask]);
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    ));
  };

  const updateTaskStatus = (id: string, status: Status) => {
    updateTask(id, { status });
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setComments(prev => prev.filter(c => c.taskId !== id));
    if (currentTaskId === id) setCurrentTaskId(null);
  };

  const reorderTasks = (projectId: string, status: Status, taskIds: string[]) => {
    // For now, we just update the status of moved tasks
    // In a real app, you might want to add an order field
  };

  // Comment actions
  const addComment = (taskId: string, content: string, authorId: string): Comment => {
    const newComment: Comment = {
      id: generateId('com'),
      taskId,
      authorId,
      content,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [...prev, newComment]);
    return newComment;
  };

  // Notification actions
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Preferences
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  // Computed
  const getCurrentProject = () => projects.find(p => p.id === currentProjectId);
  const getCurrentTask = () => tasks.find(t => t.id === currentTaskId);
  const getProjectTasks = (projectId: string) => tasks.filter(t => t.projectId === projectId);
  const getTasksByStatus = (projectId: string, status: Status) => 
    tasks.filter(t => t.projectId === projectId && t.status === status);
  const getTaskComments = (taskId: string) => 
    comments.filter(c => c.taskId === taskId).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  const getTeamMember = (id: string) => teamMembers.find(m => m.id === id);
  const getUnreadNotificationCount = () => notifications.filter(n => !n.read).length;
  
  const searchTasks = (query: string): Task[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return tasks.filter(t => 
      t.title.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  };

  return (
    <ProjectContext.Provider value={{
      projects,
      tasks,
      teamMembers,
      comments,
      notifications,
      preferences,
      currentProjectId,
      currentTaskId,
      searchQuery,
      setCurrentProjectId,
      setCurrentTaskId,
      setSearchQuery,
      addProject,
      updateProject,
      deleteProject,
      addTask,
      updateTask,
      updateTaskStatus,
      deleteTask,
      reorderTasks,
      addComment,
      markNotificationRead,
      markAllNotificationsRead,
      updatePreferences,
      getCurrentProject,
      getCurrentTask,
      getProjectTasks,
      getTasksByStatus,
      getTaskComments,
      getTeamMember,
      getUnreadNotificationCount,
      searchTasks,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
