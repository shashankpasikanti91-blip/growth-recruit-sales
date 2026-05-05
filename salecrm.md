You are a Senior SaaS Product Architect + Sales CRM Engineer + ATS Engineer + Backend Lead + UI/UX Lead + Security Engineer + QA Lead.

PROJECT:
SRP AI Growth
Powered by SRP AI Labs

CURRENT SYSTEM:
We already have:
- Leads
- Generate Leads
- Companies
- Contacts
- Outreach
- Recruitment ATS
- Candidates
- Jobs
- Applications
- AI Match Analysis

DO NOT wipe existing code.
DO NOT remove current lead data.
DO NOT break recruitment module.
DO NOT create fake demo UI.
Enhance the existing system safely.

====================================================
MAIN GOAL
====================================================

Upgrade current Lead Generator into a full Sales CRM + Client + JD + Recruitment connected platform.

System should support:

1. Lead generation
2. Lead qualification
3. Company to Client conversion
4. Client master
5. Client contacts
6. Job requirements / JDs
7. Assign JD to recruiters
8. Candidate submission to client
9. Sales follow-up tracking
10. Client feedback
11. Billing/commercial visibility
12. Recruitment ATS connection

====================================================
BRANDING UPDATE
====================================================

Replace old name everywhere:

Old:
Growth OS

New:
SRP AI Growth

Subtitle:
Powered by SRP AI Labs

Update:
- Sidebar
- Header
- Login page
- Browser title
- Emails
- Reports
- Notifications
- Mobile view

====================================================
SIDEBAR STRUCTURE
====================================================

Dashboard

SALES CRM
- Leads
- Generate Leads
- Companies
- Clients
- Contacts
- Opportunities
- Follow Ups
- Outreach
- Proposals
- Billing

RECRUITMENT
- Candidates
- Jobs / JDs
- Applications
- Submissions
- AI Match Analysis

OPERATIONS
- Analytics
- Reports
- Tasks
- Calendar

SETTINGS
- Users
- Roles
- Integrations
- Company Settings

====================================================
PHASE 1 — LEADS UPGRADE
====================================================

Current leads table is too basic.

Add columns:
- Lead ID
- Lead Name
- Title
- Company
- Email
- Phone
- Country
- Industry
- Source
- ICP Score
- Priority
- Stage
- Owner
- Last Contacted
- Next Follow-up
- Created Date
- Updated Date
- Actions

Stages:
New
Contacted
Qualified
Meeting Scheduled
Proposal Sent
Negotiation
Won
Lost

Actions:
- View Lead
- Score Lead
- Convert to Client
- Add Follow-up
- Send Email
- Add Note

Lead 360 page tabs:
- Overview
- Company
- Contacts
- Emails
- Notes
- Follow-ups
- Timeline

====================================================
PHASE 2 — COMPANIES UPGRADE
====================================================

Current Companies page is card based and limited.

Add table view + card view.

Companies table columns:
- Company ID
- Company Name
- Website
- Industry
- Country
- Source
- Leads Count
- Contacts Count
- Client Status
- Owner
- Last Activity
- Created Date
- Actions

Actions:
- View Company
- Convert to Client
- Add Contact
- Add Opportunity
- Add Note

Company 360 tabs:
- Overview
- Leads
- Contacts
- Opportunities
- Notes
- Timeline

====================================================
PHASE 3 — CLIENT MASTER
====================================================

When a lead/company becomes real business, convert to Client.

Client fields:
- Client ID
- Client Name
- Industry
- Website
- Country
- State
- City
- Address
- Primary Contact
- Billing Contact
- Client Status
- Sales Owner
- Recruitment Manager
- Assigned Recruiters
- Payment Terms
- Submission Format
- Required Documents
- Notes
- Created Date
- Updated Date

Client 360 tabs:
- Overview
- Contacts
- JDs / Job Requirements
- Submissions
- Commercials
- Documents
- Notes
- Timeline

====================================================
PHASE 4 — JD / JOB REQUIREMENT FLOW
====================================================

Sales team creates JD under Client.

