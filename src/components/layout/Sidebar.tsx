import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
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
  BookOpen,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Guía", href: "/guide", icon: BookOpen },
  { name: "Importar", href: "/import", icon: Upload },
  { name: "Leads", href: "/leads", icon: Target },
  { name: "Pipeline", href: "/pipeline", icon: Zap },
  { name: "Buyers", href: "/buyers", icon: Users },
  { name: "Realtors", href: "/realtors", icon: UserCheck },
  { name: "Payments", href: "/payments", icon: DollarSign },
  { name: "Tracking", href: "/tracking", icon: Mail },
  { name: "Campaigns", href: "/campaigns", icon: MessageSquare },
  { name: "Deals", href: "/deals", icon: FileText },
  { name: "Properties", href: "/properties", icon: Building2 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {(!collapsed || isMobile) && (
          <Link to="/" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-gradient">KLOSE</span>
          </Link>
        )}
        {collapsed && !isMobile && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
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
        })}
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
