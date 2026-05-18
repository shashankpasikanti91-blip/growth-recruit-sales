# Tekgen Payroll & HR System - Complete Implementation Plan

> **CRITICAL**: Do NOT modify recruitment module (Phase 00). All changes are additive only.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      UNIFIED LOGIN SYSTEM                       │
│              (Internal Staff + Deployed Staff)                  │
└────────┬──────────────────────────────────────────────────────────┘
         │
         ├─ INTERNAL STAFF                    ├─ DEPLOYED STAFF
         │  (Tekgen Employees)                │  (Sent to Clients)
         │                                    │
         ├─ My Workspace Dashboard            ├─ ESS Portal Dashboard
         ├─ Leave Management                  ├─ Attendance Tracking
         ├─ Claim Submission                  ├─ Invoice View
         ├─ Payslips                          ├─ Payment History
         ├─ Overtime (Optional)               ├─ Rate Cards
         └─ Documents (ID, Certs)            └─ Client Agreements
```

---

## PHASE 1: Core Infrastructure & Schema Enhancement

### 1.1 Staff Type System
**Goal**: Define INTERNAL vs DEPLOYED with different rules

#### Database Changes:
```prisma
// Define staff eligibility rules
model StaffTypeRules {
  id                  String    @id @default(cuid())
  staffType           String    @unique  // INTERNAL | DEPLOYED
  
  // Leave Entitlements (annual days)
  annualLeaveEnDays   Int       // e.g., 10 days for citizen, 8 for PR
  annualLeaveExpatDays Int      // Different for expatriates
  medicalLeavePerYear Float     // e.g., 14 days
  
  // Benefits
  canApplyOvertime    Boolean   @default(false)
  overtimeRateMultiplier Float  @default(1.5)
  canSwapHolidays     Boolean   @default(false)
  
  // Eligibility
  leaveEligibleAfterDays Int    // Days before employee can apply leave
  mustHaveContractUntilEOD DateTime? // For deployed: contract must extend to EOD
  
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  @@map("staff_type_rules")
}

// Payment Structure per Agreement
model PaymentAgreement {
  id              String    @id @default(cuid())
  displayId       String?   @unique  // AGR-XXXX
  
  // For INTERNAL: Company-wide
  // For DEPLOYED: Client-specific
  employeeId      String?
  clientId        String?
  
  staffType       String    // INTERNAL | DEPLOYED
  
  // Payment terms
  paymentType     String    // MONTHLY_SALARY | DAILY_RATE | HOURLY_RATE | HYBRID
  monthlyRate     Float?
  dailyRate       Float?
  hourlyRate      Float?
  
  // Billing to client (for deployed)
  billingType     String?   // TIMESHEET | DAILY_BILLABLE | FIXED_RATE | HYBRID
  billingRate     Float?
  
  // Duration
  startDate       DateTime
  endDate         DateTime?
  
  // OT eligibility (can differ by agreement)
  allowOvertime   Boolean   @default(false)
  otRateMultiplier Float   @default(1.5)
  
  // Leave eligibility
  leavesPerYear   Int?      // If different from staff type default
  
  currency        String    @default("MYR")
  status          String    @default("ACTIVE")  // ACTIVE | EXPIRED | SUSPENDED
  
  approvedBy      String?   // userId
  approvedAt      DateTime?
  
  notes           String?   @db.Text
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([employeeId])
  @@index([clientId])
  @@map("payment_agreements")
}
```

### 1.2 Enhanced Employee Profile

```prisma
// Update EmployeeProfile to track staff type and rules
// Add to EmployeeProfile:
  staffType           String    @default("INTERNAL")  // INTERNAL | DEPLOYED
  staffTypeRulesId    String?
  paymentAgreementId  String?
  
  // Visa/nationality tracking
  visaStatus          String?   // CITIZEN | PR | EP_PASS | WORK_PERMIT | STUDENT | OTHER
  visaExpiryDate      DateTime?
  
  // Eligibility dates
  leaveEligibleFrom   DateTime? // Date when leave can be applied
  contractEndDate     DateTime? // Important for deployed staff
  
  // Limits
  maxOvertimeHoursPerMonth Float? @default(0)
  
  rules               StaffTypeRules? @relation(fields: [staffTypeRulesId], references: [id])
  agreement           PaymentAgreement? @relation(fields: [paymentAgreementId], references: [id])
```

### 1.3 Public Holiday Calendar

```prisma
model PublicHoliday {
  id              String    @id @default(cuid())
  
  holidayName     String    // "Hari Raya", "Chinese New Year", etc.
  holidayDate     DateTime
  state           String?   // "KL" | "JHR" | "SGR" | null (for national)
  
  isNational      Boolean   @default(false)
  isReplacement   DateTime? // If holiday falls on weekend, replacement date
  
  appliedFrom     Int       // Year from which valid
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([holidayDate, state])
  @@map("public_holidays")
}

