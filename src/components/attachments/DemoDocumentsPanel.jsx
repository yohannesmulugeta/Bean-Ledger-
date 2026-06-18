// @ts-nocheck
import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react';
import { attachmentService } from '@/services/attachmentService';
import { AttachmentSlot } from './FileAttachments';
import { Button } from '@/components/ui/button';

export default function DemoDocumentsPanel({
  entityType,
  entityId,
  section = 'document',
  sectionRef = 'general',
  title = 'Documents',
  description = 'Attach demo-only supporting documents',
}) {
  const queryClient = useQueryClient();
  const queryKey = ['attachments', entityType, entityId];
  const { data: attachments = [] } = useQuery({
    queryKey,
    queryFn: () => attachmentService.listForEntity(entityType, entityId, { includeArchived: true }),
    enabled: Boolean(entityId),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, metadata }) => attachmentService.uploadForEntity(entityType, entityId, file, metadata),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const archiveMutation = useMutation({
    mutationFn: id => attachmentService.archiveAttachment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const restoreMutation = useMutation({
    mutationFn: id => attachmentService.restoreAttachment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const activeAttachments = attachments.filter((item) => !item.archived_at);
  const archivedAttachments = attachments.filter((item) => item.archived_at);

  const handleAdd = (att) => uploadMutation.mutate({
    file: att.file,
    metadata: {
      ...att,
      section,
      section_ref: sectionRef,
      description,
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Demo documents only. Do not upload real customer files in this migration phase.
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-2 mb-3">
          <div className="mt-0.5 h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <AttachmentSlot
          label=""
          emptyLabel="Upload demo document"
          subtext="PDF, JPG, PNG, TXT · Max 10 MB"
          attachments={activeAttachments}
          onAdd={handleAdd}
          onDelete={(att) => archiveMutation.mutate(att.id)}
          allowMultiple
          accept="application/pdf,text/plain,image/jpeg,image/jpg,image/png,image/heic,.txt,.pdf,.jpg,.jpeg,.png,.heic"
        />
      </div>
      {archivedAttachments.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-xs font-semibold text-foreground mb-2">Archived demo documents</p>
          <div className="space-y-2">
            {archivedAttachments.map((att) => (
              <div key={att.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{att.file_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{att.description || 'Archived demo document'}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(att.id)}>
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
