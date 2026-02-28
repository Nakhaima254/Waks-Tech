import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Loader2, Save, User, Bell, Palette, Globe, LogOut, Mail, Phone, Briefcase, Shield, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getSafeErrorMessage, logError } from '@/lib/errorHandler';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  phone: string | null;
  timezone: string;
  theme: string;
  email_notifications: boolean;
}

export function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    job_title: '',
    phone: '',
    timezone: 'UTC',
    theme: 'system',
    email_notifications: true,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          job_title: data.job_title || '',
          phone: data.phone || '',
          timezone: data.timezone || 'UTC',
          theme: data.theme || 'system',
          email_notifications: data.email_notifications ?? true,
        });
      } else {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      }
    } catch (error) {
      logError('fetchProfile', error);
      toast({
        title: 'Error',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          job_title: formData.job_title || null,
          phone: formData.phone || null,
          timezone: formData.timezone,
          theme: formData.theme,
          email_notifications: formData.email_notifications,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      logError('handleSave', error);
      toast({
        title: 'Error',
        description: getSafeErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);

      toast({ title: 'Success', description: 'Avatar updated successfully' });
    } catch (error) {
      logError('handleAvatarUpload', error);
      toast({ title: 'Error', description: getSafeErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({ title: 'Error', description: 'Please fill in all password fields', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast({ title: 'Error', description: 'New password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: 'Error', description: 'New passwords do not match', variant: 'destructive' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Success', description: 'Password updated successfully' });
    } catch (error) {
      logError('handleChangePassword', error);
      toast({ title: 'Error', description: getSafeErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;

      toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' });
      await signOut();
      navigate('/auth');
    } catch (error) {
      logError('handleDeleteAccount', error);
      toast({ title: 'Error', description: getSafeErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmText('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = () => {
    if (formData.full_name) {
      return formData.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, profile, and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-11">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Palette className="h-4 w-4 hidden sm:block" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Shield className="h-4 w-4 hidden sm:block" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Avatar Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Photo</CardTitle>
              <CardDescription>Upload a photo to personalize your account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/0 group-hover:bg-foreground/40 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-background" />
                      ) : (
                        <Camera className="h-6 w-6 text-background" />
                      )}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{formData.full_name || 'Your Name'}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Camera className="h-3.5 w-3.5 mr-1.5" />
                    Change Photo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-1.5 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title" className="flex items-center gap-1.5 text-sm font-medium">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                    Job Title
                  </Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                    placeholder="e.g. Software Developer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted/50 text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5 text-sm font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Appearance</CardTitle>
              <CardDescription>Customize how the app looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                    Theme
                  </Label>
                  <p className="text-sm text-muted-foreground">Choose your preferred color scheme</p>
                </div>
                <Select
                  value={formData.theme}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, theme: value }))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    Timezone
                  </Label>
                  <p className="text-sm text-muted-foreground">Set your local timezone for accurate scheduling</p>
                </div>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Africa/Johannesburg">Johannesburg (SAST)</SelectItem>
                    <SelectItem value="Africa/Lagos">Lagos (WAT)</SelectItem>
                    <SelectItem value="Africa/Nairobi">Nairobi (EAT)</SelectItem>
                    <SelectItem value="Africa/Cairo">Cairo (EET)</SelectItem>
                    <SelectItem value="Africa/Casablanca">Casablanca (WET)</SelectItem>
                    <SelectItem value="Africa/Accra">Accra (GMT)</SelectItem>
                    <SelectItem value="Africa/Addis_Ababa">Addis Ababa (EAT)</SelectItem>
                    <SelectItem value="Africa/Dar_es_Salaam">Dar es Salaam (EAT)</SelectItem>
                    <SelectItem value="Africa/Kinshasa">Kinshasa (WAT)</SelectItem>
                    <SelectItem value="Africa/Luanda">Luanda (WAT)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET)</SelectItem>
                    <SelectItem value="Europe/Moscow">Moscow (MSK)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">Mumbai (IST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                    <SelectItem value="Pacific/Auckland">Auckland (NZST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notifications</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notifications" className="text-sm font-medium flex items-center gap-1.5">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">Get notified about task assignments, updates, and mentions</p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email_notifications: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px]">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Account ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{user?.id?.slice(0, 8)}...</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your password to keep your account secure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-sm font-medium">New Password</Label>
                <PasswordInput
                  id="new_password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                />
                {passwordData.newPassword && (
                  <PasswordStrengthIndicator password={passwordData.newPassword} />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-sm font-medium">Confirm New Password</Label>
                <PasswordInput
                  id="confirm_password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                />
                {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-sm text-destructive">Passwords do not match</p>
                )}
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full sm:w-auto"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Update Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Account
              </CardTitle>
              <CardDescription>Permanently delete your account and all associated data. This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Delete Account Permanently
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>This will permanently delete your account and all associated data. This action <strong>cannot be undone</strong>.</p>
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="delete-confirm" className="text-sm font-medium text-foreground">
                          Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                        </Label>
                        <Input
                          id="delete-confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="Type DELETE"
                          className="border-destructive/50 focus-visible:ring-destructive"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete My Account'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg text-destructive flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Sign Out
              </CardTitle>
              <CardDescription>Sign out of your account on this device</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleSignOut} className="w-full sm:w-auto">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
