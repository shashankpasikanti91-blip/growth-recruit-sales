# End-to-End Testing Guide - HR & Payroll System
**Date**: May 6, 2026  
**Status**: Ready for Production Testing  

---

## 🧪 TEST ENVIRONMENT SETUP

### Prerequisites
- Docker running with `tekgen-postgres` started
- Frontend: `npm run dev` (port 3000)
- Backend: `npm start` (port 5000)
- Browser: Chrome/Firefox (clear cache if needed)

### Quick Start
```bash
# Terminal 1 - Frontend
cd c:\Tekgen\tekgen-ats-frontend
npm run dev

# Terminal 2 - Backend
cd c:\Tekgen\tekgen-ats-backend
npm start

# Terminal 3 - Database (if needed)
docker start tekgen-postgres
```

---

## 🎯 TEST SCENARIO 1: Quick Login Flow

### Objective
Verify quick login auto-fills email AND password for all demo accounts

### Test Steps
1. Open browser → http://localhost:3000/auth/login
2. Click "Quick Login" dropdown
3. **Test each account**:
   - [ ] Admin (email: admin@tekgen.com, password: Admin@2026)
   - [ ] Demo (email: demo@tekgen.com, password: Demo@2026)
   - [ ] Shashank (email: shashank@tekgen.com, password: Shashank@2026)
   - [ ] Jerry (email: jerry@tekgen.com, password: Jerry@2026)
   - [ ] Savitha (email: savitha@tekgen.com, password: Savitha@2026)
   - [ ] Payroll Admin (email: payroll@tekgen.com, password: Payroll@2026)

### Expected Results
```
✅ Email field auto-fills with correct email
✅ Password field auto-fills with correct password
✅ Click "Sign In" → Logs in successfully
✅ Redirects to correct dashboard per role
```

### Actual Results
| Account | Email | Password | Sign In | Redirect | Status |
|---------|-------|----------|---------|----------|--------|
| Admin | ✅ | ✅ | ✅ | Ops Hub | ✅ |
| Payroll | ✅ | ✅ | ✅ | Admin Dash | ✅ |
| Shashank | ✅ | ✅ | ✅ | Dashboard | ✅ |
| Demo | ✅ | ✅ | ✅ | Dashboard | ✅ |
| Jerry | ✅ | ✅ | ✅ | Dashboard | ✅ |
| Savitha | ✅ | ✅ | ✅ | Dashboard | ✅ |

---

## 🎯 TEST SCENARIO 2: Role-Based Dashboards

### Objective
Verify each role sees correct dashboard on login

### Test 2A: Admin User
```
1. Login as admin@tekgen.com / Admin@2026
2. Expected: Operations Hub (full platform)
3. Check sidebar:
   ✅ Recruitment section visible
   ✅ HR Operations visible
   ✅ Payroll section visible
   ✅ Sales CRM visible
   ✅ Visa & Permits visible
   ✅ Finance visible
   ✅ Analytics visible
```

### Test 2B: Payroll Admin User
```
1. Login as payroll@tekgen.com / Payroll@2026
2. Expected: Payroll Admin Dashboard (NOT Ops Hub!)
3. Check dashboard:
   ✅ Total Staff card (KPI)
   ✅ Active Employees card (KPI)
   ✅ Pending Setup card (KPI)
   ✅ Pending Claims card (KPI)
   ✅ Current Payroll Run section
   ✅ Quick Actions panel (4 buttons)
4. Check sidebar:
   ❌ Recruitment NOT visible
   ❌ Sales CRM NOT visible
   ✅ HR Operations visible
   ✅ Payroll visible
   ✅ My Workspace visible
```

### Test 2C: Recruiter User
```
1. Login as shashank@tekgen.com / Shashank@2026
2. Expected: Dashboard (My Workspace)
3. Check sidebar:
   ✅ My Dashboard visible
   ✅ My Leave visible
   ✅ My Attendance visible
   ✅ My Payslips visible
   ✅ My Claims visible
   ❌ Recruitment module NOT in sidebar (specific menu)
   ❌ Payroll section NOT visible
```

---

## 🎯 TEST SCENARIO 3: Beautiful Leaves Dashboard

### Objective
Verify new gradient-style leaves page displays correctly and is interactive

### Test 3A: Navigate to Leaves
```
1. Login as any internal staff (Shashank, Demo, etc.)
2. Click "My Leave" in sidebar
3. Expected: Beautiful gradient-style page loads
```

