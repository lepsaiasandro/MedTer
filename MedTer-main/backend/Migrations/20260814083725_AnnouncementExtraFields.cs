using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AnnouncementExtraFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Duration",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Format",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Language",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Price",
                table: "Announcements",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "RegistrationDeadline",
                table: "Announcements",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Seats",
                table: "Announcements",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShortDescription",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "Published");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Announcements",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Duration",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Format",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Language",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "RegistrationDeadline",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Seats",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "ShortDescription",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Announcements");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Announcements");
        }
    }
}
