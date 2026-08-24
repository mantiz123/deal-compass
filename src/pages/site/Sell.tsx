import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  { t: "Submit the property", d: "Address, condition and what you need. Two minutes." },
  { t: "We underwrite it", d: "Comps, rehab scope and exit — usually within 24 hours." },
  { t: "You get a written offer", d: "Cash, as-is, no repairs and no commissions." },
  { t: "Close on your timeline", d: "As fast as 10 days, or later if you need time to move." },
];

const inputCls =
  "w-full rounded-xl border border-white/10 bg-[#0b1530] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#3b6fa0]";

export default function Sell() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = String(fd.get("asking_price") ?? "").replace(/[^0-9.]/g, "");
    setLoading(true);
    const { error } = await supabase.from("site_submissions").insert({
      kind: "property",
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      address: String(fd.get("address") ?? ""),
      city: String(fd.get("city") ?? ""),
      state: String(fd.get("state") ?? ""),
      property_type: String(fd.get("property_type") ?? ""),
      asking_price: price ? Number(price) : null,
      timeline: String(fd.get("timeline") ?? ""),
      message: String(fd.get("message") ?? ""),
    });
    setLoading(false);
    if (error) {
      toast.error("We couldn't send your submission. Please try again or email sergio@goklose.com.");
      return;
    }
    setSent(true);
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Sell"
        title="Submit your property"
        subtitle="Houses, lots and acreage. We buy as-is with our own capital — no listings, no showings, no commissions."
      />

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#3b6fa0]">How it works</div>
            <ol className="mt-8 space-y-8">
              {steps.map((s, i) => (
                <li key={s.t} className="flex gap-5">
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#3b6fa0]/50 text-xs text-[#7fb0dd]">
                    {i + 1}
                  </span>
                  <div>
                    <div className="font-medium">{s.t}</div>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#12203f] p-8">
            {sent ? (
              <div className="flex flex-col items-start gap-4 py-10">
                <CheckCircle2 className="h-10 w-10 text-[#7fb0dd]" />
                <h2 className="text-2xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Got it — thank you.
                </h2>
                <p className="text-white/60">
                  We're reviewing the property now. Expect a response from our team within one business day at the
                  email you provided.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <h2 className="text-xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Property details
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input required name="name" placeholder="Full name" className={inputCls} />
                  <input required type="email" name="email" placeholder="Email" className={inputCls} />
                  <input name="phone" placeholder="Phone" className={inputCls} />
                  <select name="property_type" defaultValue="" className={inputCls}>
                    <option value="">Property type</option>
                    <option value="residential">Single family</option>
                    <option value="multifamily">Multifamily</option>
                    <option value="land">Land / lot</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <input required name="address" placeholder="Property address" className={inputCls} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="city" placeholder="City" className={inputCls} />
                  <input name="state" placeholder="State" className={inputCls} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="asking_price" placeholder="Asking price (optional)" className={inputCls} />
                  <select name="timeline" defaultValue="" className={inputCls}>
                    <option value="">Timeline</option>
                    <option value="asap">As soon as possible</option>
                    <option value="30-60">30–60 days</option>
                    <option value="60+">60+ days</option>
                    <option value="exploring">Just exploring</option>
                  </select>
                </div>
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Condition, repairs needed, occupancy, anything we should know"
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#3b6fa0] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#4a85c0] disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Submit property"}
                </button>
                <p className="text-center text-[11px] leading-relaxed text-white/35">
                  By submitting you agree to be contacted about this property. KLOSE is a real estate investment
                  company, not a licensed broker.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
