import { Bell, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile, useUserRole } from "@/hooks/useProfile";

export function Header() {
  const isMobile = useIsMobile();
  const { data: profile } = useProfile();
  const { data: role } = useUserRole();

  const displayName = profile?.full_name || 'User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleBadgeLabel = role === 'admin' ? 'Admin' : role === 'buyer' ? 'Buyer' : 'Agent';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-6">
      {/* Search - hidden on mobile, offset for hamburger */}
      <div className={`relative ${isMobile ? 'ml-10 flex-1' : 'w-96'}`}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={isMobile ? "Search..." : "Search leads, properties, buyers..."}
          className="pl-10 bg-secondary/50 border-border focus:border-primary/50 focus:ring-primary/20"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
            3
          </span>
        </Button>

        {!isMobile && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{displayName}</p>
              <Badge variant="glow" className="text-[10px]">{roleBadgeLabel}</Badge>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
