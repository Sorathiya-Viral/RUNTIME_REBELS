# Schedulix — Constraint-Satisfaction Scheduling Algorithm

## 1. Problem Formulation as a CSP
An Academic Timetable Generation Problem is modeled as a Constraint Satisfaction Problem:

$$\mathcal{P} = \langle \mathcal{X}, \mathcal{D}, \mathcal{C} \rangle$$

- **Variables ($\mathcal{X}$)**: Discrete session blocks that must be scheduled.
  - Theory Sessions: Single 1-hour periods for an entire academic group.
  - Practical Sessions: $K$ consecutive periods (e.g. 2 hours) for specific student laboratory batches ($B_1, B_2$).
- **Domains ($\mathcal{D}$)**: The set of allowable assignments for each variable $X_i \in \mathcal{X}$:
  $$D(X_i) = \{ (d, s, r) \mid d \in \text{WorkingDays}, s \in \text{Slots}, r \in \text{Rooms} \}$$
- **Constraints ($\mathcal{C}$)**: Hard constraints (mandatory, 0 violations allowed) and soft constraints (optimizing faculty satisfaction and balance).

---

## 2. Mandatory Hard Constraints ($\mathcal{C}_{hard}$)

1. **Working Hours & Day Boundary**: All assigned periods must satisfy $s_{\text{start}} \ge \text{DayStart}$ and $s_{\text{end}} \le \text{DayEnd}$.
2. **Break Period Exclusion**: No session may intersect scheduled breaks $[\text{BreakStart}, \text{BreakEnd})$.
3. **No Faculty Overlap**: A faculty member cannot be assigned to two sessions simultaneously.
4. **No Room Overlap**: A classroom or laboratory cannot host two sessions simultaneously.
5. **No Academic Group Overlap**: A student group cannot have two classes at the same time.
6. **Whole-Class vs Practical Batch Disjointness**:
   - If Session A is for the whole class and Session B is for Batch $B_1$, they **CANNOT** overlap.
   - If Session A is for Batch $B_1$ and Session B is for Batch $B_2$, they **CAN** run concurrently in different rooms with different faculty.
7. **Room Capacity**: $\text{Capacity}(r) \ge \text{Strength}(X_i)$.
8. **Laboratory Room Type**: Practical sessions must strictly be assigned to $r.\text{roomType} = \text{'laboratory'}$.
9. **Consecutive Block Integrity**: Multi-period practicals must occupy unbroken consecutive slots without intersecting breaks.
10. **Curriculum Quota Guarantee**: Every subject receives its designated weekly theory and practical allocations.
11. **Fixed Institutional Commitments**: Faculty obligations (committee meetings, research duties) are pre-reserved and untouchable.
12. **Declared Faculty Availability**: Faculty availability windows and unavailable slots are strictly respected.
13. **Locked Session Preservation**: Sessions locked by coordinators are frozen in their designated day, slot, and room.
14. **Active Facility Status**: Sessions cannot be assigned to rooms under maintenance or deactivated.
15. **Valid Referential Integrity**: Every session must possess valid references to subject, faculty, group, and room.

---

## 3. Heuristics & Search Strategy

### 3.1 Minimum Remaining Values (MRV)
At each recursion step, the solver selects the unassigned variable $X \in \mathcal{X}$ with the smallest candidate domain:
$$\text{argmin}_{X \in \mathcal{X}_{\text{unassigned}}} |D(X)|$$
*Rationale*: Fails early on constrained variables (such as practicals requiring scarce laboratories), avoiding massive wasted search trees.

### 3.2 Degree Tie-Breaking
When multiple variables share identical domain sizes, the variable with the highest duration periods (e.g. 2-hour practicals over 1-hour theories) is chosen first.

### 3.3 Forward Checking
When variable $X_i$ is assigned to $(d, s, r)$, the engine prunes colliding candidates from the domains of all remaining variables $X_j$. If any remaining variable's domain drops to $|D(X_j)| = 0$, the engine backtracks immediately.

### 3.4 Chronological Backtracking with Depth Limits
The search executes recursively with cutoff bounds (default 40,000 iterations or 15,000 ms) to guarantee non-blocking responses on large inputs.

---

## 4. Infeasibility Proof vs Search Timeout
When no complete assignment is found:
- **Proven Infeasible**: The engine tests all possible slots against isolated resources. If a subject requires a laboratory and 0 laboratories exist, or a faculty member's total available hours are strictly less than required teaching hours, the state is mathematically proven impossible.
- **Search Limit Exceeded**: If candidate slots exist theoretically but combinatorial congestion prevented resolution within configured iteration limits, the report labels the state as unresolved within search limits.
