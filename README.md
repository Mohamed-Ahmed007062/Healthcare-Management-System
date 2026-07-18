# Part 1: Database Schema & Architecture

## Schema Design Strategy

Use the **discriminator pattern** on a single `User` collection for role-specific fields (avoids expensive joins while keeping clean separation), and use **references (not embedding)** for large/growing relations (appointments, records, notifications). Embed only small, bounded sub-documents (e.g., time slots).

### Models & Relationships

```js
// User (Base collection with discriminator)
User {
  email:           { type: String, unique: true, index: true, lowercase: true }
  passwordHash:    String
  role:            { type: String, enum: ['admin', 'doctor', 'patient'], index: 1 }
  firstName, lastName, phone, avatarUrl
  isActive:        { type: Boolean, default: true }
  isEmailVerified: { type: Boolean, default: false }
  refreshTokenHash: String          // hash before storing; rotate on use
  emailVerifyToken, resetPasswordToken  // hashed + TTL index on expiry
  lastLoginAt:     Date
  timestamps
}
// Discriminators: Doctor.discriminator adds specialization, qualifications[], experienceYears,
//   consultationFee, departmentId, weeklySchedule[Slot], averageRating, isAvailable
// Patient.discriminator adds dateOfBirth, gender, bloodGroup, address, emergencyContact,
//   allergies[], chronicConditions[]
```

```js
Department { name, description, headDoctorId: ref User, isActive, timestamps }
```

```js
Appointment {
  patientId: { type: ref User, index: true }
  doctorId:  { type: ref User, index: true }
  slot:      { start: Date, end: Date }       // denormalized for fast range queries
  status:    { enum: ['pending','confirmed','completed','cancelled','no_show'], index: true }
  reason, symptoms, diagnosis
  meetingType: { enum: ['in_person','video'] }
  cancelledById: ref User
  prescriptionId: ref Prescription
  timestamps
}
// Compound indexes (critical for performance):
//   { doctorId: 1, 'slot.start': 1, status: 1 }   // prevent double booking + doctor calendar
//   { patientId: 1, 'slot.start': -1 }            // patient history
//   { status: 1, 'slot.start: 1 }                 // admin dashboards
```

```js
MedicalRecord {
  patientId:  { ref User, index: true }
  doctorId:   ref User
  appointmentId: ref Appointment
  title, description
  type: { enum: ['lab_report','scan','prescription','discharge_summary','other'] }
  files: [{ url, publicId, fileName, mimeType, sizeBytes }]   // signed URLs only
  uploadedById: ref User
  isConfidential: { type: Boolean, default: true }
  timestamps
}
// Index: { patientId: 1, createdAt: -1 }
```

```js
Prescription {
  appointmentId: ref Appointment
  patientId: ref User, doctorId: ref User
  medications: [{ name, dosage, frequency, durationDays, instructions }]
  notes
  timestamps
}
```

```js
Notification {
  recipientId: { ref User, index: true }
  senderId:    ref User
  type: { enum: ['appointment_request','appointment_confirmed','appointment_cancelled',
                 'new_record','reminder','system'] }
  title, message
  relatedEntityType: String, relatedEntityId: ObjectId   // polymorphic
  isRead: { type: Boolean, default: false, index: true }
  timestamps
}
// Compound index: { recipientId: 1, isRead: 1, createdAt: -1 }
// TTL index: { createdAt: 1 } expireAfterSeconds: 7776000  // auto-purge after 90 days
```

```js
AnalyticsSnapshot {       // cached daily aggregates for fast dashboard loads
  date: Date, scope: { enum: ['admin','doctor'] }, doctorId: ref User
  metrics: Mixed         // { totalAppointments, completed, cancelled, revenue, newPatients, ... }
  timestamps
}
// Unique compound index: { date: 1, scope: 1, doctorId: 1 }
```

### Architectural Rules
1. **Transactions** for appointment creation + slot lock + notification atomically.
2. **Read-replica aware queries**: heavy aggregations use `readPreference: secondary`.
3. **Aggregation pipelines** with `$facet` for dashboard stats to avoid N+1 calls.
4. **Caching layer (Redis)** for: refresh token allowlist, rate limit counters, dashboard metrics (5 min TTL), socket adapter.
5. **Soft deletes** via `isActive` flag; never `deleteOne()` audit-sensitive docs.
6. **Pagination**: use `_id`-cursor pagination for lists > 1k docs (faster than skip/limit).

