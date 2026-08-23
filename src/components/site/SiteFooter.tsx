import { Link } from "react-router-dom";
import { markets } from "@/data/siteContent";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0b1530] px-6 py-16">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-4">
        <div>
          <div className="text-lg font-bold uppercase tracking-[0.25em]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Klose
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            KLOSE LLC acquires, improves and sells real estate across the American Southeast.
          </p>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#3b6fa0]">Explore</div>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li><Link className="hover:text-white" to="/buy">Available Properties</Link></li>
            <li><Link className="hover:text-white" to="/land">Land</Link></li>
            <li><Link className="hover:text-white" to="/sell">Submit Property</Link></li>
            <li><Link className="hover:text-white" to="/about">About</Link></li>
            <li><Link className="hover:text-white" to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#3b6fa0]">Markets</div>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            {markets.map((m) => (
              <li key={m.slug}>
                <Link className="hover:text-white" to={`/markets/${m.slug}`}>{m.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-[#3b6fa0]">Contact</div>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li><a className="hover:text-white" href="mailto:sergio@goklose.com">sergio@goklose.com</a></li>
            <li>Birmingham, Alabama</li>
          </ul>
          <div className="mt-6 flex gap-4 text-[10px] uppercase tracking-[0.2em] text-white/40">
            <Link className="hover:text-white" to="/legal/terms">Terms</Link>
            <Link className="hover:text-white" to="/legal/privacy">Privacy</Link>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-[10px] uppercase leading-loose tracking-[0.18em] text-white/30">
        &copy; {new Date().getFullYear()} KLOSE LLC — A Wyoming registered entity. KLOSE is a real estate
        investment company, not a licensed broker or investment advisor. All real estate investments carry risk.
      </div>
    </footer>
  );
}
