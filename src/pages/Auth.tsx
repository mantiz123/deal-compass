import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import kloseLogo from '@/assets/klose-logo.png';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading, isApproved } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');

  useEffect(() => {
    if (user && isApproved === true) {
      navigate('/dashboard');
    } else if (user && isApproved === false) {
      navigate('/pending-approval');
    }
  }, [user, isApproved, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Error de validación',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      let message = 'Error al iniciar sesión';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Credenciales incorrectas';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Por favor confirma tu email';
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(forgotEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: 'Error', description: err.errors[0].message, variant: 'destructive' });
        return;
      }
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo enviar el enlace. Intenta de nuevo.', variant: 'destructive' });
    } else {
      toast({ title: '📧 Email enviado', description: 'Revisa tu bandeja para el enlace de recuperación.' });
      setShowForgotPassword(false);
      setForgotEmail('');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Error de validación',
          description: err.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);

    if (error) {
      let message = 'Error al registrarse';
      if (error.message.includes('User already registered')) {
        message = 'Este email ya está registrado';
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Cuenta creada!',
        description: 'Bienvenido a KLOSE',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-6 left-6"
        onClick={() => navigate('/')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={kloseLogo} alt="KLOSE" className="w-12 h-12 object-contain" />
            <span className="text-3xl font-bold text-foreground">KLOSE</span>
          </div>
          <p className="text-muted-foreground">Plataforma Integral de Wholesaling</p>
        </div>

        {/* Auth Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          {showForgotPassword ? (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Recuperar Contraseña</CardTitle>
                <CardDescription>
                  Te enviaremos un enlace para restablecer tu contraseña
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="tu@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al login
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">Acceso a la Plataforma</CardTitle>
                <CardDescription>
                  Ingresa tus credenciales para continuar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
                    <TabsTrigger value="signup">Registrarse</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="tu@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password">Contraseña</Label>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setShowForgotPassword(true)}
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        </div>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Ingresando...
                          </>
                        ) : (
                          'Ingresar'
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Nombre Completo</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Juan Pérez"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="tu@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Contraseña</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registrando...
                          </>
                        ) : (
                          'Crear Cuenta'
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          KLOSE © 2025 • Alabama, USA
        </p>
      </div>
    </div>
  );
}
