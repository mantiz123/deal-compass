import { Link } from "react-router-dom";
import kloseLogo from "@/assets/klose-logo.png";

export default function Terms() {
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
        <h1>Terms and Conditions</h1>
        <p className="text-muted-foreground">Last updated: April 24, 2026</p>

        <h2>1. Identification of the Seller</h2>
        <p>
          These Terms and Conditions ("Terms") govern your use of the services provided by{" "}
          <strong>Klose LLC</strong>, a limited liability company organized under the laws of the
          State of Wyoming, United States, with EIN 41-4409334, operating the website{" "}
          <strong>goklose.com</strong> ("KLOSE", "we", "us", or "our"). By using our services, you
          are entering into a contract with Klose LLC.
        </p>

        <h2>2. Acceptance of Terms</h2>
        <p>
          By accessing, registering, or using KLOSE, you agree to be bound by these Terms. If you do
          not agree, you must not use the service. Continued use of the service constitutes ongoing
          acceptance of these Terms.
        </p>

        <h2>3. Description of Service</h2>
        <p>
          KLOSE provides a software-as-a-service platform for real estate wholesaling operations,
          including lead management, property analysis, contract generation, and consulting services
          related to real estate investment in the United States. KLOSE acts strictly as an
          investment firm and software provider — we are not licensed real estate brokers or agents.
        </p>

        <h2>4. Authority and Eligibility</h2>
        <p>
          You represent that you are at least 18 years of age and have the legal authority to enter
          into this agreement. If you are using the service on behalf of an organization, you
          represent that you have authority to bind that organization to these Terms.
        </p>

        <h2>5. Acceptable Use</h2>
        <p>You must not misuse the service. Specifically, you agree not to:</p>
        <ul>
          <li>Use the service for any unlawful, fraudulent, or harmful purpose;</li>
          <li>Send spam or unsolicited communications in violation of TCPA, CAN-SPAM, or other applicable laws;</li>
          <li>Infringe upon the intellectual property rights of KLOSE or any third party;</li>
          <li>Attempt to interfere with the security of the service, including probing, scanning, scraping, distributing malware, or attempting to gain unauthorized access;</li>
          <li>Reverse engineer, decompile, or disassemble any portion of the service;</li>
          <li>Resell, redistribute, or sublicense the service without our written consent;</li>
          <li>Circumvent any technical limitations or access controls.</li>
        </ul>

        <h2>6. Account Credentials</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activity that occurs under your account. You must provide accurate, current
          information and keep it updated.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          KLOSE retains all right, title, and interest in and to the service, including all
          software, documentation, branding, logos, and related intellectual property. We grant you
          a limited, non-exclusive, non-transferable, revocable license to use the service solely
          within the scope of your active plan and in accordance with these Terms.
        </p>

        <h2>8. User Content</h2>
        <p>
          You retain ownership of any data and content you upload to KLOSE. You grant us a limited
          license to host, store, and process such content solely as necessary to provide the
          service.
        </p>

        <h2>9. Service Availability</h2>
        <p>
          We make commercially reasonable efforts to keep the service available but do not guarantee
          uninterrupted, error-free, or secure operation. The service is provided "as is" and "as
          available", and we disclaim all implied warranties to the fullest extent permitted by law,
          including warranties of merchantability and fitness for a particular purpose.
        </p>

        <h2>10. Payment Terms</h2>
        <p>
          Our order process is conducted by our online reseller{" "}
          <strong>Paddle.com</strong>. Paddle.com is the Merchant of Record for all our orders.
          Paddle provides all customer service inquiries and handles returns. For payment, billing,
          taxes, cancellations, and refund mechanics, please refer to the{" "}
          <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">
            Paddle Buyer Terms
          </a>
          .
        </p>
        <p>
          Fees are due as displayed at checkout or at the time we issue you a payment link.
          One-time service fees are non-recurring and billed at the moment of payment.
        </p>

        <h2>11. Suspension and Termination</h2>
        <p>
          We may suspend or terminate your access to the service at any time, with or without
          notice, for: (a) material breach of these Terms; (b) non-payment of fees; (c) suspected
          fraud or security risk; or (d) repeated or serious violations of acceptable use. Upon
          termination, your right to use the service ceases immediately and we may delete your
          account data after a reasonable export window.
        </p>

        <h2>12. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, KLOSE's aggregate liability arising out of or
          related to these Terms or your use of the service will not exceed the total fees you paid
          to us in the twelve (12) months preceding the event giving rise to the claim. We will not
          be liable for any indirect, consequential, special, incidental, or punitive damages,
          including loss of profits, data, or goodwill. These limitations do not apply to fraud,
          gross negligence, or any liability that cannot be excluded under applicable law.
        </p>

        <h2>13. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless Klose LLC, its officers, employees, and agents
          from any claims, damages, or expenses arising from your content, your unlawful use of the
          service, or your violation of these Terms.
        </p>

        <h2>14. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms are governed by the laws of the State of Wyoming, United States, without
          regard to its conflict of laws principles. Any dispute arising under these Terms shall be
          resolved in the state or federal courts located in Wyoming.
        </p>

        <h2>15. Assignment</h2>
        <p>
          You may not assign these Terms without our prior written consent. We may assign these
          Terms in connection with a merger, acquisition, or sale of assets.
        </p>

        <h2>16. Force Majeure</h2>
        <p>
          Neither party shall be liable for any failure or delay in performance due to events beyond
          its reasonable control, including natural disasters, acts of war, government actions, or
          internet/telecommunications outages.
        </p>

        <h2>17. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Material changes will be communicated via
          email or in-app notice. Continued use after changes constitutes acceptance.
        </p>

        <h2>18. Contact</h2>
        <p>
          Questions about these Terms can be sent to <strong>support@goklose.com</strong>.
        </p>
      </main>
    </div>
  );
}
