import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '../lib/api-client';

export interface VoiceProfile {
  id: number;
  voice_description: string | null;
  example_posts: string | null;
  general_opinions: string | null;
  created_at: number;
  updated_at: number;
}

export function useProfile() {
  return useQuery<VoiceProfile | null>({
    queryKey: ['profile'],
    queryFn: () => apiGet<VoiceProfile | null>('/profile'),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      voiceDescription?: string;
      examplePosts?: string;
      generalOpinions?: string;
    }) => apiPut<VoiceProfile>('/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
