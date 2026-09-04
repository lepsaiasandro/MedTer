using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class RatingsCertificatesApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Certificates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DoctorUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AnnouncementId = table.Column<int>(type: "int", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Points = table.Column<int>(type: "int", nullable: false),
                    CenterName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Certificates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Certificates_Announcements_AnnouncementId",
                        column: x => x.AnnouncementId,
                        principalTable: "Announcements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Certificates_AspNetUsers_DoctorUserId",
                        column: x => x.DoctorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Ratings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CenterUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DoctorUserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Stars = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ratings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ratings_AspNetUsers_CenterUserId",
                        column: x => x.CenterUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Ratings_AspNetUsers_DoctorUserId",
                        column: x => x.DoctorUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Certificates_AnnouncementId",
                table: "Certificates",
                column: "AnnouncementId");

            migrationBuilder.CreateIndex(
                name: "IX_Certificates_DoctorUserId",
                table: "Certificates",
                column: "DoctorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_CenterUserId_DoctorUserId",
                table: "Ratings",
                columns: new[] { "CenterUserId", "DoctorUserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Ratings_DoctorUserId",
                table: "Ratings",
                column: "DoctorUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Certificates");

            migrationBuilder.DropTable(
                name: "Ratings");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "Announcements");
        }
    }
}
