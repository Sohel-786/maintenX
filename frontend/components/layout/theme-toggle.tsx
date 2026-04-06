'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-10 h-10 rounded-xl"
        disabled
      >
        <Sun className="h-5 w-5 text-secondary-400" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-10 h-10 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border"
      title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
    >
      {!isDark ? (
        <Sun className="h-5 w-5 text-amber-500 transition-all duration-300" />
      ) : (
        <Moon className="h-5 w-5 text-blue-400 transition-all duration-300" />
      )}
      <span className="sr-only">Toggle Theme</span>
    </Button>
  );
}
