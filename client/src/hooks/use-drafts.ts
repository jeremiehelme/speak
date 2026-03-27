import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut } from '../lib/api-client';

export interface Draft {
  id: number;
  source_id: number;
  angle: string | null;
  content: string | null;
  feedback: string | null;
  status: string;
  published_status: string | null;
  published_url: string | null;
  published_at: number | null;
  scheduled_at: number | null;
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, content }: { draftId: number; content: string }) =>
      apiPut<Draft>(`/drafts/${draftId}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source'] });
    },
  });
}

export function usePublishDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: number) => apiPost<Draft>(`/drafts/${draftId}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source'] });
    },
  });
}

export function useScheduleDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: number) => apiPost<Draft>(`/drafts/${draftId}/schedule`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useUnscheduleDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: number) => apiPost<Draft>(`/drafts/${draftId}/unschedule`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useQueue() {
  return useQuery<Draft[]>({
    queryKey: ['queue'],
    queryFn: () => apiGet<Draft[]>('/queue'),
  });
}

export function useRescheduleDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, scheduledAt }: { draftId: number; scheduledAt: number }) =>
      apiPut<Draft>(`/drafts/${draftId}/reschedule`, { scheduledAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      queryClient.invalidateQueries({ queryKey: ['source'] });
    },
  });
}

export function useRegenerateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      draftId,
      feedback,
      angle,
    }: {
      draftId: number;
      feedback?: string;
      angle?: string;
    }) => apiPost<Draft>(`/drafts/${draftId}/regenerate`, { feedback, angle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source'] });
    },
  });
}

export function useTranslateDraft() {
  return useMutation({
    mutationFn: ({ draftId, language }: { draftId: number; language: string }) =>
      apiPost<{ translated: string }>(`/drafts/${draftId}/translate`, { language }),
  });
}
