# Part 1: Database Schema & Architecture

## Schema Design Strategy (PostgreSQL & Prisma ORM)

We use **PostgreSQL** as a relational database managed through **Prisma ORM** (`schema.prisma`). Base user credentials and access controls reside in a central `User` model, with 1-to-1 extension tables (`DoctorProfile` and `PatientProfile`) for role-specific attributes. All relationships (appointments, prescriptions, medical records, notifications) use explicit **Foreign Key Constraints** and relational indexing.

### Models & Relationships (`prisma/schema.prisma`)

```prisma
enum Role {
  admin
  doctor
  patient
}

enum AppointmentStatus {
  pending
  confirmed
  completed
  cancelled
  no_show
}

enum MeetingType {
  in_person
  video
}

model User {
  id                     String          @id @default(uuid())
  email                  String          @unique
  passwordHash           String
  role                   Role
  firstName              String
  lastName               String
  phone                  String?
  avatarUrl              String?
  isActive               Boolean         @default(true)
  isEmailVerified        Boolean         @default(false)
  refreshTokenHash       String?
  refreshFamilyId        String?
  emailVerifyToken       String?
  emailVerifyExpiresAt   DateTime?
  resetPasswordToken     String?
  resetPasswordExpiresAt DateTime?
  lastLoginAt            DateTime?
  createdAt              DateTime        @default(now())
  updatedAt              DateTime        @updatedAt

  doctorProfile          DoctorProfile?
  patientProfile         PatientProfile?

  doctorAppointments     Appointment[]   @relation("DoctorAppointments")
  patientAppointments    Appointment[]   @relation("PatientAppointments")
  doctorPrescriptions    Prescription[]  @relation("DoctorPrescriptions")
  patientPrescriptions   Prescription[]  @relation("PatientPrescriptions")
  patientRecords         MedicalRecord[] @relation("PatientRecords")
  doctorMedicalRecords   MedicalRecord[] @relation("DoctorMedicalRecords")
  uploadedRecords        MedicalRecord[] @relation("UploadedRecords")
  notifications          Notification[]  @relation("UserNotifications")

  @@map("users")
}

model DoctorProfile {
  id              String      @id @default(uuid())
  userId          String      @unique
  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  specialization  String
  qualifications  String[]
  experienceYears Int         @default(0)
  consultationFee Float       @default(0)
  departmentId    String?
  department      Department? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  weeklySchedule  Json        @default("[]")
  averageRating   Float       @default(0)
  ratingsCount    Int         @default(0)
  isAvailable     Boolean     @default(true)
  bio             String?

  @@map("doctor_profiles")
}

model PatientProfile {
  id                String    @id @default(uuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  dateOfBirth       DateTime?
  gender            String?
  bloodGroup        String?
  address           Json?
  emergencyContact  Json?
  allergies         String[]
  chronicConditions String[]

  @@map("patient_profiles")
}

model Department {
  id           String          @id @default(uuid())
  name         String          @unique
  description  String?
  headDoctorId String?
  isActive     Boolean         @default(true)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  doctors      DoctorProfile[]

  @@map("departments")
}

model Appointment {
  id             String            @id @default(uuid())
  patientId      String
  patient        User              @relation("PatientAppointments", fields: [patientId], references: [id])
  doctorId       String
  doctor         User              @relation("DoctorAppointments", fields: [doctorId], references: [id])
  slotStart      DateTime
  slotEnd        DateTime
  status         AppointmentStatus @default(pending)
  reason         String?
  symptoms       String[]
  diagnosis      String?
  meetingType    MeetingType       @default(in_person)
  cancelledById  String?
  prescriptionId String?
  notes          String?
  videoRoomId    String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  prescription   Prescription?

  @@index([doctorId, slotStart, status])
  @@index([patientId, slotStart])
  @@map("appointments")
}

model Prescription {
  id             String      @id @default(uuid())
  appointmentId  String      @unique
  appointment    Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patientId      String
  patient        User        @relation("PatientPrescriptions", fields: [patientId], references: [id])
  doctorId       String
  doctor         User        @relation("DoctorPrescriptions", fields: [doctorId], references: [id])
  medications    Json
  notes          String?
  pdfStoragePath String?
  pdfFileName    String?
  pdfGeneratedAt DateTime?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@map("prescriptions")
}

model MedicalRecord {
  id             String   @id @default(uuid())
  patientId      String
  patient        User     @relation("PatientRecords", fields: [patientId], references: [id])
  doctorId       String?
  doctor         User?    @relation("DoctorMedicalRecords", fields: [doctorId], references: [id])
  appointmentId  String?
  title          String
  description    String?
  type           String
  files          Json     @default("[]")
  uploadedById   String
  uploadedBy     User     @relation("UploadedRecords", fields: [uploadedById], references: [id])
  isConfidential Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@map("medical_records")
}

model Notification {
  id                String   @id @default(uuid())
  recipientId       String
  recipient         User     @relation("UserNotifications", fields: [recipientId], references: [id], onDelete: Cascade)
  senderId          String?
  type              String
  title             String
  message           String
  relatedEntityType String?
  relatedEntityId   String?
  isRead            Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([recipientId, isRead, createdAt])
  @@map("notifications")
}
```

