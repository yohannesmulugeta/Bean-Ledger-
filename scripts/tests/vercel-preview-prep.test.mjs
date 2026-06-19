import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(path, 'utf8');
}

const viteConfig = read('vite.config.js');
assert.doesNotMatch(viteConfig, /@base44\/vite-plugin/, 'Vite config must not import the Base44 plugin');
assert.doesNotMatch(viteConfig, /\bbase44\s*\(/, 'Vite config must not instantiate the Base44 plugin');
assert.match(viteConfig, /alias:\s*{[\s\S]*['"]@['"]:/, 'Vite config must preserve the @ source alias');

const packageJson = JSON.parse(read('package.json'));
assert.equal(packageJson.dependencies['@base44/vite-plugin'], undefined, 'Base44 Vite plugin package must not be installed');
assert.equal(packageJson.devDependencies?.['@base44/vite-plugin'], undefined, 'Base44 Vite plugin must not be a dev dependency');

const envExample = read('.env.example');
assert.match(envExample, /^VITE_SUPABASE_URL=$/m, '.env.example must use a blank Supabase URL placeholder');
assert.match(envExample, /^VITE_SUPABASE_ANON_KEY=$/m, '.env.example must use a blank anon key placeholder');
assert.doesNotMatch(
  envExample,
  /BASE44|SERVICE_ROLE|DATABASE_URL|DB_PASSWORD|POSTGRES|TELEGRAM|JWT_SECRET|SECRET_KEY/i,
  '.env.example must not mention production secret names',
);

assert.ok(existsSync('vercel.json'), 'vercel.json exists');
const vercel = JSON.parse(read('vercel.json'));
assert.deepEqual(
  vercel.rewrites,
  [{ source: '/(.*)', destination: '/index.html' }],
  'Vercel must route SPA paths to index.html',
);

[
  'src/lib/AuthContext.jsx',
  'src/pages/Login.jsx',
  'src/components/layout/AppLayout.jsx',
  'src/components/ModuleRouteGuard.jsx',
].forEach((file) => assert.ok(existsSync(file), `${file} exists for demo route protection`));

const activeDemoFiles = [
  'src/App.jsx',
  'src/lib/AuthContext.jsx',
  'src/lib/PageNotFound.jsx',
  'src/lib/activityLogger.js',
  'src/lib/notificationService.js',
  'src/lib/role-hooks.js',
  'src/hooks/useNotifications.js',
  'src/hooks/useOfflineSync.js',
  'src/components/layout/AppLayout.jsx',
  'src/components/layout/Sidebar.jsx',
  'src/components/admin/DownloadBackupButton.jsx',
  'src/components/shared/ArchivedRecordsSection.jsx',
  'src/components/shared/EnvironmentWarning.jsx',
  'src/pages/Login.jsx',
  'src/pages/MasterData.jsx',
  'src/pages/PurchaseRegistration.jsx',
  'src/pages/WarehouseReceipt.jsx',
  'src/pages/SampleLogPage.jsx',
  'src/pages/ProcessingLogPage.jsx',
  'src/pages/OutputReportPage.jsx',
  'src/pages/ExportContracts.jsx',
  'src/pages/BuyerInspections.jsx',
  'src/pages/MaterialsRegister.jsx',
  'src/pages/BagLedger.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Reports.jsx',
  'src/pages/StockReport.jsx',
  'src/pages/ActivityLog.jsx',
  'src/pages/NotificationHistory.jsx',
  'src/pages/NotificationSettings.jsx',
  'src/pages/Permissions.jsx',
  'src/pages/UsersManagement.jsx',
  'src/pages/UserActivityReport.jsx',
  'src/pages/PurchaseOrdersReport.jsx',
  'src/pages/WarehouseReceiptReport.jsx',
  'src/pages/DataAudit.jsx',
  'src/services/archiveService.js',
  'src/services/attachmentService.js',
  'src/services/auditService.js',
  'src/services/bagService.js',
  'src/services/buyerInspectionService.js',
  'src/services/dashboardService.js',
  'src/services/exportService.js',
  'src/services/materialService.js',
  'src/services/notificationService.js',
  'src/services/outputService.js',
  'src/services/processingService.js',
  'src/services/purchaseService.js',
  'src/services/reportService.js',
  'src/services/sampleService.js',
  'src/services/supplierService.js',
  'src/services/stockService.js',
  'src/services/userService.js',
  'src/services/warehouseService.js',
];

const activeHits = activeDemoFiles.flatMap((file) => {
  const text = read(file);
  return /@\/api\/base44Client|@base44\/sdk|base44\.entities|base44\.auth|base44\.functions|CreateFileSignedUrl|UploadFile|VITE_BASE44/.test(text)
    ? [file]
    : [];
});
assert.deepEqual(activeHits, [], 'active demo files must not import or call Base44 runtime APIs');

const app = read('src/App.jsx');
assert.doesNotMatch(app, /from ['"].*\/(Purchases|WarehousePage|Processing|Exports)(\.jsx)?['"]/, 'legacy Base44 pages must not be imported by active routes');
assert.match(app, /path="\/warehouse" element={<Navigate to="\/warehouse-receipt" replace \/>}/, 'legacy warehouse route redirects to Supabase demo module');
assert.match(app, /path="\/processing" element={<Navigate to="\/processing-log" replace \/>}/, 'legacy processing route redirects to Supabase demo module');
assert.match(app, /path="\/exports" element={<Navigate to="\/export-contracts" replace \/>}/, 'legacy exports route redirects to Supabase demo module');

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const trackedExportData = trackedFiles.filter((file) => (
  file.startsWith('exports/base44/manual-drop/')
  || file.startsWith('exports/base44/runs/')
));
assert.deepEqual(trackedExportData, [], 'real Base44 export payload folders must not be tracked');

console.log('Phase 12 Vercel preview preparation tests passed');
