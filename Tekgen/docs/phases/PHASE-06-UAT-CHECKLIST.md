# Phase 06 Payroll UAT Checklist (Final)

## Scope

- Payroll data correctness (gross, deductions, net)
- Department and leadership access mapping
- Isolation: one employee/department issue must not block others
- Backup guard enforcement for critical write actions

## Role Coverage

- `ADMIN`: cross-department payroll/monitoring visibility
- `PAYROLL_ADMIN`: payroll run lifecycle, payslip generation, approvals queue
- `HR_ADMIN`: payroll staff/attendance operational visibility
- `FINANCE_HEAD`: finance + payroll monitoring dashboards
- `SALES_MANAGER`: payroll routes blocked
- `RECRUITER`: payroll admin routes blocked; own payslip route only
- `VISA_ADMIN`: visa routes allowed, payroll admin routes blocked

## UAT Validation Results

- Role matrix E2E: `npm run test:e2e:role-matrix` -> pass (3 consecutive iterations)
- Payroll integrity E2E: `npm run test:e2e:payroll-integrity` -> pass
- Signed payslip URL flow validated
- Monthly statutory batch automation validated
- Year-close statutory readiness endpoint validated
- Backend and frontend lint checks on changed files -> no lint errors

## Mandatory Data Safety Controls

- Backup guard required for payroll critical writes (create/validate/review/approve/generate/publish)
- Backup guard required for attendance create/delete (payroll-affecting records)
- Payroll generation supports partial-failure isolation (successful employees still processed)
- Monitoring summary supports partial-data fallback if one source fails

