export const outputService = {
  list: () => Promise.resolve([]),
  get: (_id) => Promise.resolve(null),
  create: (_data) => Promise.reject(new Error('outputService is a migration placeholder and is not wired yet.')),
  update: (_id, _data) => Promise.reject(new Error('outputService is a migration placeholder and is not wired yet.')),
};
