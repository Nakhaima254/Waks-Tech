import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, AppRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, ShieldCheck, User, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getSafeErrorMessage, logError } from '@/lib/errorHandler';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  role: AppRole;
  created_at: string;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
  admin: { label: 'Admin', icon: <ShieldCheck className="h-4 w-4" />, color: 'bg-destructive text-destructive-foreground' },
  moderator: { label: 'Moderator', icon: <Shield className="h-4 w-4" />, color: 'bg-warning text-warning-foreground' },
  user: { label: 'User', icon: <User className="h-4 w-4" />, color: 'bg-secondary text-secondary-foreground' },
};

export function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch emails from team_members table
      const userIds = data?.map(u => u.user_id) || [];
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('user_id, email')
        .in('user_id', userIds);

      const emailMap = new Map(teamMembers?.map(tm => [tm.user_id, tm.email]) || []);

      const usersWithEmail: UserWithRole[] = (data || []).map(u => ({
        ...u,
        role: u.role as AppRole,
        email: emailMap.get(u.user_id) || 'Unknown',
      }));

      setUsers(usersWithEmail);
    } catch (err) {
      logError('fetchUsers', err);
      toast.error(getSafeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole) => {
    if (userId === user?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.user_id === userId ? { ...u, role: newRole } : u
      ));
      toast.success(`Role updated to ${ROLE_CONFIG[newRole].label}`);
    } catch (err) {
      logError('updateUserRole', err);
      toast.error(getSafeErrorMessage(err));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground">You need admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage user roles and permissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {(['admin', 'moderator', 'user'] as AppRole[]).map(role => {
          const count = users.filter(u => u.role === role).length;
          const config = ROLE_CONFIG[role];
          return (
            <Card key={role}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{config.label}s</CardTitle>
                <div className={`p-2 rounded-lg ${config.color}`}>
                  {config.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {count === 1 ? '1 user' : `${count} users`} with this role
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage user roles across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => {
                  const config = ROLE_CONFIG[u.role];
                  const isCurrentUser = u.user_id === user?.id;
                  
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{u.email}</p>
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground">(You)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>
                          {config.icon}
                          <span className="ml-1">{config.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {isCurrentUser ? (
                          <span className="text-sm text-muted-foreground">Cannot modify</span>
                        ) : (
                          <Select
                            value={u.role}
                            onValueChange={(value) => updateUserRole(u.user_id, value as AppRole)}
                            disabled={updatingUserId === u.user_id}
                          >
                            <SelectTrigger className="w-[130px]">
                              {updatingUserId === u.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
