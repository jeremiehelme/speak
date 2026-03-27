import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api-client';
import { useRef, useEffect } from 'react';

export interface Source {
  id: number;
  url: string | null;
  title: string | null;
  raw_text: string | null;
  extracted_content: string | null;
  analysis_summary: string | null;
  category: string | null;
  themes: string | null;
  takeaways: string | null;
  relevance: string | null;
  opinion: string | null;
  analysis_status: string;
  targeted_questions: string | null;
  targeted_answers: string | null;
  angles: string | null;
  created_at: number;
  updated_at: number;
}

export function useSources(search?: string) {
  return useQuery<Source[]>({
    queryKey: ['sources', search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return apiGet<Source[]>(`/sources${params}`);
    },
  });
}

export function useSource(id: string | undefined) {
  const query = useQuery<Source>({
    queryKey: ['source', id],
    queryFn: () => apiGet<Source>(`/sources/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      if (data.analysis_status === 'pending') return 2000;
      if (data.analysis_status === 'complete' && !data.angles) return 2000;
      return false;
    },
  });
  return query;
}

export function useRetryAnalysis() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: number) =>
      apiPost<Source>(`/sources/${sourceId}/retry-analysis`, {}),
    onSuccess: (_data, sourceId) => {
      queryClient.invalidateQueries({ queryKey: ['source', String(sourceId)] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiDelete(`/sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export interface Angle {
  title: string;
  description: string;
}

export function useGenerateAngles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, count }: { sourceId: number; count?: number }) =>
      apiPost<Angle[]>(`/sources/${sourceId}/angles`, { count }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source'] });
    },
  });
}

export function useUpdateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, title }: { sourceId: number; title: string }) =>
      apiPut<Source>(`/sources/${sourceId}`, { title }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['source', String(variables.sourceId)] });
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });
}

export function useSaveAnswers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, answers }: { sourceId: number; answers: string[] }) =>
      apiPut<Source>(`/sources/${sourceId}/answers`, { answers }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['source', String(variables.sourceId)] });
    },
  });
}
