# MedTer

Medical training platform — training centers and doctors register, browse trainings, and chat in real time.

## Stack
- **Backend:** .NET 10 Web API + EF Core (SQL Server) + ASP.NET Identity + JWT + SignalR
- **Frontend:** React + Vite + TypeScript + Tailwind (built into backend `wwwroot` on publish)

## Run locally

### Backend
```bash
cd MedTer-main/backend
dotnet run
```
API: `http://localhost:5234`

### Frontend (dev)
```bash
cd MedTer-main/medter.client
npm install
npm run dev
```
UI: `http://localhost:5173` (proxies API to local backend)

### Demo accounts (Development seed only)
Password: `pass123`  
Doctors: `nino@medter.ge`, `giorgi@medter.ge`, `mariam@medter.ge`  
Centers: `promed@medter.ge`, `medlearn@medter.ge`, …  
Admin: `admin@medter.ge`

## Deploy to Azure App Service

SPA + API publish as **one** site. `dotnet publish` builds React and copies it into `wwwroot`.

### 1. Create Azure resources
- **App Service** (Windows or Linux, .NET 10)
- **Azure SQL Database**

### 2. App Settings (required or the site returns 503)

**Connection strings** tab → name `Default`, type **SQLAzure** — use **SQL login**, not Active Directory:

```
Server=tcp:YOUR_SERVER.database.windows.net,1433;Initial Catalog=YOUR_DB;User ID=YOUR_SQL_ADMIN;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

Do **not** use `Authentication=Active Directory Default` on App Service (that only works with Managed Identity / local Azure login).

**Application settings:**
| Name | Value |
|------|--------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Jwt__Key` | Long random secret (32+ chars) |
| `Jwt__Issuer` | `medter` |
| `Jwt__Audience` | `medter` |
| `Seed__AdminPassword` | Initial admin password (first boot only) |
| `Seed__Demo` | `true` to seed demo doctors/centers/trainings (password `pass123`) |

Also: SQL server → Networking → allow **Azure services**; then **Restart** the web app.

GitHub Actions can set these from secrets: `MEDTER_SQL_CONNECTION_STRING`, `MEDTER_JWT_KEY`, `MEDTER_SEED_ADMIN_PASSWORD`.

Optional SMTP: `Email__Smtp__Host`, `Email__Smtp__Port`, `Email__Smtp__User`, `Email__Smtp__Password`, `Email__AppealTo`

### 3. Publish

**CLI:**
```bash
cd MedTer-main/backend
dotnet publish -c Release -o ./publish
# Zip publish/ and deploy via Azure Portal / az webapp deploy / VS Publish
```

**Visual Studio:** right-click `backend` → Publish → Azure App Service  
(or edit `Properties/PublishProfiles/Azure-AppService.pubxml` with your profile)

### Notes
- Production serves the SPA from the same origin (`/api`, `/hubs/chat`) — no CORS needed
- Swagger is **Development only**
- Demo users are **not** seeded in Production; only `admin@medter.ge` is created if missing
- Migrations run automatically on startup

## Project layout
```
MedTer-main/
  backend/          .NET API + SignalR + wwwroot (SPA on publish)
  medter.client/    React source
  MedTer.sln
```
