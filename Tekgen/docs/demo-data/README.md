# HR/Payroll Temporary Demo Data

These files are temporary demo imports for validating HR + Payroll mappings without affecting recruitment workflows.

## Files

- `hr-internal-staff-demo.csv` - Internal staff mix (local + non-local)
- `hr-deployed-staff-demo.csv` - Deployed staff mix (local + non-local, client-mapped)

## Important

- Backup is compulsory before import/update actions:
  - Run: `powershell -ExecutionPolicy Bypass -File C:\Tekgen\backup-db.ps1`
  - System now enforces recent backup presence for critical HR/Payroll write actions.
- Replace placeholder client IDs (`CLIENT_ID_001`, etc.) with real IDs from `GET /api/sales/clients`.
- Upload through `HR -> Employees -> Import Existing`.
- Use `allowUpdateExisting=false` first for dry-run-like behavior (creates new only, skips existing emails).
- Use `allowUpdateExisting=true` only after verifying CSV values.

## Mapping Rules Enforced by System

- HR creates login + Employee ID for every staff.
- Deployed staff require `clientId`.
- Role-to-department validation is enforced for manager/admin roles.
- Manager leave/claim approvals are escalated (no self-approval).
