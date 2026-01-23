import { useState, useEffect, ReactNode } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiJsonRequest, setApiKey } from '@/lib/api';

const SESSION_KEY = 'klartext_authenticated';

interface PasswordGateProps {
  children: ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  // Check session storage on mount
  useEffect(() => {
    const authenticated = sessionStorage.getItem(SESSION_KEY);
    // In production, API key is required; in dev, just the session flag is enough
    setIsAuthenticated(authenticated === 'true');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiJsonRequest('/v1/auth/verify', { password });

      if (response.ok) {
        const data = await response.json();
        // Store API key if provided (production)
        if (data.api_key) {
          setApiKey(data.api_key);
        }
        sessionStorage.setItem(SESSION_KEY, 'true');
        setIsAuthenticated(true);
      } else {
        const data = await response.json();
        setError(data.detail || (language === 'de' ? 'Falsches Passwort' : 'Invalid password'));
      }
    } catch (err) {
      setError(
        language === 'de'
          ? 'Verbindung zum Server fehlgeschlagen'
          : 'Failed to connect to server'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show app if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === 'de' ? 'KlarText Zugang' : 'KlarText Access'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'de'
              ? 'Bitte geben Sie das Passwort ein, um fortzufahren.'
              : 'Please enter the password to continue.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password">
              {language === 'de' ? 'Passwort' : 'Password'}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={language === 'de' ? 'Passwort eingeben' : 'Enter password'}
              className="mt-1"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !password.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'de' ? 'Wird geprüft...' : 'Verifying...'}
              </>
            ) : (
              language === 'de' ? 'Anmelden' : 'Sign In'
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
