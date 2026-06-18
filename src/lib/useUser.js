import { useAuth } from '@/lib/AuthContext';

// Demo user fallback for public demo mode — no real auth required
const DEMO_USER = {
  id: 'demo-user-001',
  full_name: 'Demo Admin',
  email: 'demo@beanledgerexport.com',
  role: 'admin',
};

export function useUser() {
  const { user } = useAuth();
  return user || DEMO_USER;
}