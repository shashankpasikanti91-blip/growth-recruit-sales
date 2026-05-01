# Phase 10 — Analytics & Reports

**Status:** 🔲 Not Started  
**Depends on:** All preceding phases (data must exist first)

---

## Goal

Cross-module KPI dashboards for Management and module heads.  
Each module head sees their own analytics. Management sees cross-module.  
All analytics are **read-only** — no editing from analytics pages.

---

## Analytics by Module

### Recruitment Analytics
| Report | KPIs |
|--------|------|
| Pipeline Overview | Open JDs, Candidates sourced, Screened, Submitted, Interviewed, Offered, Joined |
| Recruiter Productivity | JDs per recruiter, CVs submitted per week, Interview-to-offer rate |
| Source Effectiveness | Which source channels produce the most joined candidates |
| Time-to-Fill | Average days from JD created to candidate joined |
| AI Screening Stats | Avg score, Pass rate, Rejection reasons frequency |
| Stalled JDs | JDs with no activity > 14 days |

---

### Sales Analytics
| Report | KPIs |
|--------|------|
| Client Overview | New clients, Active clients, On Hold, Inactive |
| JD Activity | Open JDs, Assigned to recruitment, Filled this month |
| Follow-up Compliance | Overdue client follow-ups by sales owner |
| Submission Rate | CVs submitted per JD per client |
| Win Rate | Offers/Closures vs. total submitted |
| Revenue Pipeline | Estimated revenue from open JDs |

---

### HR Analytics
| Report | KPIs |
|--------|------|
| Headcount | Total employees, by department, by employment type |
| New Joiners | Per month/quarter |
| Attrition | Resignations, terminations, rate % |
| Leave Usage | By leave type, by department, by month |
| Attendance Summary | Present rate, absent rate, leave rate |
| Missing Documents | Employees with incomplete document checklist |
| Probation Due | Employees whose probation ends within 30 days |

---

### Payroll Analytics
| Report | KPIs |
|--------|------|
| Payroll Cost | Gross payroll by month/department |
| Salary Variance | Month-over-month changes > threshold |
| Claims Summary | Total claims submitted, approved, rejected, paid |
| Deductions Breakdown | EPF, SOCSO, EIS, PCB, HRDF totals |
| Statutory Reports | Malaysia statutory summary for submission |
| Payroll Exceptions | Recurring exception flags |

---

### Finance Analytics
| Report | KPIs |
|--------|------|
| Revenue by Client | Monthly, quarterly, annual |
| Invoice Aging | Current / 30 / 60 / 90+ days outstanding |
| Collection Performance | Average days to collect, collection rate |
| Client Profitability | Revenue - costs (if cost data from payroll is accessible) |
| Open Invoices Summary | Total value of unpaid invoices |
| Overdue Alerts | Clients with invoices overdue > 30/60/90 days |
| Tax / SST Report | Tax collected by period |

---

### Visa Analytics
| Report | KPIs |
|--------|------|
| Permit Expiry Risk | Workers with permits expiring in 30/60/90 days |
| Renewals Due | Count by month |
| Permit Status Breakdown | Approved / Pending / Rejected / Expired |
| Missing Documents | Workers with incomplete visa document checklist |
| Worker Category Breakdown | Local / Expat / Overseas by count |

---

### Cross-Module Management Dashboard
| Section | KPIs |
|---------|------|
| Workforce Summary | Total employees + deployed staff, headcount by client |
| Revenue vs Costs | Revenue from Finance vs payroll costs |
| Pipeline Health | Open JDs → Submissions → Joined → Deployed |
| Compliance Risk | Expiring permits, missing docs, overdue leave approvals |
| AI Flags Summary | Outstanding AI anomalies across all modules |

---

## Analytics Access

| Role | Access |
|------|--------|
| Super Admin | All analytics |
| Management | All analytics (cross-module) |
| Sales Manager | Sales analytics + Recruitment pipeline (for their clients) |
| Recruitment Manager | Recruitment analytics |
| HR Admin | HR analytics |
| Payroll Admin | Payroll analytics (no invoice/revenue data) |
| Finance User | Finance analytics (no salary amounts unless permitted) |
| Visa Team | Visa analytics |
| Recruiter / Employee | No analytics access |

---

## UI Pages Required

- `/analytics` — Management overview (cross-module)
- `/analytics/recruitment` — Recruitment pipeline + recruiter stats
- `/analytics/sales` — Sales client + revenue pipeline
- `/analytics/hr` — Headcount, leave, attendance
- `/analytics/payroll` — Payroll costs + statutory
- `/analytics/finance` — Revenue, aging, collection
- `/analytics/visa` — Permit expiry, renewals, compliance

---

## Chart Types

- KPI number cards (with trend % vs last period)
- Bar charts (monthly revenue, payroll cost, headcount)
- Donut/Pie charts (pipeline stages, leave type breakdown)
- Line charts (time-to-fill trend, revenue trend)
- Aging tables (Finance: invoice aging grid)
- Heatmap (attendance calendar)

---

## Export

- All analytics pages should support: **Export to CSV / Excel / PDF**
- Exports are audit-logged (who exported what, when)
- Sensitive payroll/salary exports restricted to Payroll Admin / Super Admin
