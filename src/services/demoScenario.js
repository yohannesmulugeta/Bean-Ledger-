import { calculatePurchaseTotals } from '../lib/purchaseCalculations.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const PROFILE_EMAIL = 'demo-admin@beanledger.local';
const PROFILE_NAME = 'Selamawit Bekele';

export const DEMO_DATA_VERSION = 'beanledger-showcase-2026-07-v1';
export const DEMO_META = {
  organizationId: ORGANIZATION_ID,
  profileId: PROFILE_ID,
  profileEmail: PROFILE_EMAIL,
  companyName: 'BeanLedger Export PLC',
  datasetVersion: DEMO_DATA_VERSION,
  label: 'Demo Environment',
};

const supplierDefinitions = [
  ['Kercha Highlands Washing Station', 'Guji', 'Guji', 'Washed Guji', 'Hana Tadesse', 'Kercha Highlands Station'],
  ['Aleta Wondo Coffee Growers Union', 'Sidama', 'Sidama', 'Natural Sidama', 'Samuel Desta', 'Aleta Wondo Collection Center'],
  ['Bule Gedeo Producers Cooperative', 'Gedeo', 'Yirgacheffe', 'Washed Yirgacheffe', 'Marta Alemu', 'Bule Wet Mill'],
  ['Limu Kosa Forest Coffee Estate', 'Jimma', 'Limmu', 'Washed Limmu', 'Yonas Kebede', 'Limu Kosa Estate'],
  ['Nole Kaba Coffee Cooperative', 'Wollega', 'Wollega', 'Unwashed Lekempti', 'Abel Girma', 'Nole Kaba Dry Mill'],
  ['Bonga Canopy Coffee Estate', 'Kaffa', 'Kaffa', 'Natural Kaffa', 'Hana Tadesse', 'Bonga Forest Station'],
  ['Goma Highland Washing Station', 'Jimma', 'Jimma', 'Washed Jimma', 'Samuel Desta', 'Goma Central Mill'],
  ['Gursum Highland Coffee PLC', 'Harrar', 'Harar', 'Natural Harar', 'Liya Assefa', 'Gursum Drying Station'],
  ['Bench Maji Coffee Producers Union', 'Bench Sheko', 'Bench Maji', 'Natural Bench Maji', 'Yonas Kebede', 'Mizan Collection Center'],
  ['Bale Mountain Coffee Estate', 'Bale', 'Bale', 'Natural Bale', 'Abel Girma', 'Delo Mena Estate'],
  ['Shakiso Sunrise Coffee Farm', 'Guji', 'Shakiso', 'Natural Guji', 'Hana Tadesse', 'Shakiso Sunrise Station'],
  ['Dale River Coffee Cooperative', 'Sidama', 'Dale', 'Washed Sidama', 'Samuel Desta', 'Dale River Wet Mill'],
];

const buyers = [
  ['Nordhavn Coffee Trading AB', 'Sweden'],
  ['Rheinland Specialty Imports GmbH', 'Germany'],
  ['Harbor Roast Trading BV', 'Netherlands'],
  ['Sakura Origin Coffee Co.', 'Japan'],
  ['Pacific Crest Coffee LLC', 'United States'],
  ['Southern Cross Green Coffee Pty', 'Australia'],
];

const banks = ['Meridian Commercial Bank', 'Rift Valley Bank', 'Blue Nile International Bank'];
const warehouses = ['Addis Central Coffee Warehouse', 'Gelan Export Warehouse', 'Kaliti Bonded Coffee Store'];
const registrars = ['Mekdes Tadesse', 'Nahom Tesfaye', 'Ruth Daniel'];
const costNames = ['Inbound transport', 'Loading and handling', 'Quality certification'];

