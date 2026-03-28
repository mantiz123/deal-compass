import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import kloseLogo from "@/assets/klose-logo.png";

const Landing = () => {
  const revealRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("lp-visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".lp-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lp-root">
      {/* NAV */}
      <nav className="lp-nav">
        <a href="#" className="lp-nav-logo">
          <img src={kloseLogo} alt="KLOSE" className="lp-logo-img" />
        </a>
        <ul className="lp-nav-links">
          <li><a href="#process">How it works</a></li>
          <li><a href="#markets">Markets</a></li>
          <li><a href="#platform">Platform</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <div className="lp-nav-cta">
          <Link to="/auth" className="lp-btn-ghost">Partner Login</Link>
          <a href="mailto:sergio@goklose.com" className="lp-btn-primary">Get an Offer</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-grid" />
        <div className="lp-hero-content">
          <span className="lp-hero-label">
            <span className="lp-label-line" />
            Alabama Real Estate · Est. 2026
          </span>
          <h1 className="lp-hero-title">
            We buy homes<br />
            <em>before you</em><br />
            lose them.
          </h1>
          <p className="lp-hero-subtitle">
            Klose connects motivated property owners in Alabama with serious cash investors. No banks. No repairs. No commissions. We close in 2–3 weeks.
          </p>
          <div className="lp-hero-actions">
            <a href="mailto:sergio@goklose.com" className="lp-btn-large lp-btn-large-primary">Request a Cash Offer</a>
            <a href="#process" className="lp-btn-large lp-btn-large-ghost">See how it works</a>
          </div>
        </div>
        <div className="lp-hero-stats">
          <div className="lp-hero-stat">
            <span className="lp-stat-num">14–21<span>d</span></span>
            <span className="lp-stat-label">Average close time</span>
          </div>
          <div className="lp-hero-stat">
            <span className="lp-stat-num">$<span>0</span></span>
            <span className="lp-stat-label">Commissions or repairs</span>
          </div>
          <div className="lp-hero-stat">
            <span className="lp-stat-num">100<span>%</span></span>
            <span className="lp-stat-label">Cash transactions only</span>
          </div>
        </div>
        <div className="lp-hero-line" />
      </section>

      {/* TICKER */}
      <div className="lp-ticker">
        <div className="lp-ticker-track">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="lp-ticker-set">
              <span className="lp-ticker-item"><strong>Birmingham</strong> · Jefferson County</span>
              <span className="lp-ticker-dot" />
              <span className="lp-ticker-item"><strong>Tuscaloosa</strong> · Tuscaloosa County</span>
              <span className="lp-ticker-dot" />
              <span className="lp-ticker-item"><strong>Hoover</strong> · Shelby County</span>
              <span className="lp-ticker-dot" />
              <span className="lp-ticker-item">Cash offers · <strong>Pre-foreclosure specialists</strong></span>
              <span className="lp-ticker-dot" />
              <span className="lp-ticker-item">No MLS · No agents · <strong>Direct to investors</strong></span>
              <span className="lp-ticker-dot" />
            </div>
          ))}
        </div>
      </div>

      {/* PROCESS */}
      <section id="process" className="lp-section">
        <span className="lp-section-label lp-reveal"><span className="lp-label-line" />Process</span>
        <h2 className="lp-section-title lp-reveal">
          Three steps.<br /><em>One solution.</em>
        </h2>
        <div className="lp-steps-grid">
          <div className="lp-step lp-reveal">
            <span className="lp-step-num">01</span>
            <div className="lp-step-icon">✉</div>
            <h3>You reach out</h3>
            <p>Contact us by email or phone. We'll ask a few questions about the property — no commitment required. Everything is confidential.</p>
          </div>
          <div className="lp-step lp-reveal lp-reveal-delay-1">
            <span className="lp-step-num">02</span>
            <div className="lp-step-icon">◈</div>
            <h3>We analyze & offer</h3>
            <p>Our team runs a full analysis of the property value, market comps, and your situation. We present a fair cash offer within 24 hours.</p>
          </div>
          <div className="lp-step lp-reveal lp-reveal-delay-2">
            <span className="lp-step-num">03</span>
            <div className="lp-step-icon">$</div>
            <h3>You get paid</h3>
            <p>Sign the contract digitally. A local Birmingham title company handles all paperwork and pays you directly at closing. Done in 14–21 days.</p>
          </div>
        </div>
      </section>

      {/* WHO WE HELP */}
      <section className="lp-section lp-serve-section">
        <div className="lp-serve-grid">
          <div>
            <span className="lp-section-label lp-reveal"><span className="lp-label-line" />Who we help</span>
            <h2 className="lp-section-title lp-reveal">
              Every situation.<br /><em>One answer.</em>
            </h2>
            <p className="lp-serve-body lp-reveal">
              We specialize in situations where traditional real estate doesn't work — where speed, discretion, and certainty matter more than maximum price.
            </p>
            <a href="mailto:sergio@goklose.com" className="lp-btn-primary lp-reveal" style={{ display: "inline-block", marginTop: 40 }}>
              Talk to us today
            </a>
          </div>
          <div className="lp-serve-cards">
            {[
              { icon: "⚡", title: "Pre-foreclosure & Auction", desc: "Facing a bank auction date? We can close before it happens — protecting your credit and ensuring you leave with real money." },
              { icon: "✈", title: "Absentee owners", desc: "You live outside Alabama but own property here. We handle everything remotely — sign digitally, get paid by wire." },
              { icon: "🏛", title: "Inherited properties", desc: "Inheriting a property you don't want to manage? We simplify probate situations and offer a fast exit for all title holders." },
              { icon: "🔑", title: "Vacant & distressed homes", desc: "Property sitting empty, costing you taxes and insurance? We buy as-is. No cleaning, no repairs, no showing." },
            ].map((c, i) => (
              <div key={i} className={`lp-serve-card lp-reveal lp-reveal-delay-${i % 3}`}>
                <span className="lp-serve-card-icon">{c.icon}</span>
                <div>
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKETS */}
      <section id="markets" className="lp-section">
        <span className="lp-section-label lp-reveal"><span className="lp-label-line" />Active markets</span>
        <h2 className="lp-section-title lp-reveal">Where we <em>operate.</em></h2>
        <div className="lp-market-grid">
          {[
            { num: "283", label: "Active leads tracked", city: "Jefferson County" },
            { num: "14", label: "Average days to close", city: "All markets" },
            { num: "$0", label: "Seller commissions", city: "Guaranteed" },
            { num: "100%", label: "Cash transactions", city: "No financing contingency" },
          ].map((m, i) => (
            <div key={i} className={`lp-market-card lp-reveal lp-reveal-delay-${i % 3}`}>
              <span className="lp-market-num">{m.num}</span>
              <span className="lp-market-label">{m.label}</span>
              <span className="lp-market-city">{m.city}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM / K-SCORE */}
      <section id="platform" className="lp-section lp-piw-section">
        <div className="lp-piw-inner">
          <div className="lp-piw-visual lp-reveal">
            <div className="lp-piw-card">
              <div className="lp-piw-card-header">
                <span className="lp-piw-card-title">K-Score™ · Lead Intelligence</span>
                <span className="lp-piw-badge-hot">HOT · 96%</span>
              </div>
              <div className="lp-piw-card-body">
                <p className="lp-piw-address">1535 Bay Ave SW</p>
                <p className="lp-piw-city">Birmingham, AL 35211 · Jefferson County</p>
                <div className="lp-piw-score-row">
                  <span className="lp-piw-score-label">K-Score</span>
                  <div className="lp-piw-score-bar"><div className="lp-piw-score-fill" /></div>
                  <span className="lp-piw-score-num">96</span>
                </div>
                <div className="lp-piw-badges">
                  <span className="lp-badge lp-badge-red">🚨 AUCTION 23d</span>
                  <span className="lp-badge lp-badge-amber">💎 FREE & CLEAR</span>
                  <span className="lp-badge lp-badge-blue">FORECLOSURE</span>
                  <span className="lp-badge lp-badge-green">PRE-FC</span>
                </div>
                <div className="lp-piw-financials">
                  <div className="lp-piw-fin-item">
                    <span className="lp-piw-fin-label">ARV</span>
                    <span className="lp-piw-fin-val">$58K</span>
                  </div>
                  <div className="lp-piw-fin-item">
                    <span className="lp-piw-fin-label">Offer</span>
                    <span className="lp-piw-fin-val lp-fin-accent">$27.4K</span>
                  </div>
                  <div className="lp-piw-fin-item">
                    <span className="lp-piw-fin-label">Spread</span>
                    <span className="lp-piw-fin-val lp-fin-accent">$13.1K</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-piw-text">
            <span className="lp-section-label lp-reveal"><span className="lp-label-line" />Our technology</span>
            <h2 className="lp-section-title lp-reveal">Precision-scored.<br /><em>Data-driven.</em></h2>
            <p className="lp-serve-body lp-reveal">
              Behind every offer we make sits our proprietary investment platform that analyzes over 40 data signals to identify the most motivated sellers in Alabama.
            </p>
            <div className="lp-piw-features">
              {[
                { icon: "◎", title: "K-Score™ Algorithm", desc: "Proprietary 3-dimension scoring: seller motivation, financial viability, closing difficulty." },
                { icon: "⚡", title: "Auction Urgency Detection", desc: "Real-time monitoring of foreclosure timelines in Jefferson and Tuscaloosa counties." },
                { icon: "◈", title: "Verified Buyer Network", desc: "Curated network of active cash investors ranked by transaction speed and buying power." },
              ].map((f, i) => (
                <div key={i} className={`lp-piw-feat lp-reveal lp-reveal-delay-${i}`}>
                  <div className="lp-piw-feat-icon">{f.icon}</div>
                  <div>
                    <p className="lp-piw-feat-title">{f.title}</p>
                    <p className="lp-piw-feat-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/auth" className="lp-inline-link lp-reveal">Partner & Investor Login →</Link>
          </div>
        </div>
      </section>

      {/* TRANSPARENCY */}
      <section className="lp-section lp-transparent-section">
        <div className="lp-transparent-inner">
          <span className="lp-section-label lp-reveal" style={{ justifyContent: "center" }}>Our commitment</span>
          <h2 className="lp-section-title lp-reveal" style={{ margin: "0 auto", textAlign: "center" }}>
            Radical<br /><em>transparency.</em>
          </h2>
          <p className="lp-transparent-body lp-reveal">
            We are not a real estate agency. We are investors. We earn a finder's fee when we connect a seller with a buyer — and we disclose this upfront, always.
          </p>
          <div className="lp-transparent-cards">
            {[
              { num: "$7K", desc: "Typical assignment fee — paid by the investor, disclosed upfront, never deducted from your offer." },
              { num: "0", desc: "Hidden costs for sellers. No closing fees charged to you. No commissions. The offer is what you get." },
              { num: "48h", desc: "Time to receive your written cash offer after your first contact with our team." },
            ].map((c, i) => (
              <div key={i} className={`lp-transparent-card lp-reveal lp-reveal-delay-${i}`}>
                <span className="lp-transparent-card-num">{c.num}</span>
                <p>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="lp-cta-section">
        <div className="lp-cta-inner">
          <span className="lp-cta-eyebrow lp-reveal">Ready to move?</span>
          <h2 className="lp-cta-title lp-reveal">
            Let's talk about<br /><em>your property.</em>
          </h2>
          <p className="lp-cta-sub lp-reveal">
            Send us your address and a few details. We'll respond within 24 hours with a real number — no pressure, no obligation.
          </p>
          <div className="lp-cta-buttons lp-reveal">
            <a href="mailto:sergio@goklose.com" className="lp-btn-large lp-btn-large-primary">Email sergio@goklose.com</a>
            <Link to="/auth" className="lp-btn-large lp-btn-large-ghost">Investor & Partner Login</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">
          <img src={kloseLogo} alt="KLOSE" className="lp-logo-img-sm" />
        </div>
        <p className="lp-footer-text">
          Wyoming LLC · Operating in Alabama · goklose.com<br />
          Klose is a real estate investment company, not a licensed broker or agent.
        </p>
        <div className="lp-footer-links">
          <a href="mailto:sergio@goklose.com">Contact</a>
          <Link to="/auth">Login</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
