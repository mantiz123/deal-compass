import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { markets } from "@/data/siteContent";

export default function Markets() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Markets"
        title="Where we operate"
        subtitle="Five states, one discipline: buy below basis, improve with intent, exit with certainty."
      />

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2">
          {markets.map((m) => (
            <Link
              key={m.slug}
              to={`/markets/${m.slug}`}
              className="group rounded-2xl border border-white/10 bg-[#12203f] p-8 transition-colors hover:border-[#3b6fa0]/60"
            >
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {m.name}
                  </h2>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#3b6fa0]">{m.tagline}</div>
                </div>
                <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-white/40 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-white/55">{m.copy}</p>
              <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
                {m.stats.map((s) => (
                  <div key={s.k}>
                    <div className="text-lg font-semibold text-[#7fb0dd]">{s.v}</div>
                    <div className="text-[10px] uppercase tracking-[0.16em] text-white/40">{s.k}</div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
