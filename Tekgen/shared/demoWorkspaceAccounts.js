'use strict';

/**
 * Single source of truth for workspace demo accounts (local/dev seeding).
 *
 * - Backend seed on startup syncs ONLY these emails (password + role); other
 *   recruitment users created through signup or admin are never touched.
 *
 * - Sales pilot: Sreenivasa Gadde = RECRUITMENT_MANAGER (recruitment lead). Deepa + Abhiram =
 *   SALES_MANAGER (sales / account managers for demos). Nadia Rahim = RECRUITER.
 *   If an existing user row still has an old role, restart API once with SEED_UPDATE_DEMO_ROLES=true.
 *
 * To change demo passwords or add a row: edit this file only, then restart
 * the API server so seed runs (or run reset-passwords.js).
 *
 * Builds: `npm run build` in tekgen-ats-frontend does not connect to PostgreSQL.
 * Backups before schema work: C:\\Tekgen\\backup-db.ps1 — never `prisma migrate reset`
 * on the shared team database.
 */

const DEMO_WORKSPACE_ACCOUNTS = [
  {
    email: 'kavitha@tekgen.com.my',
    password: 'Kavitha@2026',
    label: 'Kavitha',
    title: 'Managing Director',
    role: 'ADMIN',
    firstName: 'Kavitha',
    lastName: 'Tekgen',
  },
  {
    email: 'qhailisha@bestinet.com.my',
    password: 'Qhailisha@2026',
    label: 'Qhailisha',
    title: 'Director',
    role: 'ADMIN',
    firstName: 'Qhailisha',
    lastName: 'Darwina',
  },
  {
    email: 'admin@tekgen.com',
    password: 'Admin@2026',
    label: 'System Admin',
    title: 'Platform Administrator',
    role: 'ADMIN',
    firstName: 'System',
    lastName: 'Tekgen',
  },
  {
    email: 'demo@tekgen.com',
    password: 'Demo@2026',
    label: 'Demo Admin',
    title: 'Testing Admin',
    role: 'ADMIN',
    firstName: 'Demo',
    lastName: 'Admin',
  },
  {
    email: 'sreenivasa.gadde@tekgen.com.my',
    password: 'Sreeni@2026',
    label: 'Sreeni',
    title: 'Recruitment Manager',
    role: 'RECRUITMENT_MANAGER',
    firstName: 'Sreenivasa',
    lastName: 'Gadde',
  },
  {
    email: 'deepa@tekgen.com.my',
    password: 'Deepa@2026',
    label: 'Deepa',
    title: 'Sales Manager',
    role: 'SALES_MANAGER',
    firstName: 'Deepa',
    lastName: 'Menon',
  },
  {
    email: 'abhiram@tekgen.com.my',
    password: 'Abhiram@2026',
    label: 'Abhiram',
    title: 'Sales Manager',
    role: 'SALES_MANAGER',
    firstName: 'Abhiram',
    lastName: 'Nair',
  },
  {
    email: 'nadia.rahim@tekgen.com.my',
    password: 'Nadia@2026',
    label: 'Nadia',
    title: 'Recruitment Staff',
    role: 'RECRUITER',
    firstName: 'Nadia',
    lastName: 'Rahim',
  },
  {
    email: 'shashank.pasikanti@tekgen.com.my',
    password: 'Shashank@2026',
    label: 'Shashank',
    title: 'Recruitment Staff',
    role: 'RECRUITER',
    firstName: 'Shashank',
    lastName: 'Pasikanti',
  },
  {
    email: 'tang.yung@tekgen.com.my',
    password: 'Jerry@2026',
    label: 'Jerry',
    title: 'Recruitment Staff',
    role: 'RECRUITER',
    firstName: 'Jerry',
    lastName: 'Recruiter',
  },
  {
    email: 'savita.angadi@tekgen.com.my',
    password: 'Savita@2026',
    label: 'Savita',
    title: 'Recruitment Staff',
    role: 'RECRUITER',
    firstName: 'Savita',
    lastName: 'Angadi',
  },
  {
    email: 'hrops.manager@tekgen.com',
    password: 'HROps@2026',
    label: 'HR Ops Manager',
    title: 'HR Operations Manager',
    role: 'HR_ADMIN',
    firstName: 'HR Ops',
    lastName: 'Manager',
  },
  {
    email: 'visa.admin@tekgen.com',
    password: 'Visa@2026',
    label: 'Visa Lead',
    title: 'Visa & Compliance',
    role: 'VISA_ADMIN',
    firstName: 'Visa',
    lastName: 'Admin',
  },
  {
    email: 'archana.naik@tekgen.com.my',
    password: 'Archana@2026',
    label: 'Archana',
    title: 'Payroll Lead',
    role: 'PAYROLL_ADMIN',
    firstName: 'Archana',
    lastName: 'Naik',
  },
  {
    email: 'finance.manager@tekgen.com',
    password: 'Finance@2026',
    label: 'Finance Manager',
    title: 'Finance Manager',
    role: 'FINANCE_HEAD',
    firstName: 'Finance',
    lastName: 'Manager',
  },
];

function getDemoAccountsForSeed() {
  return DEMO_WORKSPACE_ACCOUNTS.map(
    ({ email, password, firstName, lastName, role }) => ({
      email,
      password,
      firstName,
      lastName,
      role,
    })
  );
}

/** Emails that startup seed may reset (password unlock). Not used for other users. */
function getDemoWorkspaceEmailSet() {
  return new Set(DEMO_WORKSPACE_ACCOUNTS.map((a) => a.email.toLowerCase()));
}

module.exports = {
  DEMO_WORKSPACE_ACCOUNTS,
  getDemoAccountsForSeed,
  getDemoWorkspaceEmailSet,
};
