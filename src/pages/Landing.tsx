import { useEffect, FormEvent, useState } from "react";
import { Link } from "react-router-dom";

const Landing = () => {
  const [form, setForm] = useState({ name: "", email: "", range: "$50k - $150k" });

  useEffect(() => {
    // Inject Playfair Display + Inter once
    const id = "klose-landing-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }

    // Fade-in on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).style.opacity = "1";
            (e.target as HTMLElement).style.transform = "translateY(0)";
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const html = el as HTMLElement;
      html.style.opacity = "0";
      html.style.transform = "translateY(20px)";
      html.style.transition = "opacity 700ms ease, transform 700ms ease";
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("New Investor Interest — KLOSE Section 8");
    const body = encodeURIComponent(
      `Nombre: ${form.name}\nEmail: ${form.email}\nCapital Range: ${form.range}\n\n— Sent from goklose.com`
    );
    window.location.href = `mailto:sergio@goklose.com?subject=${subject}&body=${body}`;
  };

  return (
    <div
      className="min-h-screen w-full bg-[#0f1b3d] text-[#e8edf3] selection:bg-[#3b6fa0] selection:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div
          className="text-2xl font-bold tracking-tighter"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          KLOSE
        </div>
        <Link
          to="/auth"
          className="text-sm font-medium tracking-wide uppercase border-b border-[#3b6fa0] pb-1 hover:text-[#3b6fa0] transition-colors"
        >
          Investor Portal
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8" data-reveal>
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 border border-[#3b6fa0] rounded-full text-xs font-semibold tracking-widest uppercase text-[#3b6fa0]">
              Oportunidades Exclusivas
            </span>
            <h1
              className="text-5xl lg:text-7xl font-medium leading-[1.1]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Build cashflow with <span className="italic">turnkey</span> Section 8 properties.
            </h1>
            <p className="text-xl text-[#e8edf3]/70 max-w-xl font-light">
              Access government-guaranteed rental income through specialized US real estate deals
              curated for the Latino investor community.
            </p>
          </div>

          <div className="flex gap-12 border-t border-[#1e3a5f] pt-8">
            <div>
              <div
                className="text-3xl font-medium"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                12.4%
              </div>
              <div className="text-xs uppercase tracking-widest text-[#3b6fa0] mt-1">
                Avg Cap Rate
              </div>
            </div>
            <div>
              <div
                className="text-3xl font-medium"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                21 Days
              </div>
              <div className="text-xs uppercase tracking-widest text-[#3b6fa0] mt-1">
                Tenant Placement
              </div>
            </div>
          </div>
        </div>

        {/* Investor Lead Capture */}
        <div
          className="bg-[#1e3a5f] p-8 lg:p-10 rounded-2xl shadow-2xl ring-1 ring-white/10"
          data-reveal
        >
          <h2
            className="text-2xl font-medium mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Join the Investor List
          </h2>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#e8edf3]/50 mb-2">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Juan Perez"
                className="w-full bg-[#0f1b3d] border border-[#3b6fa0]/30 rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-[#3b6fa0] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#e8edf3]/50 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="juan@investor.com"
                className="w-full bg-[#0f1b3d] border border-[#3b6fa0]/30 rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-[#3b6fa0] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#e8edf3]/50 mb-2">
                Investment Capital Range
              </label>
              <select
                value={form.range}
                onChange={(e) => setForm({ ...form, range: e.target.value })}
                className="w-full bg-[#0f1b3d] border border-[#3b6fa0]/30 rounded-lg px-4 py-3 outline-none focus:ring-1 focus:ring-[#3b6fa0] transition-all"
              >
                <option>$50k - $150k</option>
                <option>$150k - $500k</option>
                <option>$500k+</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-[#3b6fa0] hover:bg-[#4a85c0] text-white font-semibold py-4 rounded-lg transition-all shadow-lg shadow-black/20 mt-4"
            >
              Get Deal Access
            </button>
            <p className="text-center text-[10px] text-[#e8edf3]/40 uppercase tracking-tighter">
              No commitment required. Accredited &amp; Non-accredited welcome.
            </p>
          </form>
        </div>
      </section>

      {/* Services Grid */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#1e3a5f]">
        <div className="grid md:grid-cols-3 gap-12">
          {[
            {
              title: "Turnkey Section 8",
              desc: "Fully renovated, high-yield properties sourced, analyzed, and ready for closing. Guaranteed rent from day one.",
              path: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            },
            {
              title: "Full Management",
              desc: "Expert tenant placement and Section 8 compliance handling. Hands-off ownership for long-distance investors.",
              path: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
            },
            {
              title: "Off-Market Sourcing",
              desc: "Access our exclusive wholesale inventory in high-growth US markets before they ever hit the MLS.",
              path: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
            },
          ].map((s) => (
            <div key={s.title} className="space-y-4 group" data-reveal>
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1e3a5f] group-hover:bg-[#3b6fa0] transition-colors">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d={s.path}
                  />
                </svg>
              </div>
              <h3
                className="text-xl font-medium"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#e8edf3]/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Section 8 */}
      <section className="bg-[#1e3a5f]/40 py-24 px-6 border-t border-[#1e3a5f]">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div data-reveal>
            <span className="text-xs uppercase tracking-widest text-[#3b6fa0] font-semibold">
              Why Section 8
            </span>
            <h2
              className="text-4xl lg:text-5xl font-medium leading-tight mt-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Government-backed <span className="italic">cashflow.</span>
            </h2>
          </div>
          <ul className="space-y-6 text-[#e8edf3]/80" data-reveal>
            {[
              {
                k: "Rent guaranteed by HUD",
                v: "The federal government pays the majority of rent directly to the landlord every month.",
              },
              {
                k: "Low vacancy, long tenancy",
                v: "Section 8 tenants typically stay 7+ years, dramatically reducing turnover costs.",
              },
              {
                k: "Inflation-hedged rents",
                v: "HUD adjusts Fair Market Rent annually, keeping your yields aligned with the market.",
              },
            ].map((it) => (
              <li key={it.k} className="border-l border-[#3b6fa0] pl-5">
                <div className="text-sm font-semibold text-[#e8edf3]">{it.k}</div>
                <div className="text-sm text-[#e8edf3]/60 mt-1">{it.v}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Proof Numbers */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#1e3a5f]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { n: "12+", l: "US Markets" },
            { n: "98%", l: "Occupancy Rate" },
            { n: "8.5%", l: "Avg Cap Rate" },
            { n: "14d", l: "Avg Placement" },
          ].map((s) => (
            <div key={s.l} data-reveal>
              <div
                className="text-4xl lg:text-5xl font-medium"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {s.n}
              </div>
              <div className="text-xs uppercase tracking-widest text-[#3b6fa0] mt-2">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Disclaimer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-[#1e3a5f]">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="text-xs text-[#e8edf3]/40 max-w-2xl uppercase tracking-wider leading-loose">
            KLOSE Assets LLC. A Wyoming Registered Entity. KLOSE is a real estate investment
            platform and not a licensed real estate broker or investment advisor. All real estate
            investments carry risk.
          </div>
          <div className="flex flex-col md:items-end gap-3">
            <div className="flex gap-5 text-[10px] uppercase tracking-widest text-[#e8edf3]/50">
              <Link to="/legal/terms" className="hover:text-[#3b6fa0]">Terms</Link>
              <Link to="/legal/privacy" className="hover:text-[#3b6fa0]">Privacy</Link>
              <Link to="/legal/refund" className="hover:text-[#3b6fa0]">Refund</Link>
            </div>
            <div className="text-[10px] text-[#3b6fa0] font-bold tracking-widest">
              &copy; {new Date().getFullYear()} KLOSE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
