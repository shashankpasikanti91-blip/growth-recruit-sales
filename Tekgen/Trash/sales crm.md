You are a Senior Product Architect, ATS/CRM Engineer, Backend Lead, UI/UX Lead, and QA Lead.

Project:
Tekgen AI HRMS — Internal Platform

Current status:
Recruitment module exists.
Now build Sales CRM and connect it properly with Recruitment.

IMPORTANT CONTEXT:
This is an internal TechGen platform.
Do not copy Ceipal UI exactly.
Use Ceipal only as reference for workflow ideas.
Build in Tekgen’s own clean, simple, modern style.

STRICT RULES:
- No wipe coding.
- Do not break recruitment module.
- Sales and Recruitment must be connected.
- Sales owns clients and JDs.
- Recruiters can view JDs and work on assigned jobs only.
- Recruiters should not edit client/JD commercial details.
- Use real backend relationships.
- Every record must have ID, owner, created date, updated date, and audit log.

====================================================
PHASE 1 — SALES CRM MAIN MODULE
====================================================

Add Sales CRM module in sidebar/dashboard.

Sales CRM pages:
1. Sales Dashboard
2. Clients
3. Client Contacts
4. Job Requirements / JDs
5. Client Documents
6. Submissions Tracking
7. Follow-ups
8. Billing / Commercials
9. Reports

Sales Dashboard KPIs:
- Total Clients
- Active Clients
- New Clients This Month
- Open JDs
- JDs Assigned to Recruitment
- CVs Submitted
- Interviews Scheduled
- Offers / Closures
- Pending Client Follow-ups
- Revenue / Billing Pending

====================================================
PHASE 2 — CLIENT MASTER
====================================================

Create Client Master.

Client fields:
- Client ID
- Client Name
- Business Unit
- Industry
- Website
- Country
- State
- City
- Address
- Primary Contact Name
- Primary Contact Email
- Primary Contact Phone
- Billing Contact
- Client Status: Active / On Hold / Inactive
- Client Owner / Sales Owner
- Recruitment Manager
- Default Recruiters
- Payment Terms
- Submission Format
- Required Documents
- Notes
- Created By
- Created Date
- Updated Date

Client ID format:
TKG-CL-0001

Client page tabs:
1. Overview
2. Contacts
3. Job Requirements
4. Submissions
5. Documents
6. Commercials
7. Notes
8. Activity Timeline

====================================================
PHASE 3 — CLIENT CONTACTS
====================================================

Each client can have multiple contacts.

Contact fields:
- Contact ID
- Client ID
- Contact Name
- Designation
- Department
- Email
- Phone
- LinkedIn URL
- Contact Type: HR / Hiring Manager / Finance / Procurement / Other
- Status
- Notes

Rules:
- Contacts must be linked to client.
- Email/meeting history should be visible under client and contact.

====================================================
PHASE 4 — JOB REQUIREMENTS / JD OWNERSHIP
====================================================

Sales team creates and owns JDs.

JD fields:
- JD ID
- Client ID
- Client Name
- Job Title
- Department
- Location
- Country
- Employment Type: Permanent / Contract / Freelance
- Contract Duration
- Required Experience Min/Max
- Salary Min/Max
- Currency
- Billing Rate / Client Rate
- Pay Rate / Candidate Rate
- Priority
- Number of Positions
- Target Submission Date
- Job Received Date
- Job Status: Open / On Hold / Closed / Cancelled
- Required Skills
- Secondary Skills
- Work Authorization / Visa
- Job Description
- Boolean Search
- Assigned Recruitment Manager
- Assigned Recruiters
- Created By
- Created Date
- Updated Date

JD ID format:
TKG-J-0001

Rules:
- Sales can create/edit commercial and client JD details.
- Recruiters can view JD and tag candidates.
- Recruiters cannot edit client name, billing rate, payment terms, or commercial fields.
- Admin can edit all.
- Every JD must belong to one client.
- One client can have many JDs.
- One JD can have many candidate submissions.

====================================================
PHASE 5 — SALES TO RECRUITMENT FLOW
====================================================

Workflow:

Sales creates Client
→ Sales creates JD under Client
→ Sales assigns Recruitment Manager / Recruiters
→ JD appears in Recruitment Job Openings
→ Recruiter views assigned JD
→ Recruiter uploads/tags candidates to JD
→ Candidate submission updates Sales module
→ Sales tracks CV submissions per JD/client

Recruitment side:
- Can view assigned JDs.
- Can submit candidates to JD.
- Can update recruitment stage.
- Cannot edit commercial/client fields.

Sales side:
- Can see all submissions for their clients/JDs.
- Can see recruiter activity.
- Can see candidate count and stages.
- Can communicate with client.
- Can update client feedback.

====================================================
PHASE 6 — SUBMISSIONS TRACKING
====================================================

Create Submissions module.

Submission fields:
- Submission ID
- Client ID
- Client Name
- JD ID
- Job Title
- Candidate ID
- Candidate Name
- Recruiter
- Sales Owner
- Submitted Date
- Current Stage
- AI Match Score
- Resume Link
- Client Feedback
- Interview Date
- Offer Status
- Rejection Reason
- Last Updated