### Test 3B: Grid View (Default)
```
Should see 7 colorful gradient cards:

Card 1: ANNUAL LEAVE
✅ Green gradient (from-green-400 to-green-600)
✅ Icon: ☀️
✅ Title: "Annual Leave"
✅ Subtitle: "Yearly vacation entitlement"
✅ Stats: Entitled=11, Taken=7, Remaining=4
✅ Progress bar showing 7/11 (64%)
✅ "APPLY" button at bottom

Card 2: MEDICAL LEAVE
✅ Purple gradient
✅ Icon: ⚕️
✅ Stats: Entitled=14, Taken=0, Remaining=14
✅ "APPLY" button

Card 3: HOSPITALIZATION
✅ Red gradient
✅ Icon: 🏥
✅ Stats: Entitled=60, Taken=0, Remaining=60
✅ "APPLY" button

Card 4: COMPASSIONATE
✅ Blue gradient
✅ Icon: 💙
✅ Stats: Entitled=3, Taken=0, Remaining=3
✅ "APPLY" button

Card 5: NO PAY
✅ Slate gradient
✅ Icon: 📋
✅ Stats: All 0
✅ "APPLY" button

Card 6: REPLACEMENT
✅ Amber gradient
✅ Icon: 🔄
✅ Stats: All 0
✅ "APPLY" button

Card 7: COMPANY OFF
✅ Cyan gradient
✅ Icon: 🏢
✅ Stats: All 0
✅ "APPLY" button
```

### Test 3C: Card Interactions
```
1. Hover over any card:
   ✅ Shadow increases
   ✅ Card scales slightly (hover:scale-105)
   ✅ Cursor changes to pointer
   
2. Click on Annual Leave card:
   ✅ Card is clickable (no page navigation yet)
   ✅ "APPLY" button is also clickable
   
3. Click "APPLY" button:
   ✅ Navigates to apply form (if created)
   ✅ Or shows apply modal
```

### Test 3D: List View
```
1. Click "List View" button at top
2. Expected: Table view of all leaves
   ✅ Columns: Leave Type, Entitled, Taken, Remaining, Pending, Action
   ✅ 7 rows (one per leave type)
   ✅ Icons visible in first column
   ✅ Stats correctly displayed
   ✅ "Apply" button on each row
   ✅ Hover effect on rows (bg-slate-50)

3. Click "Apply" button on any row:
   ✅ Navigates to apply form
```

### Test 3E: Toggle Views
```
1. Start in Grid View
   ✅ Grid View button highlighted (blue)
   ✅ List View button white
   ✅ Cards display
   
2. Click List View button
   ✅ List View button becomes blue
   ✅ Grid View button becomes white
   ✅ Table displays
   ✅ Cards hidden

3. Click Grid View button again
   ✅ Back to cards
   ✅ All previous state preserved
```

### Test 3F: Recent Requests Section
```
1. Scroll to bottom of page
2. See "Recent Leave Requests" section
   ✅ Shows sample leave requests
   ✅ Each request shows:
      - Leave type
      - Date range
      - Status badge (Pending/Approved)
      - Right arrow (chevron)
   ✅ Hoverable rows (bg-slate-100)
   ✅ Clickable (can click to view details)
```

---

## 🎯 TEST SCENARIO 4: Payroll Admin Specific Features

### Objective
Verify payroll admin dashboard shows only relevant features

### Test 4A: Dashboard Stats
```
Login as payroll@tekgen.com
Expected visible:

✅ Total Staff: X active employees
✅ Active Employees: X (should be less than total)
✅ Pending Setup: X (staff without approved salary structure)
✅ Pending Claims: X (claims awaiting approval)

All stats should have:
✅ Icon (relevant to stat type)
✅ Color-coded background
✅ Status badge ("Active", "Action", "Alert")
✅ Description text
```

### Test 4B: Current Payroll Run
```
When payroll run exists:
✅ Shows: Month/Year
✅ Shows: Status (DRAFT, IN_PROGRESS, COMPLETED)
✅ Shows: Total Payroll amount
✅ Shows: Progress (X processed of Y staff)

When no payroll run:
✅ Shows placeholder with status NOT_STARTED
```

### Test 4C: Quick Actions Panel
```
Blue gradient panel on right side shows 4 buttons:

1. "View All Runs"
   ✅ Navigates to /payroll/runs

2. "Pending Approvals"
   ✅ Navigates to /payroll/approvals

3. "Salary Structures"
   ✅ Navigates to /payroll/salary-structures

4. "My Workspace"
   ✅ Navigates to /workspace
```

### Test 4D: Role Enforcement
```
1. Try to access /payroll/admin-dashboard as non-PAYROLL_ADMIN
   ✅ Should redirect to /dashboard or show permission error

2. Try to access via Payroll Admin
   ✅ Should load successfully
```

---

## 🎯 TEST SCENARIO 5: Authorization & Token Handling

### Objective
Verify auth token is properly sent and handled

### Test 5A: Token Storage
```
1. Login successfully
2. Open browser DevTools → Application → Local Storage
   ✅ Find: token (JWT string)
   ✅ Find: authToken (should match token)
   ✅ Find: user (JSON object with user data)

3. Open browser DevTools → Application → Cookies
   ✅ Find: token (HTTP-only cookie)
   ✅ Find: user (HTTP-only cookie)
```

### Test 5B: API Requests
```
1. Login as any user
2. Open DevTools → Network tab
3. Navigate to any page that makes API calls
4. Check network requests:
   ✅ All requests have "Authorization: Bearer <token>" header
   ✅ No requests show "No authorization token provided"
   ✅ Responses have status 200 (not 401)
```

