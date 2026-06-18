import { freshDemoStore } from './demoData';

const STORE_KEY = 'kkgt_phase4_demo_store';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

export function readDemoStore() {
  const storage = getStorage();
  if (!storage) return freshDemoStore();

  const raw = storage.getItem(STORE_KEY);
  if (!raw) {
    const fresh = freshDemoStore();
    storage.setItem(STORE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  try {
    return JSON.parse(raw);
  } catch {
    const fresh = freshDemoStore();
    storage.setItem(STORE_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function writeDemoStore(nextStore) {
  const normalized = clone(nextStore);
  const storage = getStorage();
  if (storage) storage.setItem(STORE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createDemoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
