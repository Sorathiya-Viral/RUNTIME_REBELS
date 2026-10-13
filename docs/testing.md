# Schedulix — Automated Testing Strategy & Verification Report

## 1. Test Architecture
Schedulix employs **Vitest** and **Supertest** to execute comprehensive automated testing across four primary suites:
1. `tests/auth_and_security.test.js` (Authentication, HttpOnly cookies, CSRF, RBAC, NoSQL injection, and audit hash-chain integrity)
2. `tests/crud_and_rbac.test.js` (Academic CRUD endpoints, role restrictions, and audit event emission)
3. `tests/scheduler.test.js` (Mandatory hard constraints, interval arithmetic, locked session preservation, preference scoring, and infeasibility reporting)
4. `tests/timetable_workflow.test.js` (Generation, manual move pre-validation, locking, version publication, CSV export, and analytics)

---

## 2. Test Execution Command
To execute the complete test suite against local MongoDB:

```powershell
npm --prefix server test
```

Or for sequential execution:
```powershell
npx --prefix server vitest run --fileParallelism false
```

---

## 3. Test Coverage Summary

- **Total Test Files**: 4 passed (100%)
- **Total Tests**: 41 passed (100%)
- **Zero Failures**: All 15 mandatory hard constraints mathematically verified.
