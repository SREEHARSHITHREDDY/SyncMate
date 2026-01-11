import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useMeetingAttachments, MeetingAttachment } from "@/hooks/useMeetingAttachments";
import { Loader2, Paperclip, X, FileImage, FileText, File, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MeetingAttachmentsProps {
  minuteId: string;
  canEdit: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) {
    return <FileImage className="h-4 w-4" />;
  }
  if (fileType === "application/pdf" || fileType.includes("document")) {
    return <FileText className="h-4 w-4" />;
  }
  return <File className="h-4 w-4" />;
}

export function MeetingAttachments({ minuteId, canEdit }: MeetingAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    attachments,
    isLoading,
    uploadFile,
    isUploading,
    deleteAttachment,
    isDeleting,
    getPublicUrl,
  } = useMeetingAttachments(minuteId);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Max file size: 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      uploadFile({ file, minuteId });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (attachment: MeetingAttachment) => {
    if (confirm(`Delete "${attachment.file_name}"?`)) {
      deleteAttachment(attachment);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading attachments...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => {
            const url = getPublicUrl(attachment.file_path);
            const isImage = attachment.file_type.startsWith("image/");
            
            return (
              <div
                key={attachment.id}
                className="group relative flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5 text-xs"
              >
                {isImage ? (
                  <img
                    src={url}
                    alt={attachment.file_name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  getFileIcon(attachment.file_type)
                )}
                <div className="flex flex-col">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-medium hover:underline"
                  >
                    <span className="max-w-[120px] truncate">{attachment.file_name}</span>
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                  <span className="text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </span>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(attachment)}
                    disabled={isDeleting}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload button */}
      {canEdit && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Paperclip className="h-3 w-3" />
            )}
            Attach file
          </Button>
        </div>
      )}
    </div>
  );
}
