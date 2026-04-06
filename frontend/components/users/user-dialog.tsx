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

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.nativeEnum(Role),
  isActive: z.boolean().default(true),
  mobileNumber: z.string().optional().nullable(),
  companyId: z.number().optional(),
  locationId: z.number().optional(),
}).superRefine((data, ctx) => {
  if (!data.password && !data.companyId) return;
  const mobileMandatory =
    data.role === Role.EMPLOYEE || data.role === Role.COORDINATOR || data.role === Role.HANDLER;
  const mobile = data.mobileNumber?.trim();
  if (mobileMandatory && (!mobile || mobile.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Mobile number is mandatory for Employee, Coordinator, and Handler",
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
      role: Role.EMPLOYEE,
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
        firstName: user.firstName,
        lastName: user.lastName,
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
        firstName: "",
        lastName: "",
        role: Role.EMPLOYEE,
        isActive: true,
        mobileNumber: "",
        companyId: undefined,
        locationId: undefined,
      });
    }
  }, [isOpen, user, reset]);

  const onSubmit = (data: UserFormValues) => {
    if (user) {
      updateUser.mutate(
        {
          id: user.id,
          data: {
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
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
          firstName: data.firstName,
          lastName: data.lastName,
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">First Name <span className="text-red-500">*</span></Label>
            <Input {...register("firstName")} className="h-11 border-secondary-300" placeholder="First name" />
            {errors.firstName && <p className="text-xs text-rose-500">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Last Name <span className="text-red-500">*</span></Label>
            <Input {...register("lastName")} className="h-11 border-secondary-300" placeholder="Last name" />
            {errors.lastName && <p className="text-xs text-rose-500">{errors.lastName.message}</p>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Username <span className="text-red-500">*</span></Label>
            <Input {...register("username")} className="h-11 border-secondary-300" placeholder="Username" disabled={!!user} />
            {errors.username && <p className="text-xs text-rose-500">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Password {user ? "(leave blank to keep)" : "*"}</Label>
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
              <option value={Role.EMPLOYEE}>Employee</option>
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
        <div className="flex items-center gap-3 py-2">
          <input type="checkbox" {...register("isActive")} className="w-4 h-4 rounded border-secondary-300 text-primary-600" id="user-active" />
          <Label htmlFor="user-active" className="text-sm font-medium text-secondary-700">Active</Label>
        </div>
        <div className="flex gap-3 pt-4 border-t border-secondary-100">
          <Button type="submit" disabled={isPending} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-11">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving... </> : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-secondary-300 text-secondary-700 font-bold h-11">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
