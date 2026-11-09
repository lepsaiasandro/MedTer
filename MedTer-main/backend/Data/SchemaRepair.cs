using System.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace backend.Data;

/// <summary>
/// SQLite is created once with <c>EnsureCreated</c>, so an existing file never
/// picks up new columns. Login then fails on every account. Add the missing
/// AspNetUsers columns in place and keep the rows.
/// </summary>
public static class SchemaRepair
{
    public static async Task EnsureApplicationUserColumnsAsync(AppDbContext db, ILogger logger)
    {
        var entity = db.Model.FindEntityType(typeof(ApplicationUser));
        if (entity is null)
            return;

        var tableName = entity.GetTableName();
        if (string.IsNullOrEmpty(tableName))
            return;

        var conn = db.Database.GetDbConnection();
        var openedHere = conn.State != ConnectionState.Open;
        if (openedHere)
            await conn.OpenAsync();

        try
        {
            var sqlite = db.Database.IsSqlite();
            var existing = await ReadColumnsAsync(conn, tableName, sqlite);
            if (existing.Count == 0)
                return;

            var store = StoreObjectIdentifier.Table(tableName, entity.GetSchema());
            foreach (var prop in entity.GetProperties())
            {
                var column = prop.GetColumnName(store);
                if (string.IsNullOrEmpty(column) || existing.Contains(column))
                    continue;

                var sql = sqlite
                    ? SqliteAddColumn(tableName, column, prop)
                    : SqlServerAddColumn(tableName, column, prop);

                logger.LogWarning("Adding missing column {Table}.{Column}", tableName, column);
                await using var alter = conn.CreateCommand();
                alter.CommandText = sql;
                await alter.ExecuteNonQueryAsync();
            }
        }
        finally
        {
            if (openedHere)
                await conn.CloseAsync();
        }
    }

    private static async Task<HashSet<string>> ReadColumnsAsync(System.Data.Common.DbConnection conn, string tableName, bool sqlite)
    {
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (tableName.Any(c => !char.IsLetterOrDigit(c) && c != '_'))
            return names;

        await using var cmd = conn.CreateCommand();
        if (sqlite)
            cmd.CommandText = $"SELECT name FROM pragma_table_info('{tableName}')";
        else
        {
            cmd.CommandText = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table";
            var p = cmd.CreateParameter();
            p.ParameterName = "@table";
            p.Value = tableName;
            cmd.Parameters.Add(p);
        }

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            if (!reader.IsDBNull(0))
                names.Add(reader.GetString(0));
        }

        return names;
    }

    private static string SqliteAddColumn(string table, string column, IProperty prop)
    {
        var type = prop.GetColumnType();
        var nullability = prop.IsNullable
            ? "NULL"
            : $"NOT NULL {DefaultClause(prop, sqlite: true)}";
        return $"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" {type} {nullability}";
    }

    private static string SqlServerAddColumn(string table, string column, IProperty prop)
    {
        var type = prop.GetColumnType();
        var nullability = prop.IsNullable
            ? "NULL"
            : $"NOT NULL {DefaultClause(prop, sqlite: false)}";
        return $"ALTER TABLE [{table}] ADD [{column}] {type} {nullability}";
    }

    private static string DefaultClause(IProperty prop, bool sqlite)
    {
        var clr = Nullable.GetUnderlyingType(prop.ClrType) ?? prop.ClrType;
        if (clr == typeof(string) || clr == typeof(Guid))
            return sqlite ? "DEFAULT ''" : "DEFAULT N''";
        if (clr == typeof(DateTime) || clr == typeof(DateTimeOffset))
            return "DEFAULT '1970-01-01T00:00:00'";
        return "DEFAULT 0";
    }
}
