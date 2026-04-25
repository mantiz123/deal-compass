import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, CheckCircle, Clock, Search, 
  Phone, Calendar, Loader2, UserCheck, UserX, Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithEmail {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  role?: AppRole;
}

export function AdminUsersPanel() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return profiles.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || 'agent',
      })) as UserWithEmail[];
    },
  });

  const approveUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Closer activado — ya puede acceder a la plataforma');
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const rejectUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Acceso revocado');
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      toast.success('Role updated successfully');
    },
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  const filterUsers = (list: UserWithEmail[]) =>
    list.filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.user_id.toLowerCase().includes(q)
      );
    });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">Admin</Badge>;
      case 'agent':
        return <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Agent</Badge>;
      case 'buyer':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">Buyer</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{role}</Badge>;
    }
  };

  const UserCard = ({ user, showApprove = false, showRevoke = false }: { 
    user: UserWithEmail; 
    showApprove?: boolean; 
    showRevoke?: boolean;
  }) => (
    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/30 hover:border-border/60 transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary">
            {user.full_name?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{user.full_name || 'No name'}</p>
            {getRoleBadge(user.role || 'agent')}
            {!user.is_approved && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-[10px]">
                <Clock className="h-3 w-3 mr-1" />
                Aplicación pendiente
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {user.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> {user.phone}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {format(new Date(user.created_at), 'MMM d, yyyy')}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {/* Role selector */}
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <Select
            value={user.role || 'agent'}
            onValueChange={(value) => changeRole.mutate({ userId: user.user_id, newRole: value as AppRole })}
          >
            <SelectTrigger className="h-8 w-24 text-xs bg-secondary/50 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
              <SelectItem value="buyer">Buyer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showApprove && (
          <Button
            size="sm"
            onClick={() => approveUser.mutate(user.user_id)}
            disabled={approveUser.isPending}
            className="gap-1"
          >
            {approveUser.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
            Activar Closer
          </Button>
        )}
        {showRevoke && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => rejectUser.mutate(user.user_id)}
            disabled={rejectUser.isPending}
            className="gap-1"
          >
            {rejectUser.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
            Revocar acceso
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Klose Closers Program
            </CardTitle>
            <CardDescription>
              Activa, revoca acceso y asigna roles a estudiantes inscritos en el programa
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {pendingUsers.length > 0 && (
              <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
                <Clock className="h-3 w-3 mr-1" />
                {pendingUsers.length} aplicación{pendingUsers.length !== 1 ? 'es' : ''}
              </Badge>
            )}
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
              {users.length} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary/30 border-border/50"
          />
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="bg-secondary/50 border border-border/50">
            <TabsTrigger value="pending" className="gap-1.5 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              Pending ({pendingUsers.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
              Approved ({approvedUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-2">
            {filterUsers(pendingUsers).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No pending users</p>
              </div>
            ) : (
              filterUsers(pendingUsers).map(user => (
                <UserCard key={user.id} user={user} showApprove />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-4 space-y-2">
            {filterUsers(approvedUsers).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No approved users</p>
              </div>
            ) : (
              filterUsers(approvedUsers).map(user => (
                <UserCard key={user.id} user={user} showRevoke />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
