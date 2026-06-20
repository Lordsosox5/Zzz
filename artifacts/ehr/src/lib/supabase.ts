// Supabase is no longer used — this file is kept as a stub to avoid import errors
// during incremental migration. Remove this file once all imports are updated.
export const supabase = {
  channel: () => ({
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
  removeChannel: () => {},
};
