# NFSU CODER EVENT - 13 OCT 2026
## TEAM : RUNTIME_REBELS

# Selected Problem Statement : Automated Academic Timetable Generation System

## Project Blueprint & Central Development Documentation

### 1. Project Architecture & Tech Stack Formulation

To meet the stringent 2-hour hackathon timeframe while ensuring strict constraint satisfaction and data integrity, the following stack is recommended:

* **Frontend:** React.js + Vite (for rapid HMR) + TailwindCSS (for zero-config UI scaling).
* **State Management:** Zustand (lighter and faster to set up than Redux for a 2-hour sprint).
* **Backend:** Node.js + Express.js (or Fastify).
* **Database:** PostgreSQL (Strongly Recommended).
* *Why PostgreSQL?* Timetable data is inherently relational (Faculty $\rightarrow$ Subjects $\rightarrow$ Rooms $\rightarrow$ Programs). A relational database prevents the deep nesting and manual join complexities of NoSQL, making the validation of constraints much faster.


* **ORM:** Prisma (Provides instant type safety and auto-generated CRUD operations, saving critical time).
* **Algorithm Logic:** Constraint Satisfaction Problem (CSP) Engine using a Backtracking with Forward Checking algorithm.

---

### 2. Team Work Delegation (2-Hour Sprint Strategy)

To avoid merge conflicts and maximize parallel development, isolate responsibilities:

* **Darshan (Core Algorithm Engine):** Focus exclusively on the CSP Backtracking logic, conflict detection, and "Impossible Timetable" error reporting.


* **Arjun (DB & API Endpoints):** Setup Prisma schema, database seeding, and RESTful CRUD endpoints for inputs.
* **Het (Frontend Inputs & State):** Build input forms for University Timings, Classrooms, Programs, Subjects, and Faculty constraints.


* **Viral (Frontend Grid & Export):** Build the timetable visualization grid (programme-wise, faculty-wise, room-wise) and export logic.


* **Nemish (Security & Validation):** Implement input validation (Zod), API security, and the live conflict validation engine for manual adjustments.



---

### 3. Core Data Models (PostgreSQL / Prisma Schema Approach)

Define these centrally so all team members use exact variable names.

```prisma
// schema.prisma

model UniversityTime {
  id              Int      @id @default(autoincrement())
  workingDays     String[] // e.g., ["MON", "TUE", "WED", "THU", "FRI"]
  startTime       String   // "09:00"
  endTime         String   // "17:00"
  periodDuration  Int      // in minutes, e.g., 60
  breakStart      String   // "13:00"
  breakEnd        String   // "14:00"
}

model Room {
  id         Int       @id @default(autoincrement())
  name       String    @unique
  type       RoomType  // LECTURE or LAB
  capacity   Int
  isAvailable Boolean  @default(true)
  sessions   Session[]
}

model ProgramGroup {
  id           Int       @id @default(autoincrement())
  programName  String    // e.g., "M.Sc. DFIS"
  semester     Int       // e.g., 1
  section      String
  strength     Int
  batchType    BatchType // FULL_CLASS, BATCH_A, BATCH_B
  subjects     Subject[]
  sessions     Session[]
}

model Faculty {
  id            Int       @id @default(autoincrement())
  name          String
  availableDays String[]
  timeStart     String
  timeEnd       String
  subjects      Subject[]
  sessions      Session[]
}

model Subject {
  id                 Int          @id @default(autoincrement())
  code               String       @unique
  name               String
  type               SubjectType  // THEORY or PRACTICAL
  reqTheoryPeriods   Int
  reqPracticalSessions Int
  consecutivePeriods Int          // e.g., 2 for labs
  facultyId          Int
  faculty            Faculty      @relation(fields: [facultyId], references: [id])
  programId          Int
  program            ProgramGroup @relation(fields: [programId], references: [id])
  sessions           Session[]
}

model Session {
  id         Int          @id @default(autoincrement())
  day        String
  startTime  String
  endTime    String
  isLocked   Boolean      @default(false)
  
  subjectId  Int
  subject    Subject      @relation(fields: [subjectId], references: [id])
  roomId     Int
  room       Room         @relation(fields: [roomId], references: [id])
  facultyId  Int
  faculty    Faculty      @relation(fields: [facultyId], references: [id])
  groupId    Int
  group      ProgramGroup @relation(fields: [groupId], references: [id])
}

enum RoomType { LECTURE, LAB }
enum SubjectType { THEORY, PRACTICAL }
enum BatchType { FULL_CLASS, PRACTICAL_BATCH }

```

---

### 4. Common Definitions & Constants

| Variable Name | Type | Description |
| --- | --- | --- |
| `DAYS_OF_WEEK` | Array | `["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]` |
| `TIME_FORMAT` | String | HH:MM (24-hour format, e.g., "09:00", "14:30") for strict parsing. |
| `MANDATORY_CONSTRAINTS` | Object | Central logic flags mapping to the 8 mandatory rules.

 |
| `ERROR_IMPOSSIBLE_STATE` | String | Triggered when total required slots exceed total available university slots. |

