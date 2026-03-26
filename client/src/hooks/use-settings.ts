import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost } from '../lib/api-client';

interface Settings {
  hasApiKey: boolean;
  analysis_model?: string;
  drafting_model?: string;
  app_url?: string;
  [key: string]: unknown;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => apiGet<Settings>('/settings'),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: Record<string, string>) =>
      apiPut<Settings>('/settings', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useValidateApiKey() {
  return useMutation({
    mutationFn: (apiKey: string) =>
      apiPost<ValidationResult>('/settings/validate-key', { apiKey }),
  });
}
