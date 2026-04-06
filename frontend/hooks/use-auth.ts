'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { User } from '@/types';

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      try {
        await api.post('/auth/validate');
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    validateAuth();
  }, [router]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore errors
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem("allowedLocationAccess");
      localStorage.removeItem("selectedOrgContext");
      sessionStorage.clear();
      // Force full page reload to clear all state including React Query
      window.location.href = '/login';
    }
  };

  return { user, loading, logout };
}
