import { useRef, useState, DragEvent, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useMeetingAttachments, MeetingAttachment } from "@/hooks/useMeetingAttachments";
import { Loader2, Paperclip, X, FileImage, FileText, File, ExternalLink, Upload } from "lucide-react";
import { ImagePreviewModal } from "@/components/ImagePreviewModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

// Component for individual attachment with async URL handling
function AttachmentItem({ 
  attachment, 
  canEdit, 
  isDeleting, 
  onDelete, 
  onImageClick,
  getSignedUrl,
}: {
  attachment: MeetingAttachment;
  canEdit: boolean;
  isDeleting: boolean;
  onDelete: (attachment: MeetingAttachment) => void;
  onImageClick: (url: string, name: string) => void;
  getSignedUrl: (filePath: string) => Promise<string>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(true);
  const isImage = attachment.file_type.startsWith("image/");

  useEffect(() => {
    let isMounted = true;
    
    const fetchUrl = async () => {
      try {
        const signedUrl = await getSignedUrl(attachment.file_path);
        if (isMounted) {
          setUrl(signedUrl);
          setIsLoadingUrl(false);
        }
      } catch (error) {
        console.error('Failed to get signed URL:', error);
        if (isMounted) {
          setIsLoadingUrl(false);
        }
      }
    };

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [attachment.file_path, getSignedUrl]);

  const handleImageClick = () => {
    if (url && isImage) {
      onImageClick(url, attachment.file_name);
    }
  };

  const handleOpenFile = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="group relative flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5 text-xs">
      {isLoadingUrl ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isImage && url ? (
        <button
          type="button"
          onClick={handleImageClick}
          className="h-8 w-8 rounded overflow-hidden hover:ring-2 ring-primary transition-all"
        >
          <img
            src={url}
            alt={attachment.file_name}
            className="h-full w-full object-cover"
          />
        </button>
      ) : (
        getFileIcon(attachment.file_type)
      )}
      <div className="flex flex-col">
        {isImage ? (
          <button
            type="button"
            onClick={handleImageClick}
            className="flex items-center gap-1 font-medium hover:underline text-left"
            disabled={!url}
          >
            <span className="max-w-[120px] truncate">{attachment.file_name}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleOpenFile}
            className="flex items-center gap-1 font-medium hover:underline text-left"
            disabled={!url}
          >
            <span className="max-w-[120px] truncate">{attachment.file_name}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </button>
        )}
        <span className="text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </span>
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(attachment)}
          disabled={isDeleting}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export function MeetingAttachments({ minuteId, canEdit }: MeetingAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  
  const {
    attachments,
    isLoading,
    uploadFile,
    isUploading,
    deleteAttachment,
    isDeleting,
    getSignedUrl,
  } = useMeetingAttachments(minuteId);

  const validateAndUploadFile = (file: File) => {
    // Max file size: 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    
    // Validate file type
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain", "text/csv"
    ];
    
    if (!allowedTypes.includes(file.type) && !file.type.startsWith("image/")) {
      toast.error("File type not supported");
      return;
    }
    
    uploadFile({ file, minuteId });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndUploadFile(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (canEdit) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!canEdit) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      validateAndUploadFile(files[0]);
    }
  };

  const handleDelete = (attachment: MeetingAttachment) => {
    if (confirm(`Delete "${attachment.file_name}"?`)) {
      deleteAttachment(attachment);
    }
  };

  const handleImageClick = useCallback((url: string, name: string) => {
    setPreviewImage({ url, name });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading attachments...
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "space-y-2 rounded-md transition-colors",
          canEdit && isDragOver && "bg-primary/10 ring-2 ring-primary ring-dashed p-2"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drop zone indicator */}
        {canEdit && isDragOver && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-primary">
            <Upload className="h-5 w-5" />
            <span>Drop file to upload</span>
          </div>
        )}

        {/* Attachments list */}
        {attachments.length > 0 && !isDragOver && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <AttachmentItem
                key={attachment.id}
                attachment={attachment}
                canEdit={canEdit}
                isDeleting={isDeleting}
                onDelete={handleDelete}
                onImageClick={handleImageClick}
                getSignedUrl={getSignedUrl}
              />
            ))}
          </div>
        )}

        {/* Upload button */}
        {canEdit && !isDragOver && (
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
              {isUploading ? "Uploading..." : "Attach file (or drag & drop)"}
            </Button>
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {previewImage && (
        <ImagePreviewModal
          open={!!previewImage}
          onOpenChange={(open) => !open && setPreviewImage(null)}
          imageUrl={previewImage.url}
          fileName={previewImage.name}
        />
      )}
    </>
  );
}