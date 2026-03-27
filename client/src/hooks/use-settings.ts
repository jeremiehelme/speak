import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut, apiPost } from '../lib/api-client';

interface Settings {
  hasApiKey: boolean;
  hasXCredentials: boolean;
  analysis_model?: string;
  drafting_model?: string;
  app_url?: string;
  [key: string]: unknown;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
}

interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
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
    mutationFn: (updates: Record<string, string>) => apiPut<Settings>('/settings', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useValidateApiKey() {
  return useMutation({
    mutationFn: (apiKey: string) => apiPost<ValidationResult>('/settings/validate-key', { apiKey }),
  });
}

export function useBookmarklet() {
  return useQuery<{ code: string }>({
    queryKey: ['bookmarklet'],
    queryFn: () => apiGet<{ code: string }>('/settings/bookmarklet'),
  });
}

export function useSaveXCredentials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (creds: XCredentials) =>
      apiPut<{ hasXCredentials: boolean }>('/settings/x-credentials', creds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useValidateXConnection() {
  return useMutation({
    mutationFn: (creds?: XCredentials) =>
      apiPost<ValidationResult>('/settings/validate-x', creds ?? {}),
  });
}

export interface ScheduleSlot {
  day: string;
  time: string;
}

interface ScheduleData {
  schedule: { slots: ScheduleSlot[] };
  defaults: ScheduleSlot[];
}

export function useSchedule() {
  return useQuery<ScheduleData>({
    queryKey: ['schedule'],
    queryFn: () => apiGet<ScheduleData>('/settings/schedule'),
  });
}

export function useSaveSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slots: ScheduleSlot[]) =>
      apiPut<{ schedule: { slots: ScheduleSlot[] } }>('/settings/schedule', { slots }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });
}

export interface TimeRestrictions {
  start: string | null;
  end: string | null;
  timezone: string;
}

export function useTimeRestrictions() {
  return useQuery<TimeRestrictions>({
    queryKey: ['time-restrictions'],
    queryFn: () => apiGet<TimeRestrictions>('/settings/time-restrictions'),
  });
}

export function useSaveTimeRestrictions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (restrictions: Partial<TimeRestrictions>) =>
      apiPut<TimeRestrictions>('/settings/time-restrictions', restrictions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-restrictions'] });
    },
  });
}
