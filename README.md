# Schedulix — Intelligent Academic Timetable Management System

**Schedulix** is an enterprise-grade, secure, automated academic timetable management system developed for institutional academic scheduling at the **National Forensic Sciences University (NFSU)**, specifically tailored for the **M.Sc. Digital Forensics and Information Security (DFIS)** programme.

---

## 🌟 Key Highlights

- **Pure Node.js Constraint Solver**: Deterministic Constraint Satisfaction Problem (CSP) solver engine using Minimum Remaining Values (MRV), Degree tie-breaking, Forward Checking, and Backtracking search. No third-party black boxes or external Python microservices.
- **15 Mandatory Hard Constraints Verified**: Guarantees zero faculty collisions, zero room overlaps, zero student-group conflicts, continuous practical blocks, lunch break exclusions, and locked session preservation.
- **Tamper-Evident SHA-256 Audit Trail**: Monotonically chained audit event sequence starting from Genesis. One-click cryptographic verification validates data integrity across all administrative and scheduling events.
- **Strict Role-Based Access Control (RBAC)**: Server-enforced permissions across 4 personas: `Administrator`, `Timetable Coordinator`, `Faculty Member`, and `Read-Only Viewer`.
- **Pre-Commit Conflict Explainer**: Immediate server-side validation on manual moves with clear explanations of violated rules.
- **Honest Infeasibility Diagnostics**: Detects impossible scheduling constraints (e.g., zero available laboratories or insufficient faculty hours) and reports actionable recommendations without claiming false success.
- **Production-Grade MERN Architecture**: Express.js with Helmet, Rate Limiting, HttpOnly SameSite cookies, CSRF protection, and a modern React 18 SPA styled with a Navy/Indigo Tailwind CSS design system.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, React Router v6, Axios with CSRF interceptors, Recharts.
- **Backend**: Node.js v22, Express.js, MongoDB, Mongoose ORM, Zod request validators, Bcrypt (12 rounds), Helmet, Rate Limiter.
- **Testing**: Vitest, Supertest (41 automated tests covering security, RBAC, scheduler constraints, and publication workflow).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node.js v22.19.0)
- **MongoDB**: Running locally on `mongodb://127.0.0.1:27017`

### 2. Environment Setup
The project comes pre-configured with `.env` files in `server/` and `client/`.

```powershell
# Copy environment configuration if needed
copy .env.example .env
```

### 3. Seed Fictional Demonstration Data
Seeds the default M.Sc. DFIS Semester I scenario (40 students, 2 batches, practical sessions, rooms, faculty, constraints, and genesis audit record):

```powershell
npm --prefix server run seed
```

To run the intentionally impossible scheduling scenario test:
```powershell
npm --prefix server run seed:impossible
```

### 4. Run Automated Test Suites
Runs all 41 unit, integration, and security tests:

```powershell
npm --prefix server test
```

### 5. Start the Application
Open two terminal windows:

**Terminal 1 (Backend Server on Port 5000):**
```powershell
npm --prefix server start
```

**Terminal 2 (Frontend Client on Port 5173):**
```powershell
npm --prefix client run dev
```

Visit the application at: **[http://localhost:5173](http://localhost:5173)**

---

## 🔐 Default Demonstration Accounts

The login interface includes a **1-click quick-fill demo switcher** for all 4 roles:

| Role | Institutional Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@schedulix.local` | `AdminSecure@2026` | Full system control, user & role management, cryptographic audit trail verification. |
| **Timetable Coordinator** | `coordinator@schedulix.local` | `CoordSecure@2026` | Manage curriculum, faculty, rooms, constraints; generate, manually move, lock, and publish timetables. |
| **Faculty Member** | `faculty@schedulix.local` | `FacultySecure@2026` | View personal teaching schedule, room allocations, and departmental timetables. |
| **Read-Only Viewer** | `viewer@schedulix.local` | `ViewerSecure@2026` | View and export officially published academic schedules. |

---

## 📚 Technical Documentation

Comprehensive academic documentation is located in `docs/`:
- [`architecture.md`](docs/architecture.md): System architecture, tier decoupling, and data flow.
- [`scheduler-algorithm.md`](docs/scheduler-algorithm.md): CSP mathematical formulation, MRV heuristics, and forward checking.
- [`security.md`](docs/security.md): Threat model, OWASP mitigations, and SHA-256 hash-chain specification.
- [`database-design.md`](docs/database-design.md): Entity relationship model and indexing strategy.
- [`testing.md`](docs/testing.md): Automated testing strategy and verification report.
- [`user-guide.md`](docs/user-guide.md): Operational manuals and standard administrative workflows.
