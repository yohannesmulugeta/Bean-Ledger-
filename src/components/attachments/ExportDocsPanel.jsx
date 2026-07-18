// @ts-nocheck
import React, { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Eye, FileX, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { attachmentService } from '@/services/attachmentService';
import { exportService } from '@/services/exportService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRole } from '@/lib/role-hooks';
import {
  downloadExportDocument,
  EXTERNAL_DOCUMENTS,
  GENERATED_DOCUMENTS,
  getMissingRequiredUploads,
  getMissingShipmentFields,
  getShipmentChecks,
  parseShipmentDetails,
} from '@/lib/exportDocuments';

const MAX_SIZE_MB = 10;
const EMPTY_CONTAINER = { container_number: '', seal_number: '', bags: '', net_kg: '', gross_kg: '' };
const CORE_GENERATED_KEYS = new Set(['commercial_invoice', 'packing_list', 'shipping_instruction', 'shipment_checklist']);
const CONTAINER_FIELDS = [
  { key: 'container_number', label: 'Container' },
  { key: 'seal_number', label: 'Seal' },
  { key: 'bags', label: 'Bags', type: 'number', min: '0', step: '1' },
  { key: 'net_kg', label: 'Net kg', type: 'number', min: '0', step: '0.01' },
  { key: 'gross_kg', label: 'Gross kg', type: 'number', min: '0', step: '0.01' },
];

function Field({ label, ...props }) {
  const id = useId();
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} {...props} /></div>;
}