Submission stages:
Draft → Submitted to Sales → Submitted to Client → Client Review → Interview → Offer → Joined → Rejected

Rules:
- When recruiter submits candidate to JD, create submission record.
- Sales can approve before client submission if required.
- Client submission history must be visible under Client 360 and JD 360.
- Candidate profile must show all client/JD submissions.

====================================================
PHASE 7 — CLIENT 360 DASHBOARD
====================================================

Client 360 must show:

Top cards:
- Total JDs
- Open JDs
- CVs Submitted
- Interviews
- Offers
- Closures
- Pending Feedback

Tabs:
- Overview
- Contacts
- JDs
- Submissions
- Documents
- Commercials
- Notes
- Activity

For each client, show:
- All JDs
- JD status
- Number of submissions per JD
- Pending submissions
- Target date
- Recruiters assigned
- Sales owner

====================================================
PHASE 8 — JD 360 DASHBOARD
====================================================

JD 360 must show:

Top cards:
- Open Positions
- Submitted CVs
- Screened Candidates
- Interviews
- Offers
- Days Open
- Target Submission Date

Tabs:
- Overview
- Job Description
- Assigned Recruiters
- Candidates
- Submissions
- Client Feedback
- Timeline
- Commercials

JD must show:
- Client name
- JD ID
- Job received date
- Target date
- Salary/pay rate
- Billing rate
- Employment type
- Contract duration
- Required skills
- Boolean Search button

====================================================
PHASE 9 — DOCUMENTS
====================================================

Client documents:
- MSA
- NDA
- LOA
- MOU
- Contract Copy
- SOW
- Rate Card
- Client Submission Format

Document fields:
- Document ID
- Client ID
- Document Type
- Title
- File
- Uploaded By
- Uploaded Date
- Expiry Date
- Notes

Secure access:
- Sales owner, manager, admin can access.
- Recruiters can access only submission-related documents if permitted.

====================================================
PHASE 10 — BILLING / COMMERCIALS
====================================================

Add simple commercial tracking, not complicated.

Fields:
- Client Bill Rate
- Candidate Pay Rate
- Currency
- Rate Type: Monthly / Hourly / Daily / Full Time
- Markup Type: Flat / Percentage
- Markup Value
- Payment Terms
- Replacement Period
- Invoice Status

Calculate:
- Margin
- Estimated Revenue
- Average Salary
- Min Salary
- Max Salary

Commercial fields visible only to:
- Sales
- Management
- Admin
- Payroll/Finance if enabled

Recruiters should not see commercial fields unless permission allows.

====================================================
PHASE 11 — PERMISSIONS / HIERARCHY
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

Permission rules:
- Sales creates clients and JDs.
- Sales assigns JDs to recruitment.
- Recruitment works only on assigned JDs.
- Recruitment cannot edit client commercial fields.
- Recruitment Manager can assign recruiters.
- Sales Manager sees sales team clients/JDs.
- Admin sees all.

Every action must create audit log:
- Client created
- JD created
- JD assigned
- Candidate submitted
- Client feedback updated
- Stage changed
- Document uploaded
- Commercial updated

====================================================
PHASE 12 — UI STYLE
====================================================

Use Tekgen style:
- Clean
- Compact
- User-friendly
- Not overly complicated
- Enterprise table layout
- Proper tabs
- Clear forms
- Minimal required fields first
- Advanced fields collapsed under “More Details”

Do not copy Ceipal exactly.

Sales pages must be simpler than Ceipal but cover mandatory fields.

Use:
- Compact tables
- Client 360 page
- JD 360 page
- Submission pipeline
- Quick filters
- Export option
- Internal notes

====================================================
PHASE 13 — REQUIRED TABLE VIEWS
====================================================

Clients table columns:
- Client ID
- Client Name
- Industry
- Country
- Status
- Sales Owner
- Active JDs
- Submissions
- Last Activity
- Created Date
- Actions

JDs table columns:
- JD ID
- Client
- Job Title
- Location
- Employment Type
- Experience
- Salary Range
- Open Positions
- Assigned Recruiters
- Status
- Target Date
- Submissions
- Created Date
- Actions

Submissions table columns:
- Submission ID
- Client
- JD ID
- Job Title
- Candidate
- Recruiter
- Stage
- AI Score
- Submitted Date
- Client Feedback
- Last Updated
- Actions

====================================================
PHASE 14 — QA TEST
====================================================

Test:

1. Sales creates client.
2. Client ID generated.
3. Sales creates JD under client.
4. JD ID generated.
5. Sales assigns recruiter.
6. JD appears in recruiter job list.
7. Recruiter can view JD but cannot edit commercial/client fields.
8. Recruiter submits candidate to JD.
9. Submission appears in Sales module.
10. Client 360 shows JD and submission count.
11. JD 360 shows submitted candidates.
12. Candidate profile shows client/JD submission.
13. Sales updates client feedback.
14. Recruiter can see feedback.
15. Admin can see full audit history.

Final instruction:
Build Sales CRM connected with Recruitment.
Do not wipe code.
Do not copy Ceipal UI.
Use Tekgen internal platform style.
Backend relationships first, then API, then UI, then QA.
List changed files and completed items after implementation.