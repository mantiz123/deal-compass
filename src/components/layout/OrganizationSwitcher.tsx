import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function OrganizationSwitcher() {
  const { currentOrg, memberships, switchOrganization, isSuperAdmin } = useOrganization();

  if (!currentOrg || memberships.length <= 1) {
    if (!currentOrg) return null;
    // Single org: just show the name (no switcher)
    return (
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary/50">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[160px]">{currentOrg.name}</span>
        {currentOrg.is_klose_internal && (
          <Badge variant="glow" className="text-[10px]">Internal</Badge>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 max-w-[220px]">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate flex-1 text-left">{currentOrg.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-popover">
        <DropdownMenuLabel>
          {isSuperAdmin ? "Switch organization (Super Admin)" : "Your organizations"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map(({ organization, role }) => (
          <DropdownMenuItem
            key={organization.id}
            onClick={() => switchOrganization(organization.id)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{organization.name}</span>
                {organization.is_klose_internal && (
                  <Badge variant="glow" className="text-[9px] h-4">Internal</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {role} · {organization.tier}
              </div>
            </div>
            {organization.id === currentOrg.id && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
