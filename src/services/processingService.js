export const processingService = {
  list: () => Promise.resolve([]),
  get: (_id) => Promise.resolve(null),
  create: (_data) => Promise.reject(new Error('processingService is a migration placeholder and is not wired yet.')),
  update: (_id, _data) => Promise.reject(new Error('processingService is a migration placeholder and is not wired yet.')),
};
