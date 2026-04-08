import Link from 'next/link';
import { Zap } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | SRP AI Labs',
  description: 'Terms of Service for SRP AI Labs Recruitment & Sales Automation Platform',
};

const LAST_UPDATED = '1 April 2026';
const COMPANY = 'SRP AI Labs Sdn. Bhd.';
const CONTACT_EMAIL = 'legal@srp-ai-labs.com';

export default function TermsPage() {
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
            <Link href="/privacy" className="text-gray-500 hover:text-gray-900">Privacy Policy</Link>
            <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          <div className="mb-8 pb-6 border-b border-gray-100">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-sm text-gray-500">Last updated: {LAST_UPDATED} · Effective: {LAST_UPDATED}</p>
          </div>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-8">

            {/* 1 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Agreement to Terms</h2>
              <p>
                By accessing or using the SRP AI Labs platform ("Platform", "Service") operated by {COMPANY}
                ("Company", "we", "us", "our"), you agree to be bound by these Terms of Service ("Terms").
                If you are using the Platform on behalf of an organisation, you represent that you have the authority
                to bind that organisation to these Terms.
              </p>
              <p className="mt-2">
                If you do not agree with any part of these Terms, you must not access or use the Service.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p>
                SRP AI Labs is a cloud-based recruitment and sales automation platform that enables businesses to:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Manage candidate pipelines and job postings</li>
                <li>Import and enrich contact and lead data from authorised sources</li>
                <li>Automate outreach sequences via email, WhatsApp, and other channels</li>
                <li>Use AI-powered tools to assist with screening, scoring, and drafting communications</li>
                <li>Generate analytics and reports on recruitment and sales performance</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Data Sourcing, Web Scraping & Third-Party Data</h2>
              <p className="font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg text-xs border border-amber-200">
                Important: Recruitment platforms that use web scraping or third-party data pipelines have specific legal obligations. Please read this section carefully.
              </p>
              <div className="mt-3 space-y-3">
                <p><strong>3.1 Permitted Data Sources.</strong> The Platform facilitates importing business contact information
                  from authorised third-party services (e.g., Apollo.io, LinkedIn Sales Navigator, Hunter.io) and from publicly
                  available sources where permitted by those platforms' terms of service. You must hold valid licences for
                  any third-party data provider you connect.</p>
                <p><strong>3.2 Your Responsibility for Data Compliance.</strong> By using the import features, you warrant that:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You have a legitimate business purpose and lawful basis for processing contact data (e.g., B2B legitimate interest)</li>
                  <li>You will honour data subject rights requests (access, erasure, correction) in a timely manner</li>
                  <li>You will not use the Platform to scrape social media profiles in violation of those platforms' terms of service</li>
                  <li>You comply with all applicable data protection laws in your jurisdiction (GDPR, PDPA, CCPA, etc.)</li>
                </ul>
                <p><strong>3.3 Resume & CV Data.</strong> When uploading or importing candidate resumes, you confirm that you
                  have obtained the candidate's consent or have a lawful basis under applicable employment and data protection law
                  to process their personal data for recruitment purposes. Resumes may contain special category data (health,
                  nationality, etc.) — you are responsible for handling this in accordance with applicable law.</p>
                <p><strong>3.4 AI Processing of Personal Data.</strong> The Platform may process personal data through AI features
                  (e.g., screening summaries, enrichment). Such processing occurs within our infrastructure and is described in
                  our Privacy Policy and Data Processing Agreement (available on request).</p>
              </div>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">4. User Accounts & Security</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must notify us immediately at {CONTACT_EMAIL} of any unauthorised use of your account</li>
                <li>We use email OTP verification to secure new account registrations</li>
                <li>You may not share your account or credentials with third parties</li>
                <li>You must provide accurate, current information during registration</li>
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Acceptable Use Policy</h2>
              <p>You agree NOT to use the Platform to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Send unsolicited bulk emails (spam) or conduct mass outreach without a lawful basis</li>
                <li>Harvest, scrape, or collect data in violation of any third-party platform's terms of service</li>
                <li>Process sensitive personal data (e.g., ethnicity, religion, health) without explicit consent</li>
                <li>Discriminate in hiring or sales activities based on protected characteristics</li>
                <li>Use AI-generated content that is misleading, deceptive, or impersonates real individuals</li>
                <li>Attempt to reverse-engineer, decompile, or circumvent the Platform's security mechanisms</li>
                <li>Upload malware, viruses, or other malicious code</li>
                <li>Use the Service for any unlawful purpose</li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Subscription, Billing & Cancellation</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>All new accounts receive a 14-day free trial of the Starter plan</li>
                <li>After the trial, continued use requires a paid subscription</li>
                <li>Subscriptions renew automatically unless cancelled before the next billing cycle</li>
                <li>Refunds are provided on a pro-rata basis for annual subscriptions cancelled within 30 days of purchase</li>
                <li>We reserve the right to suspend accounts that are 30+ days overdue</li>
                <li>Pricing is published on our website and may change with 30 days advance notice</li>
              </ul>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
              <p>
                The Platform and its original content, features, and functionality are and will remain the exclusive property
                of {COMPANY}. Your data remains your property. You grant us a limited licence to process your data solely
                to provide the Service.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Disclaimers & Limitation of Liability</h2>
              <p>
                The Service is provided "as is" and "as available" without warranties of any kind. To the maximum extent
                permitted by law, {COMPANY} shall not be liable for any indirect, incidental, special, or consequential
                damages arising from your use of the Service.
              </p>
              <p className="mt-2">
                Our total aggregate liability shall not exceed the fees paid by you in the 12 months preceding the claim.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Governing Law & Dispute Resolution</h2>
              <p>
                These Terms are governed by the laws of Malaysia. Any disputes shall be submitted to the exclusive
                jurisdiction of the courts of Malaysia. For EU/UK users, mandatory local consumer protection laws apply
                and are not affected by this clause.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you by email and/or a prominent
                notice on the Platform at least 14 days before changes take effect. Continued use after the effective date
                constitutes acceptance of the new Terms.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Us</h2>
              <p>For questions about these Terms, please contact:</p>
              <div className="mt-2 bg-gray-50 rounded-lg p-4 text-sm">
                <p className="font-medium">{COMPANY}</p>
                <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-600 hover:underline">{CONTACT_EMAIL}</a></p>
                <p className="text-xs text-gray-400 mt-1">We aim to respond within 5 business days.</p>
              </div>
            </section>

          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex gap-4 text-sm text-gray-400">
            <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
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
