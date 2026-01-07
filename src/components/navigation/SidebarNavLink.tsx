import React from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarNavLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed?: boolean;
  badge?: number;
  onClick?: () => void;
}

export function SidebarNavLink({ to, icon: Icon, label, collapsed, badge, onClick }: SidebarNavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/'));

  return (
    <RouterNavLink
      to={to}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        'hover:bg-sidebar-accent',
        isActive 
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' 
          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
      )}
    >
      <Icon className={cn(
        'h-5 w-5 shrink-0 transition-colors',
        isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
      )} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-xs font-medium text-sidebar-primary-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </RouterNavLink>
  );
}
