You are a Senior Product Architect + ATS Engineer + CRM Integration Engineer + Backend Lead + UI/UX Lead + Security Engineer + QA Lead.

PROJECT:
SRP AI Growth
Powered by SRP AI Labs

GOAL:
Enhance Recruitment ATS and connect it properly with Sales CRM JDs.

DO NOT wipe code.
DO NOT break existing candidates/jobs/applications.
DO NOT create demo/static logic.
DO NOT auto-send emails/messages.
Use real backend relationships, RBAC, audit logs, and secure persistence.

====================================================
CORE FLOW
====================================================

Sales CRM creates Client
→ Sales creates JD under Client
→ Sales assigns Recruitment Manager / Recruiters
→ JD appears in Recruitment Jobs / JDs
→ Recruiter screens candidates against assigned JD
→ Candidate submission is created
→ Submission appears in both Recruitment and Sales CRM
→ Sales sends CV to client
→ Client feedback updates Recruitment
→ Interview / Offer / Joined status tracked

====================================================
PHASE 1 — RECRUITMENT SIDEBAR
====================================================

Recruitment menu:

- Candidates
- Jobs / JDs
- Applications
- Submissions
- AI Screening
- Candidate Match Analysis
- Interviews
- Talent Pool

====================================================
PHASE 2 — JOBS / JDs FROM SALES
====================================================

Recruitment Jobs must show Sales-created JDs.

Job/JD table columns:
- JD ID
- Client Name
- Job Title
- Department
- Location
- Employment Type
- Contract Duration
- Experience
- Salary Range
- Required Skills
- Priority
- Assigned Recruiter
- Applicants
- Screened
- Submitted
- Interviews
- Status
- Job Received Date
- Target Submission Date
- Created Date
- Updated Date
- Actions

Actions:
- View JD
- View Boolean
- Screen Candidates
- Submit Candidate
- Add Note
- Change Recruitment Stage

Recruiters can only edit recruitment fields:
- Stage
- Notes
- Candidate mapping
- Interview status

Recruiters cannot edit:
- Client name
- Billing rate
- Commercials
- Payment terms
- Sales ownership

====================================================
PHASE 3 — JD DETAIL 360
====================================================

JD detail page tabs:

- Overview
- Job Description
- Assigned Recruiters
- Matched Candidates
- Applications
- Submissions
- Interviews
- Client Feedback
- Notes
- Timeline

JD Overview must show:
- Client Name
- JD ID
- Job Title
- Location
- Employment Type
- Contract Duration
- Experience
- Salary Range
- Required Skills
- Secondary Skills
- Work Authorization / Visa
- Number of Positions
- Job Received Date
- Target Submission Date
- Sales Owner
- Recruitment Manager
- Assigned Recruiters

Add Boolean Search:
- Generate Boolean from title + required skills + preferred skills + location
- Show “View Boolean” button
- Modal with copy button
- Do not show long Boolean text directly on page

====================================================
PHASE 4 — CANDIDATE LIST UPGRADE
====================================================

Candidate table columns:
- Candidate ID
- Full Name
- Email
- Phone
- Current Role
- Current Company
- Experience
- Location
- Visa / Work Authorization
- Skills
- Resume
- Latest Screened JD
- Client
- AI Score
- Current Stage
- Owner Recruiter
- Parsing Status
- Created Date
- Last Activity
- Actions

Actions:
- View Profile
- View Resume
- Screen vs JD
- Submit to Client
- Send Email Draft
- Add Note

====================================================
PHASE 5 — CANDIDATE 360
====================================================

Candidate 360 tabs:

- Overview
- Resume
- Applications
- Submissions
- AI Screening History
- Notes
- Emails
- Interviews
- Timeline
- Documents

Resume tab:
- PDF preview
- Download
- Replace resume
- Parse resume
- Version history
- Uploaded date

AI Screening History:
- Show previous screenings
- JD screened against
- Client
- Score
- Matched skills
- Missing skills
- AI summary
- Recommendation
- Created date
- Re-run only with confirmation

====================================================
PHASE 6 — RESUME PARSING FIX
====================================================

Extract and save:
- Full Name
- Email
- Phone
- Current Job Title
- Current Company
- Total Experience
- Location
- Country
- Skills
- Education
- Visa Status
- Notice Period
- Expected Salary
- Resume File URL
- Resume Hash
- Parser Confidence
- Parsed Date
- Parsing Status

Rules:
- Remove labels like “Name:”
- Do not save section heading as name
- Do not overwrite manually corrected data
- If confidence is low, show “Needs Review”
- Detect Malaysia, India, Singapore, and international phone formats
- Detect experience from resume text
- Prevent duplicate candidate using email + phone + resume hash

Duplicate alert:
“Candidate already exists. Update existing, merge, or cancel?”

====================================================
PHASE 7 — AI SCREENING PERSISTENCE
====================================================

