using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <inheritdoc />
    public partial class MxTicketTablesAndDepartments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_complaint_categories_locations_LocationId",
                table: "complaint_categories");

            migrationBuilder.DropForeignKey(
                name: "FK_complaint_logs_complaints_ComplaintId",
                table: "complaint_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_complaint_logs_users_UserId",
                table: "complaint_logs");

            migrationBuilder.DropForeignKey(
                name: "FK_complaints_complaint_categories_CategoryId",
                table: "complaints");

            migrationBuilder.DropForeignKey(
                name: "FK_complaints_locations_LocationId",
                table: "complaints");

            migrationBuilder.DropForeignKey(
                name: "FK_complaints_users_AssignedHandlerUserId",
                table: "complaints");

            migrationBuilder.DropForeignKey(
                name: "FK_complaints_users_RaisedByUserId",
                table: "complaints");

            migrationBuilder.DropPrimaryKey(
                name: "PK_complaints",
                table: "complaints");

            migrationBuilder.DropPrimaryKey(
                name: "PK_complaint_logs",
                table: "complaint_logs");

            migrationBuilder.DropPrimaryKey(
                name: "PK_complaint_categories",
                table: "complaint_categories");

            migrationBuilder.RenameTable(
                name: "complaints",
                newName: "mx_maintenance_tickets");

            migrationBuilder.RenameTable(
                name: "complaint_logs",
                newName: "mx_ticket_timeline");

            migrationBuilder.RenameTable(
                name: "complaint_categories",
                newName: "mx_ticket_categories");

            migrationBuilder.RenameIndex(
                name: "IX_complaints_RaisedByUserId",
                table: "mx_maintenance_tickets",
                newName: "IX_mx_maintenance_tickets_RaisedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_complaints_LocationId_ComplaintNo",
                table: "mx_maintenance_tickets",
                newName: "IX_mx_maintenance_tickets_LocationId_ComplaintNo");

            migrationBuilder.RenameIndex(
                name: "IX_complaints_CategoryId",
                table: "mx_maintenance_tickets",
                newName: "IX_mx_maintenance_tickets_CategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_complaints_AssignedHandlerUserId",
                table: "mx_maintenance_tickets",
                newName: "IX_mx_maintenance_tickets_AssignedHandlerUserId");

            migrationBuilder.RenameIndex(
                name: "IX_complaint_logs_UserId",
                table: "mx_ticket_timeline",
                newName: "IX_mx_ticket_timeline_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_complaint_logs_ComplaintId",
                table: "mx_ticket_timeline",
                newName: "IX_mx_ticket_timeline_ComplaintId");

            migrationBuilder.RenameIndex(
                name: "IX_complaint_categories_LocationId_Name",
                table: "mx_ticket_categories",
                newName: "IX_mx_ticket_categories_LocationId_Name");

            migrationBuilder.AddColumn<string>(
                name: "ProfileDepartment",
                table: "users",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompletionPhotoUrl",
                table: "mx_maintenance_tickets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "mx_maintenance_tickets",
                type: "int",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_mx_maintenance_tickets",
                table: "mx_maintenance_tickets",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_mx_ticket_timeline",
                table: "mx_ticket_timeline",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_mx_ticket_categories",
                table: "mx_ticket_categories",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "mx_facility_departments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_mx_facility_departments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_mx_facility_departments_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_mx_maintenance_tickets_DepartmentId",
                table: "mx_maintenance_tickets",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_mx_facility_departments_LocationId_Name",
                table: "mx_facility_departments",
                columns: new[] { "LocationId", "Name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_maintenance_tickets_locations_LocationId",
                table: "mx_maintenance_tickets",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_maintenance_tickets_mx_facility_departments_DepartmentId",
                table: "mx_maintenance_tickets",
                column: "DepartmentId",
                principalTable: "mx_facility_departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_maintenance_tickets_mx_ticket_categories_CategoryId",
                table: "mx_maintenance_tickets",
                column: "CategoryId",
                principalTable: "mx_ticket_categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_maintenance_tickets_users_AssignedHandlerUserId",
                table: "mx_maintenance_tickets",
                column: "AssignedHandlerUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_maintenance_tickets_users_RaisedByUserId",
                table: "mx_maintenance_tickets",
                column: "RaisedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_ticket_categories_locations_LocationId",
                table: "mx_ticket_categories",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_ticket_timeline_mx_maintenance_tickets_ComplaintId",
                table: "mx_ticket_timeline",
                column: "ComplaintId",
                principalTable: "mx_maintenance_tickets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_mx_ticket_timeline_users_UserId",
                table: "mx_ticket_timeline",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_mx_maintenance_tickets_locations_LocationId",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_maintenance_tickets_mx_facility_departments_DepartmentId",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_maintenance_tickets_mx_ticket_categories_CategoryId",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_maintenance_tickets_users_AssignedHandlerUserId",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_maintenance_tickets_users_RaisedByUserId",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_ticket_categories_locations_LocationId",
                table: "mx_ticket_categories");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_ticket_timeline_mx_maintenance_tickets_ComplaintId",
                table: "mx_ticket_timeline");

            migrationBuilder.DropForeignKey(
                name: "FK_mx_ticket_timeline_users_UserId",
                table: "mx_ticket_timeline");

            migrationBuilder.DropTable(
                name: "mx_facility_departments");

            migrationBuilder.DropPrimaryKey(
                name: "PK_mx_ticket_timeline",
                table: "mx_ticket_timeline");

            migrationBuilder.DropPrimaryKey(
                name: "PK_mx_ticket_categories",
                table: "mx_ticket_categories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_mx_maintenance_tickets",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropIndex(
                name: "IX_mx_maintenance_tickets_DepartmentId",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropColumn(
                name: "ProfileDepartment",
                table: "users");

            migrationBuilder.DropColumn(
                name: "CompletionPhotoUrl",
                table: "mx_maintenance_tickets");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "mx_maintenance_tickets");

            migrationBuilder.RenameTable(
                name: "mx_ticket_timeline",
                newName: "complaint_logs");

            migrationBuilder.RenameTable(
                name: "mx_ticket_categories",
                newName: "complaint_categories");

            migrationBuilder.RenameTable(
                name: "mx_maintenance_tickets",
                newName: "complaints");

            migrationBuilder.RenameIndex(
                name: "IX_mx_ticket_timeline_UserId",
                table: "complaint_logs",
                newName: "IX_complaint_logs_UserId");

            migrationBuilder.RenameIndex(
                name: "IX_mx_ticket_timeline_ComplaintId",
                table: "complaint_logs",
                newName: "IX_complaint_logs_ComplaintId");

            migrationBuilder.RenameIndex(
                name: "IX_mx_ticket_categories_LocationId_Name",
                table: "complaint_categories",
                newName: "IX_complaint_categories_LocationId_Name");

            migrationBuilder.RenameIndex(
                name: "IX_mx_maintenance_tickets_RaisedByUserId",
                table: "complaints",
                newName: "IX_complaints_RaisedByUserId");

            migrationBuilder.RenameIndex(
                name: "IX_mx_maintenance_tickets_LocationId_ComplaintNo",
                table: "complaints",
                newName: "IX_complaints_LocationId_ComplaintNo");

            migrationBuilder.RenameIndex(
                name: "IX_mx_maintenance_tickets_CategoryId",
                table: "complaints",
                newName: "IX_complaints_CategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_mx_maintenance_tickets_AssignedHandlerUserId",
                table: "complaints",
                newName: "IX_complaints_AssignedHandlerUserId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_complaint_logs",
                table: "complaint_logs",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_complaint_categories",
                table: "complaint_categories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_complaints",
                table: "complaints",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_complaint_categories_locations_LocationId",
                table: "complaint_categories",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_complaint_logs_complaints_ComplaintId",
                table: "complaint_logs",
                column: "ComplaintId",
                principalTable: "complaints",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_complaint_logs_users_UserId",
                table: "complaint_logs",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_complaints_complaint_categories_CategoryId",
                table: "complaints",
                column: "CategoryId",
                principalTable: "complaint_categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_complaints_locations_LocationId",
                table: "complaints",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_complaints_users_AssignedHandlerUserId",
                table: "complaints",
                column: "AssignedHandlerUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_complaints_users_RaisedByUserId",
                table: "complaints",
                column: "RaisedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
