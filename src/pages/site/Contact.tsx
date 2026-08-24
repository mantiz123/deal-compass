import { useState } from "react";
import { CheckCircle2, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-[#0b1530] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#3b6fa0]";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.from("site_submissions").insert({
      kind: "contact",
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      message: String(fd.get("message") ?? ""),
    });
    setLoading(false);
    if (error) {
      toast.error("We couldn't send your message. Please email sergio@goklose.com.");
      return;
    }
    setSent(true);
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Let's talk"
        subtitle="Sellers, realtors, investors and land owners — we answer every message."
      />

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <Mail className="mt-1 h-5 w-5 text-[#3b6fa0]" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Email</div>
                <a href="mailto:sergio@goklose.com" className="mt-1 block text-lg hover:text-[#7fb0dd]">
                  sergio@goklose.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="mt-1 h-5 w-5 text-[#3b6fa0]" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Based in</div>
                <div className="mt-1 text-lg">Birmingham, Alabama</div>
              </div>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/50">
              If your message is about a specific property you want to sell, the{" "}
              <a href="/sell" className="text-[#7fb0dd] hover:text-white">
                property submission form
              </a>{" "}
              gets you a faster answer.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#12203f] p-8">
            {sent ? (
              <div className="flex flex-col items-start gap-4 py-10">
                <CheckCircle2 className="h-10 w-10 text-[#7fb0dd]" />
                <h2 className="text-2xl font-medium" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Message received
                </h2>
                <p className="text-white/60">We'll get back to you within one business day.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <input required name="name" placeholder="Full name" className={inputCls} />
                  <input required type="email" name="email" placeholder="Email" className={inputCls} />
                </div>
                <input name="phone" placeholder="Phone (optional)" className={inputCls} />
                <textarea required name="message" rows={6} placeholder="How can we help?" className={inputCls} />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#3b6fa0] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#4a85c0] disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
