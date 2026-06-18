// @ts-nocheck
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Paperclip, Trash2, Eye, CheckCircle2, Loader2, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useRole } from '@/lib/role-hooks';
import { attachmentService } from '@/services/attachmentService';

const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
const ACCEPTED_EXTS = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.heic'];

function isAcceptedFile(file) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTS.some(ext => name.endsWith(ext));
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function openAttachment(att) {
  const url = await attachmentService.getSignedUrl(att.id);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Full-featured attachment slot with dashed upload zone, progress bar, file size, subtext.
 * attachments: array of Attachment records from DB
 * onAdd(att): called after upload
 * onDelete(att): called when delete clicked
 * label: section heading
 * subtext: hint shown in empty state
 * emptyLabel: call-to-action text in dashed zone (default "Upload PDF")
 */
export function AttachmentSlot({
  label,
  subtext,
  emptyLabel = 'Upload File',
  attachments = [],
  onAdd,
  onDelete,
  accept = 'application/pdf,image/jpeg,image/jpg,image/png,image/heic,.heic',
  allowMultiple = false,
}) {
  const { role } = useRole();
  const canDelete = role === 'admin' || role === 'supervisor';
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [justDone, setJustDone] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!isAcceptedFile(file)) {
      setError('Only PDF or image files are accepted (PDF, JPG, PNG, HEIC).');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    setProgress(10);

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 85));
    }, 300);

    try {
      await onAdd({
        file,
        file_name: file.name,
        original_filename: file.name,
        file_size: file.size,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'Demo Admin',
      });
      clearInterval(progressInterval);
      setProgress(100);
      setJustDone(true);
      setTimeout(() => { setJustDone(false); setProgress(0); }, 2000);
      e.target.value = '';
    } catch (err) {
      clearInterval(progressInterval);
      setError(err?.message || 'Upload failed. This demo only accepts safe local test files.');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const showEmpty = attachments.length === 0 && !uploading;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-foreground">{label}</p>
          {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
        </div>
        {attachments.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 flex-shrink-0"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || (!allowMultiple && attachments.length > 0)}
          >
            <Upload className="w-3 h-3" /> {allowMultiple ? 'Add another' : 'Replace'}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 text-destructive text-xs bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1.5 bg-muted/30 rounded-lg px-3 py-2.5 border border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploading...
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty state — dashed zone */}
      {showEmpty && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-lg py-5 flex flex-col items-center gap-1.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
        >
          <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-primary">{emptyLabel}</span>
          <span className="text-[10px] text-muted-foreground">PDF, JPG, PNG, HEIC · Max {MAX_SIZE_MB} MB</span>
        </button>
      )}

      {/* Attached files */}
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{att.file_name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {att.uploaded_by}
              {att.uploaded_at ? ` · ${format(new Date(att.uploaded_at), 'd MMM yyyy')}` : ''}
              {att.file_size ? ` · ${formatBytes(att.file_size)}` : ''}
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:text-primary" onClick={() => openAttachment(att)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          {canDelete && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={() => onDelete(att)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}

      {/* Small attach button when slot is compact (inline in payment row) */}
      {showEmpty && false /* never shown here, handled by dashed zone */ && null}
    </div>
  );
}

/**
 * Compact inline attach button used inside payment rows.
 * Shows "+ Attach slip" when no attachment, or filename + view/delete when attached.
 */
export function CompactAttachSlot({ attachments = [], onAdd, onDelete, cpvRef }) {
  const { role } = useRole();
  const canDelete = role === 'admin' || role === 'supervisor';
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    if (!isAcceptedFile(file)) {
      setError('Only PDF or image files are accepted (PDF, JPG, PNG, HEIC).');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }
    setUploading(true);
    try {
      await onAdd({
        file,
        file_name: file.name,
        original_filename: file.name,
        file_size: file.size,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'Demo Admin',
      });
      e.target.value = '';
    } catch (err) {
      setError(err?.message || 'Upload failed. This demo only accepts safe local test files.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-1 space-y-1">
      <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,.heic" className="hidden" onChange={handleFile} />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {attachments.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5 transition-colors"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? 'Uploading...' : '+ Attach slip'}
        </button>
      ) : (
        attachments.map(att => (
          <div key={att.id} className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded px-2 py-1">
            <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]">{att.file_name}</span>
            <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0 text-primary" onClick={() => openAttachment(att)}>
              <Eye className="w-3 h-3" />
            </Button>
            {canDelete && (
              <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => onDelete(att)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function AttachmentIndicator({ count = 0 }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-primary ml-1" title={`${count} attachment${count > 1 ? 's' : ''}`}>
      <Paperclip className="w-3 h-3" />
      <span className="text-[10px] font-medium">{count}</span>
    </span>
  );
}

export function parseAttachments(jsonStr) {
  if (!jsonStr) return [];
  try { return JSON.parse(jsonStr) || []; } catch { return []; }
}
