import { QueryClient } from '@tanstack/react-query';
import { apiRequest } from './api';

export { apiRequest, getApiUrl } from './api';

const defaultQueryFn = async ({ queryKey }: { queryKey: readonly unknown[] }) => {
  const path = queryKey[0] as string;
  return apiRequest(path);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 30_000,
      retry: 1,
    },
  },
});
