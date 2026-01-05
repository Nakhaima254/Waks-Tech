import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="p-6 rounded-lg border border-border bg-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-foreground">{user?.email || 'Not signed in'}</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-border bg-card">
          <h2 className="text-lg font-semibold text-foreground mb-4">Sign Out</h2>
          <p className="text-muted-foreground mb-4">Sign out of your account on this device.</p>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
