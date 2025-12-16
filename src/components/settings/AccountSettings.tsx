import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, LogOut, UserCircle, Calendar, Shield, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function AccountSettings() {
  const { user, signOut } = useAuth();
  const { data: role, isLoading: isLoadingRole } = useUserRole();

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Administrador</Badge>;
      case 'agent':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Agente</Badge>;
      case 'buyer':
        return <Badge className="bg-success/20 text-success border-success/30">Comprador</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Cuenta
        </CardTitle>
        <CardDescription>
          Información de tu cuenta y opciones de sesión
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">ID de Usuario</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {user?.id?.slice(0, 8)}...{user?.id?.slice(-4)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Rol</p>
                <p className="text-xs text-muted-foreground">Tu nivel de acceso en la plataforma</p>
              </div>
            </div>
            {isLoadingRole ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              getRoleBadge(role || 'agent')
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Fecha de Registro</p>
                <p className="text-xs text-muted-foreground">
                  {user?.created_at
                    ? format(new Date(user.created_at), "d 'de' MMMM, yyyy", { locale: es })
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Session */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Sesión</h4>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sesión Activa</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            </div>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={signOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
