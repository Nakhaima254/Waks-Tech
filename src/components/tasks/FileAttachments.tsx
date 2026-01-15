import React, { useState, useEffect, useRef } from 'react';
import { Upload, File, Image, FileText, X, Download, History, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FileAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  version: number;
  is_latest: boolean;
  uploaded_by: string | null;
  created_at: string;
}

interface FileAttachmentsProps {
  taskId: string;
}

// Security: Allowed file types for upload
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
  'text/plain', 'text/csv'
];

// Security: Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Security: Sanitize filename to prevent path traversal and special characters
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
};

export function FileAttachments({ taskId }: FileAttachmentsProps) {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAttachments();
  }, [taskId]);

  const fetchAttachments = async () => {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('task_id', taskId)
      .eq('is_latest', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return;
    }

    setAttachments(data || []);
  };

  const getVersionHistory = async (fileName: string): Promise<FileAttachment[]> => {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('task_id', taskId)
      .eq('file_name', fileName)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching version history:', error);
      return [];
    }

    return data || [];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Security: Get current user for uploaded_by field
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload files',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    for (const file of Array.from(files)) {
      try {
        // Security: Validate file type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not allowed. Accepted types: images, PDF, Word, Excel, CSV, text files.`,
            variant: 'destructive',
          });
          continue;
        }

        // Security: Validate file size
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds the 10MB limit`,
            variant: 'destructive',
          });
          continue;
        }

        // Security: Sanitize filename
        const sanitizedName = sanitizeFilename(file.name);

        // Check if file with same name exists
        const existingFile = attachments.find(a => a.file_name === file.name);
        let newVersion = 1;

        if (existingFile) {
          // Get the latest version number
          const versions = await getVersionHistory(file.name);
          newVersion = versions.length > 0 ? versions[0].version + 1 : 1;

          // Mark all previous versions as not latest
          await supabase
            .from('file_attachments')
            .update({ is_latest: false })
            .eq('task_id', taskId)
            .eq('file_name', file.name);
        }

        // Security: Use cryptographically random UUID for file path
        const filePath = `${taskId}/${crypto.randomUUID()}-${sanitizedName}`;
        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: 'Upload failed',
            description: uploadError.message,
            variant: 'destructive',
          });
          continue;
        }

        // Security: Set uploaded_by to current user ID for RLS
        const { error: dbError } = await supabase
          .from('file_attachments')
          .insert({
            task_id: taskId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            version: newVersion,
            is_latest: true,
            uploaded_by: user.id,
          });

        if (dbError) {
          console.error('Database error:', dbError);
          toast({
            title: 'Failed to save attachment',
            description: dbError.message,
            variant: 'destructive',
          });
          continue;
        }

        toast({
          title: existingFile ? 'New version uploaded' : 'File uploaded',
          description: `${file.name}${existingFile ? ` (v${newVersion})` : ''}`,
        });
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Upload failed',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    }

    setIsUploading(false);
    fetchAttachments();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (attachment: FileAttachment) => {
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .download(attachment.file_path);

    if (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (attachment: FileAttachment) => {
    // Delete from storage
    await supabase.storage
      .from('task-attachments')
      .remove([attachment.file_path]);

    // Delete from database
    await supabase
      .from('file_attachments')
      .delete()
      .eq('id', attachment.id);

    // If this was the latest, make the previous version latest
    if (attachment.is_latest) {
      const versions = await getVersionHistory(attachment.file_name);
      if (versions.length > 0) {
        await supabase
          .from('file_attachments')
          .update({ is_latest: true })
          .eq('id', versions[0].id);
      }
    }

    toast({
      title: 'File deleted',
      description: attachment.file_name,
    });

    fetchAttachments();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-destructive" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canPreview = (fileType: string) => {
    return fileType.startsWith('image/') || fileType === 'application/pdf';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <File className="h-4 w-4" />
          Attachments ({attachments.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {attachments.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
          No files attached yet
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
            >
              {getFileIcon(attachment.file_type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {attachment.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)} • v{attachment.version}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canPreview(attachment.file_type) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewFile(attachment)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowVersionHistory(attachment.file_name)}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(attachment)}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(attachment)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <FilePreviewDialog
        attachment={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Version History Dialog */}
      <VersionHistoryDialog
        fileName={showVersionHistory}
        taskId={taskId}
        onClose={() => setShowVersionHistory(null)}
        onDownload={handleDownload}
        onRestore={async (attachment) => {
          // Mark all as not latest
          await supabase
            .from('file_attachments')
            .update({ is_latest: false })
            .eq('task_id', taskId)
            .eq('file_name', attachment.file_name);

          // Mark selected as latest
          await supabase
            .from('file_attachments')
            .update({ is_latest: true })
            .eq('id', attachment.id);

          toast({
            title: 'Version restored',
            description: `Restored to v${attachment.version}`,
          });

          fetchAttachments();
          setShowVersionHistory(null);
        }}
      />
    </div>
  );
}

interface FilePreviewDialogProps {
  attachment: FileAttachment | null;
  onClose: () => void;
}

function FilePreviewDialog({ attachment, onClose }: FilePreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (attachment) {
      loadPreview();
    } else {
      setPreviewUrl(null);
    }
  }, [attachment]);

  const loadPreview = async () => {
    if (!attachment) return;
    setIsLoading(true);

    // Security: Use signed URLs instead of public URLs
    const { data, error } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

    if (error) {
      console.error('Error creating signed URL:', error);
      setIsLoading(false);
      return;
    }

    setPreviewUrl(data.signedUrl);
    setIsLoading(false);
  };

  return (
    <Dialog open={!!attachment} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{attachment?.file_name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center min-h-[400px] overflow-auto">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : previewUrl && attachment?.file_type.startsWith('image/') ? (
            <img
              src={previewUrl}
              alt={attachment.file_name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          ) : previewUrl && attachment?.file_type === 'application/pdf' ? (
            <iframe
              src={previewUrl}
              className="w-full h-[70vh] rounded-lg"
              title={attachment.file_name}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VersionHistoryDialogProps {
  fileName: string | null;
  taskId: string;
  onClose: () => void;
  onDownload: (attachment: FileAttachment) => void;
  onRestore: (attachment: FileAttachment) => void;
}

function VersionHistoryDialog({
  fileName,
  taskId,
  onClose,
  onDownload,
  onRestore,
}: VersionHistoryDialogProps) {
  const [versions, setVersions] = useState<FileAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (fileName) {
      loadVersions();
    }
  }, [fileName]);

  const loadVersions = async () => {
    if (!fileName) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('task_id', taskId)
      .eq('file_name', fileName)
      .order('version', { ascending: false });

    if (!error && data) {
      setVersions(data);
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={!!fileName} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version History: {fileName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No version history
            </p>
          ) : (
            versions.map((version) => (
              <div
                key={version.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  version.is_latest ? 'bg-primary/10 border border-primary/20' : 'bg-muted'
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      Version {version.version}
                    </span>
                    {version.is_latest && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(version.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(version)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {!version.is_latest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestore(version)}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
