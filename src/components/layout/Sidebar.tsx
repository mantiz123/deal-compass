import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  FileSignature,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Building2,
  MessageSquare,
  LogOut,
  Mail,
  UserCheck,
  Upload,
  DollarSign,
  Link2,
  BookOpen,
  GraduationCap,
  Briefcase,
  Menu,
  X,
  Wallet,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useKCFYRequests } from "@/hooks/useKCFYRequests";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import kloseLogo from "@/assets/klose-logo.png";

type NavItem = {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Tiers que pueden ver este item. Si no se define, todos lo ven. */
  tiers?: Array<'free' | 'pro' | 'elite' | 'internal'>;
};

type NavSection = {
  label: string;
  items: NavItem[];
  /** Si se define, solo se muestra a tiers que matchean. */
  tiers?: Array<'free' | 'pro' | 'elite' | 'internal'>;
  /** Si true, solo super admin de Klose lo ve. */
  superAdminOnly?: boolean;
};

// === SECCIÓN 1: APRENDIZAJE — todos los tiers ===
const learningSection: NavSection = {
  label: "Aprendizaje",
  items: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Guía", href: "/guide", icon: BookOpen },
    { name: "Academy", href: "/academy", icon: GraduationCap },
  ],
};

// === SECCIÓN 2: MI NEGOCIO — todos los tiers (estudiante Modelo A incluido) ===
const businessSection: NavSection = {
  label: "Mi Negocio",
  items: [
    { name: "Importar", href: "/import", icon: Upload },
    { name: "Leads", href: "/leads", icon: Target },
    { name: "Pipeline", href: "/pipeline", icon: Zap },
    { name: "Properties", href: "/properties", icon: Building2 },
    { name: "Mis Ganancias", href: "/earnings", icon: Wallet },
  ],
};

// === SECCIÓN 3: OPERACIÓN — solo Pro/Elite/Internal (estudiante NO lo ve) ===
const operationsSection: NavSection = {
  label: "Operación",
  tiers: ['pro', 'elite', 'internal'],
  items: [
    { name: "Herramientas", href: "/tools", icon: Wrench },
    { name: "Buyers", href: "/buyers", icon: Users },
    { name: "Realtors", href: "/realtors", icon: UserCheck },
    { name: "Tracking", href: "/tracking", icon: Mail },
    { name: "Campaigns", href: "/campaigns", icon: MessageSquare },
    { name: "Deals", href: "/deals", icon: FileText },
    { name: "Payments", href: "/payments", icon: DollarSign },
    { name: "Cobros", href: "/cobros", icon: Link2 },
  ],
};

// === SECCIÓN 4: KLOSE INTERNAL — exclusivo equipo interno Klose ===
// Contratos y Entrenamiento AI son herramientas operativas de Klose, no del estudiante.
const kloseInternalSection: NavSection = {
  label: "Klose Internal",
  tiers: ['internal'],
  items: [
    { name: "Contratos", href: "/contracts", icon: FileSignature },
    { name: "Entrenamiento AI", href: "/training", icon: GraduationCap },
  ],
};

const settingsItem: NavItem = { name: "Settings", href: "/settings", icon: Settings };

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin, currentOrg } = useOrganization();
  const { data: kcfyRequests } = useKCFYRequests(isSuperAdmin ? { status: ['pending'] } : undefined);
  const pendingKcfy = isSuperAdmin ? (kcfyRequests?.length ?? 0) : 0;
  const isMobile = useIsMobile();

  // Build sections dynamically based on org tier (Modelo A: free students see less)
  const tier = (currentOrg?.tier ?? 'free') as 'free' | 'pro' | 'elite' | 'internal';
  const allSections: NavSection[] = [
    learningSection,
    businessSection,
    operationsSection,
    kloseInternalSection,
  ];
  const visibleSections = allSections.filter(
    section => !section.tiers || section.tiers.includes(tier)
  );

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive =
      location.pathname === item.href ||
      (item.href === '/dashboard' && location.pathname === '/dashboard');
    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={handleNavClick}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_hsl(187_85%_53%_/_0.1)]"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />
        {(!collapsed || isMobile) && <span>{item.name}</span>}
      </Link>
    );
  };

  const renderSectionLabel = (label: string) => (
    <div
      className={cn(
        "mt-4 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70",
        collapsed && !isMobile && "text-center"
      )}
    >
      {(!collapsed || isMobile) ? label : '•'}
    </div>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {(!collapsed || isMobile) && (
          <Link to="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
            <img src={kloseLogo} alt="KLOSE" className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-foreground">KLOSE</span>
          </Link>
        )}
        {collapsed && !isMobile && (
          <Link to="/dashboard" className="mx-auto">
            <img src={kloseLogo} alt="KLOSE" className="h-8 w-8 object-contain" />
          </Link>
        )}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {visibleSections.map((section, idx) => (
          <div key={section.label}>
            {/* Primera sección sin label superior pegado al borde */}
            {idx > 0 && renderSectionLabel(section.label)}
            {idx === 0 && renderSectionLabel(section.label)}
            {section.items.map(renderNavItem)}
          </div>
        ))}

        {/* Settings — siempre visible al final del bloque general */}
        <div className="pt-2">
          {renderNavItem(settingsItem)}
        </div>

        {/* Super admin only: KCFY panel */}
        {isSuperAdmin && (
          <>
            {renderSectionLabel('Klose Admin')}
            <Link
              to="/admin/kcfy"
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                location.pathname === '/admin/kcfy'
                  ? "bg-primary/10 text-primary shadow-[inset_0_0_20px_hsl(187_85%_53%_/_0.1)]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Briefcase className={cn("h-5 w-5 flex-shrink-0", location.pathname === '/admin/kcfy' && "text-primary")} />
              {(!collapsed || isMobile) && (
                <>
                  <span className="flex-1">KCFY Requests</span>
                  {pendingKcfy > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                      {pendingKcfy}
                    </Badge>
                  )}
                </>
              )}
              {collapsed && !isMobile && pendingKcfy > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {(!collapsed || isMobile) && <span className="ml-2">Cerrar sesión</span>}
        </Button>

        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Colapsar</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  // Mobile: overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Hamburger button */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-3 left-3 z-50 md:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-screen w-72 border-r border-border bg-sidebar transition-transform duration-300 md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-300 hidden md:block",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {sidebarContent}
    </aside>
  );
}

export function useSidebarWidth() {
  // This is used by Layout to set proper padding
  const isMobile = useIsMobile();
  if (isMobile) return 0;
  return 256; // default w-64
}
