# Schedulix — Security Architecture, Threat Model & Forensic Audit Integrity

## 1. Threat Model & Mitigations (OWASP Top 10)

| Threat / Vulnerability | Risk | Schedulix Mitigation |
| :--- | :--- | :--- |
| **Credential Theft via XSS** | High | Auth JWT tokens are stored exclusively in **HttpOnly, SameSite, Secure cookies**. Inaccessible to JavaScript `document.cookie`. |
| **Cross-Site Request Forgery (CSRF)** | High | **Double Submit Cookie pattern**: Server sets `XSRF-TOKEN` cookie; frontend attaches matching `x-csrf-token` header on all mutating requests. |
| **Broken Access Control (Privilege Escalation)** | Critical | Server enforces RBAC on every protected route via `requireRole()`. Client UI controls are purely cosmetic; unauthorized requests are rejected and logged. |
| **NoSQL Injection** | High | Strict **Zod schema validation** strips unexpected operators (`$gt`, `$ne`, `$regex`). No raw client input is passed directly to Mongoose queries. |
| **Brute Force Authentication** | Medium | Rate limiting on `/api/auth/login` (15 requests per 15 minutes per IP). Generic "Invalid email or password" error messages prevent user enumeration. |
| **CSV Formula Injection** | Medium | In CSV timetable exports, any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r` is escaped with a leading single quote (`'`). |
| **Audit Log Tampering** | Critical | **SHA-256 Hash Chain**: Each audit record stores `hash` derived from `(sequenceNumber + previousHash + timestamp + payload)`. Tampering breaks the mathematical chain. |

---

## 2. Forensic Audit Log Hash Chain Specification

Each audit record is linked to its predecessor in an append-only sequence starting from a predefined Genesis block:

```
[Genesis Hash: GENESIS_SCHEDULIX_DFIS_2026_AUDIT_TRAIL]
                          |
                          v
+-------------------------------------------------------------+
| Seq: 1 | PrevHash: GENESIS...                               |
| Action: SYSTEM_INITIALIZED_AND_SEEDED                       |
| Actor: admin@schedulix.local | Role: admin                 |
| Hash: SHA256(1 | GENESIS... | 2026-10-13T... | payload...)  |
+-------------------------------------------------------------+
                          |
                          v
+-------------------------------------------------------------+
| Seq: 2 | PrevHash: Hash(Seq 1)                              |
| Action: TIMETABLE_GENERATED                                 |
| Actor: coordinator@schedulix.local                          |
| Hash: SHA256(2 | Hash(Seq 1) | 2026-10-13T... | payload...) |
+-------------------------------------------------------------+
                          |
                          v
                     [Next Link]
```

### Chain Verification Algorithm
1. Retrieve all audit events sorted by `sequenceNumber ASC`.
2. For each record $i$:
   - Verify `sequenceNumber == i + 1`.
   - Verify `previousHash == hash(i - 1)` (or Genesis for $i = 0$).
   - Recompute SHA-256 hash using the canonical payload pipeline.
   - If computed hash $\neq$ stored hash, flag tampering at sequence $i$.

### Limitations
A hash chain guarantees **tamper detection**, not complete immutability. An attacker with full write access to the underlying MongoDB database could recalculate the entire chain from a tampered node to the head. To mitigate this in institutional environments, audit logs can be mirrored to append-only write-once-read-many (WORM) storage or signed with an offline HSM key.
