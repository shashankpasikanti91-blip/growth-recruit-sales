import Link from 'next/link';
import { Zap } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | SRP AI Labs',
  description: 'Privacy Policy for SRP AI Labs Recruitment & Sales Automation Platform',
};

const LAST_UPDATED = '9 April 2026';
const COMPANY = 'SRP AI Labs Sdn. Bhd.';
const CONTACT_EMAIL = 'privacy@srp-ai-labs.com';
const DPO_EMAIL = 'dpo@srp-ai-labs.com';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-900 font-bold">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            SRP AI Labs
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/terms" className="text-gray-500 hover:text-gray-900">Terms of Service</Link>
            <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="mb-8 pb-6 border-b border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-500">Last updated: {LAST_UPDATED} · Effective: {LAST_UPDATED}</p>
            <p className="text-xs text-gray-400 mt-1">This policy applies to all users of the SRP AI Labs platform globally, including users in Malaysia, Singapore, the EU, UK, and other jurisdictions.</p>
          </div>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-8">

            {/* 1 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Who We Are</h2>
              <p>
                {COMPANY} ("SRP AI Labs", "we", "us", "our") operates the recruitment and sales automation platform
                at <strong>growth.srpailabs.com</strong>. We are the data controller for account and platform usage data,
                and a data processor for candidate and contact data you upload or import.
              </p>
              <p className="mt-2">
                Data Protection contact: <a href={`mailto:${DPO_EMAIL}`} className="text-brand-600 hover:underline">{DPO_EMAIL}</a>
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Data We Collect</h2>

              <h3 className="font-medium text-gray-800 mt-3 mb-1">2.1 Account & Platform Users</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Name, work email address, phone number (optional)</li>
                <li>Company name, industry, country</li>
                <li>Job title (optional, stored in profile settings)</li>
                <li>Authentication data (password hash, Google OAuth tokens) — passwords are never stored in plain text</li>
                <li>Usage data: pages visited, features used, API call logs</li>
                <li>IP address, browser type, device information</li>
                <li>Email verification codes (OTP) — deleted immediately upon use or after a short expiry window, then permanently removed</li>
              </ul>

              <h3 className="font-medium text-gray-800 mt-4 mb-1">2.2 Candidate & Contact Data (Customer Data)</h3>
              <p>
                When you import, upload, or enter candidate or contact records into the Platform, that data is
                processed on your behalf. This may include:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Full name, email, phone number, LinkedIn profile URL</li>
                <li>Work history, skills, education (from CVs/resumes)</li>
                <li>Company, job title, industry, location</li>
                <li>Communication history (outreach emails, responses)</li>
                <li>AI-generated screening scores, summaries, and notes</li>
                <li>Visa status, nationality (for international placement roles — where you explicitly provide this)</li>
              </ul>
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                As our customer, you are the data controller for candidate and contact data. You are responsible for ensuring you have a valid lawful basis (e.g. consent, legitimate interest) for processing this data, in compliance with GDPR, PDPA, and other applicable laws.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
              <table className="w-full text-sm border-collapse border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200">Purpose</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200">Lawful Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Providing and operating the Platform', 'Contract performance'],
                    ['Account registration and email verification', 'Contract performance'],
                    ['Sending OTP security codes', 'Contract performance / Legal obligation'],
                    ['Product updates and feature announcements', 'Legitimate interest (opt-out available)'],
                    ['Security monitoring and fraud prevention', 'Legitimate interest / Legal obligation'],
                    ['Analytics and platform improvement', 'Legitimate interest'],
                    ['Legal compliance and responding to lawful requests', 'Legal obligation'],
                    ['Owner notifications (new signups)', 'Legitimate interest — internal operations only'],
                  ].map(([purpose, basis]) => (
                    <tr key={purpose}>
                      <td className="px-4 py-2 border border-gray-200">{purpose}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-500">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Data Sharing & Third Parties</h2>
              <p>We do not sell your personal data. We share data only in the following circumstances:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Service Providers:</strong> Cloud hosting (our VPS provider), database services, email delivery — bound by data processing agreements</li>
                <li><strong>Third-Party Integrations:</strong> Only when you explicitly connect services (Apollo.io, LinkedIn, Hunter.io, etc.) — API calls are made with your credentials on your behalf</li>
                <li><strong>AI Processing:</strong> AI features are used to assist with screening, scoring, and drafting. Processing occurs within our secure infrastructure. We do not send candidate personal data to third-party AI APIs without disclosure in our Data Processing Agreement</li>
                <li><strong>Legal requirements:</strong> When required by law, court order, or to protect rights and safety</li>
                <li><strong>Business transfer:</strong> In connection with a merger or acquisition, with data protection obligations maintained</li>
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Data Retention</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account data:</strong> Retained while your account is active + 90 days after deletion request</li>
                <li><strong>OTP codes:</strong> Deleted immediately upon use or after 10-minute expiry</li>
                <li><strong>Candidate/contact records:</strong> Retained as long as your account is active. Deleted within 30 days of a verified deletion request</li>
                <li><strong>Audit logs:</strong> Retained for 12 months for security and compliance purposes</li>
                <li><strong>Backups:</strong> Encrypted backups retained for 30 days</li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Security</h2>
              <p>We implement appropriate technical and organisational measures to protect your data, including:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>All passwords hashed using a strong, industry-standard cryptographic algorithm</li>
                <li>Email OTP verification for new account registrations</li>
                <li>TLS/HTTPS encryption for all data in transit</li>
                <li>Encrypted database backups</li>
                <li>Access controls and role-based permissions</li>
                <li>Regular security audits and dependency updates</li>
              </ul>
              <p className="mt-2 text-sm">
                If you discover a security vulnerability, please report it responsibly to{' '}
                <a href="mailto:security@srp-ai-labs.com" className="text-brand-600 hover:underline">security@srp-ai-labs.com</a>.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Your Rights</h2>
              <p>Depending on your location and applicable law, you may have the following rights:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update inaccurate or incomplete data (directly via your profile settings)</li>
                <li><strong>Erasure:</strong> Request deletion of your account and associated data</li>
                <li><strong>Portability:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Restriction:</strong> Request we limit processing in certain circumstances</li>
                <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Withdraw consent:</strong> Where processing is based on consent</li>
              </ul>
              <p className="mt-2">
                To exercise your rights, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a>.
                We will respond within 30 days. We may need to verify your identity before fulfilling requests.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. International Data Transfers</h2>
              <p>
                Your data may be processed in countries outside your home country, including countries without
                equivalent data protection laws. When transferring data internationally, we rely on appropriate
                safeguards such as Standard Contractual Clauses (EU/UK), or equivalent mechanisms.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Cookies & Tracking</h2>
              <p>
                We use only essential cookies required for authentication (access token, refresh token) stored as
                secure, same-site cookies. We do not use third-party advertising trackers. Our minimal analytics
                are anonymised and do not track individual users across websites.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Children's Privacy</h2>
              <p>
                The Platform is not intended for individuals under 18. We do not knowingly collect personal data
                from minors. If you believe we have inadvertently collected such data, please contact us immediately.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
              <p>
                We will notify you of material changes to this Privacy Policy via email and/or platform notification
                at least 14 days before they take effect. The updated date at the top of this page reflects the latest version.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contact & Complaints</h2>
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium">{COMPANY}</p>
                <p>Privacy: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a></p>
                <p>Data Protection Officer: <a href={`mailto:${DPO_EMAIL}`} className="text-brand-600 hover:underline">{DPO_EMAIL}</a></p>
              </div>
              <p className="mt-3 text-sm">
                If you are in the EU/UK and believe your rights have been violated, you have the right to lodge a
                complaint with your local supervisory authority (e.g., the ICO in the UK, or your national DPA in the EU).
              </p>
            </section>

          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex gap-4 text-sm text-gray-400">
            <Link href="/terms" className="text-brand-600 hover:underline">Terms of Service</Link>
            <span>·</span>
            <Link href="/signup" className="text-brand-600 hover:underline">Create account</Link>
            <span>·</span>
            <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
