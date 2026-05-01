====================================================
GLOBAL ID-FIRST ARCHITECTURE
====================================================

Every module must run by unique ID numbers. IDs are the main key for linking records across Sales, Recruitment, Workforce, HR, Payroll, Attendance, Visa, Documents, and Finance.

Required IDs:
- Client ID: TKG-CL-0001
- Contact ID: TKG-CNT-0001
- JD ID: TKG-JD-0001
- Candidate ID: TKG-CAN-0001
- Submission ID: TKG-SUB-0001
- Employee ID: TKG-EMP-0001
- Deployed Staff ID: TKG-DEP-0001
- Attendance ID: TKG-ATT-0001
- Timesheet ID: TKG-TS-0001
- Payroll Run ID: TKG-PR-0001
- Payslip ID: TKG-PS-0001
- Invoice ID: TKG-INV-0001
- Agreement ID: TKG-AGR-0001
- Document ID: TKG-DOC-0001
- Visa Case ID: TKG-VISA-0001
- Audit Log ID: TKG-AUD-0001

Rules:
- Never depend only on name/email/phone for linking.
- Candidate ID must follow the candidate across recruitment, submission, onboarding, deployment, attendance, payroll, invoice, and documents.
- Client ID must connect client profile, contacts, JDs, agreements, submissions, invoices, collections, and documents.
- JD ID must connect recruitment activity, candidate submissions, client feedback, onboarding, and billing.
- Deployed Staff ID is created only after candidate is joined/deployed to client.
- All tables must show ID columns.
- All search bars must support ID search.
- Audit logs must store related entity ID.