import { Link } from "react-router-dom";
import kloseLogo from "@/assets/klose-logo.png";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={kloseLogo} alt="KLOSE" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold">KLOSE</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link to="/legal/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/legal/refund" className="hover:text-foreground">Refund</Link>
            <Link to="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm md:prose-base">
        <h1>Privacy Notice</h1>
        <p className="text-muted-foreground">Last updated: April 24, 2026</p>

        <h2>1. Who We Are</h2>
        <p>
          This Privacy Notice describes how <strong>Klose LLC</strong>, a Wyoming limited liability
          company (EIN 41-4409334), operating the website <strong>goklose.com</strong> ("KLOSE",
          "we", "us"), collects, uses, and shares personal information. Klose LLC acts as the data
          controller for the personal data described below.
        </p>

        <h2>2. Categories of Personal Data We Collect</h2>
        <ul>
          <li><strong>Account information:</strong> name, email address, phone number, password (hashed).</li>
          <li><strong>Profile information:</strong> business name, role, profile picture if provided.</li>
          <li><strong>Customer data:</strong> the lead and property records you upload to operate your business.</li>
          <li><strong>Payment-related data:</strong> billing name and email passed to Paddle for invoicing. We do <em>not</em> store full card numbers — Paddle handles payment processing.</li>
          <li><strong>Communications:</strong> messages you send to support, feedback, survey responses.</li>
          <li><strong>Usage data and telemetry:</strong> log data, pages visited, actions taken, device identifiers, IP address, browser type, approximate location.</li>
          <li><strong>Cookies:</strong> session cookies, authentication tokens, and analytics cookies.</li>
        </ul>

        <h2>3. Purposes and Legal Basis</h2>
        <ul>
          <li><strong>Provide the service</strong> (contract performance): account creation, hosting your data, executing the features you request.</li>
          <li><strong>Process payments</strong> (contract performance): coordinate billing through Paddle.</li>
          <li><strong>Customer support</strong> (legitimate interests / contract): responding to inquiries and troubleshooting.</li>
          <li><strong>Security and fraud prevention</strong> (legitimate interests / legal obligation): detecting abuse, protecting accounts, complying with anti-fraud regulations.</li>
          <li><strong>Product improvement and analytics</strong> (legitimate interests): understanding how the service is used to improve it.</li>
          <li><strong>Marketing communications</strong> (consent or legitimate interests): only when you have opted in or where permitted by law. You can opt out at any time.</li>
          <li><strong>Legal compliance</strong> (legal obligation): tax, accounting, and other obligations.</li>
        </ul>

        <h2>4. How We Share Personal Data</h2>
        <ul>
          <li>
            <strong>Service providers / subprocessors:</strong> hosting (Supabase / Lovable Cloud),
            analytics, email delivery (Resend), AI providers used to power features (e.g. Google
            Gemini, OpenAI via gateway), all under appropriate data processing agreements.
          </li>
          <li>
            <strong>Merchant of Record (Paddle.com):</strong> for sale of our products and services,
            subscription and payment processing, tax compliance, and invoicing. Paddle acts as a
            separate controller for the data they collect to fulfill these obligations.
          </li>
          <li>
            <strong>Professional advisers:</strong> legal counsel, accountants, auditors when required.
          </li>
          <li>
            <strong>Authorities:</strong> when required by law, court order, or to protect rights,
            safety, or property.
          </li>
          <li>
            <strong>Business transfers:</strong> in the event of a merger, acquisition, or sale of
            assets, with continued protection under this Notice.
          </li>
        </ul>

        <h2>5. Data Retention</h2>
        <p>
          We retain personal data only for as long as necessary to fulfill the purposes for which it
          was collected, comply with legal obligations, resolve disputes, and enforce our
          agreements. When data is no longer needed, it will be deleted or anonymized. You may
          request deletion of your account data at any time, subject to lawful retention
          requirements.
        </p>

        <h2>6. Your Rights</h2>
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you;</li>
          <li>Request correction of inaccurate data;</li>
          <li>Request deletion of your data;</li>
          <li>Object to or restrict certain processing;</li>
          <li>Request data portability;</li>
          <li>Withdraw consent at any time where processing is based on consent;</li>
          <li>Lodge a complaint with a competent supervisory authority.</li>
        </ul>
        <p>To exercise any of these rights, contact <strong>support@goklose.com</strong>.</p>

        <h2>7. International Transfers</h2>
        <p>
          Personal data may be transferred to and processed in countries outside of your country of
          residence, including the United States. Where required, we rely on appropriate safeguards
          such as Standard Contractual Clauses or adequacy decisions.
        </p>

        <h2>8. Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect personal data,
          including encryption in transit (TLS), encryption at rest, role-based access controls, and
          row-level security on databases. No method of transmission over the internet is 100%
          secure, and we cannot guarantee absolute security.
        </p>

        <h2>9. Cookies</h2>
        <p>
          We use essential cookies for authentication and session management, and may use analytics
          cookies to understand product usage. You can manage cookie preferences through your
          browser settings. Disabling essential cookies may impact your ability to use the service.
        </p>

        <h2>10. Children</h2>
        <p>
          KLOSE is not intended for use by individuals under the age of 18. We do not knowingly
          collect personal data from children.
        </p>

        <h2>11. Changes to This Notice</h2>
        <p>
          We may update this Privacy Notice from time to time. Material changes will be communicated
          via email or in-app notice.
        </p>

        <h2>12. Contact</h2>
        <p>
          For privacy questions, contact <strong>support@goklose.com</strong>.
        </p>
      </main>
    </div>
  );
}
