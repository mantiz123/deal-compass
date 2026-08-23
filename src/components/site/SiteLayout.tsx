import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function useSiteFonts() {
  useEffect(() => {
    const id = "klose-site-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  useSiteFonts();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div
      className="min-h-screen bg-[#0f1b3d] text-[#e8edf3] selection:bg-[#3b6fa0] selection:text-white"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="border-b border-white/10 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">{eyebrow}</span>
        <h1
          className="mt-4 max-w-3xl text-4xl font-medium leading-[1.1] lg:text-6xl"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-5 max-w-2xl text-lg font-light text-white/60">{subtitle}</p>}
      </div>
    </section>
  );
}
