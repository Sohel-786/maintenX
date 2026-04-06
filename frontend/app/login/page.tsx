"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { useLogin } from "@/hooks/use-auth-mutations";
import { useAppSettings } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, Eye, EyeOff, Building2 } from "lucide-react";
import { LoginBackground1 } from "@/components/login/LoginBackground1";
import { LoginBackground2 } from "@/components/login/LoginBackground2";
import { LoginMainBackground } from "@/components/login/LoginMainBackground";
import { applyPrimaryColor } from "@/lib/theme";
import { useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const loginMutation = useLogin();
  const { data: appSettings } = useAppSettings();
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    applyPrimaryColor("#0d6efd");
  }, []);

  const softwareName =
    appSettings?.softwareName?.trim() ||
    "MaintenX – Facility Maintenance Portal";
  const logoUrl = appSettings?.logoUrl
    ? `${API_BASE}${appSettings.logoUrl}`
    : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    if (loginMutation.isPending) return;
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen h-dvh w-full flex items-center justify-center relative overflow-hidden">
      {/* Main background container - full viewport */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 w-full h-full pointer-events-none"
        aria-hidden
      >
        {/* Base: primary gradient - top, left, right, bottom: 0 */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-[var(--primary-50)] via-[var(--primary-100)] to-[var(--primary-200)]"
          aria-hidden
        />
        {/* mainbackground.svg - primary-colored via mask, full viewport */}
        <LoginMainBackground />
        {/* Blurred ellipses (primary-themed) - top, left, bottom: 0 */}
        <div className="absolute top-0 left-0 bottom-0 w-[80vmin] overflow-hidden opacity-30">
          <LoginBackground1 className="w-full h-full text-[var(--primary-300)]" />
        </div>
        {/* Blurred ellipses - top, right, bottom: 0 */}
        <div className="absolute top-0 right-0 bottom-0 w-[70vmin] overflow-hidden opacity-25">
          <LoginBackground1 className="w-full h-full text-[var(--primary-400)]" />
        </div>
        {/* Radial pattern (primary gradient) - right: top, right, bottom: 0 */}
        <div className="absolute top-0 right-0 bottom-0 w-[50vw] max-w-[600px] opacity-40">
          <LoginBackground2 className="w-full h-full" />
        </div>
        {/* Soft overlay for form readability */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          aria-hidden
        />
      </div>

      {/* Centered sign-in section */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[420px] mx-4"
      >
        <div className="rounded-2xl shadow-xl shadow-black/10 bg-white/95 backdrop-blur-md border border-white/60 p-8 sm:p-10">
          {/* Logo & software name */}
          <div className="flex flex-col items-center justify-center gap-6 mb-8 text-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={softwareName}
                className="h-24 w-auto shrink-0 object-contain"
              />
            ) : (
              <div className="h-20 w-20 shrink-0 rounded-xl flex items-center justify-center bg-primary shadow-lg shadow-primary/25">
                <Building2 className="h-10 w-10 text-white" />
              </div>
            )}
            <div className="w-full">
              <h1 className="text-2xl font-bold text-gray-700 tracking-tight">
                {softwareName}
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-text"
              >
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...register("username")}
                  className="pl-12 h-12 rounded-xl border-secondary-200 bg-secondary-50/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
              </div>
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-text"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                  className="pl-12 pr-12 h-12 rounded-xl border-secondary-200 bg-secondary-50/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <motion.div
              className="pt-1"
              whileHover={loginMutation.isPending ? {} : { scale: 1.01 }}
              whileTap={loginMutation.isPending ? {} : { scale: 0.99 }}
            >
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </motion.div>

            {loginMutation.isError && (
              <p className="text-sm text-red-600 text-center pt-1">
                {(
                  loginMutation.error as {
                    response?: { status?: number; data?: { message?: string } };
                  }
                )?.response?.status === 401
                  ? "Invalid username or password. Please verify your credentials and try again."
                  : (
                    loginMutation.error as {
                      response?: { data?: { message?: string } };
                    }
                  )?.response?.data?.message ||
                  "Unable to sign you in at the moment. Please try again."}
              </p>
            )}
          </form>
        </div>
      </motion.section>
    </div>
  );
}
