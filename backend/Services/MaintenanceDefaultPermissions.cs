using net_backend.Models;

namespace net_backend.Services
{
    public static class MaintenanceDefaultPermissions
    {
        public static UserPermission ForAdmin(int userId)
        {
            var p = Base(userId);
            ApplyAdmin(p);
            return p;
        }

        public static void ApplyAdmin(UserPermission perm)
        {
            perm.ViewDashboard = true;
            perm.ViewComplaints = true;
            perm.RaiseComplaint = true;
            perm.ViewAllComplaints = true;
            perm.AssignComplaints = true;
            perm.HandleComplaints = true;
            perm.ManageCategories = true;
            perm.ViewMaster = true;
            perm.AddMaster = true;
            perm.EditMaster = true;
            perm.ImportMaster = true;
            perm.ExportMaster = true;
            perm.ManageCompany = true;
            perm.ManageLocation = true;
            perm.ManageCategories = true;
            perm.ManageDepartment = true;
            perm.AccessSettings = true;
            perm.ExportDashboard = true;
            perm.UpdatedAt = DateTime.Now;
        }

        public static UserPermission ForRole(int userId, Role role)
        {
            var p = Base(userId);
            switch (role)
            {
                case Role.ADMIN:
                    ApplyAdmin(p);
                    break;
                case Role.COORDINATOR:
                    p.ViewDashboard = true;
                    p.ViewComplaints = true;
                    p.RaiseComplaint = true;
                    p.ViewAllComplaints = true;
                    p.AssignComplaints = true;
                    p.HandleComplaints = false;
                    p.ManageCategories = false;
                    p.ManageDepartment = false;
                    break;
                case Role.HANDLER:
                    p.ViewDashboard = true;
                    p.ViewComplaints = true;
                    p.RaiseComplaint = false;
                    p.ViewAllComplaints = false;
                    p.AssignComplaints = false;
                    p.HandleComplaints = true;
                    p.ManageCategories = false;
                    p.ManageDepartment = false;
                    break;
                case Role.USER:
                default:
                    p.ViewDashboard = true;
                    p.ViewComplaints = true;
                    p.RaiseComplaint = true;
                    p.ViewAllComplaints = false;
                    p.AssignComplaints = false;
                    p.HandleComplaints = false;
                    p.ManageCategories = false;
                    p.ManageDepartment = false;
                    break;
            }
            return p;
        }

        private static UserPermission Base(int userId)
        {
            var now = DateTime.Now;
            return new UserPermission
            {
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now,
                NavigationLayout = "SIDEBAR"
            };
        }
    }
}