model HolidaySwap {
  id              String    @id @default(cuid())
  employeeId      String
  employee        EmployeeProfile @relation("HolidaySwaps", fields: [employeeId], references: [id])
  
  originalHolidayDate DateTime
  swappedWorkingDate DateTime
  
  reason          String?
  approvedBy      String?   // userId (manager/HR)
  approvedAt      DateTime?
  
  status          String    @default("PENDING") // PENDING | APPROVED | REJECTED
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([employeeId, originalHolidayDate])
  @@map("holiday_swaps")
}
```

---

## PHASE 2: Dashboard & UI Structure

### 2.1 Internal Staff Dashboard (`/hr/dashboard/internal`)

**Cards**:
- Leave Balance (Annual, Medical, etc.) - Visual cards with gradient design
- Pending Approvals (if manager)
- Payslip (Latest month)
- OT Hours (This month vs Balance)
- Upcoming Holidays (Calendar view)

**Features**:
- Calendar with color-coded events (Leaves, Holidays, OT)
- Department-specific data
- Team view (if manager)

### 2.2 Deployed Staff Dashboard (`/hr/dashboard/deployed`)

**Cards**:
- Current Assignment (Client name, billing rate)
- Attendance (This month)
- Invoice Status (Pending billing)
- Payment History (Last 3 months)
- Rate Card (Hourly/Daily)

**Features**:
- Attendance calendar
- Invoice list with amounts
- Payment schedule
- Client contact info

---

## PHASE 3: Eligibility Engine

### Business Logic

```javascript
// Determine leave eligibility
const canApplyLeave = async (employeeId, leaveType) => {
  const employee = await getEmployee(employeeId);
  const staffRules = await getStaffTypeRules(employee.staffType);
  const agreement = await getPaymentAgreement(employee.paymentAgreementId);
  
  // Rule 1: Must have completed eligibility period
  if (!isAfter(new Date(), employee.leaveEligibleFrom)) {
    return { allowed: false, reason: 'Not eligible yet' };
  }
  
  // Rule 2: Check visa-based eligibility
  if (employee.visaStatus === 'STUDENT' && leaveType === 'ANNUAL') {
    return { allowed: false, reason: 'Student visa: cannot take annual leave' };
  }
  
  // Rule 3: Check deployment status
  if (employee.staffType === 'DEPLOYED') {
    if (!agreement) return { allowed: false, reason: 'No active agreement' };
    if (isAfter(new Date(), agreement.endDate)) {
      return { allowed: false, reason: 'Contract ended' };
    }
  }
  
  // Rule 4: Check leave balance
  const balance = await getLeaveBalance(employeeId, leaveType);
  if (balance.remaining <= 0) {
    return { allowed: false, reason: 'No balance available' };
  }
  
  return { allowed: true };
};

// Determine OT eligibility
const canApplyOvertime = async (employeeId) => {
  const employee = await getEmployee(employeeId);
  const staffRules = await getStaffTypeRules(employee.staffType);
  const agreement = await getPaymentAgreement(employee.paymentAgreementId);
  
  if (!staffRules.canApplyOvertime && !agreement?.allowOvertime) {
    return { allowed: false, reason: 'Staff type does not allow OT' };
  }
  
  if (employee.maxOvertimeHoursPerMonth > 0) {
    const thisMonthOT = await getOvertimeThisMonth(employeeId);
    if (thisMonthOT >= employee.maxOvertimeHoursPerMonth) {
      return { allowed: false, reason: 'Monthly OT limit reached' };
    }
  }
  
  return { allowed: true };
};

