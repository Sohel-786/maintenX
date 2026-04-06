"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { User, Role } from "@/types";

interface CreateUserData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive?: boolean;
  avatar?: string | null;
  mobileNumber?: string | null;
  companyId: number;
  locationId: number;
}

interface UpdateUserData {
  username?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  isActive?: boolean;
  mobileNumber?: string | null;
  companyId?: number;
  locationId?: number;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<User[]> => {
      const response = await api.get("/users");
      return response.data.data || response.data;
    },
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: async (): Promise<User> => {
      const response = await api.get(`/users/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData): Promise<User> => {
      const response = await api.post("/users", data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to create user";
      toast.error(message);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateUserData;
    }): Promise<User> => {
      const response = await api.patch(`/users/${id}`, data);
      return response.data.data;
    },
    onSuccess: (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      // If current user updated their own profile, refresh localStorage and notify Header
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id === updatedUser.id) {
            localStorage.setItem("user", JSON.stringify(updatedUser));
            // Notify AuthLayout/Header to reflect changes without page reload
            window.dispatchEvent(
              new CustomEvent("currentUserUpdated", { detail: updatedUser }),
            );
          }
        }
      } catch {
        // ignore
      }
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to update user";
      toast.error(message);
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<User> => {
      const response = await api.patch(`/users/${id}/deactivate`);
      return response.data.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", id] });
      toast.success("User deactivated successfully");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Failed to deactivate user";
      toast.error(message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to delete user";
      toast.error(message);
    },
  });
}
