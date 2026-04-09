'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import api from '@/lib/api';
import { User, Role } from '@/types';
import { CompanyLocationAccess } from "@/contexts/location-context";

interface LoginData {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user: User;
  allowedLocationAccess?: CompanyLocationAccess[];
  AllowedLocationAccess?: CompanyLocationAccess[];
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginData): Promise<LoginResponse> => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        const access =
          data.allowedLocationAccess ?? data.AllowedLocationAccess ?? [];
        if (Array.isArray(access)) {
          localStorage.setItem("allowedLocationAccess", JSON.stringify(access));
          // Set default selection to first (company, location) so API requests always have headers
          const pairs = access.flatMap((c: CompanyLocationAccess) =>
            (c.locations || []).map((l: { id: number }) => ({ companyId: c.companyId, locationId: l.id }))
          );
          if (pairs.length >= 1) {
            const context = { companyId: pairs[0].companyId, locationId: pairs[0].locationId };
            localStorage.setItem("selectedOrgContext", JSON.stringify(context));
            window.dispatchEvent(new CustomEvent("orgContextChanged", { detail: context }));
          } else {
            localStorage.removeItem("selectedOrgContext");
            window.dispatchEvent(new CustomEvent("orgContextChanged", { detail: null }));
          }
        }
        queryClient.setQueryData(['user'], data.user);
        toast.success('Login successful!');

        const role = data.user.role as Role;
        if (role === Role.HANDLER) {
          router.push('/complaints');
        } else if (role === Role.USER) {
          router.push('/complaints/raise');
        } else {
          router.push('/dashboard');
        }
      }
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const backendMessage = error.response?.data?.message;

      const message =
        status === 401
          ? 'Invalid username or password.'
          : backendMessage || 'Login failed.';

      toast.error(message);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem('user');
      localStorage.removeItem("allowedLocationAccess");
      localStorage.removeItem("selectedOrgContext");
      queryClient.clear();
      toast.success('Logged out successfully');
      window.location.href = '/login';
    },
    onError: () => {
      localStorage.removeItem('user');
      localStorage.removeItem("allowedLocationAccess");
      localStorage.removeItem("selectedOrgContext");
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}

