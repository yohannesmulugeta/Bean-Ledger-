import { jsPDF } from 'jspdf';

export const GENERATED_DOCUMENTS = [
  ['commercial_invoice', 'Commercial Invoice'],
  ['packing_list', 'Packing List'],
  ['shipping_instruction', 'Shipping Instruction'],
  ['bag_marks', 'Bag Marks'],
  ['certificate_quantity', 'Certificate of Quantity'],
  ['certificate_weight', 'Certificate of Weight'],
  ['certificate_quality', 'Certificate of Quality'],
  ['vgm_declaration', 'VGM Declaration'],
  ['shipment_checklist', 'Shipment Checklist'],
].map(([key, label]) => ({ key, label }));

export const EXTERNAL_DOCUMENTS = [
  { key: 'bill_of_lading', label: 'Bill of Lading', required: true },
  { key: 'phytosanitary', label: 'Phytosanitary Certificate', required: true },
  { key: 'ico_coo', label: 'ICO Certificate of Origin', required: true },
  { key: 'bank_permit', label: 'Bank Permit', required: true },
  { key: 'fumigation', label: 'Fumigation Certificate' },
  { key: 'buyer_approval', label: 'Buyer Inspection Approval' },
  { key: 'booking_confirmation', label: 'Booking Confirmation' },
];

const EMPTY_SHIPMENT = {
  consignee: '',
  lc_reference: '',
  port_of_loading: '',
  port_of_discharge: '',
  shipping_line: '',
  booking_number: '',
  vessel: '',
  voyage: '',
  shipment_date: '',
  containers: [],
};

export function parseShipmentDetails(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return { ...EMPTY_SHIPMENT, ...(parsed && typeof parsed === 'object' ? parsed : {}), containers: Array.isArray(parsed?.containers) ? parsed.containers : [] };
  } catch {
    return { ...EMPTY_SHIPMENT };
  }
}

const total = (rows, key) => rows.reduce((sum, row) => sum + Number(row[key] || 0), 0);
const same = (a, b) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.01;
const number = value => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function getShipmentChecks(contract, value) {
  const shipment = parseShipmentDetails(value);
  const containers = shipment.containers;
  const bags = total(containers, 'bags');
  const netKg = total(containers, 'net_kg');
  const expectedKg = Number(contract.actual_shipped_kg ?? contract.export_kg ?? 0);

  return [
    { key: 'route', label: 'Loading and discharge ports entered', ok: Boolean(shipment.port_of_loading && shipment.port_of_discharge) },
    { key: 'containers', label: 'At least one container entered', ok: containers.length > 0 },
    { key: 'references', label: 'Every container has container and seal numbers', ok: containers.length > 0 && containers.every(row => row.container_number && row.seal_number) },
    { key: 'bags', label: `Container bags equal contract bags (${number(bags)} / ${number(contract.export_bags)})`, ok: containers.length > 0 && same(bags, contract.export_bags) },
    { key: 'net', label: `Container net weight equals shipped weight (${number(netKg)} / ${number(expectedKg)} kg)`, ok: containers.length > 0 && same(netKg, expectedKg) },
    { key: 'weights', label: 'Gross weight is present and not below net weight', ok: containers.length > 0 && containers.every(row => Number(row.gross_kg) >= Number(row.net_kg) && Number(row.gross_kg) > 0) },
  ];
}

export function getMissingRequiredUploads(attachments = []) {
  return EXTERNAL_DOCUMENTS.filter(doc => doc.required && !attachments.some(item => !item.archived_at && item.section_ref === doc.key));
}

export function getMissingShipmentFields(contract, value) {
  const shipment = parseShipmentDetails(value);
  return [
    ['consignee', 'Consignee', shipment.consignee || contract.buyer_name],
    ['shipment_date', 'Shipment date', shipment.shipment_date],
    ['port_of_loading', 'Port of loading', shipment.port_of_loading],
    ['port_of_discharge', 'Port of discharge', shipment.port_of_discharge],
    ['shipping_line', 'Shipping line', shipment.shipping_line],
    ['booking_number', 'Booking number', shipment.booking_number],
    ['vessel', 'Vessel', shipment.vessel],
    ['voyage', 'Voyage', shipment.voyage],
  ].filter(([, , fieldValue]) => !String(fieldValue || '').trim())
    .map(([key, label]) => ({ key, label }));
}

