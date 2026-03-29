import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import kloseLogo from '@/assets/klose-logo.png';

export default function PendingApproval() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={kloseLogo} alt="KLOSE" className="w-12 h-12 object-contain" />
            <span className="text-3xl font-bold text-foreground">KLOSE</span>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl">Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your account has been registered successfully. An administrator will review your request 
              and notify you by email when your access is approved.
            </p>
            <p className="text-muted-foreground text-xs">
              If you believe this is an error, please contact the administrator.
            </p>
            <Button variant="outline" className="w-full mt-4" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          KLOSE © 2025 • Alabama, USA
        </p>
      </div>
    </div>
  );
}
