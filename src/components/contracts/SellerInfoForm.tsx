import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardList, ArrowRight } from 'lucide-react';

interface SellerInfoFormProps {
  initialData: Record<string, string>;
  onComplete: (data: Record<string, string>) => void;
}

const ACQUISITION_METHODS = [
  'Traditional Purchase (MLS/Realtor)',
  'Inherited / Gifted / Family Transfer',
  'Rent-to-Own Agreement',
  'Divorce Settlement',
  'Foreclosure Auction',
  'Tax Lien Sale',
  'Sheriff Sale',
  'Owner Financing',
  'Private Sale (Off-market)',
];

export default function SellerInfoForm({ initialData, onComplete }: SellerInfoFormProps) {
  const [data, setData] = useState<Record<string, string>>({ ...initialData });

  const set = (key: string, value: string) => setData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    onComplete(data);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Preliminary Seller Information Worksheet
          </CardTitle>
          <p className="text-sm text-muted-foreground">Please fill out the following information before reviewing and signing the contract documents.</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* SELLER INFORMATION */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-3">Seller Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Legal Name *</Label>
                <Input value={data.seller_name || ''} onChange={e => set('seller_name', e.target.value)} placeholder="Full legal name" />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={data.seller_dob || ''} onChange={e => set('seller_dob', e.target.value)} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input value={data.seller_phone || ''} onChange={e => set('seller_phone', e.target.value)} placeholder="(XXX) XXX-XXXX" />
              </div>
              <div>
                <Label>Best Day/Time to Reach</Label>
                <Input value={data.best_time_reach || ''} onChange={e => set('best_time_reach', e.target.value)} placeholder="e.g. Weekdays after 5pm" />
              </div>
              <div>
                <Label>Marital Status</Label>
                <Select value={data.marital_status || ''} onValueChange={v => set('marital_status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {['Single', 'Married', 'Divorced', 'Widowed', 'Other'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Spouse Name (if married)</Label>
                <Input value={data.spouse_name || ''} onChange={e => set('spouse_name', e.target.value)} placeholder="Spouse full name" />
              </div>
            </div>
          </div>

          {/* PROPERTY OWNERSHIP & STATUS */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-3">Property Ownership & Status</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Is this your primary residence?</Label>
                  <RadioGroup value={data.is_primary_residence || ''} onValueChange={v => set('is_primary_residence', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="pr-yes" /><Label htmlFor="pr-yes" className="cursor-pointer text-sm">Yes</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="pr-no" /><Label htmlFor="pr-no" className="cursor-pointer text-sm">No</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Are you the direct title holder?</Label>
                  <RadioGroup value={data.is_title_holder || ''} onValueChange={v => set('is_title_holder', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="th-yes" /><Label htmlFor="th-yes" className="cursor-pointer text-sm">Yes</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="th-no" /><Label htmlFor="th-no" className="cursor-pointer text-sm">No</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Are there any co-title holders?</Label>
                  <RadioGroup value={data.has_co_title_holders || ''} onValueChange={v => set('has_co_title_holders', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="ct-yes" /><Label htmlFor="ct-yes" className="cursor-pointer text-sm">Yes</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="ct-no" /><Label htmlFor="ct-no" className="cursor-pointer text-sm">No</Label></div>
                  </RadioGroup>
                </div>
              </div>

              {data.has_co_title_holders === 'yes' && (
                <div>
                  <Label>Name(s) of all title holders</Label>
                  <Input value={data.title_holders_names || ''} onChange={e => set('title_holders_names', e.target.value)} placeholder="List all title holders" />
                </div>
              )}

              <div>
                <Label className="mb-2 block">How was the property acquired?</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {ACQUISITION_METHODS.map(method => (
                    <div key={method} className="flex items-center gap-2">
                      <Checkbox
                        id={`acq-${method}`}
                        checked={data.acquisition_method === method}
                        onCheckedChange={() => set('acquisition_method', method)}
                      />
                      <Label htmlFor={`acq-${method}`} className="text-xs cursor-pointer">{method}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Years property has been owned</Label>
                  <Input type="number" value={data.years_owned || ''} onChange={e => set('years_owned', e.target.value)} placeholder="Years" />
                </div>
                <div>
                  <Label>Any title holders deceased?</Label>
                  <RadioGroup value={data.title_holder_deceased || ''} onValueChange={v => set('title_holder_deceased', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="dec-yes" /><Label htmlFor="dec-yes" className="cursor-pointer text-sm">Yes</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="dec-no" /><Label htmlFor="dec-no" className="cursor-pointer text-sm">No</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Has property gone through probate?</Label>
                  <RadioGroup value={data.has_probate || ''} onValueChange={v => set('has_probate', v)} className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="prob-yes" /><Label htmlFor="prob-yes" className="cursor-pointer text-sm">Yes</Label></div>
                    <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="prob-no" /><Label htmlFor="prob-no" className="cursor-pointer text-sm">No</Label></div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>

          {/* PROPERTY DETAILS */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-3">Property Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Property Type</Label>
                <Select value={data.property_type_seller || ''} onValueChange={v => set('property_type_seller', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {['Single Family', 'Manufactured', 'Multifamily', 'Commercial/Mixed'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Occupancy Status</Label>
                <Select value={data.occupancy_status || ''} onValueChange={v => set('occupancy_status', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {['Vacant', 'Owner Occupied', 'Tenant Occupied'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* CLOSING & FINANCIAL */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-3">Closing & Financial</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>How soon would you like to close?</Label>
                <Select value={data.desired_closing || ''} onValueChange={v => set('desired_closing', v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {['Less than 30 Days', 'Less than 60 Days', 'Less than 90 Days'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Is there a mortgage on the property?</Label>
                <RadioGroup value={data.has_mortgage || ''} onValueChange={v => set('has_mortgage', v)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="mtg-yes" /><Label htmlFor="mtg-yes" className="cursor-pointer text-sm">Yes</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="mtg-no" /><Label htmlFor="mtg-no" className="cursor-pointer text-sm">No</Label></div>
                </RadioGroup>
              </div>
              {data.has_mortgage === 'yes' && (
                <div>
                  <Label>Estimated mortgage balance ($)</Label>
                  <Input type="number" value={data.mortgage_balance_seller || ''} onChange={e => set('mortgage_balance_seller', e.target.value)} placeholder="$" />
                </div>
              )}
              <div>
                <Label>Pre-foreclosure or pending foreclosure?</Label>
                <RadioGroup value={data.is_preforeclosure || ''} onValueChange={v => set('is_preforeclosure', v)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="pf-yes" /><Label htmlFor="pf-yes" className="cursor-pointer text-sm">Yes</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="pf-no" /><Label htmlFor="pf-no" className="cursor-pointer text-sm">No</Label></div>
                </RadioGroup>
              </div>
              <div>
                <Label>Is there an HOA?</Label>
                <RadioGroup value={data.has_hoa || ''} onValueChange={v => set('has_hoa', v)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="hoa-yes" /><Label htmlFor="hoa-yes" className="cursor-pointer text-sm">Yes</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="hoa-no" /><Label htmlFor="hoa-no" className="cursor-pointer text-sm">No</Label></div>
                </RadioGroup>
              </div>
            </div>
          </div>

          {/* RENTAL INFO */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-3">Rental Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Is the property generating rental income?</Label>
                <RadioGroup value={data.has_rental_income || ''} onValueChange={v => set('has_rental_income', v)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="ri-yes" /><Label htmlFor="ri-yes" className="cursor-pointer text-sm">Yes</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="ri-no" /><Label htmlFor="ri-no" className="cursor-pointer text-sm">No</Label></div>
                </RadioGroup>
              </div>
              {data.has_rental_income === 'yes' && (
                <>
                  <div>
                    <Label>Monthly rental amount ($)</Label>
                    <Input type="number" value={data.monthly_rent || ''} onChange={e => set('monthly_rent', e.target.value)} placeholder="$" />
                  </div>
                  <div>
                    <Label>Written lease agreement in place?</Label>
                    <RadioGroup value={data.has_lease || ''} onValueChange={v => set('has_lease', v)} className="flex gap-4 mt-2">
                      <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="lease-yes" /><Label htmlFor="lease-yes" className="cursor-pointer text-sm">Yes</Label></div>
                      <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="lease-no" /><Label htmlFor="lease-no" className="cursor-pointer text-sm">No</Label></div>
                    </RadioGroup>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ADDITIONAL */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary mb-3">Additional Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Power of Attorney (POA) involved?</Label>
                <RadioGroup value={data.has_poa || ''} onValueChange={v => set('has_poa', v)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="poa-yes" /><Label htmlFor="poa-yes" className="cursor-pointer text-sm">Yes</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="poa-no" /><Label htmlFor="poa-no" className="cursor-pointer text-sm">No</Label></div>
                </RadioGroup>
              </div>
              <div>
                <Label>Ever filed for bankruptcy?</Label>
                <RadioGroup value={data.has_bankruptcy || ''} onValueChange={v => set('has_bankruptcy', v)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="yes" id="bk-yes" /><Label htmlFor="bk-yes" className="cursor-pointer text-sm">Yes</Label></div>
                  <div className="flex items-center gap-1.5"><RadioGroupItem value="no" id="bk-no" /><Label htmlFor="bk-no" className="cursor-pointer text-sm">No</Label></div>
                </RadioGroup>
              </div>
              <div className="md:col-span-2">
                <Label>People you wish to consult before deciding to sell</Label>
                <Input value={data.consult_people || ''} onChange={e => set('consult_people', e.target.value)} placeholder="Names of people to consult (if any)" />
              </div>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!data.seller_name?.trim()}>
            Continue to Contract Review <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
