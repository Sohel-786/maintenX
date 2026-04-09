"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Role } from "@/types";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { useCompaniesActive, useLocationsActive } from "@/hooks/use-settings";
import { Save, X, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  role: z.nativeEnum(Role),
  isActive: z.boolean().default(true),
  mobileNumber: z.string().optional().nullable(),
  companyId: z.number().optional(),
  locationId: z.number().optional(),
}).superRefine((data, ctx) => {
  if (!data.password && !data.companyId) return;
  const mobileMandatory =
    data.role === Role.USER || data.role === Role.COORDINATOR || data.role === Role.HANDLER;
  const mobile = data.mobileNumber?.trim();
  if (mobileMandatory && (!mobile || mobile.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Mobile number is mandatory for User, Coordinator, and Handler",
      path: ["mobileNumber"],
    });
  }
  if (mobile && mobile.length > 0 && !/^[6-9]\d{9}$/.test(mobile)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter a valid 10-digit Indian mobile number", path: ["mobileNumber"] });
  }
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
}

export function UserDialog({ isOpen, onClose, user }: UserDialogProps) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const { data: companies = [] } = useCompaniesActive();
  const { data: locations = [] } = useLocationsActive();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: Role.USER,
      isActive: true,
    },
  });

  const companyId = watch("companyId");

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      const companyIdVal = (user as any).defaultCompanyId ?? user.companyId ?? undefined;
      const locationIdVal = (user as any).defaultLocationId ?? user.locationId ?? undefined;
      reset({
        username: user.username,
        name: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        isActive: user.isActive,
        mobileNumber: user.mobileNumber || "",
        password: "",
        companyId: companyIdVal,
        locationId: locationIdVal,
      });
    } else {
      reset({
        username: "",
        password: "",
        name: "",
        role: Role.USER,
        isActive: true,
        mobileNumber: "",
        companyId: undefined,
        locationId: undefined,
      });
    }
  }, [isOpen, user, reset]);

  const onSubmit = (data: UserFormValues) => {
    const normalized = data.name?.trim() || "";
    const parts = normalized.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;
    if (user) {
      updateUser.mutate(
        {
          id: user.id,
          data: {
            username: data.username,
            firstName,
            lastName,
            role: data.role,
            isActive: data.isActive,
            mobileNumber: data.mobileNumber || null,
            ...(data.password ? { password: data.password } : {}),
            ...(data.companyId != null && data.locationId != null ? { companyId: data.companyId, locationId: data.locationId } : {}),
          },
        },
        { onSuccess: onClose }
      );
    } else {
      const companyIdVal = data.companyId ?? 0;
      const locationIdVal = data.locationId ?? 0;
      if (!data.password || !companyIdVal || !locationIdVal) return;
      createUser.mutate(
        {
          username: data.username,
          password: data.password,
          firstName,
          lastName,
          role: data.role,
          isActive: data.isActive ?? true,
          mobileNumber: data.mobileNumber || null,
          companyId: companyIdVal,
          locationId: locationIdVal,
        },
        { onSuccess: onClose }
      );
    }
  };

  const isPending = createUser.isPending || updateUser.isPending;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={user ? "Edit User" : "Add User"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input {...register("name")} className="h-11 border-secondary-300" placeholder="Full name" />
          {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Username <span className="text-red-500">*</span></Label>
            <Input {...register("username")} className="h-11 border-secondary-300" placeholder="Username" disabled={!!user} />
            {errors.username && <p className="text-xs text-rose-500">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Password {user ? "" : "*"}</Label>
            <Input type="password" {...register("password")} className="h-11 border-secondary-300" placeholder={user ? "••••••••" : "Password"} />
            {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Mobile</Label>
            <Input
              {...register("mobileNumber")}
              className="h-11 border-secondary-300"
              placeholder="10-digit mobile"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                setValue("mobileNumber", v || "", { shouldValidate: true });
              }}
            />
            {errors.mobileNumber && <p className="text-xs text-rose-500">{errors.mobileNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Role <span className="text-red-500">*</span></Label>
            <Select
              value={watch("role")}
              onValueChange={(v) => setValue("role", v as Role, { shouldValidate: true })}
              className="h-11"
            >
              <option value={Role.USER}>User</option>
              <option value={Role.COORDINATOR}>Coordinator</option>
              <option value={Role.HANDLER}>Handler</option>
              <option value={Role.ADMIN}>Admin</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Company <span className="text-red-500">*</span></Label>
            <Select
              value={watch("companyId")?.toString() || ""}
              onValueChange={(v) => {
                const val = v ? Number(v) : undefined;
                setValue("companyId", val, { shouldValidate: true });
                setValue("locationId", undefined);
              }}
              placeholder="Select company"
              className="h-11"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </Select>
            {errors.companyId && <p className="text-xs text-rose-500">{errors.companyId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Location <span className="text-red-500">*</span></Label>
            <Select
              value={watch("locationId")?.toString() || ""}
              onValueChange={(v) => setValue("locationId", v ? Number(v) : undefined, { shouldValidate: true })}
              disabled={!companyId}
              placeholder={companyId ? "Select location" : "Select company first"}
              className="h-11"
            >
              {locations.filter((l) => l.companyId === companyId).map((l) => (
                <option key={l.id} value={l.id.toString()}>{l.name}</option>
              ))}
            </Select>
            {errors.locationId && <p className="text-xs text-rose-500">{errors.locationId.message}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-secondary-200 bg-secondary-50/50 p-4 transition-colors hover:bg-secondary-50 dark:border-white/10 dark:bg-white/5">
          <div className="space-y-0.5">
            <Label htmlFor="user-active" className="text-sm font-bold text-secondary-900 dark:text-white">Active</Label>
            <p className="text-xs text-secondary-500">
              Inactive users cannot sign in and won't appear in handler assignment where applicable.
            </p>
          </div>
          <Switch
            id="user-active"
            checked={watch("isActive")}
            onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
          />
        </div>
        <div className="-mx-6 flex gap-4 mt-8 border-t border-secondary-100 bg-secondary-50/30 px-6 pt-5 pb-1 dark:border-white/10 dark:bg-white/[0.02]">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose} 
            className="flex-1 border-secondary-300 text-secondary-700 font-bold h-12 shadow-sm hover:bg-white active:scale-[0.98] transition-all"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isPending} 
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-12 shadow-md shadow-primary-500/20 active:scale-[0.98] transition-all"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save User</>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