### Test 5C: Session Expiry
```
1. Clear all auth data from storage
2. Try to navigate to protected page
   ✅ Should redirect to /auth/login
   ✅ Session properly cleared
```

---

## 🎯 TEST SCENARIO 6: Navigation & Routing

### Objective
Verify correct routing and redirects

### Test 6A: URL Direct Access
```
1. Go to http://localhost:3000/hr/leaves
   ✅ Should show new gradient leaves page
   ✅ NOT old leaves page

2. Go to http://localhost:3000/payroll
   ✅ Redirects to /payroll/admin-dashboard (if PAYROLL_ADMIN)
   ✅ Redirects to /payroll/dashboard (if ADMIN/FINANCE)

3. Go to http://localhost:3000/payroll/admin-dashboard (as Recruiter)
   ✅ Should redirect to /dashboard (not allowed)
```

### Test 6B: Sidebar Navigation
```
1. Login as Payroll Admin
2. Sidebar shows:
   ✅ HR Operations (expandable)
   ✅ Payroll (expandable)
   ✅ My Workspace (expandable)
   ✅ Integrations

3. Click HR Operations > My Leave
   ✅ Navigates to /hr/leaves
   ✅ Shows beautiful leaves page

4. Click Payroll
   ✅ Shows payroll submenu
   ✅ Can access admin dashboard, runs, salary structures
```

---

## ✅ COMPREHENSIVE TEST CHECKLIST

### Session 1: Authentication & Login
- [ ] Quick login works for all 6 demo accounts
- [ ] Email field auto-fills
- [ ] Password field auto-fills
- [ ] "Sign In" button works after quick login
- [ ] Redirects to correct dashboard per role
- [ ] Login form accepts manual entry
- [ ] Incorrect credentials show error message
- [ ] "Remember me" checkbox works

### Session 2: UI Rendering
- [ ] Leaves page shows 7 beautiful gradient cards
- [ ] All card stats display correctly
- [ ] Progress bars render
- [ ] Icons render
- [ ] Grid view responsive on mobile
- [ ] List view responsive on mobile
- [ ] View toggle buttons work
- [ ] Recent requests section visible

### Session 3: User Interactions
- [ ] Card hover effects work (scale, shadow)
- [ ] Buttons clickable and responsive
- [ ] List view table scrolls on small screens
- [ ] Navigation between views smooth
- [ ] No console errors

### Session 4: Role-Based Access
- [ ] Payroll Admin sees admin dashboard (not Ops Hub)
- [ ] Admin sees Operations Hub
- [ ] Recruiter sees My Workspace
- [ ] Sidebar correct per role
- [ ] Cannot access admin-dashboard as non-admin
- [ ] Quick Actions panel shows correct links

### Session 5: API Integration
- [ ] Auth token sent on all requests
- [ ] No 401 errors
- [ ] Dashboard stats load (if API ready)
- [ ] Error messages display when needed
- [ ] Loading states show

### Session 6: Browser Compatibility
- [ ] Works on Chrome
- [ ] Works on Firefox
- [ ] Works on Safari (if available)
- [ ] Works on mobile Safari
- [ ] Works on Chrome mobile

---

## 🐛 BUG REPORT TEMPLATE

If you find an issue:

```
**Title**: [Brief description]

**Steps to Reproduce**:
1. Login as [user]
2. Navigate to [page]
3. Click [element]
4. Expected: [what should happen]
5. Actual: [what actually happened]

**Evidence**:
- Screenshot: [attach]
- Console Error: [paste]
- Network Request: [attach]

**Severity**: [Critical/High/Medium/Low]
**Browser**: [Chrome/Firefox/etc]
**Time**: [When it occurred]
```

---

## 🎉 SUCCESS CRITERIA

All tests pass when:
- ✅ Quick login works for all accounts with email & password
- ✅ Payroll admin sees admin dashboard (not Ops Hub)
- ✅ Leaves page shows beautiful gradient cards
- ✅ Grid & List views toggle correctly
- ✅ All navigation works
- ✅ No 401 or auth errors
- ✅ Mobile responsive
- ✅ No console errors

---

## 📞 NEXT STEPS IF TESTS FAIL

1. **Check Console**: Open DevTools (F12) → Console tab
   - Look for red error messages
   - Check Network tab for failed requests

2. **Check Storage**: Application → Local Storage
   - Verify `token` and `user` are present
   - Check token format (should start with "ey")

3. **Check Backend**: Terminal where backend runs
   - Look for 500 errors
   - Check database connection
   - Run: `npm start` again if crashed

4. **Check Frontend**: Terminal where frontend runs
   - Look for build errors
   - Run: `npm run dev` again if crashed

5. **Clear Cache**:
   ```
   - Chrome: Ctrl+Shift+Delete
   - Clear: Cookies and cached images
   - Restart browser
   ```

---

**Test Completed Date**: ___________  
**Tester Name**: ___________  
**Pass/Fail**: ___________  

