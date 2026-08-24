import { useSearchParams, Link } from "react-router-dom";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ListingCard } from "@/components/site/ListingCard";
import { listings, landCategories } from "@/data/siteContent";
import landImg from "@/assets/site-land.jpg";

export default function Land() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category");
  const landListings = listings.filter((l) => l.type === "land");
  const filtered = category ? landListings.filter((l) => l.landType === category) : landListings;
  const active = landCategories.find((c) => c.slug === category);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Land"
        title={active ? active.name : "Land opportunities"}
        subtitle={
          active
            ? active.copy
            : "Lots, acreage and development parcels acquired below replacement basis in growth corridors."
        }
      />

      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid gap-4 md:grid-cols-4">
            {landCategories.map((c) => {
              const isActive = category === c.slug;
              return (
                <button
                  key={c.slug}
                  onClick={() => setParams(isActive ? {} : { category: c.slug })}
                  className={`rounded-2xl border p-5 text-left transition-colors ${
                    isActive
                      ? "border-[#3b6fa0] bg-[#12203f]"
                      : "border-white/10 bg-[#12203f]/60 hover:border-white/30"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#3b6fa0]">
                    {isActive ? "Selected" : "Category"}
                  </div>
                  <div className="mt-2 text-base font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {c.name}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{c.copy}</p>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#12203f] p-10">
              <p className="text-white/60">
                Nothing listed in this category today.{" "}
                <Link to="/contact" className="text-[#7fb0dd] hover:text-white">
                  Tell us what you're looking for
                </Link>{" "}
                and we'll source it.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-3xl border border-white/10 bg-[#12203f] md:grid-cols-2">
          <img src={landImg} alt="Rural acreage in Alabama" loading="lazy" className="h-full w-full object-cover" />
          <div className="p-10">
            <h2 className="text-3xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
              Selling land?
            </h2>
            <p className="mt-4 text-white/60">
              We buy acreage and lots directly, close with our own capital, and handle survey and title coordination.
            </p>
            <Link
              to="/sell"
              className="mt-8 inline-block rounded-full bg-[#3b6fa0] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] hover:bg-[#4a85c0]"
            >
              Submit your land
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