---

# Part 2: 4-Week Implementation Roadmap

## Week 1 — Foundation & Authentication

### Backend
- Scaffold Node project with `src/` layered structure (config, models, controllers, services, repositories, routes, middlewares, validators, utils).
- Env loader with Zod schema validation (`config/env.js`).
- MongoDB connection with retry + graceful shutdown.
- Models: `User` (with Doctor/Patient discriminators), `Department`.
- Auth service: register, login, logout, refresh (rotation + reuse detection), verify email, forgot/reset password.
- JWT strategy: access token 15 min in HTTP-only cookie (`SameSite=Lax`, `Secure` in prod), refresh token 7d hashed in DB.
- Middlewares: `authenticate`, `authorize(roles)`, `validate(schema)`, `errorHandler`, `notFound`, rate limiters (general + auth strict).
- Nodemailer with Mailtrap dev / SendGrid prod; queue via BullMQ if time permits.
- Health check `/health`, `/health/db`, request logger (Pino).

### Frontend
- Vite + React + TypeScript, TailwindCSS, shadcn/ui.
- Axios instance with request interceptor (CSRF header) + response interceptor (auto-refresh on 401, queue concurrent requests).
- React Router with `ProtectedRoute` + `RoleRoute` wrappers.
- Zustand store for `auth` slice.
- Pages: Login, Register (role-aware), Verify Email, Forgot/Reset Password, 404, Server Error.
- Toasts (sonner), form validation (react-hook-form + zod), loading skeletons.

**Deliverable**: working auth with all three roles, role-aware routing, secure cookies.

---

## Week 2 — Appointments, Real-Time Notifications, RBAC Enforcement

### Backend
- Models: `Appointment`, `Notification`, `Prescription`.
- Services with transactional slot locking (optimistic + atomic `$inc`/conditional update on a `Slot` doc, or unique compound index to enforce non-overlap).
- Endpoints: `POST /appointments`, `GET /appointments` (filter by doctor/patient/status/date range), `PATCH /appointments/:id/status`, `DELETE /appointments/:id`.
- Socket.io server with JWT auth middleware, rooms per `user:<id>` and `role:<role>`.
- Redis adapter (`@socket.io/redis-adapter`) for horizontal scaling.
- Event bus: every appointment status change emits to recipient + doctor room, creates `Notification` doc.
- Repository pattern for data access (swap-ready for future ORM).
- Advanced query utilities: `buildFilter()`, `buildSort()`, `paginate()` (cursor + skip modes).

### Frontend
- Feature folders: `features/appointments`, `features/notifications`.
- `SocketContext` provider; `useSocket` hook for subscribe/emit; auto-reconnect with backoff.
- Appointment booking wizard (select doctor → slot picker → confirm) using react-day-picker.
- Notifications dropdown with unread badge, real-time push, mark-as-read.
- Appointment tables with TanStack Table: global search, column filters, sort, pagination, URL-synced state.
- Role-specific appointment views (admin sees all, doctor sees own, patient sees own).

**Deliverable**: end-to-end appointment lifecycle with real-time updates.

---

## Week 3 — File Uploads, Medical Records, Prescriptions

### Backend
- Multer with `memoryStorage` (never local disk in prod) + file size/mime whitelist.
- Cloudinary or S3 upload stream; **signed URLs only** (5–15 min TTL), no public bucket.
- Models: `MedicalRecord`, finalize `Prescription`.
- Endpoints: `POST /medical-records` (multipart), `GET /medical-records?patientId=`, `GET /medical-records/:id/download` (generates signed URL), `DELETE /medical-records/:id` (revokes + deletes from cloud).
- Pre-signed chunked upload endpoint for large scans (>10MB).
- Audit log on every download/access (record `userId`, `recordId`, `ip`, `timestamp`).
- Antivirus hook via ClamAV container (optional but strong portfolio signal).
- Permission matrix: doctor → own patients only; patient → own records only; admin → all.