function uuid(group, index) {
  return `${group.toString(16).padStart(8, '0')}-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;
}

function isoDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function at(value, hour = 8) {
  return `${value}T${String(hour).padStart(2, '0')}:00:00Z`;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function purchaseDates() {
  const dates = [];
  [4, 13, 22].forEach((day) => {
    for (let month = 1; month <= 12; month++) dates.push(isoDate(2024, month, day));
  });
  dates.sort();
  [3, 10, 18, 25].forEach((day) => {
    for (let month = 1; month <= 12; month++) dates.push(isoDate(2025, month, day));
  });
  const currentDays = [3, 8, 13, 18, 23];
  for (let month = 1; month <= 6; month++) currentDays.forEach((day) => dates.push(isoDate(2026, month, day)));
  [2, 4, 6, 8, 10, 11].forEach((day) => dates.push(isoDate(2026, 7, day)));
  return dates.sort();
}

function buildScenario() {
  const suppliers = supplierDefinitions.map(([supplierName, region, origin, coffeeType, agent, stationName], index) => ({
    id: uuid(0x31000001, index + 1),
    organization_id: ORGANIZATION_ID,
    base44_id: null,
    is_demo: true,
    supplier_name: supplierName,
    region,
    agent,
    coffee_type: coffeeType,
    opening_stock_kg: 0,
    phone_number: `+251911${String(240100 + index).slice(-6)}`,
    coffee_origin: origin,
    station_name: stationName,
    agreement_date: isoDate(2024, 1, 1 + index),
    agreement_expiry_date: isoDate(2026, 12, 15 + (index % 12)),
    created_at: at(isoDate(2024, 1, 2), 8 + (index % 8)),
    updated_at: at(isoDate(2026, 1, 5), 8 + (index % 8)),
    archived_at: null,
  }));

  const purchases = [];
  const additionalCosts = [];
  const payments = [];
  const warehouseReceipts = [];
  const sampleLogs = [];
  const processingLogs = [];
  const outputReports = [];
  const stockMovements = [];
  const warehouseHistory = [];
  const bagReceipts = [];
  const archiveIndex = -1;

  purchaseDates().forEach((purchaseDate, index) => {
    const number = index + 1;
    const supplier = suppliers[index % suppliers.length];
    const year = Number(purchaseDate.slice(0, 4));
    const shortYear = String(year).slice(-2);
    const originCode = supplier.coffee_origin.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    const dispatchedKg = 850 + ((index * 7) % 15) * 85;
    const shortageKg = [0, 2, 4, 6, 8, 10][index % 6];
    const receivedKg = dispatchedKg - shortageKg;
    const unitPrice = (year === 2024 ? 5600 : year === 2025 ? 7200 : 8900) + (index % 8) * 125;
    const commissionPercent = [2, 2.5, 3, 3.5][index % 4];
    const isArchived = index === archiveIndex;
    const archivedAt = isArchived ? at(addDays(purchaseDate, 18), 14) : null;
    const purchase = {
      id: uuid(0x32000001, number),
      organization_id: ORGANIZATION_ID,
      supplier_id: supplier.id,
      base44_id: null,
      is_demo: true,
      coffee_code: `KKGT/${originCode}/${shortYear}/${String(number).padStart(3, '0')}`,
      purchase_date: purchaseDate,
      supplier_name: supplier.supplier_name,
      agent: supplier.agent,
      region: supplier.region,
      coffee_type: supplier.coffee_type,
      net_dispatch_weight_kg: dispatchedKg,
      warehouse_received_kg: receivedKg,
      unit_price_etb_per_feresula: unitPrice,
      commission_percent: commissionPercent,
      remark: isArchived ? 'Replaced after duplicate dispatch document review' : 'Approved seasonal coffee purchase',
      archive_reason: isArchived ? 'Duplicate dispatch document replaced by the confirmed lot record' : null,
      created_at: at(purchaseDate, 9),
      updated_at: archivedAt || at(purchaseDate, 9),
      archived_at: archivedAt,
    };
    purchases.push(purchase);

    const costCount = index < 60 ? 2 : 1;
    for (let costIndex = 0; costIndex < costCount; costIndex++) {
      additionalCosts.push({
        id: uuid(0x33000001, additionalCosts.length + 1),
        purchase_record_id: purchase.id,
        base44_id: null,
        is_demo: true,
        name: costNames[(index + costIndex) % costNames.length],
        amount_etb: 2800 + ((index * 1700 + costIndex * 900) % 8200),
        created_at: at(purchaseDate, 10),
        updated_at: at(purchaseDate, 10),
        archived_at: archivedAt,
      });
    }
    const purchaseCosts = additionalCosts.filter((row) => row.purchase_record_id === purchase.id);
    const totals = calculatePurchaseTotals({ ...purchase, additional_costs: purchaseCosts, payments: [] });
    const firstPayment = round2(totals.grand_total_etb * 0.6);
    [firstPayment, round2(totals.grand_total_etb - firstPayment)].forEach((amount, paymentIndex) => {
      payments.push({
        id: uuid(0x34000001, payments.length + 1),
        purchase_record_id: purchase.id,
        base44_id: null,
        is_demo: true,
        payment_no: paymentIndex + 1,
        payment_date: addDays(purchaseDate, 3 + paymentIndex * 4),
        amount_etb: amount,
        bank_name: banks[(index + paymentIndex) % banks.length],
        cpv_reference: `CPV-${year}-${String(index * 2 + paymentIndex + 1).padStart(4, '0')}`,
        recorded_by: PROFILE_EMAIL,
        created_at: at(addDays(purchaseDate, 3 + paymentIndex * 4), 11),
        updated_at: at(addDays(purchaseDate, 3 + paymentIndex * 4), 11),
        archived_at: archivedAt,
      });
    });

    const receivedDate = [addDays(purchaseDate, 1 + (index % 3)), '2026-07-18'].sort()[0];
    const receipt = {
      id: uuid(0x35000001, number),
      organization_id: ORGANIZATION_ID,
      purchase_record_id: purchase.id,
      supplier_id: supplier.id,
      base44_id: null,
      is_demo: true,
      receipt_number: `GRN-${year}-${String(number).padStart(4, '0')}`,
      coffee_code: purchase.coffee_code,
      supplier_name: supplier.supplier_name,
      received_date: receivedDate,
      dispatch_kg: dispatchedKg,
      received_kg: receivedKg,
      shortage_kg: shortageKg,
      warehouse_name: warehouses[index % warehouses.length],
      status: isArchived ? 'archived' : 'received',
      notes: isArchived ? 'Archived with the replaced dispatch document' : 'Weight verified and receipt approved',
      archive_reason: purchase.archive_reason,
      created_at: at(receivedDate, 8),
      updated_at: archivedAt || at(receivedDate, 8),
      archived_at: archivedAt,
    };
    warehouseReceipts.push(receipt);
    stockMovements.push({
      id: uuid(0x41000001, stockMovements.length + 1), organization_id: ORGANIZATION_ID,
      supplier_id: supplier.id, purchase_record_id: purchase.id, warehouse_receipt_id: receipt.id,
      source_type: 'warehouse_receipt', source_id: receipt.id, movement_type: 'warehouse_received',
      stock_pool: 'supplier_available', coffee_type: supplier.coffee_type, quantity_kg: receivedKg,
      occurred_at: at(receivedDate, 8), notes: 'Approved warehouse receipt', is_demo: true,
      created_at: at(receivedDate, 8), archived_at: archivedAt,
    });
    warehouseHistory.push({
      id: uuid(0x36000001, number), warehouse_receipt_id: receipt.id, organization_id: ORGANIZATION_ID,
      action_type: isArchived ? 'Archived' : 'Created', changes: { receipt_number: receipt.receipt_number, received_kg: receivedKg },
      reason: isArchived ? purchase.archive_reason : 'Warehouse receipt approved after weight verification',
      is_demo: true, created_at: archivedAt || at(receivedDate, 8),
    });

    const sampleDate = [addDays(receivedDate, 1), '2026-07-18'].sort()[0];
    const sampleKg = 3 + (index % 6);
    const sample = {
      id: uuid(0x37000001, number), organization_id: ORGANIZATION_ID, supplier_id: supplier.id,
      purchase_record_id: purchase.id, warehouse_receipt_id: receipt.id, base44_id: null, is_demo: true,
      sample_type: 'Warehouse', supplier_name: supplier.supplier_name, coffee_type: supplier.coffee_type,
      coffee_code: purchase.coffee_code, sample_date: sampleDate, sample_datetime: at(sampleDate, 9),
      sample_kg: sampleKg, company_recipient: 'BeanLedger Quality Laboratory', keeper_name: 'Daniel Worku',
      remark: 'Pre-processing quality assessment sample', archive_reason: purchase.archive_reason,
      created_at: at(sampleDate, 9), updated_at: archivedAt || at(sampleDate, 9), archived_at: archivedAt,
    };
    sampleLogs.push(sample);
    stockMovements.push({
      id: uuid(0x41000001, stockMovements.length + 1), organization_id: ORGANIZATION_ID,
      supplier_id: supplier.id, purchase_record_id: purchase.id, warehouse_receipt_id: receipt.id,
      source_type: 'sample_log', source_id: sample.id, movement_type: 'sample_deduction',
      stock_pool: 'supplier_available', coffee_type: supplier.coffee_type, quantity_kg: sampleKg,
      occurred_at: at(sampleDate, 9), notes: 'Quality laboratory sample', is_demo: true,
      created_at: at(sampleDate, 9), archived_at: archivedAt,
    });

    bagReceipts.push({
      id: uuid(0x51000001, number), organization_id: ORGANIZATION_ID, supplier_id: supplier.id,
      warehouse_receipt_id: receipt.id, base44_id: null, receipt_mode: 'agent', agent_name: supplier.agent,
      supplier_name: supplier.supplier_name, date: receivedDate, warehouse_received_kg: receivedKg,
      bags_received: Math.ceil(dispatchedKg / 85), source: 'warehouse', note: 'Bags received with coffee delivery',
      is_demo: true, created_at: at(receivedDate, 8), updated_at: archivedAt || at(receivedDate, 8), archived_at: archivedAt,
    });

    if (index % 10 < 7) {
      const processingDate = addDays(sampleDate, 2 + (index % 4));
      const actualKg = 425 + (index % 5) * 85;
      const processing = {
        id: uuid(0x38000001, processingLogs.length + 1), organization_id: ORGANIZATION_ID,
        supplier_id: supplier.id, purchase_record_id: purchase.id, warehouse_receipt_id: receipt.id,
        base44_id: null, is_demo: true, entry_type: 'Standard',
        entry_mode: index % 2 === 0 ? 'By Bags' : 'By KG', processing_date: processingDate, date: processingDate,
        supplier_name: supplier.supplier_name, coffee_type: supplier.coffee_type, coffee_code: purchase.coffee_code,
        bags_sent: index % 2 === 0 ? actualKg / 85 : null, kg_sent: index % 2 === 0 ? actualKg : null,
        actual_weighed_kg: actualKg, batch_variance_kg: 0,
        batch_no: `BAT-${year}-${String(processingLogs.length + 1).padStart(4, '0')}`,
        remark: 'Factory intake verified against warehouse dispatch', archive_reason: purchase.archive_reason,
        created_at: at(processingDate, 8), updated_at: archivedAt || at(processingDate, 8), archived_at: archivedAt,
      };
      processingLogs.push(processing);
      stockMovements.push({
        id: uuid(0x41000001, stockMovements.length + 1), organization_id: ORGANIZATION_ID,
        supplier_id: supplier.id, purchase_record_id: purchase.id, warehouse_receipt_id: receipt.id,
        source_type: 'processing_log', source_id: processing.id, movement_type: 'processing_deduction',
        stock_pool: 'supplier_available', coffee_type: supplier.coffee_type, quantity_kg: actualKg,
        occurred_at: at(processingDate, 8), notes: 'Coffee issued to processing', is_demo: true,
        created_at: at(processingDate, 8), archived_at: archivedAt,
      });

      const exportBags = Math.max(4, Math.floor((actualKg * 0.72) / 60));
      const rejectBags = actualKg >= 595 ? 1 : 0;
      const exportKg = exportBags * 60;
      const rejectKg = rejectBags * 85;
      const wasteKg = actualKg - exportKg - rejectKg;
      const outputDate = addDays(processingDate, 1);
      const output = {
        id: uuid(0x39000001, outputReports.length + 1), organization_id: ORGANIZATION_ID,
        processing_log_id: processing.id, supplier_id: supplier.id, base44_id: null, is_demo: true,
        entry_type: 'Standard', start_date: outputDate, end_date: outputDate, date: outputDate,
        supplier_name: supplier.supplier_name, coffee_type: supplier.coffee_type,
        total_kg_processed: actualKg, export_bags: exportBags, export_kg: exportKg,
        reject_bags: rejectBags, reject_kg: rejectKg, waste_kg: wasteKg,
        reject_pct: round2((rejectKg / actualKg) * 100), waste_pct: round2((wasteKg / actualKg) * 100),
        total_lb: round2(exportKg * 2.2046), export_status: 'Available for Export', registrar_name: registrars[index % registrars.length],
        remark: 'Processing output reconciled to factory intake', archive_reason: purchase.archive_reason,
        created_at: at(outputDate, 15), updated_at: archivedAt || at(outputDate, 15), archived_at: archivedAt,
      };
      outputReports.push(output);
      [['output_export', 'export_available', exportKg], ['output_reject', 'reject_available', rejectKg]].forEach(([movementType, pool, quantity]) => {
        if (!quantity) return;
        stockMovements.push({
          id: uuid(0x41000001, stockMovements.length + 1), organization_id: ORGANIZATION_ID,
          supplier_id: supplier.id, purchase_record_id: purchase.id, warehouse_receipt_id: receipt.id,
          source_type: 'output_report', source_id: output.id, movement_type: movementType,
          stock_pool: pool, coffee_type: supplier.coffee_type, quantity_kg: quantity,
          occurred_at: at(outputDate, 15), notes: movementType === 'output_export' ? 'Fresh export output' : 'Processing reject output',
          is_demo: true, created_at: at(outputDate, 15), archived_at: archivedAt,
        });
      });
    }
  });

  const exportContracts = [];
  const exportContractCosts = [];
  const exportContractMaterials = [];
  const exportContractPayments = [];
  const buyerInspections = [];
  const contractOutputs = Array.from({ length: 18 }, (_, index) => outputReports[index * 4]);
  contractOutputs.forEach((output, index) => {
    const number = index + 1;
    const supplier = suppliers.find((row) => row.id === output.supplier_id);
    const [buyerName, destinationCountry] = buyers[index % buyers.length];
    const contractDate = addDays(output.date, 4);
    const year = Number(contractDate.slice(0, 4));
    const exportBags = Math.max(2, Math.floor(output.export_bags * 0.6));
    const exportKg = exportBags * 60;
    const pricePerLb = round2(3.05 + (index % 6) * 0.18);
    const rate = year === 2024 ? 58 : year === 2025 ? 125 : 155;
    const totalLb = round2(exportKg * 2.2046);
    const revenueUsd = round2(totalLb * pricePerLb);
    const revenueEtb = round2(revenueUsd * rate);
    const freight = round2(revenueEtb * 0.2);
    const documentation = round2(revenueEtb * 0.08);
    const materialsEtb = round2(exportBags * 620);
    const totalCostsEtb = round2(freight + documentation);
    const profitEtb = round2(revenueEtb - totalCostsEtb - materialsEtb);
    const isArchived = false;
    const archivedAt = null;
    const contract = {
      id: uuid(0x61000001, number), organization_id: ORGANIZATION_ID, output_report_id: output.id,
      supplier_id: supplier.id, base44_id: null, is_demo: true,
      contract_no: `EXP-${year}-${String(number).padStart(3, '0')}`,
      contract_pi_number: `PI-${year}-${String(number).padStart(3, '0')}`,
      certificate_no: `CERT-${year}-${String(number).padStart(3, '0')}`,
      contract_date: contractDate, stock_pool: 'Fresh', coffee_type: output.coffee_type,
      coffee_grade: index % 3 === 0 ? 'Grade 1' : 'Grade 2', destination_country: destinationCountry,
      buyer_name: buyerName, payment_terms: index % 2 === 0 ? 'Letter of Credit (LC)' : 'Cash Against Documents (CAD)',
      custom_payment_terms: null, expected_payment_date: addDays(contractDate, 21), export_bags: exportBags,
      export_kg: exportKg, export_sample_kg: 0, actual_shipped_kg: exportKg,
      pricing_method: 'per_lb', price_per_lb_usd: pricePerLb, price_per_kg_usd: null,
      total_lb: totalLb, contract_rate_etb: rate, usd_rate_etb: rate, rate_status: 'Rate Confirmed',
      rate_confirmed_date: contractDate, total_export_value_usd: revenueUsd, total_export_value_etb: revenueEtb,
      total_materials_etb: materialsEtb, total_costs_etb: totalCostsEtb, reject_sales_etb: 0,
      grand_total_revenue_etb: revenueEtb, profit_etb: profitEtb, profit_usd: round2(profitEtb / rate),
      profit_margin_pct: round2((profitEtb / revenueEtb) * 100), total_received_usd: revenueUsd,
      total_received_etb: revenueEtb, balance_etb: 0, payment_status: 'Fully Received', status: 'Completed',
      remark: isArchived ? 'Superseded contract copy retained for audit history' : 'Shipment completed and proceeds fully received',
      archive_reason: isArchived ? 'Superseded document copy archived after final contract issue' : null,
      created_at: at(contractDate, 10), updated_at: archivedAt || at(addDays(contractDate, 21), 12), archived_at: archivedAt,
    };
    const costs = [
      { id: uuid(0x62000001, exportContractCosts.length + 1), organization_id: ORGANIZATION_ID, export_contract_id: contract.id, name: 'International freight and handling', amount_etb: freight, is_demo: true },
      { id: uuid(0x62000001, exportContractCosts.length + 2), organization_id: ORGANIZATION_ID, export_contract_id: contract.id, name: 'Documentation and certification', amount_etb: documentation, is_demo: true },
    ];
    const materials = [
      { id: uuid(0x63000001, exportContractMaterials.length + 1), organization_id: ORGANIZATION_ID, export_contract_id: contract.id, name: '60 KG jute bags and liners', quantity: exportBags, unit_cost_etb: 620, total_cost_etb: materialsEtb, is_demo: true },
    ];
    const payment = {
      id: uuid(0x64000001, number), organization_id: ORGANIZATION_ID, export_contract_id: contract.id,
      payment_date: addDays(contractDate, 18), amount_usd: revenueUsd, actual_rate_etb: rate,
      amount_etb: revenueEtb, bank_name: banks[index % banks.length], reference_no: `SWIFT-${year}-${String(number).padStart(4, '0')}`,
      note: 'Full export proceeds received', is_demo: true,
    };
    exportContractCosts.push(...costs);
    exportContractMaterials.push(...materials);
    exportContractPayments.push(payment);
    contract.cost_rows = JSON.stringify(costs.map(({ name, amount_etb }) => ({ name, amount_etb })));
    contract.material_rows = JSON.stringify(materials.map(({ name, quantity, unit_cost_etb }) => ({ name, quantity, unit_cost_etb })));
    contract.payment_history = JSON.stringify([payment]);
    exportContracts.push(contract);

    const inspectionDate = addDays(contractDate, -2);
    const inspection = {
      id: uuid(0x65000001, number), organization_id: ORGANIZATION_ID, export_contract_id: contract.id,
      linked_contract_id: contract.id, linked_contract_no: contract.contract_no, base44_id: null, is_demo: true,
      inspection_date: inspectionDate, buyer_name: buyerName, coffee_type: output.coffee_type,
      kg_to_inspect: Math.min(240, exportKg), sample_kg_taken: 3, result: 'Passed',
      kg_approved: Math.min(240, exportKg) - 3, rejection_reason: null, kg_rejected: null,
      action_taken: 'Approved for shipment', notes: 'Buyer quality inspection completed and accepted',
      created_at: at(inspectionDate, 10), updated_at: archivedAt || at(inspectionDate, 11), archived_at: archivedAt,
    };
    buyerInspections.push(inspection);
    stockMovements.push({
      id: uuid(0x41000001, stockMovements.length + 1), organization_id: ORGANIZATION_ID,
      supplier_id: null, purchase_record_id: null, warehouse_receipt_id: null,
      source_type: 'buyer_inspection', source_id: inspection.id, movement_type: 'buyer_inspection_sample',
      stock_pool: 'export_available', coffee_type: output.coffee_type, quantity_kg: 3,
      occurred_at: at(inspectionDate, 10), notes: 'Buyer inspection sample', is_demo: true,
      created_at: at(inspectionDate, 10), archived_at: archivedAt,
    });
    stockMovements.push({
      id: uuid(0x41000001, stockMovements.length + 1), organization_id: ORGANIZATION_ID,
      supplier_id: supplier.id, purchase_record_id: null, warehouse_receipt_id: null,
      source_type: 'export_contract', source_id: contract.id, movement_type: 'export_contract_deduction',
      stock_pool: 'export_available', coffee_type: output.coffee_type, quantity_kg: exportKg,
      occurred_at: at(contractDate, 10), notes: 'Completed export contract shipment', is_demo: true,
      created_at: at(contractDate, 10), archived_at: archivedAt,
    });
  });

  const rejectBagUsages = [];
  const supplierBagReturns = [];
  const supplierBagPayments = [];
  const supplierBagSettlements = [];
  [...new Set(suppliers.map((row) => row.agent))].forEach((agent, index) => {
    const received = bagReceipts.filter((row) => !row.archived_at && row.agent_name === agent).reduce((sum, row) => sum + row.bags_received, 0);
    const used = Math.max(2, Math.floor(received * 0.03));
    const lossAllowance = Math.ceil(received * 0.01);
    const returned = received - used - lossAllowance;
    const supplier = suppliers.find((row) => row.agent === agent);
    rejectBagUsages.push({
      id: uuid(0x52000001, index + 1), organization_id: ORGANIZATION_ID, supplier_id: supplier.id,
      base44_id: null, reject_mode: 'agent', agent_name: agent, supplier_name: null,
      date: isoDate(2026, 7, 2 + index), bags_used: used, amount_etb: used * 153,
      note: 'Damaged bags settled at the approved rate', is_demo: true,
      created_at: at(isoDate(2026, 7, 2 + index), 9), updated_at: at(isoDate(2026, 7, 2 + index), 9), archived_at: null,
    });
    supplierBagPayments.push({
      id: uuid(0x54000001, index + 1), organization_id: ORGANIZATION_ID, supplier_id: supplier.id,
      base44_id: null, agent_name: agent, supplier_name: null, payment_date: isoDate(2026, 7, 8 + index),
      bank_name: banks[index % banks.length], branch_account: 'Addis Ababa Main Branch',
      reference_no: `BAG-SET-${String(index + 1).padStart(3, '0')}`, payment_type: 'Final Payment',
      amount_etb: used * 153, note: 'Final settlement for non-returnable bags', is_demo: true,
      created_at: at(isoDate(2026, 7, 8 + index), 10), updated_at: at(isoDate(2026, 7, 8 + index), 10), archived_at: null,
    });
    if (index < 3) {
      supplierBagReturns.push({
        id: uuid(0x53000001, index + 1), organization_id: ORGANIZATION_ID, supplier_id: supplier.id,
        base44_id: null, agent_name: agent, supplier_name: null, return_date: isoDate(2026, 7, 10 + index),
        bags_returned: returned, note: 'Reusable bags returned and counted', is_demo: true,
        created_at: at(isoDate(2026, 7, 10 + index), 11), updated_at: at(isoDate(2026, 7, 10 + index), 11), archived_at: null,
      });
    } else {
      supplierBagSettlements.push({
        id: uuid(0x55000001, index + 1), organization_id: ORGANIZATION_ID, supplier_id: supplier.id,
        base44_id: null, agent_name: agent, supplier_name: null, settlement_date: isoDate(2026, 7, 10 + index),
        bags_received_adjustment: 0, bags_used_adjustment: 0, loss_percent_override: 1,
        bags_returned: true, bags_returned_date: isoDate(2026, 7, 10 + index), bags_returned_count: returned,
        bags_returned_note: 'Reusable bags returned and counted', cash_paid: true,
        cash_paid_date: isoDate(2026, 7, 8 + index), note: 'Agent bag account fully settled', is_demo: true,
        created_at: at(isoDate(2026, 7, 10 + index), 11), updated_at: at(isoDate(2026, 7, 10 + index), 11), archived_at: null,
      });
    }
  });

  const materialRegisterEntries = [];
  const materialMovements = [];
  [2024, 2025, 2026].forEach((year, yearIndex) => {
    [['Bag', '60kg', 300, 410], ['Liner', null, 300, 170]].forEach(([itemType, bagSize, quantity, unitCost], itemIndex) => {
      const date = isoDate(year, 1, 10 + itemIndex);
      const quantityNumber = Number(quantity);
      const unitCostNumber = Number(unitCost);
      const entry = {
        id: uuid(0x56000001, materialRegisterEntries.length + 1), organization_id: ORGANIZATION_ID,
        export_contract_id: null, base44_id: null, category: 'export', date, item_type: itemType,
        bag_size: bagSize, entry_type: 'Purchase', item_name: null, quantity: quantityNumber, unit_cost_etb: unitCostNumber,
        total_cost_etb: quantityNumber * unitCostNumber, purpose: 'Export packaging inventory',
        note: `${year} packaging stock purchase`, is_demo: true, created_at: at(date, 9), updated_at: at(date, 9), archived_at: null,
      };
      materialRegisterEntries.push(entry);
      materialMovements.push({
        id: uuid(0x57000001, materialMovements.length + 1), organization_id: ORGANIZATION_ID,
        material_register_entry_id: entry.id, export_contract_id: null,
        item_key: itemType === 'Bag' ? 'Bag 60kg' : itemType, movement_type: 'material_purchase',
        quantity: quantityNumber, unit_cost_etb: unitCostNumber, total_cost_etb: quantityNumber * unitCostNumber,
        occurred_at: at(date, 9), notes: entry.note, is_demo: true, created_at: at(date, 9), archived_at: null,
      });
    });
    const generalDate = isoDate(year, 2, 5);
    const general = {
      id: uuid(0x56000001, materialRegisterEntries.length + 1), organization_id: ORGANIZATION_ID,
      export_contract_id: null, base44_id: null, category: 'general', date: generalDate,
      item_type: null, bag_size: null, entry_type: null, item_name: 'Warehouse record books', quantity: 24,
      unit_cost_etb: 185, total_cost_etb: 4440, purpose: 'Warehouse administration',
      note: `${year} warehouse stationery purchase`, is_demo: true,
      created_at: at(generalDate, 9), updated_at: at(generalDate, 9), archived_at: null,
    };
    materialRegisterEntries.push(general);
    materialMovements.push({
      id: uuid(0x57000001, materialMovements.length + 1), organization_id: ORGANIZATION_ID,
      material_register_entry_id: general.id, export_contract_id: null, item_key: general.item_name,
      movement_type: 'material_purchase', quantity: general.quantity, unit_cost_etb: general.unit_cost_etb,
      total_cost_etb: general.total_cost_etb, occurred_at: at(generalDate, 9), notes: general.note,
      is_demo: true, created_at: at(generalDate, 9), archived_at: null,
    });
  });
  exportContracts.forEach((contract) => {
    [['Bag', '60kg'], ['Liner', null]].forEach(([itemType, bagSize]) => {
      const entry = {
        id: uuid(0x56000001, materialRegisterEntries.length + 1), organization_id: ORGANIZATION_ID,
        export_contract_id: contract.id, base44_id: null, category: 'export', date: contract.contract_date,
        item_type: itemType, bag_size: bagSize, entry_type: 'Usage', item_name: null,
        quantity: contract.export_bags, unit_cost_etb: null, total_cost_etb: null,
        purpose: `Packaging for ${contract.contract_no}`, note: `Packaging issued to ${contract.contract_no}`,
        is_demo: true, created_at: at(contract.contract_date, 9), updated_at: contract.updated_at, archived_at: contract.archived_at,
      };
      materialRegisterEntries.push(entry);
      materialMovements.push({
        id: uuid(0x57000001, materialMovements.length + 1), organization_id: ORGANIZATION_ID,
        material_register_entry_id: entry.id, export_contract_id: contract.id,
        item_key: itemType === 'Bag' ? 'Bag 60kg' : itemType, movement_type: 'material_usage',
        quantity: entry.quantity, unit_cost_etb: null, total_cost_etb: null,
        occurred_at: at(entry.date, 9), notes: entry.note, is_demo: true,
        created_at: at(entry.date, 9), archived_at: contract.archived_at,
      });
    });
  });

  const stockAdjustments = [
    [2024, 4, 28, 0, 3, 'Quarterly physical count reconciliation'],
    [2024, 12, 28, 5, -2, 'Year-end calibrated scale reconciliation'],
    [2025, 6, 28, 8, 5, 'Mid-year warehouse physical count reconciliation'],
    [2026, 3, 28, 10, -4, 'Calibrated weighbridge variance reconciliation'],
  ].map(([year, month, day, supplierIndex, quantity, reason], index) => ({
    id: uuid(0x71000001, index + 1), organization_id: ORGANIZATION_ID,
    adjustment_no: `ADJ-${year}-${String(index + 1).padStart(3, '0')}`,
    adjustment_date: isoDate(year, month, day), target_type: 'supplier', supplier_id: suppliers[supplierIndex].id,
    supplier_name: suppliers[supplierIndex].supplier_name, coffee_type: suppliers[supplierIndex].coffee_type,
    quantity_kg: Number(quantity), reason, notes: 'Reviewed and approved by inventory control', status: 'approved',
    is_demo: true, created_at: at(isoDate(year, month, day), 14), updated_at: at(isoDate(year, month, day), 14), archived_at: null,
  }));
  stockAdjustments.forEach((adjustment) => stockMovements.push({
    id: uuid(0x41000001, stockMovements.length + 1), organization_id: ORGANIZATION_ID,
    supplier_id: adjustment.supplier_id, purchase_record_id: null, warehouse_receipt_id: null,
    source_type: 'stock_adjustment', source_id: adjustment.id,
    movement_type: adjustment.quantity_kg > 0 ? 'stock_adjustment' : 'stock_adjustment_deduction',
    stock_pool: 'supplier_available', coffee_type: adjustment.coffee_type, quantity_kg: Math.abs(adjustment.quantity_kg),
    occurred_at: at(adjustment.adjustment_date, 14), notes: adjustment.reason, is_demo: true,
    created_at: adjustment.created_at, archived_at: null,
  }));

  const annualReportingPeriods = [2024, 2025].map((year, index) => {
    const yearPurchases = purchases.filter((row) => row.purchase_date.startsWith(String(year)) && !row.archived_at);
    const yearReceipts = warehouseReceipts.filter((row) => row.received_date.startsWith(String(year)) && !row.archived_at);
    return {
      id: uuid(0x72000001, index + 1), organization_id: ORGANIZATION_ID,
      period_label: `${year} Annual Coffee Operations`, start_date: `${year}-01-01`, end_date: `${year}-12-31`,
      status: 'closed', snapshot: {
        dataset_version: DEMO_DATA_VERSION,
        totals: {
          purchaseCount: yearPurchases.length,
          receivedKg: yearReceipts.reduce((sum, row) => sum + row.received_kg, 0),
          processingKg: processingLogs.filter((row) => row.processing_date.startsWith(String(year)) && !row.archived_at).reduce((sum, row) => sum + row.actual_weighed_kg, 0),
          contractedKg: exportContracts.filter((row) => row.contract_date.startsWith(String(year)) && !row.archived_at).reduce((sum, row) => sum + row.export_kg, 0),
        },
      },
      warnings: [], closed_at: at(`${year}-12-31`, 17), closed_by: PROFILE_ID,
      is_demo: true, created_at: at(`${year}-12-31`, 17), updated_at: at(`${year}-12-31`, 17), archived_at: null,
    };
  });
  const yearEndStockAdjustments = stockAdjustments.filter((row) => row.adjustment_date < '2026-01-01').map((adjustment, index) => {
    const period = annualReportingPeriods.find((row) => adjustment.adjustment_date >= row.start_date && adjustment.adjustment_date <= row.end_date);
    return {
      id: uuid(0x73000001, index + 1), organization_id: ORGANIZATION_ID,
      annual_reporting_period_id: period.id, stock_adjustment_id: adjustment.id,
      target_type: adjustment.target_type, supplier_name: adjustment.supplier_name,
      coffee_type: adjustment.coffee_type, quantity_kg: adjustment.quantity_kg,
      is_demo: true, created_at: period.closed_at, created_by: PROFILE_ID,
    };
  });
  const backupExports = [
    ['2024-06-30', 'date_range', '2024-01-01', '2024-06-30'],
    ['2024-12-31', 'full', null, null],
    ['2025-06-30', 'date_range', '2025-01-01', '2025-06-30'],
    ['2025-12-31', 'full', null, null],
    ['2026-03-31', 'date_range', '2026-01-01', '2026-03-31'],
    ['2026-07-17', 'full', null, null],
  ].map(([createdDate, scope, fromDate, toDate], index) => ({
    id: uuid(0x74000001, index + 1), organization_id: ORGANIZATION_ID, export_scope: scope,
    from_date: fromDate, to_date: toDate, file_name: `beanledger-export-${createdDate}.xlsx`,
    row_count: 250 + index * 135, status: 'completed', is_demo: true,
    created_at: at(createdDate, 18), created_by: PROFILE_ID,
  }));

  const attachments = [];
  const attachmentSources = [
    ...purchases.slice(0, 10).map((row) => ['purchase_record', row.id, 'payment_voucher', payments.find((payment) => payment.purchase_record_id === row.id)?.cpv_reference, row.purchase_date]),
    ...warehouseReceipts.slice(0, 10).map((row) => ['warehouse_receipt', row.id, 'grn_certificate', row.receipt_number, row.received_date]),
    ...exportContracts.slice(0, 5).map((row) => ['export_contract', row.id, 'export_doc', row.contract_no, row.contract_date]),
    ...buyerInspections.slice(0, 3).map((row) => ['buyer_inspection', row.id, 'inspection_document', row.linked_contract_no, row.inspection_date]),
    ...materialRegisterEntries.slice(0, 2).map((row) => ['material_register_entry', row.id, 'material_invoice', 'invoice', row.date]),
  ];
  attachmentSources.forEach(([entityType, entityId, section, sectionRef, date], index) => {
    const filename = `${section.replace(/_/g, '-')}-${String(index + 1).padStart(3, '0')}.pdf`;
    attachments.push({
      id: uuid(0x75000001, index + 1), organization_id: ORGANIZATION_ID, base44_id: null,
      entity_type: entityType, entity_id: entityId, section, section_ref: sectionRef,
      original_filename: filename, storage_bucket: entityType === 'export_contract' ? 'demo-export-documents' : 'demo-documents',
      storage_path: `${ORGANIZATION_ID}/${entityType}/${entityId}/${filename}`,
      mime_type: 'application/pdf', file_size_bytes: 48000 + index * 1730,
      description: index === 29
        ? 'Archived because a duplicate scan was replaced by the verified invoice copy'
        : 'Verified supporting document metadata',
      is_demo: true, created_at: at(addDays(date, 1), 12), updated_at: at(addDays(date, 1), 12), archived_at: index === 29 ? at(addDays(date, 5), 14) : null,
    });
  });

  const notifications = [
    ['Purchase batch approved', `${purchases.at(-1).coffee_code} was approved and received.`, 'new_purchase', '/purchase-registration'],
    ['Warehouse reconciliation complete', 'July warehouse quantities were reconciled successfully.', 'warehouse_confirmed', '/warehouse-receipt'],
    ['Processing output posted', `${outputReports.at(-1).coffee_type} output was posted and balanced.`, 'processing_complete', '/output-report'],
    ['Export proceeds received', `${exportContracts.filter((row) => !row.archived_at).at(-1).contract_no} was paid in full.`, 'export_contract', '/export-contracts'],
    ['Buyer inspection passed', `${buyerInspections.filter((row) => !row.archived_at).at(-1).linked_contract_no} passed buyer inspection.`, 'inspection_passed', '/buyer-inspections'],
    ['Bag accounts settled', 'All active agent bag accounts are fully settled.', 'bag_settlement', '/bag-ledger'],
    ['Scheduled backup completed', 'The full demonstration dataset backup completed successfully.', 'backup_complete', '/backup-center'],
    ['Fiscal records available', 'Closed 2024 and 2025 fiscal periods are available for review.', 'year_close', '/year-close'],
  ].map(([title, message, type, linkPath], index) => ({
    id: uuid(0x76000001, index + 1), organization_id: ORGANIZATION_ID, base44_id: null, is_demo: true,
    recipient_profile_id: PROFILE_ID, recipient_email: PROFILE_EMAIL, recipient_role: 'admin',
    title, message, type, severity: 'info', link_path: linkPath,
    read_at: index < 5 ? at(isoDate(2026, 7, 17 - index), 15) : null,
    created_at: at(isoDate(2026, 7, 17 - index), 14), archived_at: null,
  }));
  const notificationPreferences = [{
    id: uuid(0x77000001, 1), organization_id: ORGANIZATION_ID, profile_id: PROFILE_ID,
    user_email: PROFILE_EMAIL, disabled_types: [], is_demo: true,
    created_at: at('2024-01-01', 8), updated_at: at('2026-07-01', 8), archived_at: null,
  }];

  const auditLogs = [];
  function addAuditLogs(table, rows, describe, dateField) {
    rows.forEach((row) => {
    auditLogs.push({
      id: uuid(0x78000001, auditLogs.length + 1), organization_id: ORGANIZATION_ID,
      profile_id: PROFILE_ID, is_demo: true, action_type: row.archived_at ? 'Archived' : 'Created',
      entity_table: table, entity_id: row.id, record_description: describe(row),
      reason: row.archived_at ? row.archive_reason || 'Superseded record retained for audit history' : 'Approved operational transaction',
      changes: { dataset_version: DEMO_DATA_VERSION }, created_at: row.archived_at || at(row[dateField], 16),
    });
    });
  }
  addAuditLogs('purchase_records', purchases, (row) => row.coffee_code, 'purchase_date');
  addAuditLogs('warehouse_receipts', warehouseReceipts, (row) => row.receipt_number, 'received_date');
  addAuditLogs('processing_logs', processingLogs, (row) => row.batch_no, 'processing_date');
  addAuditLogs('output_reports', outputReports, (row) => `${row.coffee_type} output`, 'date');
  addAuditLogs('export_contracts', exportContracts, (row) => row.contract_no, 'contract_date');

  return {
    suppliers, purchases, additionalCosts, payments, warehouseReceipts, sampleLogs,
    processingLogs, outputReports, exportContracts, exportContractCosts,
    exportContractMaterials, exportContractPayments, buyerInspections, bagReceipts,
    rejectBagUsages, supplierBagReturns, supplierBagPayments, supplierBagSettlements,
    materialRegisterEntries, materialMovements, stockAdjustments, annualReportingPeriods,
    yearEndStockAdjustments, backupExports, stockMovements, warehouseHistory,
    attachments, notifications, notificationPreferences, auditLogs,
  };
}

const scenario = buildScenario();

export const seedSuppliers = scenario.suppliers;
export const seedPurchases = scenario.purchases;
export const seedAdditionalCosts = scenario.additionalCosts;
export const seedPayments = scenario.payments;
export const seedWarehouseReceipts = scenario.warehouseReceipts;
export const seedSampleLogs = scenario.sampleLogs;
export const seedProcessingLogs = scenario.processingLogs;
export const seedOutputReports = scenario.outputReports;
export const seedExportContracts = scenario.exportContracts;
export const seedExportContractCosts = scenario.exportContractCosts;
export const seedExportContractMaterials = scenario.exportContractMaterials;
export const seedExportContractPayments = scenario.exportContractPayments;
export const seedBuyerInspections = scenario.buyerInspections;
export const seedBagReceipts = scenario.bagReceipts;
export const seedRejectBagUsages = scenario.rejectBagUsages;
export const seedSupplierBagReturns = scenario.supplierBagReturns;
export const seedSupplierBagPayments = scenario.supplierBagPayments;
export const seedSupplierBagSettlements = scenario.supplierBagSettlements;
export const seedMaterialRegisterEntries = scenario.materialRegisterEntries;
export const seedMaterialMovements = scenario.materialMovements;
export const seedAttachments = scenario.attachments;
export const seedNotifications = scenario.notifications;
export const seedNotificationPreferences = scenario.notificationPreferences;
export const seedStockAdjustments = scenario.stockAdjustments;
export const seedAnnualReportingPeriods = scenario.annualReportingPeriods;
export const seedYearEndStockAdjustments = scenario.yearEndStockAdjustments;
export const seedBackupExports = scenario.backupExports;
export const seedStockMovements = scenario.stockMovements.filter((row) => row.source_type === 'warehouse_receipt');
export const seedPhase6StockMovements = scenario.stockMovements.filter((row) => ['sample_log', 'processing_log', 'output_report'].includes(row.source_type));
export const seedPhase7StockMovements = scenario.stockMovements.filter((row) => ['export_contract', 'buyer_inspection'].includes(row.source_type));
export const seedWarehouseHistory = scenario.warehouseHistory;
export const seedAuditLogs = scenario.auditLogs;

export function freshDemoStore() {
  return JSON.parse(JSON.stringify({
    suppliers: scenario.suppliers,
    purchases: scenario.purchases,
    additionalCosts: scenario.additionalCosts,
    payments: scenario.payments,
    warehouseReceipts: scenario.warehouseReceipts,
    sampleLogs: scenario.sampleLogs,
    processingLogs: scenario.processingLogs,
    outputReports: scenario.outputReports,
    exportContracts: scenario.exportContracts,
    exportContractCosts: scenario.exportContractCosts,
    exportContractMaterials: scenario.exportContractMaterials,
    exportContractPayments: scenario.exportContractPayments,
    buyerInspections: scenario.buyerInspections,
    bagReceipts: scenario.bagReceipts,
    rejectBagUsages: scenario.rejectBagUsages,
    supplierBagReturns: scenario.supplierBagReturns,
    supplierBagPayments: scenario.supplierBagPayments,
    supplierBagSettlements: scenario.supplierBagSettlements,
    materialRegisterEntries: scenario.materialRegisterEntries,
    materialMovements: scenario.materialMovements,
    attachments: scenario.attachments,
    notifications: scenario.notifications,
    notificationPreferences: scenario.notificationPreferences,
    stockAdjustments: scenario.stockAdjustments,
    annualReportingPeriods: scenario.annualReportingPeriods,
    yearEndStockAdjustments: scenario.yearEndStockAdjustments,
    backupExports: scenario.backupExports,
    auditLogs: scenario.auditLogs,
    stockMovements: scenario.stockMovements,
    warehouseHistory: scenario.warehouseHistory,
  }));
}
