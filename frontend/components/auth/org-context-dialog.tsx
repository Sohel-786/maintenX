"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, MapPin } from "lucide-react";
import { CompanyLocationAccess, SelectedOrgContext } from "@/contexts/location-context";
import {
  Select,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onClose?: () => void;
  access: CompanyLocationAccess[];
  onSelect: (sel: SelectedOrgContext) => void;
  closeDisabled?: boolean;
};

export function OrgContextDialog({ open, onClose, access, onSelect, closeDisabled = true }: Props) {
  const companies = useMemo(
    () =>
      (access || [])
        .map((c) => ({ id: c.companyId, name: c.companyName, locations: c.locations || [] }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [access],
  );

  const hasMultipleCompanies = companies.length > 1;

  const [companyId, setCompanyId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    // Default selection when dialog opens
    if (companies.length === 1) {
      const c = companies[0];
      setCompanyId(c.id);
      if (c.locations.length === 1) setLocationId(c.locations[0].id);
      else setLocationId(null);
    } else {
      setCompanyId(null);
      setLocationId(null);
    }
  }, [open, companies]);

  const availableLocations = useMemo(() => {
    const c = companies.find((x) => x.id === companyId);
    return (c?.locations || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [companies, companyId]);

  useEffect(() => {
    // reset location if company changes
    setLocationId(null);
  }, [companyId]);

  const canConfirm = companyId != null && locationId != null;

  const title = hasMultipleCompanies ? "Select Company & Location" : "Select Location";

  return (
    <Dialog
      isOpen={open}
      onClose={onClose || (() => {})}
      title={title}
      size="md"
      closeOnBackdropClick={false}
      closeButtonDisabled={closeDisabled}
    >
      <div className="space-y-5">
        <div className="text-sm text-secondary-600 dark:text-secondary-400">
          Choose where you want to work. All masters, transactions, and reports will be scoped to this location.
        </div>

        {hasMultipleCompanies && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-secondary-500" /> Company
            </label>
            <Select
              value={companyId?.toString() || ""}
              onValueChange={(v) => setCompanyId(v ? Number(v) : null)}
              className="h-11 rounded-xl"
              placeholder="Select company..."
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id.toString()}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-secondary-500" /> Location
          </label>
          <Select
            value={locationId?.toString() || ""}
            onValueChange={(v) => setLocationId(v ? Number(v) : null)}
            disabled={companyId == null}
            className="h-11 rounded-xl"
            placeholder={companyId == null ? "Select company first..." : "Select location..."}
          >
            {availableLocations.map((l) => (
              <option key={l.id} value={l.id.toString()}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {onClose && !closeDisabled && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button disabled={!canConfirm} onClick={() => onSelect({ companyId: companyId!, locationId: locationId! })}>
            Continue
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