function DocRow({ doc, attachment, onUpload, onView, onDelete, uploading, error }) {
  const { role } = useRole();
  const inputRef = useRef(null);

  return (
    <div className={`flex min-h-16 flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center ${attachment ? 'border-green-200 bg-green-50/40' : 'border-border'}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {attachment ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" /> : <FileX className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
        <div className="min-w-0">
          <p className="text-sm font-medium">{doc.label} <span className="text-[10px] font-normal text-muted-foreground">{doc.required ? 'Required' : 'Optional'}</span></p>
          <p className="truncate text-[10px] text-muted-foreground">
            {attachment ? `${attachment.file_name} · ${attachment.uploaded_by} · ${attachment.created_date ? format(new Date(attachment.created_date), 'd MMM yyyy') : ''}` : 'Not uploaded'}
          </p>
          {error && <p className="mt-0.5 text-[10px] text-destructive">{error}</p>}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {attachment ? (
          <>
            <Button type="button" size="icon" variant="outline" className="h-8 w-8" title="View document" onClick={() => onView(attachment)}>
              <Eye className="h-3.5 w-3.5" /><span className="sr-only">View document</span>
            </Button>
            {(role === 'admin' || role === 'supervisor') && (
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete document" onClick={() => onDelete(attachment)}>
                <Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Delete document</span>
              </Button>
            )}
          </>
        ) : (
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading' : 'Upload'}
          </Button>
        )}
        <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic,.heic" className="hidden" onChange={onUpload} />
      </div>
    </div>
  );
}

export default function ExportDocsPanel({ contract }) {
  const qc = useQueryClient();
  const [shipment, setShipment] = useState(() => {
    const parsed = parseShipmentDetails(contract.shipment_details);
    return parsed.consignee || !contract.buyer_name ? parsed : { ...parsed, consignee: contract.buyer_name };
  });
  const [uploadingKey, setUploadingKey] = useState(null);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');

  useEffect(() => {
    const warn = event => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', 'export_contract', contract.id],
    queryFn: () => attachmentService.listForEntity('export_contract', contract.id),
    enabled: Boolean(contract.id),
  });

  const saveMut = useMutation({
    mutationFn: () => exportService.updateShipmentDetails(contract.id, shipment),
    onSuccess: updated => {
      setShipment(parseShipmentDetails(updated.shipment_details));
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['export-contracts'] });
    },
  });
  const createMut = useMutation({
    mutationFn: ({ file, metadata }) => attachmentService.uploadForEntity('export_contract', contract.id, file, metadata),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', 'export_contract', contract.id] }),
  });
  const deleteMut = useMutation({
    mutationFn: id => attachmentService.archiveAttachment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', 'export_contract', contract.id] }),
  });

  const setField = (key, value) => { setDirty(true); setShipment(current => ({ ...current, [key]: value })); };
  const setContainer = (index, key, value) => {
    setDirty(true);
    setShipment(current => ({ ...current, containers: current.containers.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row) }));
  };
  const addContainer = () => { setDirty(true); setShipment(current => ({ ...current, containers: [...current.containers, { ...EMPTY_CONTAINER }] })); };
  const removeContainer = index => { setDirty(true); setShipment(current => ({ ...current, containers: current.containers.filter((_, rowIndex) => rowIndex !== index) })); };

  const handleUpload = docKey => async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrors(current => ({ ...current, [docKey]: '' }));
    const accepted = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    const validExtension = ['.pdf', '.jpg', '.jpeg', '.png', '.heic'].some(extension => file.name.toLowerCase().endsWith(extension));
    if (!accepted.includes(file.type) && !validExtension) {
      setErrors(current => ({ ...current, [docKey]: 'Only PDF, JPG, PNG, or HEIC files are accepted.' }));
      event.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrors(current => ({ ...current, [docKey]: `File exceeds ${MAX_SIZE_MB}MB limit.` }));
      event.target.value = '';
      return;
    }
    setUploadingKey(docKey);
    try {
      await createMut.mutateAsync({
        file,
        metadata: {
          section: 'export_doc', section_ref: docKey, original_filename: file.name,
          file_name: file.name, file_size_bytes: file.size, mime_type: file.type,
          uploaded_by: 'Demo Admin', description: `Demo export document for ${contract.contract_no || contract.id}`,
        },
      });
      event.target.value = '';
    } catch (error) {
      setErrors(current => ({ ...current, [docKey]: error?.message || 'Upload failed.' }));
    } finally {
      setUploadingKey(null);
    }
  };

  const handleView = docKey => async attachment => {
    const preview = window.open('', '_blank');
    try {
      const url = await attachmentService.getSignedUrl(attachment.id);
      if (preview) preview.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      preview?.close();
      setErrors(current => ({ ...current, [docKey]: error?.message || 'Could not open document.' }));
    }
  };

  const checks = getShipmentChecks(contract, shipment);
  const failedChecks = checks.filter(check => !check.ok);
  const missingFields = getMissingShipmentFields(contract, shipment);
  const missingUploads = getMissingRequiredUploads(attachments);
  const ready = missingFields.length === 0 && failedChecks.length === 0 && missingUploads.length === 0;
  const generationReady = missingFields.length === 0 && failedChecks.length === 0;
  const blockers = missingFields.length + failedChecks.length + missingUploads.length;
  const coreDocuments = GENERATED_DOCUMENTS.filter(doc => CORE_GENERATED_KEYS.has(doc.key));
  const otherDocuments = GENERATED_DOCUMENTS.filter(doc => !CORE_GENERATED_KEYS.has(doc.key));

  const handleGenerate = doc => {
    if (doc.key !== 'shipment_checklist' && !generationReady) {
      setGenerationMessage(`Complete ${missingFields.length} required field${missingFields.length === 1 ? '' : 's'} and resolve ${failedChecks.length} discrepancy check${failedChecks.length === 1 ? '' : 's'} first.`);
      return;
    }
    try {
      downloadExportDocument(doc.key, contract, shipment, attachments, true);
      setGenerationMessage(`${doc.label} preview opened in a new tab.`);
    } catch (error) {
      setGenerationMessage(error?.message || 'Document preview failed.');
    }
  };

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h4 className="text-sm font-semibold">Shipment Documents</h4>
          <p className="text-xs text-muted-foreground">Contract {contract.contract_no}</p>
        </div>
        <span aria-live="polite" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ready ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {ready ? 'Ready for final review' : `${blockers} blocker${blockers === 1 ? '' : 's'}`}
        </span>
      </div>
      {!ready && (
        <p className="text-xs text-muted-foreground">
          {missingFields.length} required field{missingFields.length === 1 ? '' : 's'} missing, {failedChecks.length} discrepancy check{failedChecks.length === 1 ? '' : 's'} unresolved, and {missingUploads.length} required document{missingUploads.length === 1 ? '' : 's'} missing.
        </p>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold">Shipment Data</h5>
          {dirty ? (
            <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save
            </Button>
          ) : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Saved</span>}
        </div>
        {saveMut.error && <p className="text-xs text-destructive">{saveMut.error.message}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Consignee" value={shipment.consignee} onChange={event => setField('consignee', event.target.value)} />
          <Field label="L/C Reference" value={shipment.lc_reference} onChange={event => setField('lc_reference', event.target.value)} />
          <Field label="Shipment Date" type="date" value={shipment.shipment_date} onChange={event => setField('shipment_date', event.target.value)} />
          <Field label="Port of Loading" value={shipment.port_of_loading} onChange={event => setField('port_of_loading', event.target.value)} />
          <Field label="Port of Discharge" value={shipment.port_of_discharge} onChange={event => setField('port_of_discharge', event.target.value)} />
          <Field label="Shipping Line" value={shipment.shipping_line} onChange={event => setField('shipping_line', event.target.value)} />
          <Field label="Booking Number" value={shipment.booking_number} onChange={event => setField('booking_number', event.target.value)} />
          <Field label="Vessel" value={shipment.vessel} onChange={event => setField('vessel', event.target.value)} />
          <Field label="Voyage" value={shipment.voyage} onChange={event => setField('voyage', event.target.value)} />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <h6 className="text-xs font-semibold uppercase text-muted-foreground">Containers</h6>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={addContainer}><Plus className="h-3.5 w-3.5" />Add</Button>
        </div>
        <div className="space-y-2">
            <div className="hidden grid-cols-[1.4fr_1.2fr_.7fr_1fr_1fr_36px] gap-2 px-1 text-[10px] font-semibold uppercase text-muted-foreground sm:grid">
              <span>Container</span><span>Seal</span><span>Bags</span><span>Net kg</span><span>Gross kg</span><span />
            </div>
            {shipment.containers.map((row, index) => (
              <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-[1.4fr_1.2fr_.7fr_1fr_1fr_36px]">
                {CONTAINER_FIELDS.map(field => {
                  const id = `export-container-${index}-${field.key}`;
                  return (
                    <div key={field.key} className="space-y-1 sm:space-y-0">
                      <Label htmlFor={id} className="text-[10px] text-muted-foreground sm:sr-only">{field.label}</Label>
                      <Input id={id} placeholder={field.label} type={field.type} min={field.min} step={field.step} value={row[field.key]} onChange={event => setContainer(index, field.key, event.target.value)} />
                    </div>
                  );
                })}
                <Button type="button" size="icon" variant="ghost" className="h-10 w-9 justify-self-end text-muted-foreground sm:justify-self-auto" title="Remove container" onClick={() => removeContainer(index)}><X className="h-4 w-4" /><span className="sr-only">Remove container</span></Button>
              </div>
            ))}
            {shipment.containers.length === 0 && <p className="py-2 text-xs text-muted-foreground">No containers entered.</p>}
        </div>
      </section>

      <section className="space-y-3 border-t pt-5">
        <h5 className="text-sm font-semibold">Discrepancy Check</h5>
        <div className="grid gap-2 sm:grid-cols-2">
          {checks.map(check => (
            <div key={check.key} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${check.ok ? 'border-green-200 text-green-800' : 'border-amber-200 text-amber-800'}`}>
              {check.ok ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
              <span><span className="sr-only">{check.ok ? 'Pass' : 'Needs attention'}: </span>{check.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t pt-5">
        <h5 className="text-sm font-semibold">Generated Documents</h5>
        {!generationReady && <p className="text-xs text-amber-700">Complete shipment fields and discrepancy checks before previewing final documents. The shipment checklist remains available.</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {coreDocuments.map(doc => (
            <Button key={doc.key} type="button" variant="outline" className="h-10 justify-start gap-2 text-xs" title={`Preview ${doc.label}`} onClick={() => handleGenerate(doc)} disabled={doc.key !== 'shipment_checklist' && !generationReady}>
              <Eye className="h-3.5 w-3.5" />{doc.label}
            </Button>
          ))}
        </div>
        <details className="text-xs">
          <summary className="w-fit cursor-pointer font-medium text-primary">More documents ({otherDocuments.length})</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {otherDocuments.map(doc => (
              <Button key={doc.key} type="button" variant="outline" className="h-10 justify-start gap-2 text-xs" title={`Preview ${doc.label}`} onClick={() => handleGenerate(doc)} disabled={!generationReady}>
                <Eye className="h-3.5 w-3.5" />{doc.label}
              </Button>
            ))}
          </div>
        </details>
        {generationMessage && <p aria-live="polite" className="text-xs text-muted-foreground">{generationMessage}</p>}
      </section>

      <section className="space-y-3 border-t pt-5">
        <div className="flex items-center justify-between gap-3">
          <h5 className="text-sm font-semibold">External Documents</h5>
          <span className="text-xs text-muted-foreground">{missingUploads.length} required missing</span>
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          {EXTERNAL_DOCUMENTS.map(doc => (
            <DocRow key={doc.key} doc={doc} attachment={attachments.find(item => item.section_ref === doc.key)} onUpload={handleUpload(doc.key)} onView={handleView(doc.key)} onDelete={attachment => deleteMut.mutate(attachment.id)} uploading={uploadingKey === doc.key} error={errors[doc.key]} />
          ))}
        </div>
      </section>
    </div>
  );
}

export { EXTERNAL_DOCUMENTS as EXPORT_DOCS };
