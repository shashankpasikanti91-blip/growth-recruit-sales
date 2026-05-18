# 🎯 QUICK START GUIDE - Leave/Claim/Overtime System

## Server Status
```
✅ Backend: http://localhost:5001
✅ Frontend: http://localhost:3000
✅ Database: PostgreSQL (tekgen_ats)
```

---

## Demo Accounts (All Ready)

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@tekgen.com | Admin@2026 | ADMIN | Full access |
| payroll@tekgen.com | Payroll@2026 | PAYROLL_ADMIN | Mapping & batch |
| shashank@tekgen.com | Shashank@2026 | MANAGER | Level 1 approval |
| jerry@tekgen.com | Jerry@2026 | HEAD | Level 2 approval |
| savitha@tekgen.com | Savitha@2026 | - | Employee |
| demo@tekgen.com | Demo@2026 | - | Employee |

---

## 🔄 WORKFLOW EXAMPLES

### Example 1: Employee Submits Leave

**Employee Action:**
1. Login as `savitha@tekgen.com`
2. Go to `Leaves` page
3. Fill form:
   - Start Date: 2026-05-12
   - End Date: 2026-05-14
   - Leave Type: Sick Leave
   - Reason: Medical checkup
4. Click "Submit Leave"
5. Get confirmation: `TKG-LV-XXXX`

**What Happens Behind Scenes:**
```
POST /api/my-workspace/leaves
↓
Backend creates LeaveRequest
↓
Calls approvalService.initializeLeaveApprovals()
↓
Creates 3 approval levels:
  Level 1: Assigned to shashank@tekgen.com (MANAGER)
  Level 2: Assigned to jerry@tekgen.com (HEAD)
  Level 3: Assigned to admin@tekgen.com (ADMIN/MD)
↓
Notifications sent to all approvers
```

**Manager Action (shashank@tekgen.com):**
1. Login as manager
2. Go to `/workspace/approval-queue`
3. Click "Leaves" tab
4. See pending: `1 pending leave`
5. Click on `TKG-LV-XXXX`
6. Review details
7. Click "Approve" button
8. Add comment (optional): "Looks good"
9. Click "Confirm Approval"

**Backend Processing:**
```
POST /api/payroll/approver/leaves/:leaveId/action
{
  action: "APPROVE",
  comment: "Looks good"
}
↓
Updates LeaveApproval (Level 1) → APPROVED
↓
Escalates to Level 2 (jerry@tekgen.com)
↓
notifyApprovalStatusChange() sends:
  - Email to savitha@tekgen.com
  - In-app notification
  - Status: "Approved at Level 1"
↓
Head (jerry@tekgen.com) sees new pending item
```

---

### Example 2: Payroll Maps to Payslip

**Payroll Admin Action (payroll@tekgen.com):**

1. Go to Payroll > Payslips section
2. Find payroll run: "May 2026"
3. Click "Map Approved Items"

**Backend:**
```
POST /api/payroll/mapping/batch/:payrollRunId
↓
For each employee in payroll run:
  ├─ Fetch all approved items (Month: May, Year: 2026)
  ├─ Calculate leave payroll:
  │  ├─ Paid leaves: +amount (add to earnings)
  │  └─ Unpaid leaves: -amount (deduct from salary)
  ├─ Calculate claims: +amount
  ├─ Calculate overtime: hours × rate × multiplier
  └─ Update Payslip:
     ├─ approvedLeaveIds: ["TKG-LV-0042", "TKG-LV-0043"]
     ├─ approvedClaimIds: ["TKG-CLM-0015"]
     ├─ approvedOvertimeIds: ["TKG-OT-0008"]
     ├─ Recalculate grossSalary
     └─ Mark all items as payrollMapped = true
↓
Return summary: "12/15 payslips updated"
```

**Employee (savitha@tekgen.com):**
1. Notification: "💰 Your payslip for May/2026 is ready"
2. Go to Payroll > Payslips
3. Click "May 2026" payslip
4. View summary with mapping:
   - Leaves included: TKG-LV-0042, TKG-LV-0043
   - Claims included: TKG-CLM-0015
   - Overtime included: TKG-OT-0008

---

### Example 3: Month-End Alert

**Date: May 27, 2026 (Last 5 days of month)**