### Frontend
- Drag-and-drop uploader (react-dropzone) with progress, retry, file-type validation client-side.
- Medical records gallery with PDF/image preview (react-pdf), filter by type/date.
- Prescription viewer (printable via `react-to-print`), PDF generation on client.
- Patient timeline view (appointments + records merged chronologically).
- Doctor: upload record against an appointment; Patient: view own records, request access.

**Deliverable**: HIPAA-style access-controlled document management.

---

## Week 4 — Analytics Dashboards, Optimization, Polish & Deploy

### Backend
- Aggregation pipelines (`$facet`, `$group`, `$lookup`) for:
  - Admin: revenue trend (30d), appointments by status, top doctors, department distribution, patient growth.
  - Doctor: daily appointments, earnings, patient demographics, rating trend.
  - Patient: appointment history, upcoming, spending.
- `AnalyticsSnapshot` model + nightly cron (node-cron) to pre-compute; serve from cache.
- Redis caching middleware (`cache(key, ttl)`) with tag-based invalidation.
- BullMQ queue for: email notifications, SMS reminders 1h before appointment, report generation.
- OpenAPI 3.1 spec via `swagger-jsdoc` + `swagger-ui-express` at `/docs`.
- Structured logging with Pino → stdout (Loki/CloudWatch-ready).
- Jest unit tests for services, Supertest integration tests for auth + appointment flow, 70%+ coverage.

### Frontend
- Dashboards with Recharts: line/area for trends, donut for distributions, bar for top performers.
- Date range picker + role-specific KPI cards.
- Profile management pages (with avatar upload).
- Error Boundary + Suspense, optimistic updates via TanStack Query.
- Accessibility pass (axe-core), keyboard nav, ARIA labels.
- PWA manifest + service worker (offline dashboard shell).
- Lighthouse target: 90+ on all metrics.

### DevOps & Deployment
- Multi-stage Dockerfiles for client + server; `docker-compose.yml` with MongoDB, Redis, BullMQ workers, API, client.
- GitHub Actions CI: lint → test → build → push image → deploy to Render/Railway/VPS.
- Environment management via Doppler or AWS SSM; secrets never in repo.
- Nginx reverse proxy with rate limiting + gzip + SSL via Caddy/Let's Encrypt.
- Sentry for error tracking, PostHog for product analytics (optional).

**Deliverable**: production-grade, monitored, CI/CD-enabled system.

---

# Part 3: Best Practices & Security

## Security Measures (must implement)

| Threat | Mitigation |
|---|---|
| **XSS** | React escapes by default; DOMPurify for any `dangerouslySetInnerHTML`; strict CSP header via `helmet` (`scriptSrc 'self'`). |
| **CSRF** | `SameSite=Lax` cookies + double-submit CSRF token header (`XSRF-TOKEN` cookie → `X-XSRF-TOKEN` header) verified on state-changing requests; or use `lusca` middleware. |
| **SQL/NoSQL Injection** | `express-mongo-sanitize` + `zod` validation on every input; never pass raw req body to Mongo. |
| **Brute Force** | `express-rate-limit`: 5 req/15min on `/auth/login`, 3/15min on password reset; account lockout after 5 fails (unlock via email). |
| **JWT Theft** | Short-lived access (15m); refresh rotation with reuse detection (invalidate family on reuse); refresh token hashed in DB; IP/UA binding optional. |
| **Parameter Pollution** | `hpp` middleware. |
| **Password Storage** | `bcrypt` cost 12; reject passwords < 8 chars / in HIBP via API. |
| **File Upload Abuse** | Magic-byte sniffing (file-type pkg), not just MIME; size cap (10MB docs, 50MB scans); per-user hourly quota; AV scan. |
| **Rate Limit on Costly APIs** | Per-user Redis-backed limiter on upload/analytics endpoints. |
| **Insecure Deserialization** | No `eval`, no `Function()`, schema-validate every external payload. |
| **Information Disclosure** | Generic error messages; stack traces only in dev; production error handler strips internals. |
| **Audit Trail** | Log every auth event, role change, record access; ship to a separate immutable log collection. |
| **Headers** | `helmet()` defaults + `Referrer-Policy: no-referrer`, `Permissions-Policy` disabled unused APIs. |
| **CORS** | Explicit `origin` allowlist, `credentials: true`, no `*`. |
| **Secrets** | `dotenv` only in dev; AWS Secrets Manager / Doppler in prod; rotate DB + JWT secrets. |
| **HTTPS** | Force HTTPS via reverse proxy + HSTS 1 year. |

