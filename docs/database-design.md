# Schedulix — Database Design & Entity Relationship Specification

## 1. Entity Overview

The system models academic entities using MongoDB and Mongoose with strict schema validation, compound indexes, and referential integrity.

### 1.1 Core Collections
1. **`users`**: System actors with hashed passwords and RBAC roles (`admin`, `coordinator`, `faculty`, `viewer`).
2. **`institutionSettings`**: Working days, operational hours, period durations, scheduled breaks, and timezone.
3. **`programmes`**: Degrees and cohorts, nested semesters, academic groups (e.g. `Section A`), and practical batches (`B1`, `B2`).
4. **`faculties`**: Teaching staff, faculty IDs, department, availability windows, unavailable slots, and fixed institutional commitments.
5. **`rooms`**: Lecture halls, laboratories, seminar rooms, seating capacities, and equipment inventories.
6. **`subjects`**: Course catalog with theory period requirements, practical batch allocations, consecutive period requirements, and room types.
7. **`schedulingConstraints`**: Configurable hard and soft constraints, categories, and target scopes.
8. **`timetables`**: Versioned timetables (`draft`, `validated`, `published`, `archived`), quality metrics, diagnostics, and session cards.
9. **`auditEvents`**: SHA-256 chained forensic security log of actions, actor IDs, IP addresses, and state changes.

---

## 2. Key Relationships & Indexing Strategy

```
Programme (1) ------< Semester (N) ------< AcademicGroup (N) ------< PracticalBatch (N)
                                                 |
                                                 v
Subject (N) >-------- AssignedFaculty (N) >--- TimetableSession (N)
                                                 |
Room (1) >---------------------------------------+
```

### Critical Indexes
- `users`: `{ email: 1 }` (Unique, lowercase)
- `faculties`: `{ facultyId: 1 }` (Unique), `{ email: 1 }` (Unique)
- `rooms`: `{ roomNumber: 1 }` (Unique)
- `subjects`: `{ code: 1 }` (Unique)
- `programmes`: `{ code: 1 }` (Unique)
- `timetables`: `{ programmeCode: 1, semesterNumber: 1, academicYear: 1, version: 1 }` (Compound Unique)
- `auditEvents`: `{ sequenceNumber: 1 }` (Unique), `{ hash: 1 }` (Unique), `{ timestamp: -1 }`
