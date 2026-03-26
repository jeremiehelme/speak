import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPut } from '../lib/api-client';

export interface Draft {
  id: number;
  source_id: number;
  angle: string | null;
  content: string | null;
  feedback: string | null;
  status: string;
  created_at: number;
  updated_at: number;
}

export function useGenerateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, angle }: { sourceId: number; angle: string }) =>
      apiPost<Draft>(`/sources/${sourceId}/drafts`, { angle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source'] });
    },
  });
}

export function useUpdateDraft() {
  return useMutation({
    mutationFn: ({ draftId, content }: { draftId: number; content: string }) =>
      apiPut<Draft>(`/drafts/${draftId}`, { content }),
  });
}

export function useRegenerateDraft() {
  return useMutation({
    mutationFn: ({ draftId, feedback, angle }: { draftId: number; feedback?: string; angle?: string }) =>
      apiPost<Draft>(`/drafts/${draftId}/regenerate`, { feedback, angle }),
  });
}
