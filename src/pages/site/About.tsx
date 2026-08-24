import { Link } from "react-router-dom";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import homeImg from "@/assets/site-home.jpg";

const principles = [
  {
    t: "Underwrite first",
    d: "Every property runs through our own model — comps, rehab scope, holding cost and exit — before we ever discuss price.",
  },
  {
    t: "Own capital",
    d: "We close with our own funds and lending relationships, which means we don't need a third party to say yes.",
  },
  {
    t: "Improve with intent",
    d: "Scope is driven by what the buyer in that specific neighborhood actually pays for. No vanity renovations.",
  },
  {
    t: "Exit with certainty",
    d: "We price for a fast, clean exit rather than a hopeful one. Speed protects returns better than optimism.",
  },
];

export default function About() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="About"
        title="A real estate investment company built on discipline"
        subtitle="KLOSE LLC acquires, improves and sells residential property and land across the American Southeast."
      />

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <img src={homeImg} alt="Renovated home acquired by KLOSE" loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
              Who we are
            </h2>
            <p className="mt-5 leading-relaxed text-white/60">
              KLOSE is a Wyoming registered company operating out of Birmingham, Alabama. We work with sellers who
              want a certain closing, realtors carrying listings that stalled, and investors looking for product that
              has already been vetted.
            </p>
            <p className="mt-4 leading-relaxed text-white/60">
              We are not a brokerage. We buy for our own account, take on the renovation risk, and stand behind the
              numbers we publish.
            </p>
            <Link
              to="/contact"
              className="mt-8 inline-block rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] hover:border-white/60"
            >
              Talk with us
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">How we think</div>
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <div key={p.t} className="rounded-2xl border border-white/10 bg-[#12203f] p-7">
                <div className="text-xs text-white/30">0{i + 1}</div>
                <h3 className="mt-3 text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {p.t}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
