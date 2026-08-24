import { Link, useParams } from "react-router-dom";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ListingCard } from "@/components/site/ListingCard";
import { markets, listings } from "@/data/siteContent";

const stateCodes: Record<string, string> = {
  alabama: "AL",
  florida: "FL",
  georgia: "GA",
  "south-carolina": "SC",
  texas: "TX",
};

export default function MarketDetail() {
  const { slug = "" } = useParams();
  const market = markets.find((m) => m.slug === slug);

  if (!market) {
    return (
      <SiteLayout>
        <PageHero eyebrow="Markets" title="Market not found" />
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-7xl">
            <Link to="/markets" className="text-[#7fb0dd] hover:text-white">
              Back to all markets
            </Link>
          </div>
        </section>
      </SiteLayout>
    );
  }

  const code = stateCodes[market.slug];
  const local = listings.filter((l) => l.state === code);

  return (
    <SiteLayout>
      <PageHero eyebrow="Market" title={market.name} subtitle={market.tagline} />

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-light leading-relaxed text-white/65">{market.copy}</p>
            <div className="mt-10 grid grid-cols-3 gap-6">
              {market.stats.map((s) => (
                <div key={s.k} className="rounded-2xl border border-white/10 bg-[#12203f] p-6">
                  <div className="text-2xl font-semibold text-[#7fb0dd]">{s.v}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-2xl border border-white/10 bg-[#12203f] p-8">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[#3b6fa0]">Cities we cover</div>
            <ul className="mt-4 space-y-2 text-white/70">
              {market.cities.map((c) => (
                <li key={c} className="border-b border-white/5 pb-2 last:border-0">
                  {c}
                </li>
              ))}
            </ul>
            <Link
              to="/sell"
              className="mt-8 inline-block rounded-full bg-[#3b6fa0] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#4a85c0]"
            >
              Submit a property here
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
            Inventory in {market.name}
          </h2>
          {local.length === 0 ? (
            <p className="mt-5 text-white/55">
              Nothing active in {market.name} right now.{" "}
              <Link to="/buy" className="text-[#7fb0dd] hover:text-white">
                See all properties
              </Link>
              .
            </p>
          ) : (
            <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {local.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
