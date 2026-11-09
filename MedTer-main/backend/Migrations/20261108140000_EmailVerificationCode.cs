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
            // Idempotent: a previous boot may already have added these columns
            // after a failed migration, and AddColumn would then abort startup.
            migrationBuilder.Sql("""
                IF COL_LENGTH('AspNetUsers', 'EmailVerificationAttempts') IS NULL
                    ALTER TABLE AspNetUsers ADD EmailVerificationAttempts int NOT NULL CONSTRAINT DF_AspNetUsers_EmailVerificationAttempts DEFAULT 0;
                IF COL_LENGTH('AspNetUsers', 'EmailVerificationCodeExpiresUtc') IS NULL
                    ALTER TABLE AspNetUsers ADD EmailVerificationCodeExpiresUtc datetime2 NULL;
                IF COL_LENGTH('AspNetUsers', 'EmailVerificationCodeHash') IS NULL
                    ALTER TABLE AspNetUsers ADD EmailVerificationCodeHash nvarchar(max) NULL;
                IF COL_LENGTH('AspNetUsers', 'EmailVerificationSentUtc') IS NULL
                    ALTER TABLE AspNetUsers ADD EmailVerificationSentUtc datetime2 NULL;
                UPDATE AspNetUsers SET EmailConfirmed = 1;
                """);
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
