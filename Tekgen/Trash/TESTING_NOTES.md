# Tekgen ATS – Regression & Manual Test Checklist
**Date:** 27 Apr 2026  
**Scope:** Bugs fixed in this sprint (JD mapping, JD page routing, application linking, JobList link)

---

## Environment Setup
- Server: `http://localhost:5000`
- ngrok: run `start-ngrok.bat` for public URL
- Login: `demo@tekgen.com` / `Demo@1234`

---

## Test Suite 1 — Direct URL Routing (SPA Fallback)

### TC-1.1 — Job view page: direct URL refresh
1. Open Jobs list → click **View** on any job → note URL `/jobs/view/<id>`
2. Press **F5** (hard refresh on that URL)
3. **Expected:** Page loads correctly showing job details — NOT a 404 or blank page.

### TC-1.2 — Job edit page: direct URL refresh
1. From job card click **Edit** → note URL `/jobs/edit/<id>`
2. Press **F5**
3. **Expected:** Edit form loads with pre-filled job data.

### TC-1.3 — Candidate profile page: direct URL refresh
1. Open Candidates list → click any candidate name → note URL `/candidates/<id>`
2. Press **F5**
3. **Expected:** Candidate 360 page loads correctly.

### TC-1.4 — Paste URL into new tab
1. Copy `/jobs/view/<id>` URL
2. Paste into a new browser tab and press Enter
3. **Expected:** Page loads with job detail. No redirect to home.

---

## Test Suite 2 — AI Screening: Candidate ↔ Job Mapping

### TC-2.1 — Screen button requires job selection
1. Open any Candidate 360 page that has a resume
2. Without selecting a job in the dropdown, click **Screen Now**
3. **Expected:** Button is disabled (greyed out). A tooltip "Select a job first" appears on hover. A toast error appears: "Please select a job before running AI screening."

### TC-2.2 — Screening saves against the existing candidate
1. Open a candidate with a resume (check `resumeText` is not null in Overview tab)
2. Select a job from the dropdown
3. Click **Screen Now** → wait for completion
4. **Expected:**
   - Toast: "AI screening complete. Scroll to Screenings tab to view the full result."
   - Tab automatically switches to **Screenings**
   - Screening result panel shows score, recommendation, strengths, weaknesses
   - In the DB (`screenings` table), a row exists with `candidateId` = this candidate's ID
   - **No new duplicate candidate** should appear in the Candidates list

### TC-2.3 — Re-running screening on same candidate + job returns cached result
1. Screen candidate against Job A (from TC-2.2)
2. Without changing anything, click **Screen Now** again with same job selected
3. **Expected:** Returns the existing result immediately (no second AI call). Same score.

### TC-2.4 — Screening with no resume text shows proper warning
1. Open a candidate with no resume uploaded
2. **Expected:** The AI screening block shows "No resume text on file. Upload a resume to enable AI screening." — Screen Now button is not visible.

---

## Test Suite 3 — Application Linking

### TC-3.1 — First-time screening creates an application record
1. Take a candidate that has **no existing application** for Job B
2. Run AI screening against Job B
3. **Expected:**
   - In **Applied Jobs** tab on Candidate 360, a new application row for Job B appears
   - Status is `SHORTLISTED`, `SCREENED`, or `REJECTED` based on AI score

### TC-3.2 — Repeat screening does NOT crash with unique constraint
1. Run AI screening for the same candidate + job pair a second time
2. **Expected:**
   - No 500 error or "Unique constraint failed" in the browser console or backend logs
   - Returns the cached screening result cleanly

### TC-3.3 — Application status updates on re-screen (if forced)
1. If the existing application status is `APPLIED` and re-screening returns score 75+
2. **Expected:** Application status in DB updates to `SHORTLISTED` (visible in Applied Jobs tab after refresh)

### TC-3.4 — Application ID visible in candidate profile
1. On candidate 360, click **Applications** tab
2. **Expected:** Each application shows the job title, department, status, and applied date

---

## Test Suite 4 — JobList View Link

### TC-4.1 — View Details button opens correct job page
1. Go to `/jobs` page
2. In any job card, click **View Details** (from `JobList` component if used) or the **View** button
3. **Expected:** Opens `/jobs/view/<correct-job-id>` — NOT `/jobs/<id>`

### TC-4.2 — Job detail page shows real data
1. After opening job detail via View button
2. **Expected:** Title, department, location, description, required skills, status, experience range — all populated from DB

### TC-4.3 — Refresh on job detail page works
1. On `/jobs/view/<id>`, press F5
2. **Expected:** Same page loads without 404 (covered by TC-1.1)

---

## Test Suite 5 — Error Handling & Toast Notifications

### TC-5.1 — Network error during screening shows toast
1. Disconnect network / stop backend server
2. Open candidate page and attempt screening
3. **Expected:** Toast (red) appears with error message. No unhandled JS exception in console.

### TC-5.2 — Toast auto-dismisses
1. Trigger a toast (e.g., screening success or error)
2. Wait 5 seconds without clicking
3. **Expected:** Toast disappears automatically

### TC-5.3 — Toast can be dismissed manually
1. Trigger any toast
2. Click the × button on the toast
3. **Expected:** Toast closes immediately

---

## Test Suite 6 — Dev Logging

### TC-6.1 — Console logs in development mode
1. Run frontend in development mode (`npm run dev`)
2. Open candidate page, run screening
3. **Expected:** `[CandidatePage] Screening candidate <id> against job <jobId>` visible in browser console
4. **Expected:** `[API] POST /api/screenings/single → 200` visible in browser console

### TC-6.2 — No console.log in production build
1. Use the production-built static export (served via backend on port 5000)
2. Open browser DevTools → Console
3. Run a screening
4. **Expected:** No `[CandidatePage]` or `[API] POST` debug logs in console

---

## Backend Validation Checks

### TC-7.1 — POST /api/screenings/single without candidateId
```bash
curl -X POST http://localhost:5000/api/screenings/single \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"jobId": "abc123"}'
```
**Expected:** `400 Validation failed` — `"candidateId is required"`

### TC-7.2 — POST /api/screenings/single without jobId
```bash
curl -X POST http://localhost:5000/api/screenings/single \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "abc123"}'
```
**Expected:** `400 Validation failed` — `"jobId is required"`

### TC-7.3 — POST /api/screenings/single with invalid candidate ID
```bash
curl -X POST http://localhost:5000/api/screenings/single \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"candidateId": "nonexistent-id", "jobId": "<valid-job-id>"}'
```
**Expected:** `400` — `"Candidate or resume not found"`

---

## Quick Regression Run (5-min smoke test)
1. [ ] Login successfully
2. [ ] Jobs list loads
3. [ ] Open Job detail (F5 refresh works)
4. [ ] Edit job (F5 refresh works)
5. [ ] Candidates list loads
6. [ ] Open Candidate 360 (F5 refresh works)
7. [ ] Select job + Screen Now → toast success → Screenings tab shows result
8. [ ] Applied Jobs tab shows linked application
9. [ ] Re-run screening on same pair → no crash → same result returned
10. [ ] JobList View link goes to `/jobs/view/<id>` correctly
