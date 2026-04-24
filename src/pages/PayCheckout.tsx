import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { initializePaddle, getPaddleEnvironment } from "@/lib/paddle";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import kloseLogo from "@/assets/klose-logo.png";

type LinkData = {
  id: string;
  title: string;
  description: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  customer_email: string | null;
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export default function PayCheckout() {
  const { token } = useParams<{ token: string }>();
  const [link, setLink] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error } = await supabase
        .from("payment_links")
        .select("id, title, description, amount_cents, currency, status, customer_email")
        .eq("token", token)
        .maybeSingle();
      if (error || !data) {
        setError("Este link de pago no existe o fue removido.");
      } else {
        setLink(data as LinkData);
        if (data.status === "paid") setDone(true);
      }
      setLoading(false);
    })();
  }, [token]);

  const handlePay = async () => {
    if (!link || !token) return;
    setPaying(true);
    setError(null);
    try {
      await initializePaddle();
      const env = getPaddleEnvironment();

      const { data, error } = await supabase.functions.invoke("create-payment-transaction", {
        body: { token, environment: env },
      });
      if (error) throw error;
      if (!data?.transactionId) throw new Error("No se pudo crear la transacción");

      (window as any).Paddle.Checkout.open({
        transactionId: data.transactionId,
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/pay/${token}?success=1`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudo iniciar el pago");
    } finally {
      setPaying(false);
    }
  };

  // Re-check status if returning from successful checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      setDone(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PaymentTestModeBanner />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card variant="glass" className="w-full max-w-md p-8 space-y-6">
          <div className="flex items-center gap-2">
            <img src={kloseLogo} alt="KLOSE" className="h-8 w-8" />
            <span className="text-lg font-bold">KLOSE</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && error && !link && (
            <div className="text-center py-6 space-y-2">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          )}

          {!loading && link && done && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-12 w-12 text-success mx-auto" />
              <h2 className="text-xl font-bold">¡Pago recibido!</h2>
              <p className="text-muted-foreground text-sm">
                Gracias. Recibirás un recibo por email de Paddle, nuestro procesador de pagos.
              </p>
            </div>
          )}

          {!loading && link && !done && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Pago seguro a Klose LLC</p>
                <h1 className="text-2xl font-bold mt-1">{link.title}</h1>
                {link.description && (
                  <p className="text-muted-foreground mt-2 text-sm">{link.description}</p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-3xl font-bold">
                    {formatMoney(link.amount_cents, link.currency)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                className="w-full h-12 text-base"
                onClick={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abriendo checkout...
                  </>
                ) : (
                  "Pagar ahora"
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Procesado por <strong>Paddle.com</strong> (Merchant of Record). Aceptamos tarjetas
                Visa, Mastercard, American Express, Apple Pay, Google Pay y PayPal.
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Al pagar, aceptas los{" "}
                <a href="/legal/terms" target="_blank" className="underline">Términos</a>,{" "}
                <a href="/legal/refund" target="_blank" className="underline">Política de Reembolso</a>{" "}
                y la{" "}
                <a href="/legal/privacy" target="_blank" className="underline">Política de Privacidad</a>.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
