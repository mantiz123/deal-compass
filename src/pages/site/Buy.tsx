import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ListingCard } from "@/components/site/ListingCard";
import { listings } from "@/data/siteContent";

const filters = [
  { key: "all", label: "All" },
  { key: "land", label: "Land" },
  { key: "residential", label: "Residential" },
  { key: "investment", label: "Investment" },
] as const;

export default function Buy() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? "all";

  const filtered = useMemo(
    () => (type === "all" ? listings : listings.filter((l) => l.type === type)),
    [type]
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Buy"
        title="Available properties across the Southeast"
        subtitle="Off-market and lightly marketed inventory. Every property is underwritten before it reaches this page."
      />

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap gap-3">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setParams(f.key === "all" ? {} : { type: f.key })}
                className={`rounded-full border px-5 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  type === f.key
                    ? "border-[#3b6fa0] bg-[#3b6fa0] text-white"
                    : "border-white/15 text-white/60 hover:border-white/40 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-white/50">No properties in this category right now. Check back soon.</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
