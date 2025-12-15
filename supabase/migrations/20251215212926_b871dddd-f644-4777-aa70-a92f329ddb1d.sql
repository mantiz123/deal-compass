-- Create enum types
CREATE TYPE public.lead_status AS ENUM ('captacion', 'contacto', 'bajo_contrato', 'cesion', 'cerrado');
CREATE TYPE public.property_type AS ENUM ('single_family', 'multi_family', 'condo', 'townhouse', 'land', 'commercial');
CREATE TYPE public.buyer_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze');
CREATE TYPE public.app_role AS ENUM ('admin', 'agent', 'buyer');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'AL',
  zip_code TEXT NOT NULL,
  property_type property_type NOT NULL DEFAULT 'single_family',
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  sqft INTEGER,
  lot_size NUMERIC(10,2),
  year_built INTEGER,
  arv NUMERIC(12,2),
  repair_cost NUMERIC(12,2),
  mao NUMERIC(12,2),
  tax_debt NUMERIC(12,2),
  equity_percent NUMERIC(5,2),
  owner_name TEXT,
  owner_phone TEXT,
  owner_email TEXT,
  is_absentee_owner BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  assigned_agent_id UUID REFERENCES public.profiles(user_id),
  status lead_status NOT NULL DEFAULT 'captacion',
  piw_score INTEGER CHECK (piw_score >= 0 AND piw_score <= 100),
  piw_score_factors JSONB,
  source TEXT,
  last_contact_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_at TIMESTAMP WITH TIME ZONE,
  offer_amount NUMERIC(12,2),
  assignment_fee NUMERIC(12,2),
  closing_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create buyers table
CREATE TABLE public.buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tier buyer_tier NOT NULL DEFAULT 'bronze',
  ai_match_score INTEGER CHECK (ai_match_score >= 0 AND ai_match_score <= 100),
  preferred_zip_codes TEXT[],
  preferred_property_types property_type[],
  min_arv NUMERIC(12,2),
  max_arv NUMERIC(12,2),
  max_repair_level TEXT,
  deals_closed INTEGER DEFAULT 0,
  total_volume NUMERIC(14,2) DEFAULT 0,
  avg_close_time_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interactions table for 360 history
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL, -- 'sms', 'email', 'call', 'note'
  direction TEXT, -- 'inbound', 'outbound'
  content TEXT,
  sentiment TEXT, -- 'positive', 'neutral', 'negative', 'aggressive'
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_packages table for buyer notifications
CREATE TABLE public.deal_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES public.buyers(id) ON DELETE CASCADE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  response TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_packages ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'agent');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles (read-only for users)
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for properties (agents and admins can CRUD)
CREATE POLICY "Authenticated users can view properties" ON public.properties
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Agents can insert properties" ON public.properties
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Agents can update properties" ON public.properties
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete properties" ON public.properties
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leads
CREATE POLICY "Authenticated users can view leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Agents can insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Agents can update their assigned leads" ON public.leads
  FOR UPDATE TO authenticated USING (
    assigned_agent_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete leads" ON public.leads
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for buyers
CREATE POLICY "Authenticated users can view active buyers" ON public.buyers
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage buyers" ON public.buyers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Agents can insert buyers" ON public.buyers
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for interactions
CREATE POLICY "Authenticated users can view interactions" ON public.interactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create interactions" ON public.interactions
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for deal_packages
CREATE POLICY "Authenticated users can view deal packages" ON public.deal_packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Agents can create deal packages" ON public.deal_packages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Agents can update deal packages" ON public.deal_packages
  FOR UPDATE TO authenticated USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_buyers_updated_at BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();