import { Role, type User, type UserPermission } from "@/types";

/** Primary ticket list route for the current user (dashboard deep-links, redirects). */
export function ticketListPath(
  user: User | null | undefined,
  permissions: UserPermission | null | undefined,
): string {
  if (!user || !permissions) return "/my-tickets";
  if (user.role === Role.HANDLER) return "/my-work";
  if (permissions.viewAllComplaints || user.role === Role.COORDINATOR || user.role === Role.ADMIN) {
    return "/all-tickets";
  }
  return "/my-tickets";
}
