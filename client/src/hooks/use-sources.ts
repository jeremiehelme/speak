import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '../lib/api-client';

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
  return useQuery<Source>({
    queryKey: ['source', id],
    queryFn: () => apiGet<Source>(`/sources/${id}`),
    enabled: !!id,
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
  return useMutation({
    mutationFn: ({ sourceId, count }: { sourceId: number; count?: number }) =>
      apiPost<Angle[]>(`/sources/${sourceId}/angles`, { count }),
  });
}
