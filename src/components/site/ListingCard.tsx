import { Listing } from "@/data/siteContent";
import landImg from "@/assets/site-land.jpg";
import homeImg from "@/assets/site-home.jpg";

const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

export function ListingCard({ listing }: { listing: Listing }) {
  const img = listing.type === "land" ? landImg : homeImg;
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-[#12203f] transition-colors hover:border-[#3b6fa0]/60">
      <div className="relative h-52 overflow-hidden">
        <img
          src={img}
          alt={`${listing.title} in ${listing.city}, ${listing.state}`}
          loading="lazy"
          width={1440}
          height={960}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-[#0b1530]/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur">
          {listing.status === "available" ? "Available" : listing.status === "under-contract" ? "Under contract" : "Sold"}
        </span>
      </div>
      <div className="space-y-3 p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-lg font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
            {listing.title}
          </h3>
          <span className="whitespace-nowrap text-sm font-semibold text-[#7fb0dd]">{fmt(listing.price)}</span>
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#3b6fa0]">
          {listing.city}, {listing.state}
        </div>
        <p className="text-sm leading-relaxed text-white/55">{listing.blurb}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-white/10 pt-3 text-xs text-white/50">
          {listing.beds != null && <span>{listing.beds} bd</span>}
          {listing.baths != null && <span>{listing.baths} ba</span>}
          {listing.sqft != null && <span>{listing.sqft.toLocaleString()} sqft</span>}
          {listing.acres != null && <span>{listing.acres} acres</span>}
        </div>
      </div>
    </article>
  );
}
