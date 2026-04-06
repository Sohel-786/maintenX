"use client"

import * as React from "react"
import { format, parseISO, isValid } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: Date | string | null
    onChange?: (date: Date | undefined) => void
    placeholder?: string
    className?: string
    disabled?: boolean
    clearable?: boolean
    disabledDays?: any // Can be Matcher | Matcher[]
    fromYear?: number
    toYear?: number
}

export function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    className,
    disabled,
    clearable = false,
    disabledDays,
    fromYear = 1900,
    toYear = new Date().getFullYear() + 20,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const date = React.useMemo(() => {
        if (!value) return undefined
        if (value instanceof Date) return value
        const parsed = parseISO(value)
        return isValid(parsed) ? parsed : undefined
    }, [value])

    const handleSelect = (selectedDate: Date | undefined) => {
        onChange?.(selectedDate);
        setOpen(false); // Close on select
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal pr-8 relative whitespace-nowrap overflow-hidden",
                        !date && "text-secondary-500",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">
                        {date ? format(date, "dd/MM/yyyy") : placeholder}
                    </span>
                    {clearable && date && !disabled && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange?.(undefined);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-secondary-100 text-secondary-400 hover:text-secondary-600 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </div>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    disabled={disabledDays}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={fromYear}
                    toYear={toYear}
                />
            </PopoverContent>
        </Popover>
    )
}