// Calculate billing for deployed staff
const calculateInvoiceAmount = async (employeeId, month, year) => {
  const agreement = await getPaymentAgreement(employeeId);
  const attendance = await getAttendance(employeeId, month, year);
  const overtime = await getOvertimeApproved(employeeId, month, year);
  
  let amount = 0;
  
  if (agreement.billingType === 'TIMESHEET') {
    const billableHours = attendance.workHours + (overtime.hours * agreement.otRateMultiplier);
    amount = billableHours * agreement.billingRate;
  } else if (agreement.billingType === 'DAILY_BILLABLE') {
    const workingDays = attendance.filter(a => a.status === 'PRESENT').length;
    amount = workingDays * agreement.billingRate;
  } else if (agreement.billingType === 'FIXED_RATE') {
    amount = agreement.billingRate; // Monthly fixed
  }
  
  return amount;
};
```

---

## PHASE 4: Backend API Endpoints

### New Routes to Add

**Staff Type Management** (`/hr/staff-types`)
- `GET /rules` - Get all staff type rules
- `POST /rules` - Create rule (Admin)
- `PUT /rules/:typeId` - Update rule (Admin)

**Eligibility Check** (`/hr/eligibility`)
- `GET /can-apply-leave/:employeeId?leaveType=` - Check leave eligibility
- `GET /can-apply-overtime/:employeeId` - Check OT eligibility
- `GET /leave-balance/:employeeId` - Get remaining balance with rules
- `GET /employment-info/:employeeId` - Get staff type, visa, contract info

**Payroll for Deployed** (`/payroll/deployed`)
- `GET /invoices/:employeeId?month=&year=` - Get invoices
- `GET /payment-history/:employeeId` - Payment records
- `POST /generate-invoice/:employeeId` - Create invoice from attendance

**Holiday Management** (`/hr/holidays`)
- `GET /public-holidays/:year?state=` - Get holidays by state
- `POST /holiday-swap` - Request holiday swap
- `GET /holiday-swap/pending` - Pending swaps (manager)
- `POST /holiday-swap/:swapId/approve` - Approve swap (manager)

---

## PHASE 5: UI Templates (React/Next.js)

### Internal Staff: Leave Application Page

```jsx
// Tekgen UI reference
// Shows:
// 1. Leave type cards (Annual, Medical, etc.) with available days
// 2. Leave calendar with color coding
// 3. Application form with multi-level approval flow
// 4. Document upload for supporting docs
```

### Deployed Staff: Attendance & Invoice Page

```jsx
// Shows:
// 1. Attendance calendar (check-in/out)
// 2. Current invoice (pending/paid)
// 3. Payment schedule
// 4. Rate card details
```

---

## PHASE 6: Recruitment → Payroll Integration

**Workflow**:
1. Candidate is selected (Phase 00: Recruitment)
2. HR creates offer in CandidateOnboarding
3. Offer specifies:
   - `staffType`: INTERNAL or DEPLOYED
   - `paymentAgreement`: Link to agreement
   - `leaveEligibleFrom`: Auto-set to joinDate + 3 months
   - `visaStatus`: CITIZEN / PR / EP_PASS
4. On acceptance:
   - Create EmployeeProfile
   - Set eligibility rules based on staffType
   - Link payment agreement
   - Auto-create LeaveBalances based on rules

---

## PHASE 7: Recruitment Module Protection

**DO NOT TOUCH**:
- `/routes/candidateRoutes.js`
- `/routes/jobRoutes.js`
- Candidate model relationships
- Job model relationships
- Application workflow

**SAFE TO ADD**:
- New relation in Candidate: `onboarding` (CandidateOnboarding)
- New relation in Job: `onboarding` (CandidateOnboarding)
- These are **additive only**, no existing data affected

---

## Implementation Status

- [ ] Phase 1: Schema Enhancements
  - [ ] Add StaffTypeRules model
  - [ ] Add PaymentAgreement model
  - [ ] Add PublicHoliday & HolidaySwap models
  - [ ] Enhance EmployeeProfile
  - [ ] Run migrations
  
- [ ] Phase 2: Dashboards
  - [ ] Create `/pages/hr/dashboard/internal.js`
  - [ ] Create `/pages/hr/dashboard/deployed.js`
  - [ ] Add dashboard components (Leave cards, Calendar, etc.)
  
- [ ] Phase 3: Eligibility Engine
  - [ ] Create `/services/eligibilityService.js`
  - [ ] Create `/services/invoicingService.js`
  - [ ] Add business logic functions
  
- [ ] Phase 4: Backend APIs
  - [ ] Create `/routes/staffTypes.js`
  - [ ] Create `/routes/eligibility.js`
  - [ ] Create `/routes/deployedPayroll.js`
  - [ ] Create `/routes/holidays.js`
  
- [ ] Phase 5: UI Components
  - [ ] Internal staff leave form
  - [ ] Deployed staff attendance
  - [ ] Holiday calendar
  - [ ] Invoice dashboard
  
- [ ] Phase 6: Integration
  - [ ] Update onboarding flow
  - [ ] Test recruitment → payroll flow
  
- [ ] Phase 7: Testing & Deployment
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] User acceptance testing
  - [ ] Deploy to production

---

## Key Notes

✅ **Safe**: Adding new models and routes
✅ **Safe**: Adding new relationships (additive only)
✅ **Safe**: Creating new pages/components
✅ **Safe**: Creating new services

⚠️ **NEVER**: Modify recruitment models or routes
⚠️ **NEVER**: Change existing User authentication flow
⚠️ **NEVER**: Delete or alter candidate/job relationships

