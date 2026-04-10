'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { AuthLayout } from '@/components/providers/auth-layout';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { LocationProvider } from '@/contexts/location-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocationProvider>
          <AuthLayout>{children}</AuthLayout>
        </LocationProvider>
      </ThemeProvider>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
