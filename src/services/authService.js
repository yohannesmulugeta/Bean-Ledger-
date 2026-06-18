const DEMO_SESSION_KEY = 'kkgt_demo_session';
const DEMO_USER = {
  id: 'demo-admin-local',
  username: 'admin',
  email: 'demo-admin@kkgt.local',
  full_name: 'Demo Admin',
  role: 'admin',
  environment: 'demo',
};

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export const authService = {
  login: async ({ username, password }) => {
    if (username === 'admin' && password === 'password') {
      const session = {
        user: DEMO_USER,
        created_at: new Date().toISOString(),
      };
      getStorage()?.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
      return session;
    }
    throw new Error('Invalid demo username or password');
  },
  getSession: async () => {
    try {
      const raw = getStorage()?.getItem(DEMO_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  getUser: async () => {
    const session = await authService.getSession();
    return session?.user || null;
  },
  isAuthenticated: async () => Boolean(await authService.getSession()),
  signOut: async () => {
    getStorage()?.removeItem(DEMO_SESSION_KEY);
  },
};
