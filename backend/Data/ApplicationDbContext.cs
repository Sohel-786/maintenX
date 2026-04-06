using Microsoft.EntityFrameworkCore;
using net_backend.Models;

namespace net_backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<AppSettings> AppSettings { get; set; } = default!;
        public DbSet<AuditLog> AuditLogs { get; set; } = default!;
        public DbSet<Company> Companies { get; set; } = default!;
        public DbSet<Location> Locations { get; set; } = default!;
        public DbSet<ComplaintCategory> ComplaintCategories { get; set; } = default!;
        public DbSet<FacilityDepartment> FacilityDepartments { get; set; } = default!;
        public DbSet<Complaint> Complaints { get; set; } = default!;
        public DbSet<ComplaintLog> ComplaintLogs { get; set; } = default!;
        public DbSet<User> Users { get; set; } = default!;
        public DbSet<UserPermission> UserPermissions { get; set; } = default!;
        public DbSet<UserLocationAccess> UserLocationAccess { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Complaint>()
                .HasIndex(c => new { c.LocationId, c.ComplaintNo })
                .IsUnique();

            modelBuilder.Entity<ComplaintCategory>()
                .HasIndex(c => new { c.LocationId, c.Name })
                .IsUnique();

            modelBuilder.Entity<Location>()
                .HasOne(l => l.Company)
                .WithMany(c => c.Locations)
                .HasForeignKey(l => l.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Location>()
                .HasIndex(l => new { l.CompanyId, l.Name })
                .IsUnique();

            modelBuilder.Entity<ComplaintCategory>()
                .HasOne(c => c.Location)
                .WithMany()
                .HasForeignKey(c => c.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<FacilityDepartment>()
                .HasIndex(d => new { d.LocationId, d.Name })
                .IsUnique();
            modelBuilder.Entity<FacilityDepartment>()
                .HasOne(d => d.Location)
                .WithMany()
                .HasForeignKey(d => d.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.Location)
                .WithMany()
                .HasForeignKey(c => c.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.Category)
                .WithMany()
                .HasForeignKey(c => c.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.Department)
                .WithMany()
                .HasForeignKey(c => c.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.RaisedBy)
                .WithMany()
                .HasForeignKey(c => c.RaisedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Complaint>()
                .HasOne(c => c.AssignedHandler)
                .WithMany()
                .HasForeignKey(c => c.AssignedHandlerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ComplaintLog>()
                .HasOne(l => l.Complaint)
                .WithMany(c => c.Logs)
                .HasForeignKey(l => l.ComplaintId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ComplaintLog>()
                .HasOne(l => l.User)
                .WithMany()
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AuditLog>()
                .HasOne(a => a.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserPermission>()
                .HasOne(up => up.User)
                .WithOne(u => u.Permission)
                .HasForeignKey<UserPermission>(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserLocationAccess>()
                .HasIndex(ula => new { ula.UserId, ula.CompanyId, ula.LocationId })
                .IsUnique();
            modelBuilder.Entity<UserLocationAccess>()
                .HasOne(ula => ula.User)
                .WithMany(u => u.LocationAccess)
                .HasForeignKey(ula => ula.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<UserLocationAccess>()
                .HasOne(ula => ula.Company)
                .WithMany()
                .HasForeignKey(ula => ula.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<UserLocationAccess>()
                .HasOne(ula => ula.Location)
                .WithMany()
                .HasForeignKey(ula => ula.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasOne(u => u.DefaultCompany)
                .WithMany()
                .HasForeignKey(u => u.DefaultCompanyId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<User>()
                .HasOne(u => u.DefaultLocation)
                .WithMany()
                .HasForeignKey(u => u.DefaultLocationId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
