using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <inheritdoc />
    public partial class DepartmentRequiredOnComplaints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ensure a "General" department exists per company so we can backfill old rows safely.
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM mx_facility_departments WHERE Name = 'General')
BEGIN
    INSERT INTO mx_facility_departments (CompanyId, LocationId, Name, IsActive, CreatedAt, UpdatedAt)
    SELECT l.CompanyId, MIN(l.Id) AS LocationId, 'General', 1, GETDATE(), GETDATE()
    FROM locations l
    GROUP BY l.CompanyId;
END
");

            // Backfill existing complaints with NULL department.
            migrationBuilder.Sql(@"
UPDATE c
SET c.DepartmentId = d.Id
FROM mx_maintenance_tickets c
INNER JOIN locations l ON l.Id = c.LocationId
INNER JOIN mx_facility_departments d ON d.CompanyId = l.CompanyId AND d.Name = 'General'
WHERE c.DepartmentId IS NULL;
");

            // SQL Server: indexes depending on the column must be dropped before ALTER COLUMN.
            migrationBuilder.DropIndex(
                name: "IX_mx_maintenance_tickets_DepartmentId",
                table: "mx_maintenance_tickets");

            // Make DepartmentId required
            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "mx_maintenance_tickets",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_mx_maintenance_tickets_DepartmentId",
                table: "mx_maintenance_tickets",
                column: "DepartmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_mx_maintenance_tickets_DepartmentId",
                table: "mx_maintenance_tickets");

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "mx_maintenance_tickets",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_mx_maintenance_tickets_DepartmentId",
                table: "mx_maintenance_tickets",
                column: "DepartmentId");
        }
    }
}

