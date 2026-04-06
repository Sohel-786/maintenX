'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { AppSettings, UserPermission, Company, Location } from '@/types';

export function useAppSettings() {
  return useQuery({
    queryKey: ['settings', 'software'],
    queryFn: async (): Promise<AppSettings> => {
      const response = await api.get('/settings/software');
      return response.data.data;
    },
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<AppSettings>): Promise<AppSettings> => {
      const response = await api.patch('/settings/software', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'software'] });
      toast.success('Software settings saved');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to save settings';
      toast.error(message);
    },
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<AppSettings> => {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await api.post('/settings/software/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'software'] });
      toast.success('Logo updated');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to upload logo';
      toast.error(message);
    },
  });
}

export function useUserPermissions(userId?: number) {
  return useQuery({
    queryKey: ['settings', 'permissions', userId],
    queryFn: async (): Promise<{ permissions: UserPermission } | null> => {
      if (!userId) return null;
      const response = await api.get(`/settings/permissions/user/${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });
}

/** Current logged-in user's permissions (from GET /settings/permissions/me). Use for view/add/edit checks on pages. */
export function useCurrentUserPermissions(enabled = true) {
  return useQuery({
    queryKey: ['settings', 'permissions', 'me'],
    queryFn: async (): Promise<UserPermission | null> => {
      const response = await api.get('/settings/permissions/me');
      return response.data.data ?? null;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function useUpdateUserPermissions(currentUserId?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: number; permissions: Partial<UserPermission> }): Promise<any> => {
      const response = await api.put(`/settings/permissions/user/${userId}`, { permissions });
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'permissions', variables.userId] });
      if (currentUserId !== undefined && variables.userId === currentUserId) {
        queryClient.invalidateQueries({ queryKey: ['settings', 'permissions', 'me'] });
      }
      toast.success('User permissions saved');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to save permissions';
      toast.error(message);
    },
  });
}

export function useCompaniesActive() {
  return useQuery({
    queryKey: ['companies', 'active'],
    queryFn: async (): Promise<Company[]> => {
      const response = await api.get('/companies/active');
      return response.data.data ?? response.data ?? [];
    },
  });
}

export function useLocationsActive() {
  return useQuery({
    queryKey: ['locations', 'active'],
    queryFn: async (): Promise<Location[]> => {
      const response = await api.get('/locations/active');
      return response.data.data ?? response.data ?? [];
    },
  });
}

export type CompanyLocationAccessItem = {
  companyId: number;
  companyName: string;
  locations: { id: number; name: string }[];
};

export function useUserLocationAccess(userId: number | null) {
  return useQuery({
    queryKey: ['users', userId, 'location-access'],
    queryFn: async (): Promise<CompanyLocationAccessItem[]> => {
      if (!userId) return [];
      const response = await api.get(`/users/${userId}/location-access`);
      return response.data.data ?? response.data ?? [];
    },
    enabled: !!userId,
  });
}

export function useUpdateUserLocationAccess(userId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: { companyId: number; locationId: number }[]) => {
      const response = await api.put(`/users/${userId}/location-access`, items);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', userId, 'location-access'] });
      toast.success('Location access updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update location access');
    },
  });
}
export function useCompany(id?: number) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: async (): Promise<Company> => {
      const response = await api.get(`/companies/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/** Fetches details for the currently selected company in the header context. */
export function useCurrentCompany() {
  const selRaw = typeof window !== 'undefined' ? localStorage.getItem('selectedOrgContext') : null;
  let companyId: number | undefined;
  if (selRaw) {
    try {
      const sel = JSON.parse(selRaw);
      companyId = sel?.companyId;
    } catch { }
  }
  return useCompany(companyId);
}

// Transfer rules removed: transfers are allowed between any parties.