function commonRows(contract, shipment) {
  return [
    ['Contract', contract.contract_no],
    ['Buyer', contract.buyer_name],
    ['Consignee', shipment.consignee || contract.buyer_name],
    ['L/C Reference', shipment.lc_reference],
    ['Coffee', [contract.coffee_type, contract.coffee_grade].filter(Boolean).join(' - ')],
    ['Destination', contract.destination_country],
    ['Route', [shipment.port_of_loading, shipment.port_of_discharge].filter(Boolean).join(' to ')],
    ['Vessel / Voyage', [shipment.vessel, shipment.voyage].filter(Boolean).join(' / ')],
    ['Booking', [shipment.shipping_line, shipment.booking_number].filter(Boolean).join(' / ')],
    ['Shipment Date', shipment.shipment_date],
  ];
}

export function downloadExportDocument(kind, contract, value, attachments = [], preview = false) {
  const shipment = parseShipmentDetails(value);
  const definition = GENERATED_DOCUMENTS.find(doc => doc.key === kind);
  if (!definition) throw new Error('Unknown export document');

  const pdf = new jsPDF();
  let y = 18;
  const line = (label, value = '') => {
    if (y > 278) { pdf.addPage(); y = 18; }
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, 14, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(value || '-'), 62, y, { maxWidth: 132 });
    y += 7;
  };

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(definition.label, 14, y);
  y += 5;
  pdf.setDrawColor(30, 90, 60);
  pdf.line(14, y, 196, y);
  y += 9;
  pdf.setFontSize(10);
  commonRows(contract, shipment).forEach(([label, value]) => line(label, value));

  if (kind === 'commercial_invoice') {
    line('Bags', number(contract.export_bags));
    line('Net Weight', `${number(contract.actual_shipped_kg ?? contract.export_kg)} kg`);
    line('Unit Price', contract.pricing_method === 'per_kg' ? `$${number(contract.price_per_kg_usd)} / kg` : `$${number(contract.price_per_lb_usd)} / lb`);
    line('Invoice Value', `$${number(contract.total_export_value_usd)}`);
    line('Payment Terms', contract.payment_terms);
  } else if (kind === 'packing_list' || kind === 'vgm_declaration') {
    line('Total Bags', number(total(shipment.containers, 'bags')));
    line('Total Net Weight', `${number(total(shipment.containers, 'net_kg'))} kg`);
    line('Total Gross Weight', `${number(total(shipment.containers, 'gross_kg'))} kg`);
    shipment.containers.forEach((row, index) => line(`Container ${index + 1}`, `${row.container_number || '-'} | Seal ${row.seal_number || '-'} | ${number(row.bags)} bags | ${number(row.net_kg)} / ${number(row.gross_kg)} kg`));
  } else if (kind === 'bag_marks') {
    line('Bag Mark', [contract.contract_no, contract.coffee_type, contract.coffee_grade, contract.destination_country].filter(Boolean).join(' / '));
    line('Bag Count', number(contract.export_bags));
  } else if (kind === 'certificate_quantity') {
    line('Certified Quantity', `${number(contract.export_bags)} bags`);
  } else if (kind === 'certificate_weight') {
    line('Certified Net Weight', `${number(contract.actual_shipped_kg ?? contract.export_kg)} kg`);
    line('Certified Gross Weight', `${number(total(shipment.containers, 'gross_kg'))} kg`);
  } else if (kind === 'certificate_quality') {
    line('Origin', 'Ethiopia');
    line('Coffee Type', contract.coffee_type);
    line('Grade', contract.coffee_grade);
    line('Certificate Number', contract.certificate_no);
  } else if (kind === 'shipment_checklist') {
    getShipmentChecks(contract, shipment).forEach(check => line(check.ok ? '[OK]' : '[MISSING]', check.label));
    EXTERNAL_DOCUMENTS.forEach(doc => line(attachments.some(item => !item.archived_at && item.section_ref === doc.key) ? '[UPLOADED]' : '[MISSING]', `${doc.label}${doc.required ? ' (required)' : ''}`));
  }

  y += 4;
  pdf.setFont('helvetica', 'italic');
  pdf.text('Generated by Bean Ledger. Review and approve before external use.', 14, Math.min(y, 285));
  const filename = `${contract.contract_no || 'export'}-${kind.replaceAll('_', '-')}.pdf`;
  if (preview) {
    window.open(pdf.output('bloburl'), '_blank', 'noopener,noreferrer');
  } else {
    pdf.save(filename);
  }
  return filename;
}
