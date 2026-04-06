'use client';

import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AccessDeniedProps {
  /** Main message below the title. Default: "You do not have permission to view this page." */
  message?: string;
  /** Button label, e.g. "Go to Companies" */
  actionLabel: string;
  /** Route to navigate when the button is clicked, e.g. "/companies" */
  actionHref: string;
}

const DEFAULT_MESSAGE = 'You do not have permission to view this page.';

export function AccessDenied({ message = DEFAULT_MESSAGE, actionLabel, actionHref }: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex h-[80vh] min-h-[320px] items-center justify-center p-6 font-sans">
      <div className="text-center max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-red-100">
        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">{message}</p>
        <Button
          onClick={() => router.push(actionHref)}
          variant="outline"
          className="w-full border-gray-300 hover:bg-gray-50"
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
