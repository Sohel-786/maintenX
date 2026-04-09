"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Location, Company } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect, useMemo } from "react";
import { Save, X, MapPin } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const schema = z.object({
  name: z.string().min(1, "Location name is required").max(200),
  companyId: z.coerce.number().min(1, "Company is required"),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface LocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void;
  item?: Location | null;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function LocationDialog({ isOpen, onClose, onSubmit, item, isLoading, readOnly }: LocationDialogProps) {
  const isReadOnly = !!readOnly;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true },
  });

  const isActive = watch("isActive");
  const companyId = watch("companyId");
  const nameValue = watch("name");

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["companies", "active"],
    queryFn: async () => (await api.get("/companies/active")).data.data,
  });

  const { data: nameSuggestions = [] } = useQuery({
    queryKey: ["locations", "name-suggestions", companyId, nameValue],
    queryFn: async () => {
      const res = await api.get("/locations/name-suggestions", {
        params: { companyId, q: nameValue?.trim() || undefined },
      });
      return (res.data.data ?? []) as string[];
    },
    enabled: isOpen && !!companyId && companyId > 0,
    staleTime: 15_000,
  });

  const datalistId = useMemo(() => "mx-loc-names-" + (companyId || "0"), [companyId]);

  useEffect(() => {
    if (item && isOpen) {
      reset({
        name: item.name,
        companyId: item.companyId,
        isActive: item.isActive,
      });
    } else if (isOpen) {
      reset({ name: "", companyId: 0, isActive: true });
    }
  }, [item, reset, isOpen]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={item ? "Edit location" : "Register location"}
      size="md"
      confirmOnEscWhenDirty={!isReadOnly}
      isDirty={!isReadOnly && isDirty}
    >
      <form
        onSubmit={handleSubmit((data) => {
          if (isReadOnly) return;
          onSubmit(data);
        })}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Company <span className="text-destructive">*</span>
          </Label>
          <SearchableSelect
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            value={companyId || ""}
            onChange={(val) => {
              if (isReadOnly) return;
              if (!item) setValue("companyId", Number(val), { shouldValidate: true });
            }}
            placeholder="Select company…"
            id="parent-company"
            disabled={isReadOnly || !!item}
            className="h-11 font-medium"
          />
          {errors.companyId && !item && <p className="text-xs text-destructive">{errors.companyId.message}</p>}
          {!!item && (
            <p className="text-xs text-muted-foreground">Company cannot be changed after the location is created.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="location-name" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Location name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="location-name"
              list={companyId ? datalistId : undefined}
              autoComplete="off"
              {...register("name")}
              className="h-11 pl-10"
              placeholder="e.g. Main plant, Warehouse A"
              disabled={isReadOnly}
            />
          </div>
          {companyId > 0 && (
            <datalist id={datalistId}>
              {nameSuggestions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          )}
          <p className="text-xs text-muted-foreground">
            Names must be unique per company. Suggestions show existing locations for the selected company.
          </p>
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {!!item && (
          <div className="flex items-center justify-between rounded-xl border border-secondary-200 bg-secondary-50/50 p-4 transition-colors hover:bg-secondary-50 dark:border-white/10 dark:bg-white/5">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-secondary-900 dark:text-white">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive locations are excluded from new assignments.</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
              disabled={isReadOnly}
            />
          </div>
        )}

        <div className="flex gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {!isReadOnly && (
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Saving…" : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {item ? "Update" : "Save"}
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