### Architectural Rules (PostgreSQL & Prisma)
1. **Transactions**: Use `prisma.$transaction()` for atomic multi-table operations (e.g. appointment booking + slot lock + notification dispatch).
2. **Relational Integrity**: Enforce foreign keys with `onDelete: Cascade` or `SetNull` to prevent orphaned records.
3. **Data Access Layer**: All queries pass through the **Repository Pattern** using `PrismaClient` delegates.
4. **Caching Layer (Redis)**: Refresh token allowlist, rate limit counters, dashboard metrics (5 min TTL), socket adapter.
5. **Soft Deletes**: Use `isActive` boolean flags for users and departments; preserve audit logs and transactional history.
6. **Pagination**: Use cursor-based or limit/skip pagination utilities optimized for relational tables.

---

# Part 2: 4-Week Implementation Roadmap

## Week 1 — Foundation & Authentication

### Backend
- Scaffold Node.js project with TypeScript layered structure (`config`, `repositories`, `services`, `controllers`, `routes`, `middlewares`, `validators`, `utils`).
- Env loader with Zod schema validation (`config/env.ts`) checking `DATABASE_URL`.
- PostgreSQL database setup with Prisma 7 and `@prisma/adapter-pg` driver adapter.
- Schema setup in `prisma/schema.prisma` (`User`, `DoctorProfile`, `PatientProfile`, `Department`).
- Auth service: register (patient & doctor), login, logout, refresh (rotation + reuse detection), email verification, forgot/reset password.
- JWT strategy: access token 15 min in HTTP-only cookie (`SameSite=Lax`, `Secure` in prod), refresh token 7d hashed in DB.
- Middlewares: `authenticate`, `authorize(roles)`, `validate(schema)`, `errorHandler`, `notFound`, rate limiters.
- Email transport with console fallback in dev; SendGrid/SMTP in production.
- Health check endpoints (`/api/v1/health`, `/api/v1/health/db`) and Pino logger.

### Frontend
- Vite + React + TypeScript, Vanilla CSS design system.
- Axios instance with request interceptor (CSRF header) + response interceptor (auto-refresh on 401).
- React Router with `ProtectedRoute` + `RoleRoute` wrappers.
- Zustand store for `auth` slice.
- Auth pages: Login, Register, Verify Email, Forgot/Reset Password.

**Deliverable**: Working authentication flow with PostgreSQL & Prisma backend.

---

## Week 2 — Appointments, Real-Time Notifications, RBAC Enforcement

### Backend
- Schema tables: `Appointment`, `Notification`, `Prescription`.
- Repositories: `appointment.repo.ts`, `notification.repo.ts`, `prescription.repo.ts`.
- Slot locking & availability algorithms avoiding double-booking.
- Endpoints: `POST /api/v1/appointments`, `GET /api/v1/appointments`, `PATCH /api/v1/appointments/:id/status`, `GET /api/v1/appointments/doctors/:doctorId/available-slots`.
- Socket.io server with JWT authentication and rooms (`user:<id>`).
- Notification service sending real-time socket events for appointment status updates.

### Frontend
- Doctor Search Directory (`/doctors`) with specialization filters and empty states.
- Multi-step appointment booking wizard (`/book-appointment`) with slot picker and payment gateway modal.
- Notifications dropdown with unread counter badges and real-time updates.
- Interactive SVG charts and analytical dashboards (`/dashboard`).

**Deliverable**: End-to-end appointment scheduling, real-time Socket notifications, and doctor directory.

---

## Week 3 — File Uploads, Medical Records, Prescriptions

