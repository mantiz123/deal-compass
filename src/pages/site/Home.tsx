import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ListingCard } from "@/components/site/ListingCard";
import { listings, markets, landCategories } from "@/data/siteContent";
import heroImg from "@/assets/site-hero.jpg";
import heroVideo from "@/assets/site-hero.mp4.asset.json";


function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      const html = el as HTMLElement;
      html.style.opacity = "0";
      html.style.transform = "translateY(24px)";
      html.style.transition = "opacity 800ms ease, transform 800ms ease";
      observer.observe(html);
    });
    return () => observer.disconnect();
  }, []);
}

function CinematicHero() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(Math.max(-el.getBoundingClientRect().top / Math.max(total, 1), 0), 1);
      setProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scale = 1.75 - progress * 0.75;
  const radius = progress * 28;
  const inset = progress * 3;

  return (
    <div ref={ref} className="relative h-[165vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ padding: `${inset}vh ${inset}vw`, transition: "padding 120ms linear" }}
        >
          <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: `${radius}px` }}>
            <img
              src={heroImg}
              alt="Aerial view rising from a single American home out over the city skyline at golden hour"
              width={1920}
              height={1088}
              className="h-full w-full object-cover"
              style={{ transform: `scale(${scale})`, transformOrigin: "center 82%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b1530]/75 via-[#0b1530]/35 to-[#0f1b3d]/90" />
          </div>
        </div>

        <div
          className="relative z-10 mx-auto max-w-4xl px-6 text-center"
          style={{ opacity: Math.max(1 - progress * 1.6, 0), transform: `translateY(${-progress * 40}px)` }}
        >

          <span className="text-[10px] uppercase tracking-[0.35em] text-white/70">Klose LLC</span>
          <h1
            className="mt-6 text-5xl font-medium leading-[1.05] lg:text-8xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            We buy, improve and <span className="italic">sell</span> American real estate.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-light text-white/70">
            Homes, land and investment opportunities across Alabama and the Southeast — acquired
            with discipline, renovated with intent, sold with certainty.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/buy"
              className="rounded-full bg-[#3b6fa0] px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#4a85c0]"
            >
              View Properties
            </Link>
            <Link
              to="/sell"
              className="rounded-full border border-white/25 px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:border-white"
            >
              Sell Your Property
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const pillars = [
  {
    k: "Buy",
    v: "Curated homes, land and investment deals — priced on real numbers, not hope.",
    href: "/buy",
  },
  {
    k: "Sell",
    v: "Submit your property and get a straight answer, usually within 48 hours. No listings, no showings.",
    href: "/sell",
  },
  {
    k: "Develop",
    v: "We renovate and reposition what we buy — from cosmetic refreshes to full rebuilds and land entitlement.",
    href: "/about",
  },
];

const steps = [
  { n: "01", t: "Source", d: "Off-market leads, realtor relationships and direct owner outreach across five states." },
  { n: "02", t: "Underwrite", d: "Every property runs through our analyzer: comps, rehab scope, financing, holding and exit." },
  { n: "03", t: "Acquire", d: "Cash or hard money, clean title work, closings in as little as 10 days." },
  { n: "04", t: "Improve", d: "Vetted contractor crews, fixed scopes and weekly progress accountability." },
  { n: "05", t: "Exit", d: "Retail sale, investor sale or long-term hold — whichever the numbers support." },
];

export default function Home() {
  useReveal();
  const featured = listings.filter((l) => l.status === "available").slice(0, 3);
  const land = listings.filter((l) => l.type === "land").slice(0, 3);

  return (
    <SiteLayout>
      <CinematicHero />

      {/* Brand philosophy */}
      <section className="border-t border-white/10 px-6 pb-28 pt-20">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.2fr]" data-reveal>
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">Philosophy</span>
            <h2
              className="mt-4 text-4xl font-medium leading-tight lg:text-5xl"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Real estate is a <span className="italic">numbers</span> business dressed up as an emotional one.
            </h2>
          </div>
          <div className="space-y-6 text-lg font-light leading-relaxed text-white/65">
            <p>
              KLOSE was built around a single discipline: we do not buy a property until the exit is
              already modeled. Purchase price, rehab scope, carrying cost, selling cost and the most
              probable resale value — all of it before an offer leaves our desk.
            </p>
            <p>
              That discipline is what lets us move fast when a seller needs speed, and walk away
              without hesitation when the math does not work. It is also why the people who sell to
              us, and the investors who buy from us, come back.
            </p>
          </div>
        </div>
      </section>

      {/* BUY / SELL / DEVELOP */}
      <section className="border-t border-white/10 bg-[#0b1530] px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          {pillars.map((p) => (
            <Link
              key={p.k}
              to={p.href}
              data-reveal
              className="group rounded-2xl border border-white/10 p-8 transition-colors hover:border-[#3b6fa0]/60 hover:bg-white/[0.02]"
            >
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">0{pillars.indexOf(p) + 1}</div>
              <h3 className="mt-4 text-3xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                {p.k}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/55">{p.v}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70 group-hover:text-white">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured properties */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4" data-reveal>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">Inventory</span>
              <h2 className="mt-3 text-4xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                Available now
              </h2>
            </div>
            <Link to="/buy" className="text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white">
              All properties →
            </Link>
          </div>
          <div className="grid gap-8 md:grid-cols-3" data-reveal>
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </div>
      </section>

      {/* Land opportunities */}
      <section className="border-t border-white/10 bg-[#0b1530] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4" data-reveal>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">Land</span>
              <h2 className="mt-3 text-4xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                Land opportunities
              </h2>
              <p className="mt-3 max-w-xl text-white/55">
                Lots, acreage and development parcels — the quietest way to build a position in a
                growing market.
              </p>
            </div>
            <Link to="/land" className="text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white">
              Browse land →
            </Link>
          </div>
          <div className="grid gap-8 md:grid-cols-3" data-reveal>
            {land.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-reveal>
            {landCategories.map((c) => (
              <Link
                key={c.slug}
                to={`/land?category=${c.slug}`}
                className="rounded-xl border border-white/10 px-5 py-4 text-sm text-white/70 transition-colors hover:border-[#3b6fa0]/60 hover:text-white"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Markets */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12" data-reveal>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">Footprint</span>
            <h2 className="mt-3 text-4xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
              Markets we operate in
            </h2>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10" data-reveal>
            {markets.map((m) => (
              <Link key={m.slug} to={`/markets/${m.slug}`} className="group flex flex-wrap items-center justify-between gap-4 py-7">
                <div className="flex items-baseline gap-6">
                  <span
                    className="text-3xl font-medium transition-colors group-hover:text-[#7fb0dd] lg:text-5xl"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {m.name}
                  </span>
                  <span className="text-sm text-white/45">{m.tagline}</span>
                </div>
                <span className="hidden text-xs uppercase tracking-[0.2em] text-white/40 group-hover:text-white md:block">
                  {m.cities.slice(0, 3).join(" · ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How we work */}
      <section className="border-t border-white/10 bg-[#0b1530] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14" data-reveal>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">Process</span>
            <h2 className="mt-3 text-4xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
              How we work
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-5" data-reveal>
            {steps.map((s) => (
              <div key={s.n} className="border-t border-[#3b6fa0]/40 pt-5">
                <div className="text-xs tracking-[0.25em] text-[#3b6fa0]">{s.n}</div>
                <h3 className="mt-3 text-xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {s.t}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Property submission */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 rounded-3xl border border-white/10 bg-[#12203f] p-10 lg:grid-cols-2 lg:p-14" data-reveal>
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">Sell</span>
            <h2 className="mt-4 text-4xl font-medium leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Have a property to <span className="italic">move?</span>
            </h2>
            <p className="mt-5 text-white/60">
              House, lot or acreage — condition does not matter. Send us the address and we will run
              the numbers and come back with a real answer, not a fishing expedition.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/50">
              <li>— No commissions, no repairs, no showings</li>
              <li>— Cash close in as little as 10 days</li>
              <li>— A straight no if it is not a fit</li>
            </ul>
          </div>
          <div className="lg:justify-self-end">
            <Link
              to="/sell"
              className="inline-flex items-center gap-3 rounded-full bg-[#3b6fa0] px-10 py-5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#4a85c0]"
            >
              Submit your property <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/10 px-6 py-28 text-center">
        <div className="mx-auto max-w-3xl" data-reveal>
          <h2 className="text-4xl font-medium leading-tight lg:text-6xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Let&apos;s talk about your next <span className="italic">deal.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-white/60">
            Whether you are buying, selling or looking to place capital, the conversation starts the
            same way — with the numbers.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/contact"
              className="rounded-full bg-[#3b6fa0] px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#4a85c0]"
            >
              Contact us
            </Link>
            <Link
              to="/buy?type=investment"
              className="rounded-full border border-white/25 px-8 py-4 text-xs font-semibold uppercase tracking-[0.2em] hover:border-white"
            >
              Investment opportunities
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
