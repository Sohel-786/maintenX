# MaintenX – Facility Maintenance Portal

Web application for **facility maintenance**: complaints lifecycle, roles (Employee, Coordinator, Handler, Admin), and **company/location-scoped** data. Built with **.NET 8** (ASP.NET Core Web API) and **Next.js 14** (static export for IIS).

## Quick start

### 1. Database

Use **SQL Server** (Express or full). Create a database named **`MaintenXDB`** (or your choice) and point the connection string at it.

- Base settings: `backend/appsettings.json`
- Local overrides: `backend/appsettings.Development.json`
- Production template: `backend/appsettings.Production.json` — replace `YOUR_SQL_SERVER`, `YOUR_HOST`, and **set secrets** (see below).

On first run the API applies EF migrations and seeds initial data (`DbInitializer.cs`).

### 2. Backend

Requires **[.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)** or newer (e.g. .NET 9 can build `net8.0` targets).

```bash
cd backend
dotnet restore
dotnet run --launch-profile MaintenX_API
```

Default dev URLs are in `Properties/launchSettings.json` (e.g. `https://localhost:7155`, Swagger at `/swagger`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server: `http://localhost:3000` (API proxied via `next.config.js` rewrites).

### Production static hosting

For the combined IIS publish (`publish.ps1`), set `frontend/.env.production` (see `.env.production.example`): `NEXT_PUBLIC_API_URL=/api` so the browser calls the same origin.

---

## Default credentials (seeded)

Defined in `backend/Data/DbInitializer.cs`:

- **Username**: `mitul`
- **Password**: `admin`

Change immediately in production.

---

## Production configuration

**Do not** ship real secrets in `appsettings.Production.json`. Use environment variables or a secret store. ASP.NET Core maps nested keys with double underscore:

| Setting | Environment variable |
|--------|----------------------|
| SQL connection | `ConnectionStrings__DefaultConnection` |
| JWT signing key (≥ 32 UTF-8 bytes) | `Jwt__Key` |
| JWT issuer / audience | `Jwt__Issuer`, `Jwt__Audience` |
| AES helper for encrypted fields | `PasswordEncryption__Key` |
| CORS origins | `Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`, … (indexed keys), or set the array in JSON config |

**Note:** If you change `PasswordEncryption:Key` after users were created with the old key, encrypted fields may not decrypt until users are re-saved or passwords rotated.

**CORS:** `Cors:AllowedOrigins` in appsettings is an array of allowed web origins (e.g. your public site URL). Same-origin IIS hosting with `/api` often does not need browser CORS for the app itself; add origins if you host the SPA on a different domain.

---

## Automated publish

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\publish.ps1
```

Creates `Publish/<timestamp>/` with the backend publish output and the Next.js export under `wwwroot`.

---

## Tech stack

| Layer | Stack |
|-------|--------|
| API | .NET 8, EF Core 8, SQL Server, JWT (cookie + bearer), Swagger (dev) |
| UI | Next.js 14 App Router, TypeScript, Tailwind, TanStack Query, React Hook Form + Zod |

---

## Repository layout

```
maintainx/
├── backend/          # ASP.NET Core 8 API (project: net_backend.csproj)
├── frontend/         # Next.js app (package: maintenx-frontend)
├── publish.ps1       # Combined backend + static frontend publish
└── README.md
```