### Backend
- Multer memory storage & signed document access control.
- Schema table: `MedicalRecord`.
- Repository & Service: `medicalRecord.repo.ts` and `medicalRecord.service.ts`.
- Endpoints: `POST /api/v1/medical-records`, `GET /api/v1/medical-records/patient/:patientId`, `GET /api/v1/medical-records/:id`.
- PDF generation service for medical prescriptions using `pdfkit`.
- Privacy enforcement: Confidential records access restricted to authorized doctors and patient owners.

### Frontend
- Medical Records Portal (`/medical-records`) with drag-and-drop file upload modal.
- Category filters (Lab Reports, Scans & Imaging, Prescriptions, Discharge Summaries).
- Patient timeline view & doctor patient profile switcher dropdown.

**Deliverable**: Clinical document management and prescription workflow.

---

## Week 4 — Analytics Dashboards, Optimization, Polish & Deploy

### Backend
- SQL & Prisma aggregations for live analytics (daily consultations, revenue, active patient counts).
- Nightly cron jobs for stale notification cleanups and analytics snapshotting.
- OpenAPI 3.1 documentation endpoints.
- Production environment configurations and security hardening (CSRF double-submit, HPP, Helmet, Rate Limiting).

### Frontend
- Responsive SVG chart analytics, countdown timers for upcoming appointments.
- Accessibility, dark mode support, and performance optimizations.

### DevOps & Deployment
- Docker containerization for Express + PostgreSQL + Prisma.
- `npx prisma db push` and `npx prisma db seed` workflow integration.

**Deliverable**: Full-scale, production-ready hospital management system running on PostgreSQL.

---

# Part 3: Best Practices & Security

## Security Measures

| Threat | Mitigation |
|---|---|
| **XSS** | React escapes strings by default; strict CSP header via `helmet`. |
| **CSRF** | `SameSite=Lax` cookies + double-submit CSRF token header (`XSRF-TOKEN` cookie → `X-CSRF-TOKEN` header). |
| **SQL Injection** | **Prisma ORM** uses parameterized SQL queries automatically for all input parameters. |
| **Brute Force** | `express-rate-limit` on login and password reset routes. |
| **JWT Theft** | Short-lived access tokens (15m); refresh token rotation with reuse detection. |
| **Parameter Pollution** | `hpp` middleware. |
| **Password Storage** | `bcrypt` cost factor 12. |
| **Secrets** | Centralized Zod env parser (`config/env.ts`). |

---

## Clean Folder Structure

### Backend (`server/`)
```
server/
├── prisma/
│   └── schema.prisma          # PostgreSQL relational schema definition
├── prisma.config.ts           # Prisma 7 datasource & seed configuration
├── src/
│   ├── config/                env.ts, db.ts (PrismaClient + pg adapter), socket.ts, logger.ts
│   ├── repositories/          user.repo.ts, department.repo.ts, appointment.repo.ts,
│   │                          prescription.repo.ts, medicalRecord.repo.ts, notification.repo.ts
│   ├── services/              auth.service.ts, appointment.service.ts, notification.service.ts,
│   │                          prescription.service.ts, medicalRecord.service.ts, token.service.ts
│   ├── controllers/           *.controller.js / *.controller.ts
│   ├── routes/                index.ts + v1/*.routes.ts
│   ├── middlewares/           auth.ts, rbac.ts, validate.ts, error.ts, csrf.ts, rateLimit.ts
│   ├── validators/            zod schemas per resource
│   ├── sockets/               index.ts, handlers/*.ts
│   ├── utils/                 ApiError.ts, ApiResponse.ts, asyncHandler.ts, token.ts, crypto.ts, pagination.ts
│   ├── seed.ts                PostgreSQL seed script (11 departments, 19 doctors, demo patients)
│   └── app.ts                 Express app boot & server setup
├── .env
├── tsconfig.json
└── package.json
```

### Frontend (`client/`)
```
client/
├── src/
│   ├── api/                   axios.ts instance + resource API modules
│   ├── components/            ui/, layout/ (Topbar, AppShell), feedback/
│   ├── routes/                AppRoutes.tsx, ProtectedRoute.tsx, routeConfig.ts
│   ├── pages/                 auth/, patient/, doctor/, shared/
│   ├── store/                 authSlice.ts (Zustand)
│   ├── context/               SocketContext.tsx
│   ├── types/                 TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json
```