AI results must not disappear.

Create saved Screening Sessions.

Session fields:
- Session ID
- Screening Type
- JD ID
- Client ID
- Created By
- Created Date
- Status
- Total Candidates
- Completed Count
- Failed Count
- Token Usage

Result fields:
- Screening ID
- Candidate ID
- JD ID
- Client ID
- Application ID
- Match Score
- Skill Match %
- Experience Match %
- Salary Fit
- Location Fit
- Matched Skills
- Missing Skills
- Red Flags
- AI Summary
- Recommendation
- Model Used
- Token Usage
- Created Date

Rules:
- Never rerun on page refresh
- Never rerun when opening candidate
- Never rerun when opening JD
- Load saved result first
- Rerun only when user confirms
- Track token usage

====================================================
PHASE 8 — APPLICATION + SUBMISSION MAPPING
====================================================

Every screening should create or reuse Application.

Unique key:
Candidate ID + JD ID

Application fields:
- Application ID
- Candidate ID
- JD ID
- Client ID
- Recruiter ID
- Current Stage
- Applied Date
- AI Match Score
- Screening ID
- Last Updated

Submission fields:
- Submission ID
- Candidate ID
- JD ID
- Client ID
- Recruiter ID
- Sales Owner
- AI Score
- Submitted Date
- Stage
- Client Feedback
- Interview Date
- Offer Status
- Last Updated

Submission stages:
Draft
Internal Review
Submitted to Sales
Submitted to Client
Client Review
Interview
Offer
Joined
Rejected
Withdrawn

Candidate profile must show submissions.
JD profile must show submissions.
Client profile must show submissions.
Sales CRM must receive submission update.

====================================================
PHASE 9 — INTERVIEWS
====================================================

Interview module fields:
- Interview ID
- Candidate
- JD
- Client
- Interview Round
- Interviewer
- Date / Time
- Mode
- Meeting Link
- Status
- Feedback
- Created By
- Updated Date

Statuses:
Scheduled
Completed
Rescheduled
Cancelled
No Show
Selected
Rejected

====================================================
PHASE 10 — EMAIL / TEAMS / CALENDAR
====================================================

Integration-ready only.

Rules:
- Draft first
- Never auto-send
- User must confirm send
- Store email history
- Store interview invite history
- Use encrypted tokens
- Each user connects own Outlook/Gmail if approved

Settings → Integrations:
- Outlook
- Gmail
- Microsoft Teams
- Google Calendar
- WhatsApp Business API
- Telegram
- Apollo
- Apify

====================================================
PHASE 11 — PERMISSIONS
====================================================

Roles:
- Super Admin
- Management
- Sales Manager
- Sales Executive
- Recruitment Manager
- Recruiter
- HR Admin
- Finance
- Viewer

Recruiter:
- View assigned JDs
- Upload candidates
- Screen candidates
- Submit candidates
- Update recruitment stages

Recruiter cannot:
- Edit commercials
- Edit billing rate
- Edit client payment terms
- Edit sales ownership

Sales:
- View submissions
- Update client feedback
- Submit CV to client
- Create JDs
- Assign recruiters

Admin:
- Full access

All actions must create audit logs.

====================================================
PHASE 12 — TABLE UX FIX
====================================================

Across Candidates, Jobs/JDs, Applications, Submissions:

- Sticky table header
- Sticky bottom horizontal scrollbar
- Frozen first columns
- Column hide/show
- Expand row details
- Pagination
- Virtualized rows
- Mobile card view

User must not need to scroll down first to move horizontally.

====================================================
PHASE 13 — SECURITY + SAFETY
====================================================

Implement:
- RBAC
- Audit logs
- Input validation
- API validation
- File upload validation
- Signed resume URLs
- Secure document storage
- Rate limits
- Error boundaries
- Environment variables for secrets
- No API keys in frontend
- No unsafe scraping
- No hacking/bypass logic

====================================================
PHASE 14 — QA TEST FLOW
====================================================

Test complete Sales → Recruitment flow:

1. Sales creates Client.
2. Sales creates JD under Client.
3. Sales assigns recruiter.
4. JD appears in recruiter Jobs/JDs.
5. Recruiter uploads candidate resume.
6. Resume parses correctly.
7. Recruiter screens candidate vs assigned JD.
8. AI result saves permanently.
9. Application record created.
10. Recruiter submits candidate.
11. Submission appears in Sales CRM.
12. Sales updates client feedback.
13. Candidate profile shows JD/client/submission.
14. JD profile shows candidate/submission.
15. Client profile shows JD/submission.
16. Recruiter cannot edit commercials.
17. Dates show correctly.
18. Horizontal table scroll works.
19. Audit log captures all actions.

FINAL OUTPUT:
After implementation, list:
- Files changed
- Database changes
- APIs created/updated
- UI pages updated
- Bugs fixed
- Pending items