---

### 5. Algorithm Core: Constraint Satisfaction Engine (Backend)

The core logic must distinguish between mandatory constraints and preferences.

#### Phase 1: Pre-Computation & Data Normalization

1. Convert `startTime` and `endTime` into integer indices (e.g., 09:00 = slot 0, 10:00 = slot 1) based on `periodDuration` to simplify math.
2. Filter out slots that overlap with `scheduled breaks`.


3. Calculate theoretical maximum capacity: Do required periods > total faculty/room availability? If yes, immediately halt and report the impossible timetable.



#### Phase 2: Backtracking with MRV (Minimum Remaining Values)

To assign sessions efficiently within 2 hours:

1. **Sort Variables:** Queue `Subjects` by complexity. Process practicals (requiring consecutive periods and specific labs) first. Process theory classes next.


2. **Assign Slot:** Pick the first available time slot.
3. Validate Hard Constraints:


* *Time check:* Is slot within university hours and outside breaks?.


* *Faculty check:* Is faculty available at this time?.


* *Overlap check:* Does faculty, room, or group already have a session here?.


* *Batch isolation:* If placing a FULL_CLASS, ensure no PRACTICAL_BATCH for that class is running. If placing a PRACTICAL_BATCH, ensure no FULL_CLASS is running.


* *Capacity check:* Is `Room.capacity >= ProgramGroup.strength`?.


* *Environment check:* If Practical, is `Room.type == LAB`?.




4. **Recurse:** If valid, place session and move to the next requirement.
5. **Backtrack:** If no valid slot exists, undo the previous placement and try the next slot.

#### Phase 3: Handling the "Impossible Timetable"

If backtracking exhausts all options, the system **must not** return a partial timetable as successful.

* **Logic:** Track the `Subject` that triggered the failure during the deepest traversal.
* **Output payload:**
```json
{
  "status": "error",
  "failedSubject": "DFIS103",
  "reason": "Subject DFIS103 requires three weekly periods, but its assigned faculty member is available for only two periods.",
  "unassignedSessions": 1
}

```



---

### 6. Backend API Structure

**Base URL:** `/api/v1`

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/config/university` | POST | Set working days, hours, period duration, breaks.

 |
| `/resources/rooms` | POST | Bulk upload/create classrooms and laboratories.

 |
| `/resources/programs` | POST | Input programs, strengths, and practical batches.

 |
| `/resources/faculty` | POST | Set faculty availability and fixed constraints.

 |
| `/timetable/generate` | POST | Triggers the CSP engine. Returns JSON schedule or precise failure error.

 |
| `/timetable/validate` | POST | Used by frontend for manual adjustments with immediate conflict validation.

 |
| `/timetable/lock` | POST | Lock selected sessions and regenerate the remaining schedule.

 |
| `/timetable/publish` | POST | Save a draft and publish a validated timetable.

 |

---

### 7. Security & Validation First Approach

Given the emphasis on digital forensics and information security, the backend must be hardened:

1. **Zod Schema Validation:** Every API endpoint must have a Zod schema validating input before it hits the controller. Prevent NaN injection in capacity fields, sanitize string inputs for room names.
2. **Algorithmic DOS Protection:** Backtracking can run indefinitely if poorly constrained. Implement an execution timeout (e.g., `performance.now() > 5000ms`). If generation takes > 5 seconds, throw a `Complexity Timeout` error to prevent server lockup.
3. **Conflict Sanitization:** When a user manually overrides a session, the backend must strictly re-verify Rules 1-8 before saving. Frontend validation is not enough.



---

### 8. Frontend Structure & Review System

**Component Hierarchy:**

* `DashboardLayout` (Main wrapper)
* `InputWizard` (Step-by-step forms for Coordinator inputs)
* `TimetableViewer`
* `ProgramView` (Filter by M.Sc. DFIS, etc.).


* `FacultyView` (Filter by Professor).


* `RoomView` (Filter by Lab/Classroom).





**Live Conflict Engine (Nemish's Task):**
When a coordinator drags-and-drops a generated session to manually adjust it:

1. Frontend captures `sourceSlot` and `targetSlot`.
2. Axios POSTs to `/timetable/validate`.
3. Backend temporarily applies move in memory, runs the Rule 1-8 validator.


4. Returns `{ valid: true }` or `{ valid: false, conflict: "Overlap: Faculty X is already teaching DFIS103" }`.
5. If valid, highlight green; if invalid, highlight red and snap back.

---

### 9. Development Example (Test Case for M.Sc. DFIS)

To ensure the algorithm works, immediately seed the database with the PDF's specific test case:

* **Program:** M.Sc. DFIS, Semester I.


* **Groups:** Total Strength 40. Batch A = 20, Batch B = 20.


* **Subject 1:** Theory (3 periods/week), Full Class (Strength 40).


* **Subject 2:** Practical (1 session of 2 consecutive periods/week per batch).


* **Success Criteria:** The system must automatically schedule all three theory periods and both batch practical sessions without violating faculty availability, room capacity, or overlapping full-class with batch-class sessions.