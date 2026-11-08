using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using backend.Data;

#nullable disable

namespace backend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261108140000_EmailVerificationCode")]
    public partial class EmailVerificationCode : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EmailVerificationAttempts",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailVerificationCodeExpiresUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EmailVerificationCodeHash",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EmailVerificationSentUtc",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            // Accounts that already exist were created before email codes.
            migrationBuilder.Sql("UPDATE AspNetUsers SET EmailConfirmed = 1");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "EmailVerificationAttempts", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "EmailVerificationCodeExpiresUtc", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "EmailVerificationCodeHash", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "EmailVerificationSentUtc", table: "AspNetUsers");
        }
    }
}