Additional: dependency scanning (`npm audit`, Snyk), Dependabot alerts, DAST with OWASP ZAP in CI.

## Clean Folder Structure

### Backend
```
server/
├── src/
│   ├── config/            env.js, db.js, redis.js, cloudinary.js, socket.js, logger.js
│   ├── models/            User.js, Doctor.js, Patient.js, Appointment.js,
│   │                      MedicalRecord.js, Notification.js, Prescription.js,
│   │                      Department.js, AnalyticsSnapshot.js
│   ├── repositories/      user.repo.js, appointment.repo.js, ... (pure data access)
│   ├── services/          auth.service.js, appointment.service.js,
│   │                      notification.service.js, upload.service.js,
│   │                      analytics.service.js
│   ├── controllers/       *.controller.js (thin — parse req, call service, send ApiResponse)
│   ├── routes/            index.js + v1/*.routes.js
│   ├── middlewares/       auth.js, rbac.js, validate.js, error.js,
│   │                      rateLimit.js, cache.js, auditLog.js
│   ├── validators/        zod schemas per resource
│   ├── jobs/              queue.js (BullMQ), reminder.worker.js, analytics.worker.js
│   ├── sockets/           index.js, handlers/*.js
│   ├── utils/             ApiError.js, ApiResponse.js, asyncHandler.js,
│   │                      token.js, crypto.js, pagination.js, queryBuilder.js
│   ├── docs/              openapi.yaml
│   └── app.js             express app composition
├── tests/                 unit/ + integration/
├── .env.example
├── Dockerfile
└── package.json
```

### Frontend
```
client/
├── src/
│   ├── api/               axios.js (instance + interceptors), *.api.js per resource
│   ├── features/          auth/, appointments/, medicalRecords/,
│   │                      notifications/, dashboard/, profile/  (each has components/, hooks/, api, types)
│   ├── components/
│   │   ├── ui/            shadcn primitives
│   │   ├── layout/        AppShell, Sidebar, Topbar
│   │   ├── charts/        Recharts wrappers
│   │   ├── tables/        DataTable, Pagination, Filters
│   │   └── feedback/      Toasts, Skeletons, ErrorBoundary, EmptyState
│   ├── routes/            AppRoutes.jsx, ProtectedRoute.jsx, RoleRoute.jsx,
│   │                      routeConfig.ts (role-based manifest)
│   ├── pages/             auth/, admin/, doctor/, patient/, shared/ (lazy-loaded)
│   ├── store/             authSlice, notificationSlice, uiSlice (Zustand)
│   ├── context/           SocketContext, ThemeContext
│   ├── hooks/             useAuth, useSocket, useDebounce, useInfiniteScroll, usePermissions
│   ├── lib/               utils, constants, enums, queryClient (TanStack)
│   ├── types/             domain types, api contracts (matches backend zod)
│   ├── App.jsx
│   └── main.jsx
├── public/
├── .env.example
├── vite.config.ts         (proxy to API in dev)
├── Dockerfile
└── package.json
```

## Conventions to Lock In Early
- **Controller → Service → Repository** layering; controllers never touch Mongoose directly.
- All responses via `ApiResponse` wrapper `{ success, data, message, meta }`; all errors via `ApiError(status, message, details)`.
- Every route file mounted under `/api/v1` for versioning.
- DB migrations via `migrate-mongo` (don't rely on auto-sync in prod).
- Commits follow Conventional Commits; PR template requires test + security checklist.
- ESLint + Prettier + Husky pre-commit + lint-staged; commitlint enforce conventional.
- TypeScript on frontend ASAP; backend can stay JS with JSDoc or migrate to TS in week 4.

Start coding Week 1 now: scaffold the layered backend + the auth flow first — everything downstream depends on it.
