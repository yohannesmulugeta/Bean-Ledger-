import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Eye, Trash2, CheckCircle2, Loader2, FileX } from 'lucide-react';
import { format } from 'date-fns';
import { useRole } from '@/lib/role-hooks';

const MAX_SIZE_MB = 10;

const EXPORT_DOCS = [
  { key: 'clu_quality', label: 'CLU Quality Certificate' },
  { key: 'phytosanitary', label: 'Phytosanitary Certificate' },
  { key: 'ico_coo', label: 'ICO Certificate of Origin' },
  { key: 'chamber_commerce', label: 'Chamber of Commerce Certificate' },
  { key: 'commercial_invoice', label: 'Commercial Invoice' },
  { key: 'packing_list', label: 'Packing List' },
  { key: 'bill_of_lading', label: 'Bill of Lading' },
  { key: 'customs_declaration', label: 'Customs Declaration' },
  { key: 'bank_permit', label: 'Bank Permit' },
];

function DocRow({ doc, attachment, onUpload, onDelete, uploading, error }) {
  const { role } = useRole();
  const canDelete = role === 'admin' || role === 'supervisor';
  const inputRef = useRef(null);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border ${attachment ? 'border-green-200 bg-green-50/40' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {attachment ? (
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
        ) : (
          <FileX className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{doc.label}</p>
          {attachment ? (
            <p className="text-[10px] text-muted-foreground truncate">
              {attachment.file_name} · {attachment.uploaded_by} · {attachment.created_date ? format(new Date(attachment.created_date), 'd MMM yyyy') : ''}
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">Not uploaded</p>
          )}
          {error && <p className="text-[10px] text-destructive mt-0.5">{error}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {attachment ? (
          <>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Uploaded</span>
            <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <Eye className="w-3.5 h-3.5" /> View
              </Button>
            </a>
            {canDelete && (
              <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(attachment)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </>
        ) : (
          <>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Not Uploaded</span>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </>
        )}
        <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,.heic" className="hidden" onChange={onUpload} />
      </div>
    </div>
  );
}

export default function ExportDocsPanel({ contract }) {
  const qc = useQueryClient();
  const [uploadingKey, setUploadingKey] = useState(null);
  const [errors, setErrors] = useState({});

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', 'export_contract', contract.id],
    queryFn: () => base44.entities.Attachment.filter({ entity_type: 'export_contract', entity_id: contract.id }),
    enabled: !!contract.id,
  });

  const createMut = useMutation({
    mutationFn: data => base44.entities.Attachment.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', 'export_contract', contract.id] }),
  });
  const deleteMut = useMutation({
    mutationFn: id => base44.entities.Attachment.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', 'export_contract', contract.id] }),
  });

  const handleUpload = (docKey) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrors(prev => ({ ...prev, [docKey]: '' }));
    const accepted = ['application/pdf','image/jpeg','image/jpg','image/png','image/heic'];
    const name = file.name.toLowerCase();
    const okExt = ['.pdf','.jpg','.jpeg','.png','.heic'].some(e => name.endsWith(e));
    if (!accepted.includes(file.type) && !okExt) {
      setErrors(prev => ({ ...prev, [docKey]: 'Only PDF or image files are accepted (PDF, JPG, PNG, HEIC).' }));
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [docKey]: `File exceeds ${MAX_SIZE_MB}MB limit.` }));
      return;
    }
    setUploadingKey(docKey);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const user = await base44.auth.me();
    await createMut.mutateAsync({
      entity_type: 'export_contract',
      entity_id: contract.id,
      section: 'export_doc',
      section_ref: docKey,
      file_url,
      file_name: file.name,
      uploaded_by: user?.full_name || user?.email || 'Unknown',
    });
    setUploadingKey(null);
    e.target.value = '';
  };

  const handleDelete = (att) => deleteMut.mutate(att.id);

  const uploadedCount = EXPORT_DOCS.filter(d => attachments.some(a => a.section_ref === d.key)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Export Documents Checklist</h4>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${uploadedCount === EXPORT_DOCS.length ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {uploadedCount}/{EXPORT_DOCS.length} uploaded
        </span>
      </div>
      <div className="space-y-2">
        {EXPORT_DOCS.map(doc => {
          const att = attachments.find(a => a.section_ref === doc.key);
          return (
            <DocRow
              key={doc.key}
              doc={doc}
              attachment={att}
              onUpload={handleUpload(doc.key)}
              onDelete={handleDelete}
              uploading={uploadingKey === doc.key}
              error={errors[doc.key]}
            />
          );
        })}
      </div>
    </div>
  );
}

export { EXPORT_DOCS };