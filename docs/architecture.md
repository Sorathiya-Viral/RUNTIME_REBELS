# Schedulix — System Architecture & Design Specification

## 1. System Overview
**Schedulix** is an automated academic timetable management system designed for institutional deployments such as the National Forensic Sciences University (NFSU). Built natively on the MERN stack (MongoDB, Express.js, React, Node.js), it couples a deterministic Constraint Satisfaction Problem (CSP) solver engine with server-enforced Role-Based Access Control (RBAC) and a forensic, tamper-evident SHA-256 hash-chained audit trail.

---

## 2. High-Level Architectural Diagram

```
+--------------------------------------------------------------------------------+
|                             Presentation Layer (Vite + React 18)               |
|  - Tailwind CSS Design System (Navy/Indigo)   - Recharts Visual Analytics      |
|  - Interactive Timetable Calendar View        - Live Pre-Commit Conflict Check |
|  - Role-Filtered Navigation (14 Modules)      - Axios with Auto-CSRF Token     |
+--------------------------------------------------------------------------------+
                                       |
                       HTTPS REST API (Port 5000)
                                       |
+--------------------------------------------------------------------------------+
|                           Backend Application (Express.js)                     |
|                                                                                |
|  +--------------------+  +----------------------+  +-------------------------+ |
|  |  Security Stack    |  |  Validation Stack    |  |  Audit Trail Service    | |
|  |  - Helmet CSP      |  |  - Zod Input Schemas |  |  - SHA-256 Hash Chain   | |
|  |  - CORS Reflection |  |  - Safe NoSQL Queries|  |  - Sequential Genesis   | |
|  |  - Rate Limiter    |  |  - Bounds Checking   |  |  - Tamper Detection    | |
|  |  - HttpOnly Cookie |  +----------------------+  +-------------------------+ |
|  +--------------------+                                                        |
|                                                                                |
|  +---------------------------------------------------------------------------+ |
|  |                  Constraint Satisfaction Engine (Pure Node.js)            | |
|  |  - Minimum Remaining Values (MRV) Variable Ordering                       | |
|  |  - Degree Tie-Breaking (High Duration Practicals First)                   | |
|  |  - Mathematical Half-Open Interval Overlap Checks                         | |
|  |  - Forward Checking Domain Pruning & Chronological Backtracking           | |
|  |  - Infeasibility Root-Cause Diagnostics & Actionable Recommendations      | |
|  +---------------------------------------------------------------------------+ |
+--------------------------------------------------------------------------------+
                                       |
                       Mongoose ORM Connection (Port 27017)
                                       |
+--------------------------------------------------------------------------------+
|                         Persistence Layer (MongoDB Database)                   |
|  - Users & Roles (Argon2id/Bcrypt)         - Scheduling Constraints (Hard/Soft)|
|  - Programmes & Academic Batches           - Timetables & Versioned Sessions   |
|  - Faculty, Availability & Commitments     - AuditEvents (Tamper-Chained)      |
|  - Classrooms & Laboratories               - Institution Operational Settings  |
+--------------------------------------------------------------------------------+
```

---

## 3. Component Breakdown

### 3.1 Presentation Layer (`client/`)
- **React 18 + Vite**: High-performance modular SPA.
- **Tailwind CSS**: Cohesive, accessible color system (deep navy `#0f172a`, indigo `#4338ca`, emerald `#059669`).
- **React Router v6**: Client-side protected routing with server session synchronization.
- **Axios HTTP Client**: Integrated interceptors handling credentials and CSRF tokens from cookies.
- **Recharts**: High-density SVG charts for instructor workload and room utilization density.

### 3.2 Security Stack (`server/src/security/`)
- **HttpOnly Cookies**: Session tokens stored in browser cookies inaccessible to JavaScript (`document.cookie` cannot leak the JWT), preventing Cross-Site Scripting (XSS) credential theft.
- **Double Submit CSRF Defense**: Custom `x-csrf-token` header validation on all state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Argon2id / Bcrypt (12 Rounds)**: Password storage with adaptive salt costs.
- **Helmet**: Disables MIME sniffing, clickjacking (`X-Frame-Options: SAMEORIGIN`), and configures Content Security Policy (CSP).

### 3.3 Constraint Satisfaction Solver (`server/src/scheduler/`)
- Encapsulated strictly in the Node.js backend without external foreign language microservices.
- Implements MRV, forward checking, and backtracking search with strict cycle cutoff and timeout safeguards.
