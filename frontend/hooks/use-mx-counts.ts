import { useQuery } from "@tanstack/react-query";
import { User, Role, UserPermission, ComplaintStatus } from "@/types";
import { useLocationContext } from "@/contexts/location-context";
import api from "@/lib/api";

export function useMxCounts(user: User | null, permissions: UserPermission | null | undefined) {
  const { selected } = useLocationContext();

  return useQuery({
    queryKey: ["mx-sidebar-counts", selected?.locationId],
    queryFn: async () => {
      const [openRes, doneRes] = await Promise.all([
        api.get("/complaints", { params: { status: ComplaintStatus.Open, page: 1, pageSize: 200 } }),
        api.get("/complaints", { params: { status: ComplaintStatus.Done, page: 1, pageSize: 200 } }),
      ]);
      return {
        open: (openRes.data.totalCount as number) ?? 0,
        done: (doneRes.data.totalCount as number) ?? 0,
      };
    },
    enabled:
      !!user &&
      !!selected &&
      !!permissions?.assignComplaints &&
      (user.role === Role.COORDINATOR || user.role === Role.ADMIN || permissions.viewAllComplaints),
    staleTime: 30_000,
  });
}
