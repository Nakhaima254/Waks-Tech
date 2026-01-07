import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const { 
    notifications, 
    getUnreadNotificationCount, 
    markNotificationRead,
    markAllNotificationsRead,
    searchTasks,
    setCurrentTaskId,
    searchQuery,
    setSearchQuery,
    projects
  } = useProject();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const searchResults = searchTasks(localSearch);
  const unreadCount = getUnreadNotificationCount();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const userEmail = user?.email || '';
  const userInitials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'U';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleTaskClick = (taskId: string, projectId: string) => {
    setSearchOpen(false);
    setLocalSearch('');
    navigate(`/projects/${projectId}`);
    setTimeout(() => setCurrentTaskId(taskId), 100);
  };

  return (
    <>
      <header className={cn(
        "h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6",
        isMobile && "pl-16" // Space for mobile menu button
      )}>
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            "flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition-colors",
            isMobile ? "flex-1 max-w-[200px]" : "w-80"
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="text-sm truncate">{isMobile ? "Search..." : "Search tasks..."}</span>
          {!isMobile && (
            <div className="ml-auto flex items-center gap-1 text-xs">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-muted-foreground">⌘</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-muted-foreground">K</kbd>
            </div>
          )}
        </button>

        {/* Right section */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Quick create */}
          <Button 
            size={isMobile ? "icon" : "sm"}
            onClick={() => navigate('/projects/new')}
            className={cn(!isMobile && "gap-2")}
          >
            <Plus className="h-4 w-4" />
            {!isMobile && <span>New Project</span>}
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72 md:w-80">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllNotificationsRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-8 text-center text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 10).map(notification => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        'flex flex-col items-start gap-1 px-3 py-2 cursor-pointer',
                        !notification.read && 'bg-primary/5'
                      )}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <span className="font-medium text-sm">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">{notification.message}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 border-b">
                <p className="font-medium truncate">{userEmail}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-xl p-0 max-w-[calc(100vw-2rem)] mx-4">
          <div className="flex items-center gap-3 px-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search tasks, projects..."
              className="border-0 focus-visible:ring-0 text-base md:text-lg py-4 md:py-6"
            />
          </div>
          <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
            {localSearch && searchResults.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                No results found for "{localSearch}"
              </div>
            )}
            {searchResults.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              return (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task.id, task.projectId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                  <div 
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: project?.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project?.title}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full capitalize whitespace-nowrap',
                    task.status === 'done' && 'bg-status-done/10 text-status-done',
                    task.status === 'in-progress' && 'bg-status-progress/10 text-status-progress',
                    task.status === 'blocked' && 'bg-status-blocked/10 text-status-blocked'
                  )}>
                    {task.status.replace('-', ' ')}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
