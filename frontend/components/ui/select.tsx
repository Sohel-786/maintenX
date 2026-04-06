"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Radix Primitives (Shadcn Style)
 * ----------------------------------------------------------------------------------------------- */

const SelectRoot = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-[2000] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

/* -------------------------------------------------------------------------------------------------
 * Smart Combined Component
 * ----------------------------------------------------------------------------------------------- */

interface SmartSelectProps {
  children?: React.ReactNode;
  value?: any;
  onValueChange?: (v: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Smart Select:
 * Detects if used as Radix Root (wrapping SelectTrigger/SelectContent) or Legacy Wrapper.
 */
const Select = Object.assign(
  React.forwardRef<HTMLSelectElement, SmartSelectProps>(
    ({ children, value, onValueChange, onChange, className, placeholder, ...props }, ref) => {
      // Check if it's already using the Radix primitive triggers
      const isRadixMode = React.Children.toArray(children).some(
        (child) => React.isValidElement(child) && (child.type === SelectTrigger || child.type === SelectGroup)
      );

      if (isRadixMode) {
        return (
          <SelectRoot value={value?.toString()} onValueChange={onValueChange} {...props}>
            {children}
          </SelectRoot>
        );
      }

      // Legacy Mode Implementation
      const handleValueChange = (val: string) => {
        onValueChange?.(val);
        if (onChange) {
          const event = {
            target: { value: val },
            currentTarget: { value: val },
          } as React.ChangeEvent<HTMLSelectElement>;
          onChange(event);
        }
      };

      const mappedOptions = React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === "option") {
          const p = child.props as any;
          return (
            <SelectItem 
              key={p.value} 
              value={p.value?.toString() || ""}
              disabled={p.disabled}
            >
              {p.children}
            </SelectItem>
          );
        }
        return child;
      });

      return (
        <SelectRoot value={value?.toString()} onValueChange={handleValueChange} disabled={props.disabled}>
          <SelectTrigger className={className}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent sideOffset={5}>
            {mappedOptions}
          </SelectContent>
        </SelectRoot>
      );
    }
  ),
  {
    displayName: "Select",
  }
)

export {
  Select,
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
}
