# ⚡ QUICK START - Test New Features Now

## 🚀 System Ready for Testing

**Changes Applied**:
✅ Quick login password auto-fill  
✅ Beautiful gradient leaves dashboard  
✅ Payroll admin specific dashboard  
✅ Role-based redirects  
✅ Authorization token handling  

---

## 📋 BEFORE YOU START

### 1. Clear Browser Cache
```
Chrome:  Press Ctrl+Shift+Delete
Firefox: Press Ctrl+Shift+Delete
Safari:  Cmd+Shift+Delete

Select: Cookies, Cached Images and Files
Click: Delete
```

### 2. Restart Services
```bash
# Terminal 1 - Stop frontend (if running)
# Press Ctrl+C

# Terminal 1 - Start frontend fresh
cd c:\Tekgen\tekgen-ats-frontend
npm run dev

# Terminal 2 - Stop backend (if running)
# Press Ctrl+C

# Terminal 2 - Start backend fresh
cd c:\Tekgen\tekgen-ats-backend
npm start

# Terminal 3 - Verify Docker
docker ps | findstr tekgen-postgres
# Should show container running
```

### 3. Refresh Browser
```
Open: http://localhost:3000
Press: Ctrl+Shift+R (hard refresh)
```

---

## 🎯 WHAT TO TEST (5 MINUTES)

### Test 1️⃣: Quick Login (1 min)
```
1. See login page
2. Click "Quick Login"
3. Select "Payroll Admin"
4. ✅ VERIFY: Both email AND password auto-fill
5. Click "Sign In"
6. ✅ VERIFY: Logs in and shows Payroll Admin Dashboard
```

### Test 2️⃣: Payroll Admin Dashboard (1 min)
```
1. As payroll@tekgen.com, logged in
2. ✅ VERIFY: See "Payroll Administration" title
3. ✅ VERIFY: See 4 KPI cards (Staff, Employees, Setup, Claims)
4. ✅ VERIFY: See "Current Payroll Run" section
5. ✅ VERIFY: See "Quick Actions" panel on right
6. ✅ VERIFY: NO "Operations Hub" title
7. ✅ VERIFY: Sidebar shows only HR + Payroll (not Recruitment)
```

### Test 3️⃣: Beautiful Leaves Page (2 min)
```
1. Login as shashank@tekgen.com / Shashank@2026
2. Click "My Workspace" > "My Leave"
3. ✅ VERIFY: See 7 colorful gradient cards
4. ✅ VERIFY: Each card has:
   - Icon (☀️⚕️🏥💙📋🔄🏢)
   - Leave name
   - Stats (Entitled/Taken/Remaining)
   - Progress bar
   - "APPLY" button
5. Hover over Annual Leave card
6. ✅ VERIFY: Card scales up slightly and shadow increases
7. Click "Grid View" button (should already be selected)
8. Click "List View" button
9. ✅ VERIFY: See table with all 7 leave types
10. Click "Grid View" button again
11. ✅ VERIFY: Back to cards
```

### Test 4️⃣: Authorization (1 min)
```
1. Still logged in as Shashank
2. Open DevTools: Press F12
3. Go to "Application" tab
4. Left sidebar > "Local Storage"
5. ✅ VERIFY: See "token" entry (long JWT string)
6. ✅ VERIFY: See "user" entry (JSON with user data)
7. Go to "Network" tab
8. Click "My Leave" again
9. ✅ VERIFY: Network requests show status 200 (not 401)
10. ✅ VERIFY: All requests have "Authorization" header
```

---

## 📊 EXPECTED RESULTS

### ✅ If Everything Works
```
[Test 1] Quick Login
✅ Email field filled: payroll@tekgen.com
✅ Password field filled: Payroll@2026
✅ Sign In works
✅ Dashboard shows

[Test 2] Payroll Admin Dashboard
✅ Title says "Payroll Administration"
✅ 4 KPI cards visible
✅ Current Payroll Run section present
✅ Quick Actions panel present
✅ Sidebar limited (HR + Payroll only)

[Test 3] Leaves Page
✅ 7 beautiful gradient cards
✅ All stats correct
✅ Progress bars render
✅ Grid/List toggle works
✅ Cards are interactive

[Test 4] Authorization
✅ Token in localStorage
✅ Network requests successful (200)
✅ Authorization headers present
```

### ⚠️ If Something Fails

**Symptom**: Login shows empty password field
```
→ Browser cache issue
→ Solution: Clear cache (see step 1 above)
→ Or: Use Ctrl+Shift+R on login page
```

**Symptom**: Shows "Operations Hub" instead of Payroll Dashboard
```
→ Old page still cached
→ Solution: Hard refresh (Ctrl+Shift+R)
→ Or: Restart frontend with `npm run dev`
```

**Symptom**: Leaves page shows old UI (not colorful cards)
```
→ Old code still loaded
→ Solution: Kill frontend (Ctrl+C), run `npm run dev` again
→ Wait for build: "compiled successfully"
→ Hard refresh in browser
```

**Symptom**: "No authorization token provided" error
```
→ Token not being sent
→ Solution: Clear localStorage and login again
→ Or: Close browser and reopen
```

**Symptom**: 404 or page not found
```
→ File not created properly
→ Solution: Check files exist:
  - c:\Tekgen\tekgen-ats-frontend\pages\hr\leaves.js
  - c:\Tekgen\tekgen-ats-frontend\pages\payroll\admin-dashboard.js
→ Restart frontend if missing
```

---

## 🔍 HOW TO DEBUG

### View Console Errors
```
Press: F12
Go to: Console tab
Look for: Red error messages
Copy: Paste in bug report
```

### View Network Calls
```
Press: F12
Go to: Network tab
Click: XHR filter
Refresh page
Look for: Failed requests (red)
Click: To see response
```

### View Storage
```
Press: F12
Go to: Application tab
Left: Storage > Local Storage
Check: token, user, authToken present
Verify: Token starts with "eyJ" (JWT)
```

---

## ✅ FINAL CHECKLIST

Before confirming "System Ready":

- [ ] Browser cache cleared
- [ ] Frontend running (`npm run dev`)
- [ ] Backend running (`npm start`)
- [ ] Docker PostgreSQL running
- [ ] Page hard-refreshed (Ctrl+Shift+R)
- [ ] Logged out (cleared auth)

Ready to test:

- [ ] Test 1: Quick login works (email + password)
- [ ] Test 2: Payroll admin sees admin dashboard
- [ ] Test 3: Leaves page shows 7 colorful cards
- [ ] Test 4: Authorization token is present
- [ ] No console errors (F12 > Console tab)

---

## 🎉 SUCCESS!

If all 4 tests pass → **System is ready for use** ✅

### What's Working
✅ Quick login for all 6 demo accounts  
✅ Payroll admin dashboard (payroll-specific)  
✅ Beautiful gradient leaves page  
✅ Grid & List view toggle  
✅ Role-based access control  
✅ Authorization headers on all requests  

### Next: Full E2E Testing
See **E2E_TESTING_GUIDE.md** for comprehensive test scenarios

---

**Test Duration**: ~5 minutes  
**Difficulty**: Easy  
**Required Knowledge**: None  

