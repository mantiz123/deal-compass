import { useState, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useContractorAgreement } from "@/hooks/useContractorAgreement";
import {
  buildICASections,
  TAX_CLASSIFICATION_LABELS,
  TIN_TYPE_LABELS,
  validateTinFormat,
  formatTinDisplay,
  type TinType,
} from "@/lib/icaTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ArrowRight, FileText, Shield, CheckCircle2, Info } from "lucide-react";
import TypedSignature from "@/components/contracts/TypedSignature";
import kloseLogo from "@/assets/klose-logo.png";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type TaxClassification = Database["public"]["Enums"]["tax_classification"];

type Step = "info" | "review" | "sign" | "done";

interface FormState {
  legalName: string;
  businessName: string;
  taxClassification: TaxClassification;
  tinType: TinType;
  taxIdFull: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone: string;
}

const initialForm = (defaultEmail = ""): FormState => ({
  legalName: "",
  businessName: "",
  taxClassification: "individual",
  tinType: "ssn",
  taxIdFull: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  email: defaultEmail,
  phone: "",
});

export default function ContractorAgreement() {
  const { user, loading: authLoading } = useAuth();
  const { agreement, hasSigned, isLoading, sign, isSigning } = useContractorAgreement();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("info");
  const [form, setForm] = useState<FormState>(() => initialForm(user?.email ?? ""));
  const [signature, setSignature] = useState<string | undefined>();

  const sections = useMemo(
    () =>
      buildICASections({
        legalName: form.legalName || "[Nombre Legal]",
        businessName: form.businessName || undefined,
        taxClassification: form.taxClassification,
        tinType: form.tinType,
        taxIdLast4: form.taxIdFull.replace(/\D/g, "").slice(-4) || "XXXX",
        addressLine1: form.addressLine1 || "[Dirección]",
        addressLine2: form.addressLine2 || undefined,
        city: form.city || "[Ciudad]",
        state: form.state || "XX",
        zipCode: form.zipCode || "[ZIP]",
        email: form.email,
        phone: form.phone || undefined,
        commissionSplitStudent: 60,
        signedDate: new Date().toISOString(),
      }),
    [form]
  );

  const tinDigits = form.taxIdFull.replace(/\D/g, "");
  const tinValid = tinDigits.length === 9 && validateTinFormat(tinDigits, form.tinType);
  const tinTouched = tinDigits.length >= 9;

  // Early returns AFTER hooks
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }
  if (!isLoading && hasSigned && agreement) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <CardTitle>Acuerdo ya firmado</CardTitle>
            <CardDescription>
              Firmaste tu Independent Contractor Agreement el{" "}
              {new Date(agreement.signed_at).toLocaleDateString("es-US")}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              Versión {agreement.agreement_version} · TIN: XXX-XX-{agreement.tax_id_last4}
            </p>
            <Button className="w-full" onClick={() => navigate("/dashboard")}>
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const infoComplete =
    form.legalName.trim().length >= 3 &&
    form.taxIdFull.replace(/\D/g, "").length >= 4 &&
    form.addressLine1.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.state.trim().length === 2 &&
    form.zipCode.trim().length >= 5 &&
    form.email.includes("@");

  const handleSubmit = async () => {
    if (!signature) {
      toast.error("Debes firmar antes de enviar.");
      return;
    }
    try {
      await sign({
        legalName: form.legalName.trim(),
        businessName: form.businessName.trim() || undefined,
        taxClassification: form.taxClassification,
        taxIdFull: form.taxIdFull.replace(/\D/g, ""),
        addressLine1: form.addressLine1.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        zipCode: form.zipCode.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        signatureImage: signature,
      });
      toast.success("¡Acuerdo firmado exitosamente!");
      setStep("done");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al firmar");
    }
  };

  const stepIndex = step === "info" ? 0 : step === "review" ? 1 : step === "sign" ? 2 : 3;
  const progress = ((stepIndex + 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={kloseLogo} alt="KLOSE" className="w-8 h-8" />
          <div className="flex-1">
            <h1 className="text-sm font-semibold">Independent Contractor Agreement</h1>
            <p className="text-xs text-muted-foreground">KLOSE LLC · 1099 Deal Finder</p>
          </div>
          <Badge variant="outline" className="text-xs">Paso {stepIndex + 1} de 4</Badge>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {step === "info" && (
          <>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Antes de buscar leads o recibir comisiones, necesitamos tu información fiscal (W-9) para emitir el 1099-NEC al cierre del año fiscal. Tu data está cifrada y solo accesible por KLOSE.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-primary" />
                  Información del Contratista (W-9)
                </CardTitle>
                <CardDescription>Todos los campos marcados son obligatorios.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="legalName">Nombre Legal Completo *</Label>
                  <Input
                    id="legalName"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                    placeholder="Como aparece en tu SSN/EIN"
                    maxLength={150}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="businessName">Nombre Comercial / DBA (opcional)</Label>
                  <Input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                    placeholder="Si operas bajo una LLC u otro nombre"
                    maxLength={150}
                  />
                </div>

                <div>
                  <Label htmlFor="taxClassification">Clasificación Fiscal *</Label>
                  <Select
                    value={form.taxClassification}
                    onValueChange={(v) => setForm({ ...form, taxClassification: v as TaxClassification })}
                  >
                    <SelectTrigger id="taxClassification">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TAX_CLASSIFICATION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="taxIdFull">TIN / SSN / EIN *</Label>
                  <Input
                    id="taxIdFull"
                    value={form.taxIdFull}
                    onChange={(e) => setForm({ ...form, taxIdFull: e.target.value })}
                    placeholder="123-45-6789 o 12-3456789"
                    maxLength={11}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Solo se mostrarán los últimos 4 dígitos.</p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="addressLine1">Dirección *</Label>
                  <Input
                    id="addressLine1"
                    value={form.addressLine1}
                    onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                    placeholder="123 Main St"
                    maxLength={200}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="addressLine2">Dirección 2 (opcional)</Label>
                  <Input
                    id="addressLine2"
                    value={form.addressLine2}
                    onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                    placeholder="Apt, Suite, etc."
                    maxLength={100}
                  />
                </div>

                <div>
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    maxLength={80}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                      placeholder="AL"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP *</Label>
                    <Input
                      id="zipCode"
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      placeholder="35201"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    maxLength={150}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    maxLength={30}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 sticky bottom-4">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!infoComplete}
                onClick={() => setStep("review")}
              >
                Revisar Acuerdo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4 text-primary" />
                  Independent Contractor Agreement — KLOSE LLC
                </CardTitle>
                <CardDescription>
                  Lee con atención. Al firmar, aceptas todos los términos legalmente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {sections.map((s) => (
                  <section key={s.title} className="space-y-2">
                    <h3 className="font-semibold text-sm text-foreground">{s.title}</h3>
                    {s.body.map((p, i) => (
                      <p
                        key={i}
                        className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
                        dangerouslySetInnerHTML={{
                          __html: p.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground">$1</strong>'),
                        }}
                      />
                    ))}
                  </section>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-3 sticky bottom-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep("info")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
              </Button>
              <Button className="flex-1" onClick={() => setStep("sign")}>
                Continuar a Firma <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {step === "sign" && (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Tu firma electrónica es legalmente vinculante bajo el ESIGN Act y UETA. Registramos tu IP, navegador y timestamp.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Firma Electrónica</CardTitle>
                <CardDescription>
                  Firmando como <strong className="text-foreground">{form.legalName}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TypedSignature
                  signerName={form.legalName}
                  label="Firma del Contratista"
                  existingSignature={signature}
                  onSign={setSignature}
                  onClear={() => setSignature(undefined)}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3 sticky bottom-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep("review")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
              </Button>
              <Button
                className="flex-1"
                disabled={!signature || isSigning}
                onClick={handleSubmit}
              >
                {isSigning ? "Firmando..." : "Firmar y Aceptar"}
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <CardTitle>¡Bienvenido a la red KLOSE!</CardTitle>
              <CardDescription>
                Tu Independent Contractor Agreement fue firmado y guardado. Ya puedes acceder a la plataforma completa.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full" onClick={() => navigate("/dashboard")}>
                Ir al Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
