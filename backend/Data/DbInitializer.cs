using net_backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using net_backend.Services;

namespace net_backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context, string aesKey)
        {
            if (!context.Companies.Any())
            {
                context.Companies.Add(new Company
                {
                    Name = "Aira Euro Automation Pvt Ltd",
                    ThemeColor = "#0d6efd",
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
                context.SaveChanges();
            }

            if (!context.Locations.Any())
            {
                var firstCompany = context.Companies.OrderBy(c => c.Id).First();
                context.Locations.Add(new Location
                {
                    Name = "Aira Ho",
                    Address = "8, Ajmeri Estate, Industrial Area, Ahmedabad, Gujarat, India",
                    CompanyId = firstCompany.Id,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
                context.SaveChanges();
            }

            var seedCompanyId = context.Companies.OrderBy(c => c.Id).First().Id;
            var seedLocationId = context.Locations.Where(l => l.CompanyId == seedCompanyId).OrderBy(l => l.Id).First().Id;

            var adminUser = context.Users.FirstOrDefault(u => u.Username == "mitul");
            if (adminUser == null)
            {
                adminUser = new User
                {
                    Username = "mitul",
                    FirstName = "Mitul",
                    LastName = "Admin",
                    Password = BCrypt.Net.BCrypt.HashPassword("6636"),
                    EncryptedPassword = AesHelper.Encrypt("6636", aesKey),
                    Role = Role.ADMIN,
                    IsActive = true,
                    DefaultCompanyId = seedCompanyId,
                    DefaultLocationId = seedLocationId,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                context.Users.Add(adminUser);
                context.SaveChanges();
            }
            else
            {
                if (adminUser.DefaultCompanyId == null || adminUser.DefaultLocationId == null)
                {
                    adminUser.DefaultCompanyId = seedCompanyId;
                    adminUser.DefaultLocationId = seedLocationId;
                    adminUser.UpdatedAt = DateTime.Now;
                }
                adminUser.Role = Role.ADMIN;
                adminUser.Password = BCrypt.Net.BCrypt.HashPassword("6636");
                adminUser.EncryptedPassword = AesHelper.Encrypt("6636", aesKey);
                adminUser.UpdatedAt = DateTime.Now;
                context.SaveChanges();
            }

            var adminPerm = context.UserPermissions.FirstOrDefault(p => p.UserId == adminUser.Id);
            if (adminPerm == null)
            {
                adminPerm = MaintenanceDefaultPermissions.ForAdmin(adminUser.Id);
                context.UserPermissions.Add(adminPerm);
            }
            else
            {
                MaintenanceDefaultPermissions.ApplyAdmin(adminPerm);
            }
            context.SaveChanges();

            if (!context.AppSettings.Any())
            {
                context.AppSettings.Add(new AppSettings
                {
                    SoftwareName = "MaintenX – Facility Maintenance Portal",
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
                context.SaveChanges();
            }

            try
            {
                var users = context.Users.ToList();
                foreach (var user in users)
                {
                    if (!context.UserLocationAccess.Any(ula => ula.UserId == user.Id))
                    {
                        context.UserLocationAccess.Add(new UserLocationAccess
                        {
                            UserId = user.Id,
                            CompanyId = seedCompanyId,
                            LocationId = seedLocationId,
                            CreatedAt = DateTime.Now
                        });
                        if (user.DefaultCompanyId == null || user.DefaultLocationId == null)
                        {
                            user.DefaultCompanyId = seedCompanyId;
                            user.DefaultLocationId = seedLocationId;
                            user.UpdatedAt = DateTime.Now;
                        }
                    }
                }
                context.SaveChanges();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"User location access seeding skipped: {ex.Message}");
            }

            try
            {
                var adminIds = context.Users.Where(u => u.Role == Role.ADMIN).Select(u => u.Id).ToList();
                var locationPairs = context.Locations.Select(l => new { l.CompanyId, l.Id }).ToList();
                foreach (var uid in adminIds)
                {
                    foreach (var loc in locationPairs)
                    {
                        if (context.UserLocationAccess.Any(ula => ula.UserId == uid && ula.CompanyId == loc.CompanyId && ula.LocationId == loc.Id))
                            continue;
                        context.UserLocationAccess.Add(new UserLocationAccess
                        {
                            UserId = uid,
                            CompanyId = loc.CompanyId,
                            LocationId = loc.Id,
                            CreatedAt = DateTime.Now
                        });
                    }
                }
                if (adminIds.Count > 0 && locationPairs.Count > 0)
                    context.SaveChanges();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Admin location access backfill skipped: {ex.Message}");
            }

            SeedDefaultCategories(context, seedCompanyId, seedLocationId);
            SeedDefaultDepartments(context, seedCompanyId, seedLocationId);

            // Ensure seeded admin has a valid department value once masters exist.
            try
            {
                var seededAdmin = context.Users.FirstOrDefault(u => u.Username == "mitul");
                if (seededAdmin != null)
                {
                    var hasAdminDept = context.FacilityDepartments.Any(d => d.CompanyId == seedCompanyId && d.Name == "Admin");
                    if (hasAdminDept)
                    {
                        seededAdmin.ProfileDepartment = "Admin";
                        seededAdmin.DefaultCompanyId = seedCompanyId;
                        seededAdmin.DefaultLocationId = seedLocationId;
                        seededAdmin.UpdatedAt = DateTime.Now;
                        context.SaveChanges();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Admin profile department seed skipped: {ex.Message}");
            }
        }

        private static void SeedDefaultCategories(ApplicationDbContext context, int seedCompanyId, int seedLocationId)
        {
            // Company-scoped masters: seed once per company.
            if (context.ComplaintCategories.Any(c => c.CompanyId == seedCompanyId))
                return;
            var defaults = new[] { "Lift", "Electrical", "Plumbing", "Cleaning", "IT", "Safety", "AC", "General" };
            foreach (var name in defaults)
            {
                context.ComplaintCategories.Add(new ComplaintCategory
                {
                    CompanyId = seedCompanyId,
                    LocationId = seedLocationId,
                    Name = name,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
            }
            context.SaveChanges();
        }

        private static void SeedDefaultDepartments(ApplicationDbContext context, int seedCompanyId, int seedLocationId)
        {
            // Company-scoped masters: seed once per company.
            if (context.FacilityDepartments.Any(d => d.CompanyId == seedCompanyId))
                return;
            var defaults = new[] { "Production", "Store", "Inward", "Gate", "QC", "CNC", "Purchase", "IT", "Admin" };
            foreach (var name in defaults)
            {
                context.FacilityDepartments.Add(new FacilityDepartment
                {
                    CompanyId = seedCompanyId,
                    LocationId = seedLocationId,
                    Name = name,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
            }
            context.SaveChanges();
        }
    }
}
