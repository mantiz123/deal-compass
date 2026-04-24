import { Link } from "react-router-dom";
import kloseLogo from "@/assets/klose-logo.png";

export default function Refund() {
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
        <h1>Refund Policy</h1>
        <p className="text-muted-foreground">Last updated: April 24, 2026</p>

        <h2>30-Day Money-Back Guarantee</h2>
        <p>
          Klose LLC ("KLOSE") offers a <strong>30-day money-back guarantee</strong> on all services
          purchased through our platform. If you are not satisfied with your purchase, you may
          request a full refund within 30 days from the date of your order.
        </p>

        <h2>How to Request a Refund</h2>
        <p>
          Refunds are processed by our payment provider, Paddle.com, who serves as the Merchant of
          Record for all orders. To request a refund:
        </p>
        <ul>
          <li>
            Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a>{" "}
            and locate your transaction using the email address used at checkout.
          </li>
          <li>
            Or contact our team at <strong>support@goklose.com</strong> and we will assist you with
            the refund process through Paddle.
          </li>
        </ul>

        <h2>Eligibility</h2>
        <p>
          Refund requests submitted within 30 days of the original purchase are eligible for a full
          refund, no questions asked. Requests submitted after the 30-day window may be considered
          on a case-by-case basis but are not guaranteed.
        </p>

        <h2>Processing Time</h2>
        <p>
          Once approved, refunds are typically processed within 5–10 business days and returned to
          the original payment method. Bank processing times may vary.
        </p>

        <h2>Chargebacks</h2>
        <p>
          If you have a billing concern, we ask that you contact us before initiating a chargeback
          with your bank. We are committed to resolving billing disputes promptly and fairly.
        </p>

        <h2>Contact</h2>
        <p>
          For refund-related questions, contact <strong>support@goklose.com</strong>.
        </p>
      </main>
    </div>
  );
}
