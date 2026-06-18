export const attachmentService = {
  listForRecord: (_record) => Promise.resolve([]),
  upload: (_file, _metadata) => Promise.reject(new Error('Supabase attachment migration is not wired yet.')),
};
