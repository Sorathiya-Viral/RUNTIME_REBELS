# Schedulix — User Manual & Operational Workflows

## 1. System Access & User Roles

Schedulix provides four authorized personas:

| Role | Default Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@schedulix.local` | `AdminSecure@2026` | Full system control, user & role management, cryptographic audit trail verification. |
| **Timetable Coordinator** | `coordinator@schedulix.local` | `CoordSecure@2026` | Manage curriculum, faculty, rooms, constraints; generate, manually move, lock, and publish timetables. |
| **Faculty Member** | `faculty@schedulix.local` | `FacultySecure@2026` | View personal teaching schedule, room allocations, and departmental timetables. |
| **Read-Only Viewer** | `viewer@schedulix.local` | `ViewerSecure@2026` | View and export officially published academic schedules. |

---

## 2. Standard Operational Workflows

### Workflow A: Initial Institution Configuration
1. Sign in as `coordinator@schedulix.local` or `admin@schedulix.local`.
2. Navigate to **Settings** in the sidebar.
3. Configure institutional working days, opening time (`09:00`), closing time (`17:00`), and period duration (`60` mins).
4. Save configuration.

### Workflow B: Entering Academic Data
1. Navigate to **Programmes & Semesters**: Verify or create the degree cohort (e.g. M.Sc. DFIS, 40 students, Batches B1 & B2).
2. Navigate to **Faculty & Availability**: Review instructor teaching load limits and unavailable windows.
3. Navigate to **Classrooms & Labs**: Ensure adequate lecture halls and laboratories are available.
4. Navigate to **Subjects & Batches**: Configure theory weekly periods and practical consecutive requirements.

### Workflow C: Generate Timetable
1. Navigate to **Generate Timetable**.
2. Select Programme: `M.Sc. DFIS`, Semester: `1`.
3. Click **Execute Timetable Generation**.
4. The CSP solver executes in Node.js, validates all 15 hard constraints, and displays the candidate schedule.

### Workflow D: Interactive Review, Manual Move & Locking
1. Navigate to **Timetable Calendar**.
2. Filter by Faculty, Room, or Day.
3. To lock an assignment so it is preserved during future regenerations, click the **Unlock icon** on any session card.
4. To move a session, click **Move** on the card:
   - Select the target day, time, or room.
   - Click **Validate & Save Move**.
   - If the move collides with a break or another class, Schedulix rejects it immediately and displays the violated constraint.

### Workflow E: Publication
1. When all sessions are validated with 0 hard constraint violations, click **Publish Schedule**.
2. The timetable becomes immutable to draft edits, any previous published version is archived, and viewers/faculty can now access it.

### Workflow F: Audit Verification (Admin Only)
1. Sign in as `admin@schedulix.local`.
2. Navigate to **Forensic Audit Logs**.
3. Click **Verify Cryptographic Integrity** to mathematically re-hash the SHA-256 chain and verify zero tampering.
