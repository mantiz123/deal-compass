import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import { markets, landCategories } from "@/data/siteContent";

type NavChild = { name: string; href: string };
type NavEntry = { name: string; href: string; children?: NavChild[] };

const nav: NavEntry[] = [
  { name: "Home", href: "/" },
  {
    name: "Buy",
    href: "/buy",
    children: [
      { name: "Available Properties", href: "/buy" },
      { name: "Land", href: "/buy?type=land" },
      { name: "Residential", href: "/buy?type=residential" },
      { name: "Investment Opportunities", href: "/buy?type=investment" },
    ],
  },
  { name: "Sell", href: "/sell", children: [{ name: "Submit Property", href: "/sell" }] },
  {
    name: "Land",
    href: "/land",
    children: landCategories.map((c) => ({ name: c.name, href: `/land?category=${c.slug}` })),
  },
  {
    name: "Markets",
    href: "/markets",
    children: markets.map((m) => ({ name: m.name, href: `/markets/${m.slug}` })),
  },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1530]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link to="/" className="text-xl font-bold tracking-[0.2em] uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
          Klose
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <div key={item.name} className="group relative">
              <Link
                to={item.href}
                className={`flex items-center gap-1 text-xs uppercase tracking-[0.18em] transition-colors ${
                  pathname === item.href ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {item.name}
                {item.children && <ChevronDown className="h-3 w-3" />}
              </Link>
              {item.children && (
                <div className="invisible absolute left-1/2 top-full w-60 -translate-x-1/2 pt-4 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                  <div className="rounded-xl border border-white/10 bg-[#12203f] p-2 shadow-2xl">
                    {item.children.map((c) => (
                      <Link
                        key={c.name}
                        to={c.href}
                        className="block rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <Link to="/auth" className="text-xs uppercase tracking-[0.18em] text-white/50 hover:text-white">
            Portal
          </Link>
          <Link
            to="/sell"
            className="rounded-full bg-[#3b6fa0] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#4a85c0]"
          >
            Submit Property
          </Link>
        </div>

        <button className="lg:hidden" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0b1530] px-6 py-6 lg:hidden">
          {nav.map((item) => (
            <div key={item.name} className="border-b border-white/5 py-3 last:border-0">
              <Link
                to={item.href}
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-[0.18em] text-white"
              >
                {item.name}
              </Link>
              {item.children && (
                <div className="mt-2 space-y-1 pl-3">
                  {item.children.map((c) => (
                    <Link
                      key={c.name}
                      to={c.href}
                      onClick={() => setOpen(false)}
                      className="block text-sm text-white/50"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
