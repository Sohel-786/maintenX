'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

type Position = { top: number; left: number } | null;

interface DropdownMenuContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement>;
  contentRef: React.RefObject<HTMLDivElement>;
  position: Position;
  setPosition: (p: Position) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState<Position>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insideContent = contentRef.current?.contains(target);
      if (insideTrigger || insideContent) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const value = React.useMemo(
    () => ({
      isOpen,
      setIsOpen,
      triggerRef,
      contentRef,
      position,
      setPosition,
    }),
    [isOpen, position]
  );

  return (
    <DropdownMenuContext.Provider value={value}>
      <div className="relative inline-block" ref={triggerRef}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  asChild,
}: {
  children: React.ReactElement;
  asChild?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      context.setIsOpen(!context.isOpen);
    },
  });
}

export function DropdownMenuContent({
  children,
  className,
  align = 'start',
}: {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'end' | 'center';
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

  React.useEffect(() => {
    if (!context.isOpen || !context.triggerRef.current) return;
    const rect = context.triggerRef.current.getBoundingClientRect();
    const gap = 4;
    const top = rect.bottom + gap;
    let left = rect.left;
    if (align === 'end') left = rect.right; // we'll use right in style
    else if (align === 'center') left = rect.left + rect.width / 2;
    context.setPosition({ top, left });
    return () => context.setPosition(null);
  }, [context.isOpen, align]);

  const style: React.CSSProperties =
    context.position && typeof document !== "undefined"
      ? {
        position: "fixed",
        top: context.position.top,
        ...(align === "end"
          ? { right: window.innerWidth - context.position.left }
          : align === "center"
            ? { left: context.position.left, transform: "translateX(-50%)" }
            : { left: context.position.left }),
        zIndex: 9999,
      }
      : { position: "fixed", top: 0, left: 0, opacity: 0, pointerEvents: "none", zIndex: -1 };

  const content = (
    <AnimatePresence>
      {context.isOpen && (
        <motion.div
          ref={context.contentRef}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.12 }}
          style={style}
          className={cn(
            'min-w-[8rem] overflow-hidden rounded-lg border border-secondary-200 bg-white p-1 text-secondary-950 shadow-xl outline-none',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}

export function DropdownMenuItem({
  children,
  asChild,
  className,
  onClick,
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuItem must be used within DropdownMenu');

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.(e);
    context.setIsOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      className: cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-secondary-100 hover:text-secondary-900 focus:bg-secondary-100 focus:text-secondary-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
        (children.props as any).className
      ),
      onClick: (e: React.MouseEvent) => {
        (children.props as any).onClick?.(e);
        handleClick(e);
      },
    });
  }

  return (
    <div
      role="menuitem"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent);
          context.setIsOpen(false);
        }
      }}
      tabIndex={0}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-secondary-100 hover:text-secondary-900 focus:bg-secondary-100 focus:text-secondary-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
    >
      {children}
    </div>
  );
}
