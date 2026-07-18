import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { authService } from '../../src/services/authService.js';
import { seedNotifications, seedNotificationPreferences } from '../../src/services/demoData.js';
import { readSupabaseJwtRole } from '../../src/lib/supabaseClient.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

const memoryStorage = new Map();
global.window = {
  localStorage: {
    getItem: (key) => memoryStorage.get(key) || null,
    setItem: (key, value) => memoryStorage.set(key, String(value)),
    removeItem: (key) => memoryStorage.delete(key),
  },
};

assert.equal(await authService.isAuthenticated(), false, 'demo session starts signed out');
await assert.rejects(() => authService.login({ username: 'admin', password: 'wrong' }), /invalid demo username/i);
await authService.login({ username: 'admin', password: 'password' });
assert.equal(await authService.isAuthenticated(), true, 'demo login creates local session');
assert.equal((await authService.getUser()).role, 'admin', 'demo user is admin');
assert.ok(memoryStorage.has('kkgt_demo_session'), 'demo session persists in localStorage');
await authService.signOut();
assert.equal(await authService.isAuthenticated(), false, 'demo logout clears local session');

const app = read('src/App.jsx');
assert.match(app, /isAuthenticated \? <AppLayout \/> : <Navigate to="\/login" replace \/>/, 'protected route tree redirects to login');
assert.match(app, /path="\/notification-settings" element={protectedRoute\("\/notification-settings", NotificationSettings\)}/, 'notification settings route is protected');
assert.match(app, /path="\/notification-history" element={protectedRoute\("\/notification-history", NotificationHistory\)}/, 'notification history route is protected');

assert.equal(seedNotifications.every((item) => item.is_demo), true, 'notification seeds are demo flagged');
assert.equal(seedNotifications.filter((item) => !item.archived_at).length, 8, 'all seeded notifications are active');
assert.equal(seedNotifications.filter((item) => !item.read_at && !item.archived_at).length, 3, 'unread notification seeds exist');
assert.deepEqual(seedNotificationPreferences[0].disabled_types, [], 'demo preferences start enabled');

const notificationService = read('src/services/notificationService.js');
assert.match(notificationService, /list_demo_notifications/, 'notification service uses demo Supabase RPC');
assert.doesNotMatch(notificationService, /@\/api\/base44Client|base44\.entities/, 'notification service does not call Base44');

const notificationHook = read('src/hooks/useNotifications.js');
assert.doesNotMatch(notificationHook, /@\/api\/base44Client|base44\.entities/, 'notification hook does not call Base44');

const settingsPage = read('src/pages/NotificationSettings.jsx');
assert.match(settingsPage, /Credentials cannot be changed from this screen/, 'settings page blocks demo credential editing');
assert.doesNotMatch(settingsPage, /@\/api\/base44Client|base44\.entities/, 'notification settings page does not call Base44');

const backupButton = read('src/components/admin/DownloadBackupButton.jsx');
assert.match(backupButton, /\/backup-center/, 'backup UI routes to the safe Backup Center');
assert.doesNotMatch(backupButton, /base44\.entities|CreateFileSignedUrl|Download Full Backup/, 'backup UI cannot run legacy Base44 export');

const supabaseClient = read('src/lib/supabaseClient.js');
assert.match(supabaseClient, /frontendEnvValidation/, 'frontend environment validation is exported');
assert.match(supabaseClient, /service-role credentials/, 'service-role warning is present');
const serviceRolePayload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
assert.equal(readSupabaseJwtRole(`header.${serviceRolePayload}.signature`), 'service_role', 'encoded service-role JWT is detected');

assert.ok(existsSync('vercel.json'), 'vercel.json exists');
const vercel = JSON.parse(read('vercel.json'));
assert.equal(vercel.rewrites[0].destination, '/index.html', 'Vercel SPA rewrite points to index.html');

const gitignore = read('.gitignore');
assert.match(gitignore, /^\.env$/m, '.env is ignored');
assert.match(gitignore, /^\.env\.\*$/m, '.env.* is ignored');
assert.match(gitignore, /^!\.env\.example$/m, '.env.example remains tracked');
assert.match(gitignore, /exports\/base44\/manual-drop\//, 'real Base44 manual exports are ignored');
assert.match(gitignore, /exports\/base44\/runs\//, 'generated Base44 export runs are ignored');

const envExample = read('.env.example');
assert.match(envExample, /server-only credentials/, '.env.example warns against server-only credentials');
assert.match(envExample, /VITE_SUPABASE_URL/, '.env.example documents Supabase URL');
assert.match(envExample, /VITE_SUPABASE_ANON_KEY/, '.env.example documents anon key');

const demoPathFiles = [
  'src/App.jsx',
  'src/lib/AuthContext.jsx',
  'src/lib/PageNotFound.jsx',
  'src/lib/activityLogger.js',
  'src/lib/notificationService.js',
  'src/lib/role-hooks.js',
  'src/hooks/useNotifications.js',
  'src/components/layout/AppLayout.jsx',
  'src/components/admin/DownloadBackupButton.jsx',
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
  'src/pages/ActivityLog.jsx',
  'src/pages/NotificationHistory.jsx',
  'src/pages/NotificationSettings.jsx',
  'src/pages/Permissions.jsx',
  'src/pages/UsersManagement.jsx',
  'src/pages/UserActivityReport.jsx',
  'src/pages/AdjustmentCenter.jsx',
  'src/pages/YearClose.jsx',
  'src/pages/SupplierRemainingExplanation.jsx',
  'src/pages/CommissionReport.jsx',
  'src/pages/BackupCenter.jsx',
];
const activeBase44Hits = demoPathFiles.flatMap((file) => {
  const text = read(file);
  return /base44\.entities|@\/api\/base44Client|@base44\/sdk/.test(text) ? [file] : [];
});
assert.deepEqual(activeBase44Hits, [], 'main demo navigation files do not import or call Base44');

const migrations = read('supabase/migrations/202606180010_phase11_notifications_demo_schema.sql');
['notifications', 'notification_preferences', 'list_demo_notifications', 'mark_notification_read'].forEach((token) => {
  assert.ok(migrations.includes(token), `${token} exists in Phase 11 migration`);
});
assert.doesNotMatch(migrations, /service_role/i, 'Phase 11 migration does not reference service role');

const operationalAccess = read('supabase/migrations/20260718114156_demo_anon_operational_access.sql');
[
  'warehouse_receipts',
  'sample_logs',
  'processing_logs',
  'output_reports',
  'export_contracts',
  'buyer_inspections',
  'bag_receipts',
  'material_register_entries',
].forEach((table) => {
  assert.ok(operationalAccess.includes(`'${table}'`), `${table} is visible to the demo client`);
});
assert.match(operationalAccess, /grant select on table public\.%I to anon/, 'operational access is read-only');
assert.match(operationalAccess, /is_demo = true/, 'operational access only permits synthetic records');
assert.match(operationalAccess, /11111111-1111-4111-8111-111111111111/, 'operational access is limited to the fixed demo organization');

console.log('Phase 11 demo hardening tests passed');
