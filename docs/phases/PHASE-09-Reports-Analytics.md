# Phase 09 — SRP Reports & Analytics: Exports & Custom Dashboards

**Status:** ✅ COMPLETE  
**Priority:** HIGH — Clients and admins need exportable data + drill-down KPIs  
**Depends on:** Phase 00–08 (all entities must exist)

---

## Goal

Give every user role access to exportable, filterable reports and personalised dashboard widgets. Sales managers and recruitment managers need to see performance across their teams. Admins need to export data for compliance and billing reviews.

---

## Reports to Build

### 9.1 — Placement Velocity Report (`/reports/placement-velocity`)

| Column | Source |
|--------|--------|
| Job Title | `Job.title` |
| Client | `Client.name` |
| Time to First Submit (days) | `job.createdAt` → first `Submission.createdAt` |
| Time to Offer (days) | first Submission → first Offer |
| Time to Join (days) | Offer accepted → `candidate.status = JOINED` |
| Recruiter | `job.assignedRecruiter` |
| Stage reached | Final submission stage |

### 9.2 — Sales Pipeline Report (`/reports/sales-pipeline`)

| Column | Source |
|--------|--------|
| Sales Rep | `User.name` |
| Leads this month | count of Leads (createdAt in range) |
| ICP Score avg | avg `lead.icpScore` |
| Leads converted | count `lead.convertedToClientId IS NOT NULL` |
| Conversion rate % | converted / total |
| Pipeline value | sum of `opportunity.value` |
| Follow-ups overdue | count overdue FollowUps owned by user |

### 9.3 — Recruiter Performance Report (`/reports/recruiter-performance`)

| Column | Source |
|--------|--------|
| Recruiter | `User.name` |
| JDs assigned | count Jobs `assignedRecruiterId = user.id` |
| Candidates sourced | count Candidates by recruiter |
| Submissions made | count Submissions `createdById = user.id` |
| Interviews arranged | count Interviews linked to their submissions |
| Offers generated | count Offers accepted from their submissions |
| Placement rate % | Offers ACCEPTED / Submissions |

### 9.4 — Client Activity Report (`/reports/client-activity`)

| Column | Source |
|--------|--------|
| Client | `Client.name` |
| Open JDs | count Jobs `status = OPEN` |
| Submissions received | count Submissions for client's jobs |
| Interviews held | count Interviews |
| Offers made | count Offers |
| Placements | count Offers `status = ACCEPTED` |
| Last activity | most recent entity `updatedAt` |

### 9.5 — AI Usage Report (`/reports/ai-usage`)

| Column | Source |
|--------|--------|
| User | `User.name` |
| AI screens run | count AiScreening records |
| Average AI score | avg `aiScore` |
| Leads generated | count Leads `importSource = APOLLO / APIFY / GOOGLE_MAPS` |
| Tokens consumed (est.) | from `aiUsage` / billing data |

---

## CSV / Excel Exports

Every report page and data grid must have an **Export** button:

| Page | Export Columns |
|------|---------------|
| `/candidates` | All candidate fields: name, email, phone, status, skills, visa, aiScore, source |
| `/jobs` | Title, client, status, assignedRecruiter, applications, submissions count |
| `/submissions` | Candidate, job, client, stage, submittedDate, clientFeedback |
| `/interviews` | Candidate, job, client, scheduledAt, mode, status, result, rating, recruiter |
| `/offers` | Candidate, job, client, salary, currency, status, joiningDate, recruiter |
| `/leads` | Name, company, icpScore, stage, source, ownedBy, followUpDate |
| `/follow-ups` | Entity, type, dueDate, status, owner |
| All report pages | Full table data as rendered |

### Export Format Support

| Format | Implementation |
|--------|---------------|
| CSV | `json2csv` library — fast, streaming |
| Excel (.xlsx) | `exceljs` library — formatted headers + column widths |

---

## Custom Dashboard Widgets

### Widget Types

| Widget | Data | Roles |
|--------|------|-------|
| Placement Velocity (avg days) | Calculated | Admin, Manager |
| Revenue Pipeline | Sum of opportunity values | Sales |
| My Submission Funnel | Personal stats | Recruiter |
| Lead Conversion Rate | % | Sales, Admin |
| AI Screening Volume | Count by day | Admin |
| Top Performing Recruiter | Leaderboard | Admin, Manager |
| Open JDs by Client | Bar chart | All |
| Follow-ups Overdue | Count + list | All |

### Saved Dashboard Layout

- Users can pin/unpin widgets via drag-and-drop grid
- Layout stored in `UserPreference` JSON column (no new table needed)
- Up to 8 widgets per dashboard

---

## Scheduled Email Reports

| Report | Frequency | Recipients |
|--------|-----------|-----------|
| Weekly Placement Summary | Every Monday 9am | TENANT_ADMIN + Managers |
| Monthly Sales Pipeline | 1st of month | TENANT_ADMIN + Sales Managers |
| Overdue Follow-ups Digest | Daily 8am | Each user (their own overdue items) |

Implementation: BullMQ recurring jobs + `nodemailer` with HTML template.

---

## API Endpoints

```
GET  /api/v1/reports/placement-velocity    ?from=&to=&recruiterId=&clientId=
GET  /api/v1/reports/sales-pipeline        ?from=&to=&userId=
GET  /api/v1/reports/recruiter-performance ?from=&to=&userId=
GET  /api/v1/reports/client-activity       ?from=&to=&clientId=
GET  /api/v1/reports/ai-usage             ?from=&to=&userId=

GET  /api/v1/exports/candidates            ?format=csv|xlsx&...filters
GET  /api/v1/exports/jobs                  ?format=csv|xlsx
GET  /api/v1/exports/submissions           ?format=csv|xlsx
GET  /api/v1/exports/interviews            ?format=csv|xlsx
GET  /api/v1/exports/offers                ?format=csv|xlsx
GET  /api/v1/exports/leads                 ?format=csv|xlsx

GET  /api/v1/dashboard/widgets             — list available widgets + user layout
PUT  /api/v1/dashboard/widgets             — save user's widget layout
```

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/reports` | Reports hub | Landing with report cards |
| `/reports/placement-velocity` | Table + charts | Time-to-place per JD |
| `/reports/sales-pipeline` | Table + bar chart | Per-rep pipeline stats |
| `/reports/recruiter-performance` | Leaderboard table | Recruiter KPIs |
| `/reports/client-activity` | Table | Client engagement metrics |
| `/reports/ai-usage` | Table | AI consumption per user |

Each report page has:
- Date range picker (from / to)
- Optional filters (user, client, recruiter)
- Summary stat cards at top
- Main data table
- **Export CSV** + **Export Excel** buttons

---

## Build Order

1. `ReportsModule` + `ExportsModule` backend (no new migrations needed)
2. Report endpoints — raw SQL aggregate queries via Prisma `$queryRaw`
3. Export endpoints — streaming CSV/Excel responses
4. Frontend `/reports` hub + 5 report pages
5. Export buttons wired to all existing data grids
6. Dashboard widget config endpoint + frontend widget renderer
