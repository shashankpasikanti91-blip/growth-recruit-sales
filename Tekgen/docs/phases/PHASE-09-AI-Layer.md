# Phase 09 — AI Layer

**Status:** 🔲 Not Started  
**Depends on:** All preceding phases (AI enhances existing data)

---

## Core Principle

> **AI assists. Humans decide.**  
> AI must never auto-approve payroll, invoices, leave, visa, or legal documents.  
> AI must respect RBAC — never show restricted data to unauthorized users.  
> All AI outputs are suggestions, warnings, or drafts — requiring human confirmation before action.

---

## AI Features by Module

### Sales CRM AI
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Client Summary | Summarize client activity, open JDs, submissions, outstanding invoices | Respects Sales role visibility |
| AI Follow-up Reminder | Suggest overdue client/contact follow-ups based on last activity date | User must send or dismiss |
| AI JD Cleanup | Parse and clean JD text, extract skills, suggest Boolean search string | Sales must review before saving |
| AI Boolean Search Generator | Auto-generate Boolean search from JD skills/requirements | Recruiter must confirm use |
| AI Submission Summary | Draft a summary email to client for candidate submission | User must review before sending |
| AI Revenue / Margin Alert | Flag clients where margin is below threshold or overdue > 60 days | Finance/Management only |
| AI Duplicate Client/Contact Warning | Detect if a new client/contact is likely a duplicate | User must decide |

---

### Recruitment ATS AI (already partially done in Phase 00)
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Resume Screening (done ✅) | Score candidate against JD | Human must review score |
| AI Resume Parser | Extract skills, experience, contact info from uploaded resume | HR/Recruiter must verify |
| AI Match Score | Compare candidate profile to JD requirements | Recruiter must confirm shortlist |
| AI Duplicate Candidate Alert | Warn if new candidate has similar email/phone/name as existing | Recruiter must decide |
| AI Submission Draft | Draft a candidate submission email to client | Recruiter reviews before sending |

---

### HR Operations AI
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Leave Assistant | Explain leave balance, holiday impact, and suggest best days | No auto-approval |
| AI Profile Completeness Checker | Detect missing fields in employee profile | HR must verify and complete |
| AI Missing Document Checker | Detect missing required documents per employee/worker type | HR/Admin must act |
| AI Onboarding Checklist Suggester | Suggest required onboarding tasks based on worker type | HR must confirm |

---

### Visa & Permits AI
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Compliance Checklist | Suggest required documents by worker category (Local/Expat/Overseas) | Legal/Finance must verify values |
| AI Expiry Risk Predictor | Identify workers with permits/passports expiring in next 90 days | Visa team must action |
| AI Permit Renewal Reminder | Auto-compose renewal reminder email draft | Visa team sends manually |

---

### Payroll AI
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Payroll Anomaly Checker | Flag unusual: salary changes >20%, negative net pay, duplicate payslip, missing bank/tax data | Payroll Admin must confirm each flag |
| AI Leave & Attendance Reconciler | Compare approved No-Pay Leave, absences, overtime before payroll run | Shows exceptions — Payroll Admin reviews |
| AI Compliance Assistant | Check worker category, residency, visa expiry, missing statutory fields | Do not auto-finalize |
| AI Payroll Summary | Summarize payroll run for Finance Head review | Finance Head confirms before approval |

---

### Finance & Invoices AI
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Invoice Draft Assistant | Create invoice draft from deployed staff + timesheet + agreement data | Finance must review before send |
| AI Rate Card Validator | Compare invoice line rate with agreed client rate card | Warns if mismatch — Finance must resolve |
| AI Duplicate Invoice Detector | Check same client + same period + same assignment = possible duplicate | Blocks or warns — Finance decides |
| AI Collection Follow-up Assistant | Suggest reminder message for overdue invoices | Finance/Sales sends manually |
| AI Profitability Insight | Show margin by client/JD/assignment | Finance/Management only |
| AI Overdue Alert | Flag invoices overdue > 30 / 60 / 90 days | Dashboard alert |

---

### Documents AI
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Missing Document Checker | Per employee/candidate/client: detect missing required docs | Admin/HR must verify |
| AI Expiry Alert | Highlight docs expiring within 30/60/90 days | Visa/HR team must renew |
| AI Document Categorizer | Suggest document type when new file is uploaded | User must confirm category |

---

### Analytics AI
| Feature | What It Does | Safety Rule |
|---------|-------------|-------------|
| AI Dashboard Summary | Summarize pending actions and risks per module | No sensitive info to unauthorized users |
| AI Anomaly Alerts | Cross-module: stalled JDs, overdue invoices, expiring permits, missing payroll data | Alert only — human action required |
| AI Forecasted Workload | Estimate upcoming payroll, renewals, interviews based on current pipeline | Management view only |

---

## AI Global Search

- Single search bar in the header
- Search by: `TKG-CL-XXXX`, `TKG-CAN-XXXX`, `TKG-EMP-XXXX`, `TKG-INV-XXXX`, `TKG-VISA-XXXX`, or natural language
- Returns: matched entity type, ID, name, status, quick-link to record
- **RBAC enforced:** Results only show entities the user has permission to see
- Payroll salary data must never appear in global search results

---

## AI Implementation Rules

1. AI runs as non-blocking suggestions — never blocks a user action
2. AI flags are shown as warnings or info banners — dismissible
3. AI draft content (emails, invoice drafts) must have a **Review & Edit** step before saving
4. AI must not store or cache sensitive data (salaries, passport numbers, tax amounts)
5. AI calls must respect tenant isolation — never mix data between companies
6. AI output UI: use distinct styling (blue info, orange warning, red anomaly) — clearly not real data
7. Add "AI suggestion" label to all AI-generated content so users know it needs review

---

## UI Components

- `<AIAnomalyBanner>` — shows anomaly warnings in payroll run
- `<AIDraftPreview>` — shows AI-drafted invoice/email with Edit/Confirm/Dismiss buttons
- `<AIMatchScore>` — candidate screening score card (already exists)
- `<AIDocumentChecklist>` — missing/expiring documents widget
- `<AISearchBar>` — global ID + natural language search in header
- `<AIInsightCard>` — dashboard widget with AI-flagged actions

---

## Audit Log Events

- AI screening performed (candidate + JD + score)
- AI anomaly flag acknowledged or dismissed
- AI invoice draft created / edited / confirmed
- AI suggestion used or ignored (for usage tracking)