**System Automatically:**
1. Triggers: `sendMonthEndAlerts()`
2. Finds all employees with pending items
3. Sends email + in-app notification:

**Email Subject:**
```
⚠️ Month-End Alert: 4 Days - Complete Your Submissions
```

**Email Body:**
```
Hi Savitha,

Only 4 days left in the month!

Pending Items:
- Leave Requests: 1
- Expense Claims: 2
- Overtime Claims: 0

Please log in to your workspace to complete submissions.
```

**In-app Notification:**
```
Type: MONTH_END_ALERT
Severity: HIGH
Message: "4 days remaining in month. Please complete 3 pending items."
```

---

## 📊 API QUICK CALLS

### Get Approval Dashboard
```bash
curl -X GET http://localhost:5001/api/payroll/approver/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "success": true,
  "data": {
    "pending": {
      "leaves": 5,
      "claims": 2,
      "total": 7
    },
    "recent": {
      "approvals": 12,
      "rejections": 1
    }
  }
}
```

### Get Pending Leaves
```bash
curl -X GET "http://localhost:5001/api/payroll/approver/leaves?status=PENDING&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Approve a Leave
```bash
curl -X POST http://localhost:5001/api/payroll/approver/leaves/:leaveId/action \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "APPROVE",
    "comment": "Approved by manager"
  }'
```

### Get User Notifications
```bash
curl -X GET "http://localhost:5001/api/notifications?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Map Payslip
```bash
curl -X POST http://localhost:5001/api/payroll/mapping/payslip/:payslipId/map \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "month": 5,
    "year": 2026
  }'
```

### Batch Map All Payslips
```bash
curl -X POST http://localhost:5001/api/payroll/mapping/batch/:payrollRunId \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 FEATURE MATRIX

| Feature | Employee | Manager | Payroll Admin | Status |
|---------|----------|---------|---------------|--------|
| Submit Leave | ✅ | - | - | Ready |
| Submit Claim | ✅ | - | - | Ready |
| Submit Overtime | ✅ | - | - | Ready |
| View Status | ✅ | ✅ | ✅ | Ready |
| Approve Level 1 | - | ✅ | ✅ | Ready |
| Approve Level 2 | - | ✅ | ✅ | Ready |
| Map to Payslip | - | - | ✅ | Ready |
| Batch Process | - | - | ✅ | Ready |
| View Notifications | ✅ | ✅ | ✅ | Ready |
| Receive Alerts | ✅ | ✅ | ✅ | Ready |

---

## 🔍 DEBUGGING TIPS

### Check Pending Approvals
```bash
GET /api/payroll/approver/dashboard
```

### View Specific Leave Details
```bash
GET /api/payroll/approver/leaves/:leaveId
```

### Check Unmapped Items
```bash
GET /api/payroll/mapping/unmapped/:employeeId
```

### View Payslip Audit Trail
```bash
GET /api/payroll/mapping/payslip/:payslipId/audit
```

### Check User Notifications
```bash
GET /api/notifications?unreadOnly=true
```

---

## ⚠️ IMPORTANT NOTES

1. **Payroll Mapping**: Only maps APPROVED items (status = "APPROVED")
2. **Unpaid Leaves**: Automatically deducted from salary
3. **Claims**: Only mapped when APPROVED at all levels
4. **Overtime**: Included in payslip after approval
5. **Notifications**: Sent automatically on status changes
6. **Month-End**: Alerts sent in last 5 days of month

---

## 🚨 ERROR HANDLING

### If leave approval fails:
```json
{
  "success": false,
  "message": "You are not authorized to approve this request or it is not pending"
}
```
**Fix**: Ensure you're logged in as the assigned approver

### If mapping fails:
```json
{
  "success": false,
  "message": "Payslip not found"
}
```
**Fix**: Verify payslipId exists and belongs to the correct payroll run

### If notification fails:
- Check email configuration in `.env`
- Verify SMTP credentials
- Check user email address is valid

---

## 📞 SUPPORT

For issues:
1. Check server logs: Port 5001
2. Verify database connection: PostgreSQL
3. Check notification service: `/api/notifications/unread-count`
4. Review approval workflow: `/api/payroll/approver/dashboard`

---

**System Ready**: ✅ May 6, 2026
**All Features**: ✅ Production Ready
**Testing**: ✅ E2E Verified
