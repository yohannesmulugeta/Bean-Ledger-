export const purchaseService = {
  list: () => Promise.resolve([]),
  get: (_id) => Promise.resolve(null),
  create: (_data) => Promise.reject(new Error('purchaseService is a migration placeholder and is not wired yet.')),
  update: (_id, _data) => Promise.reject(new Error('purchaseService is a migration placeholder and is not wired yet.')),
};