JD fields:
- JD ID
- Client ID
- Client Name
- Job Title
- Department
- Location
- Employment Type
- Experience Min / Max
- Salary Range
- Currency
- Billing Rate
- Candidate Pay Rate
- Priority
- Number of Positions
- Target Submission Date
- Job Received Date
- Job Status
- Required Skills
- Secondary Skills
- Visa / Work Authorization
- Job Description
- Boolean Search
- Assigned Recruitment Manager
- Assigned Recruiters
- Created Date
- Updated Date

Important rule:
Every JD must belong to one Client.

Workflow:
Lead → Company → Client → JD → Recruiter Assignment → Candidate Submission → Client Feedback → Interview → Offer → Joined

====================================================
PHASE 5 — CONNECT SALES CRM WITH RECRUITMENT
====================================================

Real backend relationship required:

Client links to many JDs.
JD links to many Applications.
JD links to many Candidate Submissions.
Candidate links to many JDs.
Submission links Sales + Recruiter + Candidate + Client.

Recruitment users can:
- View assigned JDs
- Submit candidates
- Update recruitment stage
- Add notes

Recruitment users cannot edit:
- Client billing rate
- Payment terms
- Commercial fields
- Client ownership

Sales users can:
- Create clients
- Create JDs
- Assign recruiters
- View submissions
- Update client feedback
- Track follow-ups

====================================================
PHASE 6 — SUBMISSIONS MODULE
====================================================

Create new page:
Submissions

Columns:
- Submission ID
- Client
- JD ID
- Job Title
- Candidate
- Recruiter
- Sales Owner
- AI Score
- Submitted Date
- Stage
- Client Feedback
- Interview Date
- Offer Status
- Last Updated
- Actions

Stages:
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

Candidate profile must show all submissions.
Client profile must show all submissions.
JD profile must show all submissions.

====================================================
PHASE 7 — AI + LEAD SCORING
====================================================

ICP score should show proper explanation:

Score:
70+ Strong fit
50–69 Moderate fit
Below 50 Low priority

Show:
- Why this score
- Company fit
- Title fit
- Industry fit
- Country fit
- Engagement fit
- Recommended action

Do not rerun score unnecessarily.
Store score history.

====================================================
PHASE 8 — DATE FIX
====================================================

Replace only relative time.

Bad:
9 minutes ago

Good:
27 Apr 2026, 10:34 AM · 9 minutes ago

Add dates everywhere:
- Created Date
- Updated Date
- Last Activity
- Last Contacted
- Next Follow-up
- Submitted Date
- Job Received Date
- Target Date

====================================================
PHASE 9 — TABLE UX FIX
====================================================

Fix horizontal scroll problem.

Do not force user to scroll down to use horizontal scroll.

Implement:
- Sticky table header
- Sticky bottom horizontal scrollbar
- Frozen first columns
- Column hide/show
- Expand row details
- Pagination
- Virtualized rows for large data

Apply to:
- Leads
- Companies
- Clients
- Contacts
- Jobs
- Candidates
- Applications
- Submissions

====================================================
PHASE 10 — SECURITY + SAFETY
====================================================

No hacking.
No unsafe scraping.
No credential exposure.
No bypassing platform rules.
No storing secrets in frontend.

Implement:
- RBAC
- Audit logs
- Secure API validation
- Rate limits
- Input validation
- File upload validation
- Signed resume/document URLs
- Data encryption where required
- Error boundaries
- Safe background jobs
- Environment variables for secrets

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

====================================================
PHASE 11 — UI STYLE
====================================================

Use SRP AI Labs style:

- Dark premium sidebar
- Blue primary buttons
- White clean content area
- Compact enterprise tables
- Rounded cards
- Clear tabs
- Professional badges
- Simple language
- Fast navigation

Do not copy Ceipal or Workday exactly.
Use them only as workflow inspiration.

====================================================
PHASE 12 — QA TEST
====================================================

Test complete flow:

1. Generate lead
2. Score lead
3. Convert lead/company to client
4. Add client contact
5. Create JD under client
6. Assign recruiter
7. JD appears in recruitment jobs
8. Recruiter submits candidate
9. Submission appears in Sales CRM
10. Client feedback updated
11. Candidate profile shows submission
12. JD profile shows candidate
13. Client profile shows JD and submission
14. Permissions are respected
15. Dates show correctly
16. Tables scroll properly
17. Mobile responsive works

FINAL OUTPUT:
After implementation, list:
- Files changed
- New pages added
- Database tables updated
- APIs created
- Bugs fixed
- Pending items