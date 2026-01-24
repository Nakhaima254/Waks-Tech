import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FolderKanban, 
  Users, 
  Calendar, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Menu,
  X,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { SidebarNavLink } from './SidebarNavLink';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useUserRole } from '@/hooks/useUserRole';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { projects, getUnreadNotificationCount } = useProject();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const unreadCount = getUnreadNotificationCount();
  const { isAdmin } = useUserRole();

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2" onClick={onNavigate}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">W</span>
          </div>
          {(!collapsed || isMobile) && (
            <span className="text-lg font-bold text-sidebar-foreground">Waks PMS</span>
          )}
        </Link>
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        <SidebarNavLink to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed && !isMobile} onClick={onNavigate} />
        <SidebarNavLink to="/my-tasks" icon={CheckSquare} label="My Tasks" collapsed={collapsed && !isMobile} badge={unreadCount} onClick={onNavigate} />
        <SidebarNavLink to="/calendar" icon={Calendar} label="Calendar" collapsed={collapsed && !isMobile} onClick={onNavigate} />
        <SidebarNavLink to="/team" icon={Users} label="Team" collapsed={collapsed && !isMobile} onClick={onNavigate} />
        {isAdmin && (
          <SidebarNavLink to="/admin" icon={ShieldCheck} label="Admin" collapsed={collapsed && !isMobile} onClick={onNavigate} />
        )}
        
        {/* Projects section */}
        <div className="pt-4">
          {(!collapsed || isMobile) && (
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Projects
              </span>
              <button 
                onClick={() => {
                  navigate('/projects/new');
                  onNavigate?.();
                }}
                className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="space-y-1">
            {projects.slice(0, (collapsed && !isMobile) ? 3 : 5).map(project => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                  'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                )}
              >
                <div 
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                {(!collapsed || isMobile) && (
                  <span className="truncate text-sm">{project.title}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-sidebar-border">
        <SidebarNavLink to="/settings" icon={Settings} label="Settings" collapsed={collapsed && !isMobile} onClick={onNavigate} />
      </div>
    </>
  );

  // Mobile: Sheet-based sidebar
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-md md:hidden">
            <Menu className="h-5 w-5 text-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className={cn(
      'h-screen bg-sidebar flex flex-col transition-all duration-300 ease-in-out hidden md:flex',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <SidebarContent />
    </aside>
  );
}
