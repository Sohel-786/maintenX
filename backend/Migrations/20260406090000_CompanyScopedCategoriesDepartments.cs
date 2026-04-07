using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <inheritdoc />
    public partial class CompanyScopedCategoriesDepartments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "mx_ticket_categories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "mx_facility_departments",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Backfill company ids from the existing location FK
            migrationBuilder.Sql(@"
UPDATE c
SET c.CompanyId = l.CompanyId
FROM mx_ticket_categories c
INNER JOIN locations l ON l.Id = c.LocationId;
");
            migrationBuilder.Sql(@"
UPDATE d
SET d.CompanyId = l.CompanyId
FROM mx_facility_departments d
INNER JOIN locations l ON l.Id = d.LocationId;
");

            // De-dupe within each company (keeps the lowest Id per name)
            migrationBuilder.Sql(@"
WITH x AS (
    SELECT Id, ROW_NUMBER() OVER (PARTITION BY CompanyId, Name ORDER BY Id) AS rn
    FROM mx_ticket_categories
)
DELETE FROM x WHERE rn > 1;
");
            migrationBuilder.Sql(@"
WITH x AS (
    SELECT Id, ROW_NUMBER() OVER (PARTITION BY CompanyId, Name ORDER BY Id) AS rn
    FROM mx_facility_departments
)
DELETE FROM x WHERE rn > 1;
");

            // Replace uniqueness from (LocationId, Name) -> (CompanyId, Name)
            migrationBuilder.DropIndex(
                name: "IX_mx_ticket_categories_LocationId_Name",
                table: "mx_ticket_categories");

            migrationBuilder.DropIndex(
                name: "IX_mx_facility_departments_LocationId_Name",
                table: "mx_facility_departments");

            migrationBuilder.CreateIndex(
                name: "IX_mx_ticket_categories_CompanyId_Name",
                table: "mx_ticket_categories",
                columns: new[] { "CompanyId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mx_facility_departments_CompanyId_Name",
                table: "mx_facility_departments",
                columns: new[] { "CompanyId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mx_ticket_categories_CompanyId",
                table: "mx_ticket_categories",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_mx_facility_departments_CompanyId",
                table: "mx_facility_departments",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_mx_ticket_categories_companies_CompanyId",
                table: "mx_ticket_categories",
                column: "CompanyId",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_facility_departments_companies_CompanyId",
                table: "mx_facility_departments",
                column: "CompanyId",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_mx_ticket_categories_companies_CompanyId",
                table: "mx_ticket_categories");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_facility_departments_companies_CompanyId",
                table: "mx_facility_departments");

            migrationBuilder.DropIndex(
                name: "IX_mx_ticket_categories_CompanyId_Name",
                table: "mx_ticket_categories");

            migrationBuilder.DropIndex(
                name: "IX_mx_facility_departments_CompanyId_Name",
                table: "mx_facility_departments");

            migrationBuilder.DropIndex(
                name: "IX_mx_ticket_categories_CompanyId",
                table: "mx_ticket_categories");

            migrationBuilder.DropIndex(
                name: "IX_mx_facility_departments_CompanyId",
                table: "mx_facility_departments");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "mx_ticket_categories");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "mx_facility_departments");

            migrationBuilder.CreateIndex(
                name: "IX_mx_ticket_categories_LocationId_Name",
                table: "mx_ticket_categories",
                columns: new[] { "LocationId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_mx_facility_departments_LocationId_Name",
                table: "mx_facility_departments",
                columns: new[] { "LocationId", "Name" },
                unique: true);
        }
    }
}

