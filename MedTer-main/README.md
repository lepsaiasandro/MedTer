# MedTer — MVP

სამედიცინო ტრენინგების პლატფორმა. ტრენინგ ცენტრები და ექიმები რეგისტრირდებიან და
რეალურ დროში (live chat) კომუნიკაციობენ.

## სტეკი
- **Backend:** .NET 10 Web API + EF Core (SQL Server / LocalDB) + ASP.NET Identity + JWT + SignalR
- **Frontend:** React + Vite + TypeScript + Tailwind

## ფუნქციონალი (ამ ეტაპზე)
- ტრენინგ ცენტრის რეგისტრაცია
- ექიმის რეგისტრაცია
- შესვლა (JWT)
- ლაივ ჩატი ცენტრსა და ექიმს შორის (SignalR, real-time)

> სერტიფიკატები/ქულები ჯერ არ არის — მომავალი ეტაპი.

## სოლუშენი
`MedTer.sln` (root-ში) შეიცავს **ორ ცალკე პროექტს**:
- **backend** — `backend/backend.csproj` (.NET API)
- **medter.client** — `medter.client/medter.client.esproj` (React აპი, JavaScript პროექტი)

Visual Studio-ში გახსენი `MedTer.sln` და ორივე პროექტს დაინახავ.

## გაშვება

### 1. Backend
```bash
cd backend
dotnet run
```
გაეშვება `http://localhost:5234`-ზე. მიგრაციები + seed ავტომატურად ეშვება.

> ბაზის შესაცვლელად: `backend/appsettings.json` → `ConnectionStrings:Default`.

### 2. Frontend (dev)
```bash
cd medter.client
npm install
npm run dev
```
გაეშვება `http://localhost:5173`-ზე.

## სატესტო ანგარიშები (seed)
პირველ გაშვებაზე ავტომატურად იქმნება. პაროლი ყველას: `pass123`

**ექიმები:** `nino@medter.ge`, `giorgi@medter.ge`, `mariam@medter.ge`
**ტრენინგ ცენტრები:** `promed@medter.ge`, `medlearn@medter.ge`, `vitamed@medter.ge`, `neuroedu@medter.ge`

> ქულების პანელი და სერტიფიკატები ამ ეტაპზე frontend-ის mock მონაცემებია (backend ჯერ არ არის).
> ტრენინგ ცენტრების ფოტოები placeholder-ია (picsum.photos).

## დაქphოსტვა (MonsterASP.NET — ერთი საიტი)
ფრონტი backend-ის `wwwroot`-იდან იდება, ანუ ერთ საიტზე მუშაობს ორივე.
**backend პროექტის publish** ავტომატურად ააგებს React-ს (`npm install` + `npm run build`)
და ჩასვამს `wwwroot`-ში — ცალკე ნაბიჯი არ სჭირდება.

**Visual Studio-დან:** მარჯვენა კლიკი `backend` პროექტზე → **Publish** → WebDeploy პროფილით.

**ან CLI-დან:**
```bash
cd backend
dotnet publish -c Release -o publish
# publish/-ის შიგთავსი ატვირთე MonsterASP.NET-ზე
```

- Production-ში იყენებს `appsettings.Production.json`-ს (შიდა DB `db63708.databaseasp.net`).
- ფრონტი production build-ში API-ს **იმავე origin-ზე** (`/api`, `/hubs/chat`) ეძახის — CORS არ სჭირდება.
- Swagger ხელმისაწვდომია `/swagger`-ზე.

## სტრუქტურა
```
backend/
  Models/        # ApplicationUser, TrainingCenterProfile, DoctorProfile, Message
  Data/          # AppDbContext (EF Core + Identity)
  Dtos/          # request/response ობიექტები
  Services/      # TokenService (JWT)
  Controllers/   # AuthController, UsersController, ChatController
  Hubs/          # ChatHub (SignalR)
  Program.cs     # კონფიგურაცია (DB, Identity, JWT, CORS, SignalR)

frontend/src/
  api.ts         # axios + token interceptor
  auth.tsx       # AuthContext (login/logout, localStorage)
  components/    # Layout (sidebar + header)
  pages/         # Login, Register, Dashboard, Chat
  App.tsx        # router + protected routes
```

## API
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| POST | `/api/auth/register/training-center` | ცენტრის რეგისტრაცია |
| POST | `/api/auth/register/doctor` | ექიმის რეგისტრაცია |
| POST | `/api/auth/login` | შესვლა → JWT |
| GET  | `/api/users` | კონტაქტები (მოპირდაპირე როლი) |
| GET  | `/api/chat/{otherUserId}` | მიმოწერის ისტორია |
| WS   | `/hubs/chat` | SignalR: `SendMessage(receiverId, text)` → `ReceiveMessage` |
