import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateLead } from "@/hooks/useLeads";
import { useRealtors, useCreateRealtor } from "@/hooks/useRealtors";
import { Loader2, Home, DollarSign, AlertTriangle, UserPlus, Users } from "lucide-react";

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LeadMode = "normal" | "realtor-referral";

export function NewLeadDialog({ open, onOpenChange }: NewLeadDialogProps) {
  const createLead = useCreateLead();
  const { data: realtors = [] } = useRealtors();
  const createRealtor = useCreateRealtor();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mode
  const [mode, setMode] = useState<LeadMode>("normal");
  
  // Realtor Referral fields
  const [selectedRealtorId, setSelectedRealtorId] = useState<string>("");
  const [newRealtorName, setNewRealtorName] = useState("");
  const [newRealtorEmail, setNewRealtorEmail] = useState("");
  const [newRealtorPhone, setNewRealtorPhone] = useState("");
  const [listingPrice, setListingPrice] = useState("");
  const [referralCommission, setReferralCommission] = useState("");
  const [showNewRealtorForm, setShowNewRealtorForm] = useState(false);
  
  // Basic Info
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("AL");
  const [zipCode, setZipCode] = useState("");
  const [propertyType, setPropertyType] = useState<string>("single_family");
  
  // Owner Info
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  
  // Property Details
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sqft, setSqft] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  
  // Financial
  const [arv, setArv] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [equityPercent, setEquityPercent] = useState("");
  const [taxDebt, setTaxDebt] = useState("");
  
  // Motivation Indicators
  const [isAbsenteeOwner, setIsAbsenteeOwner] = useState(false);
  const [mailingAddressDifferent, setMailingAddressDifferent] = useState(false);
  const [taxDelinquent, setTaxDelinquent] = useState(false);
  const [isForeclosure, setIsForeclosure] = useState(false);
  const [isProbate, setIsProbate] = useState(false);
  const [ownerTenureYears, setOwnerTenureYears] = useState("");
  const [ownerType, setOwnerType] = useState<string>("individual");
  const [evictionCount, setEvictionCount] = useState("");
  const [mortgageAgeYears, setMortgageAgeYears] = useState("");
  
  // Closing Factors
  const [activeLiensCount, setActiveLiensCount] = useState("");
  const [proximityToDevelopment, setProximityToDevelopment] = useState<string>("medium");
  const [neighborhoodVacancyRate, setNeighborhoodVacancyRate] = useState("");
  const [priceGrowth3yr, setPriceGrowth3yr] = useState("");
  
  // Source
  const [source, setSource] = useState("");

  const resetForm = () => {
    setMode("normal");
    setSelectedRealtorId("");
    setNewRealtorName("");
    setNewRealtorEmail("");
    setNewRealtorPhone("");
    setListingPrice("");
    setReferralCommission("");
    setShowNewRealtorForm(false);
    setAddress("");
    setCity("");
    setState("AL");
    setZipCode("");
    setPropertyType("single_family");
    setOwnerName("");
    setOwnerPhone("");
    setOwnerEmail("");
    setBedrooms("");
    setBathrooms("");
    setSqft("");
    setYearBuilt("");
    setArv("");
    setRepairCost("");
    setEquityPercent("");
    setTaxDebt("");
    setIsAbsenteeOwner(false);
    setMailingAddressDifferent(false);
    setTaxDelinquent(false);
    setIsForeclosure(false);
    setIsProbate(false);
    setOwnerTenureYears("");
    setOwnerType("individual");
    setEvictionCount("");
    setMortgageAgeYears("");
    setActiveLiensCount("");
    setProximityToDevelopment("medium");
    setNeighborhoodVacancyRate("");
    setPriceGrowth3yr("");
    setSource("");
  };

  const handleCreateRealtor = async () => {
    if (!newRealtorName) return null;
    
    const result = await createRealtor.mutateAsync({
      name: newRealtorName,
      email: newRealtorEmail || undefined,
      phone: newRealtorPhone || undefined,
    });
    
    setShowNewRealtorForm(false);
    setNewRealtorName("");
    setNewRealtorEmail("");
    setNewRealtorPhone("");
    setSelectedRealtorId(result.id);
    
    return result.id;
  };

  const handleSubmit = async () => {
    if (!address || !city || !zipCode) return;
    
    setIsSubmitting(true);
    
    try {
      let realtorId = selectedRealtorId;
      
      // If creating new realtor in referral mode
      if (mode === "realtor-referral" && showNewRealtorForm && newRealtorName) {
        const newId = await handleCreateRealtor();
        if (newId) realtorId = newId;
      }
      
      const arvNum = arv ? parseFloat(arv) : undefined;
      const repairNum = repairCost ? parseFloat(repairCost) : undefined;
      const mao = arvNum && repairNum ? (arvNum * 0.7) - repairNum : undefined;

      await createLead.mutateAsync({
        property: {
          address,
          city,
          state,
          zip_code: zipCode,
          property_type: propertyType as any,
          owner_name: ownerName || null,
          owner_phone: ownerPhone || null,
          owner_email: ownerEmail || null,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          bathrooms: bathrooms ? parseFloat(bathrooms) : null,
          sqft: sqft ? parseInt(sqft) : null,
          year_built: yearBuilt ? parseInt(yearBuilt) : null,
          arv: arvNum || null,
          repair_cost: repairNum || null,
          mao: mao || null,
          equity_percent: equityPercent ? parseFloat(equityPercent) : null,
          tax_debt: taxDebt ? parseFloat(taxDebt) : null,
          is_absentee_owner: isAbsenteeOwner,
          mailing_address_different: mailingAddressDifferent,
          tax_delinquent: taxDelinquent,
          is_foreclosure: isForeclosure,
          is_probate: isProbate,
          owner_tenure_years: ownerTenureYears ? parseInt(ownerTenureYears) : null,
          owner_type: ownerType as any,
          eviction_count: evictionCount ? parseInt(evictionCount) : null,
          mortgage_age_years: mortgageAgeYears ? parseInt(mortgageAgeYears) : null,
          active_liens_count: activeLiensCount ? parseInt(activeLiensCount) : null,
          proximity_to_development: proximityToDevelopment as any,
          neighborhood_vacancy_rate: neighborhoodVacancyRate ? parseFloat(neighborhoodVacancyRate) : null,
          price_growth_3yr: priceGrowth3yr ? parseFloat(priceGrowth3yr) : null,
        },
        source: mode === "realtor-referral" ? "Realtor Referral" : (source || undefined),
        referred_by_realtor_id: mode === "realtor-referral" ? realtorId : undefined,
        referral_commission: mode === "realtor-referral" && referralCommission ? parseFloat(referralCommission) : undefined,
        listing_price: mode === "realtor-referral" && listingPrice ? parseFloat(listingPrice) : undefined,
      });
      
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {mode === "realtor-referral" ? (
              <>
                <Users className="h-5 w-5 text-primary" />
                Referral de Realtor
              </>
            ) : (
              <>
                <Home className="h-5 w-5 text-primary" />
                Nuevo Lead - 20 Variables K-Score
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "realtor-referral" 
              ? "Ingreso rápido para propiedades referidas por Realtors" 
              : "Ingresa los datos de la propiedad. Cuantas más variables completes, más preciso será el K-Score."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "normal" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("normal")}
            className="flex-1"
          >
            <Home className="h-4 w-4 mr-2" />
            Lead Completo
          </Button>
          <Button
            variant={mode === "realtor-referral" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("realtor-referral")}
            className="flex-1"
          >
            <Users className="h-4 w-4 mr-2" />
            Referral de Realtor
          </Button>
        </div>

        {/* Realtor Referral Mode - Simplified Form */}
        {mode === "realtor-referral" ? (
          <div className="space-y-4">
            {/* Realtor Selection */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Realtor Referente</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewRealtorForm(!showNewRealtorForm)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {showNewRealtorForm ? "Seleccionar existente" : "Nuevo Realtor"}
                </Button>
              </div>
              
              {showNewRealtorForm ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="newRealtorName" className="text-xs">Nombre *</Label>
                    <Input
                      id="newRealtorName"
                      value={newRealtorName}
                      onChange={(e) => setNewRealtorName(e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newRealtorEmail" className="text-xs">Email</Label>
                    <Input
                      id="newRealtorEmail"
                      type="email"
                      value={newRealtorEmail}
                      onChange={(e) => setNewRealtorEmail(e.target.value)}
                      placeholder="realtor@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newRealtorPhone" className="text-xs">Teléfono</Label>
                    <Input
                      id="newRealtorPhone"
                      value={newRealtorPhone}
                      onChange={(e) => setNewRealtorPhone(e.target.value)}
                      placeholder="(205) 555-1234"
                    />
                  </div>
                </div>
              ) : (
                <Select value={selectedRealtorId} onValueChange={setSelectedRealtorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Realtor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {realtors.map((realtor) => (
                      <SelectItem key={realtor.id} value={realtor.id}>
                        {realtor.name} {realtor.company && `(${realtor.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Property Info - Simplified */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="refAddress">Dirección *</Label>
                <Input
                  id="refAddress"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1234 Oak Street"
                />
              </div>
              <div>
                <Label htmlFor="refCity">Ciudad *</Label>
                <Input
                  id="refCity"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Birmingham"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="refState">Estado</Label>
                  <Input
                    id="refState"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="AL"
                  />
                </div>
                <div>
                  <Label htmlFor="refZip">ZIP *</Label>
                  <Input
                    id="refZip"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="35201"
                  />
                </div>
              </div>
            </div>

            {/* Seller Info */}
            <div>
              <Label htmlFor="refOwnerName">Nombre del Vendedor</Label>
              <Input
                id="refOwnerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nombre del propietario"
              />
            </div>

            {/* Financial - Simplified */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="refListingPrice">Precio de Lista</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="refListingPrice"
                    type="number"
                    className="pl-7"
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    placeholder="150,000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="refCommission">Comisión de Referral</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="refCommission"
                    type="number"
                    className="pl-7"
                    value={referralCommission}
                    onChange={(e) => setReferralCommission(e.target.value)}
                    placeholder="1,500"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Típicamente 1% del precio de venta
                </p>
              </div>
            </div>

            {/* Quick Indicators */}
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-accent" />
                Indicadores Rápidos (Opcional)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">90+ días en MLS</Label>
                  <Switch checked={isAbsenteeOwner} onCheckedChange={setIsAbsenteeOwner} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Necesita reparaciones +$50K</Label>
                  <Switch checked={taxDelinquent} onCheckedChange={setTaxDelinquent} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Urgencia &lt;30 días</Label>
                  <Switch checked={isForeclosure} onCheckedChange={setIsForeclosure} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Probate/Herencia</Label>
                  <Switch checked={isProbate} onCheckedChange={setIsProbate} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Mode - Full Form */
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="motivation">Motivación</TabsTrigger>
              <TabsTrigger value="financial">Financiero</TabsTrigger>
              <TabsTrigger value="closing">Cierre</TabsTrigger>
            </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1234 Oak Street"
                />
              </div>
              <div>
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Birmingham"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="AL"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP *</Label>
                  <Input
                    id="zipCode"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="35201"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="propertyType">Tipo de Propiedad</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_family">Single Family</SelectItem>
                    <SelectItem value="multi_family">Multi Family</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">Fuente del Lead</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Driving for Dollars, Lista, etc."
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Información del Propietario</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ownerName">Nombre</Label>
                  <Input
                    id="ownerName"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="ownerPhone">Teléfono</Label>
                  <Input
                    id="ownerPhone"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="(205) 555-1234"
                  />
                </div>
                <div>
                  <Label htmlFor="ownerEmail">Email</Label>
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@email.com"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Detalles de la Propiedad</h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="bedrooms">Habitaciones</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    placeholder="3"
                  />
                </div>
                <div>
                  <Label htmlFor="bathrooms">Baños</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    step="0.5"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label htmlFor="sqft">Sq Ft</Label>
                  <Input
                    id="sqft"
                    type="number"
                    value={sqft}
                    onChange={(e) => setSqft(e.target.value)}
                    placeholder="1500"
                  />
                </div>
                <div>
                  <Label htmlFor="yearBuilt">Año</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                    placeholder="1985"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Motivation Tab */}
          <TabsContent value="motivation" className="space-y-4 mt-4">
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-accent">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Indicadores de Alta Motivación</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Estos factores tienen el mayor peso en el K-Score (40% del total)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>🔥 Foreclosure</Label>
                    <p className="text-xs text-muted-foreground">En proceso de ejecución hipotecaria</p>
                  </div>
                  <Switch checked={isForeclosure} onCheckedChange={setIsForeclosure} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>💀 Tax Delinquent</Label>
                    <p className="text-xs text-muted-foreground">Impuestos atrasados</p>
                  </div>
                  <Switch checked={taxDelinquent} onCheckedChange={setTaxDelinquent} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>⚰️ Probate/Herencia</Label>
                    <p className="text-xs text-muted-foreground">Propiedad en proceso sucesorio</p>
                  </div>
                  <Switch checked={isProbate} onCheckedChange={setIsProbate} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>🏠 Dueño Ausente</Label>
                    <p className="text-xs text-muted-foreground">No vive en la propiedad</p>
                  </div>
                  <Switch checked={isAbsenteeOwner} onCheckedChange={setIsAbsenteeOwner} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>📬 Dirección de Correo Diferente</Label>
                    <p className="text-xs text-muted-foreground">Confirma absentee</p>
                  </div>
                  <Switch checked={mailingAddressDifferent} onCheckedChange={setMailingAddressDifferent} />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="ownerType">Tipo de Propietario</Label>
                  <Select value={ownerType} onValueChange={setOwnerType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporation">Corporación/LLC</SelectItem>
                      <SelectItem value="trust">Trust</SelectItem>
                      <SelectItem value="estate">Estate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="ownerTenure">Años como Propietario</Label>
                  <Input
                    id="ownerTenure"
                    type="number"
                    value={ownerTenureYears}
                    onChange={(e) => setOwnerTenureYears(e.target.value)}
                    placeholder="15"
                  />
                </div>
                
                <div>
                  <Label htmlFor="mortgageAge">Antigüedad de Hipoteca (años)</Label>
                  <Input
                    id="mortgageAge"
                    type="number"
                    value={mortgageAgeYears}
                    onChange={(e) => setMortgageAgeYears(e.target.value)}
                    placeholder="20"
                  />
                </div>
                
                <div>
                  <Label htmlFor="evictions">Historial de Evictions</Label>
                  <Input
                    id="evictions"
                    type="number"
                    value={evictionCount}
                    onChange={(e) => setEvictionCount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-primary">
                <DollarSign className="h-5 w-5" />
                <span className="font-semibold">Viabilidad Financiera</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Estos datos determinan si el trato es rentable (35% del K-Score)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="arv">ARV (After Repair Value)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="arv"
                    type="number"
                    className="pl-7"
                    value={arv}
                    onChange={(e) => setArv(e.target.value)}
                    placeholder="185,000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="repairCost">Costo Estimado de Reparaciones</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="repairCost"
                    type="number"
                    className="pl-7"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    placeholder="25,000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="equity">Equity Estimado (%)</Label>
                <Input
                  id="equity"
                  type="number"
                  value={equityPercent}
                  onChange={(e) => setEquityPercent(e.target.value)}
                  placeholder="45"
                />
              </div>
              
              <div>
                <Label htmlFor="taxDebt">Deuda de Impuestos</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="taxDebt"
                    type="number"
                    className="pl-7"
                    value={taxDebt}
                    onChange={(e) => setTaxDebt(e.target.value)}
                    placeholder="3,500"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="priceGrowth">Crecimiento de Precio (3 años %)</Label>
                <Input
                  id="priceGrowth"
                  type="number"
                  step="0.1"
                  value={priceGrowth3yr}
                  onChange={(e) => setPriceGrowth3yr(e.target.value)}
                  placeholder="8.5"
                />
              </div>
              
              <div>
                <Label htmlFor="vacancyRate">Tasa de Vacancia del Vecindario (%)</Label>
                <Input
                  id="vacancyRate"
                  type="number"
                  step="0.1"
                  value={neighborhoodVacancyRate}
                  onChange={(e) => setNeighborhoodVacancyRate(e.target.value)}
                  placeholder="5.2"
                />
              </div>
            </div>

            {arv && repairCost && (
              <div className="bg-success/10 border border-success/30 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">MAO Calculado (70% Rule)</p>
                <p className="text-2xl font-bold text-success">
                  ${((parseFloat(arv) * 0.7) - parseFloat(repairCost)).toLocaleString()}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Closing Tab */}
          <TabsContent value="closing" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="liens">Gravámenes Activos</Label>
                <Input
                  id="liens"
                  type="number"
                  value={activeLiensCount}
                  onChange={(e) => setActiveLiensCount(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Más de 2 puede complicar el título
                </p>
              </div>
              
              <div>
                <Label htmlFor="proximity">Proximidad a Desarrollo</Label>
                <Select value={proximityToDevelopment} onValueChange={setProximityToDevelopment}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta (Zona en auge)</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="none">Ninguna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!address || !city || !zipCode || isSubmitting || (mode === "realtor-referral" && !selectedRealtorId && !newRealtorName)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : mode === "realtor-referral" ? (
              "Crear Referral"
            ) : (
              "Crear Lead"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
