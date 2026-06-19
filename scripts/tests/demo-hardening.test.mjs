import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { authService } from '../../src/services/authService.js';
import { seedNotifications, seedNotificationPreferences } from '../../src/services/demoData.js';

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
assert.match(app, /path="\/notification-settings" element={<ModuleRouteGuard/, 'notification settings route is protected');
assert.match(app, /path="\/notification-history" element={<ModuleRouteGuard/, 'notification history route is protected');

assert.equal(seedNotifications.every((item) => item.is_demo), true, 'notification seeds are demo flagged');
assert.equal(seedNotifications.filter((item) => !item.archived_at).length, 3, 'archived demo notifications are filterable');
assert.equal(seedNotifications.filter((item) => !item.read_at && !item.archived_at).length, 2, 'unread notification seed exists');
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
assert.match(backupButton, /Real Base44 export is not connected in this demo\./, 'backup UI shows required disabled message');
assert.doesNotMatch(backupButton, /base44\.entities|CreateFileSignedUrl|Download Full Backup/, 'backup UI cannot run legacy Base44 export');

const supabaseClient = read('src/lib/supabaseClient.js');
assert.match(supabaseClient, /frontendEnvValidation/, 'frontend environment validation is exported');
assert.match(supabaseClient, /service-role credentials/, 'service-role warning is present');

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
assert.match(envExample, /Never put service-role credentials/, '.env.example warns against service role credentials');
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

console.log('Phase 11 demo hardening tests passed');
