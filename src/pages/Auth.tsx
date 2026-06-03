import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles, Mail, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

function parseHash(hash: string) {
  const params = new URLSearchParams(hash.replace('#', ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in = params.get('expires_in');
  if (access_token && refresh_token) {
    return { access_token, refresh_token, expires_in: expires_in ? parseInt(expires_in) : 3600 };
  }
  return null;
}

export default function Auth() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [processingHash, setProcessingHash] = useState(false);

  useEffect(() => {
    const tokens = parseHash(window.location.hash);
    if (!tokens || user || authLoading) return;

    setProcessingHash(true);
    fetch('https://arxwgfifkrppkqcqtksr.supabase.co/auth/v1/user', {
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeHdnZmlma3JwcGtxY3F0a3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTYwODcsImV4cCI6MjA5NTg5MjA4N30.Rz26BRgAP120mUitnIfLMGwmvbXq0BxihK374CNeyG4',
        Authorization: 'Bearer ' + tokens.access_token,
      },
    })
      .then(resp => resp.json())
      .then(userData => {
        if (userData.id) {
          localStorage.setItem(
            'supabase.auth.token',
            JSON.stringify({
              currentSession: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_in: tokens.expires_in,
                user: userData,
              },
              expiresAt: Date.now() + tokens.expires_in * 1000,
            })
          );
          window.location.pathname = '/';
        }
      })
      .catch(() => setProcessingHash(false));
  }, []);

  if (authLoading || processingHash) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    try {
      const redirectTo = window.location.origin;
      const url = 'https://arxwgfifkrppkqcqtksr.supabase.co/auth/v1/otp?redirect_to=' + encodeURIComponent(redirectTo);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeHdnZmlma3JwcGtxY3F0a3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTYwODcsImV4cCI6MjA5NTg5MjA4N30.Rz26BRgAP120mUitnIfLMGwmvbXq0BxihK374CNeyG4',
        },
        body: JSON.stringify({
          email: email.trim(),
          gotrue_meta_security: {},
        }),
      });
      if (resp.ok) {
        setSent(true);
        toast.success('登录链接已发送到你的邮箱');
      } else {
        const data = await resp.json();
        toast.error(data.msg || data.error || '发送失败，请重试');
      }
    } catch (err: any) {
      toast.error(err.message || '发送失败');
    }
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="glass-card max-w-md w-full p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            SEC<span className="gold-accent">Slider</span> AI
          </h1>
          <p className="text-sm text-muted-foreground">登录以保存和同步你的诗歌</p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">请查看邮箱</p>
              <p className="text-sm text-muted-foreground">
                我们已发送登录链接至 <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
            <Button variant="outline" onClick={() => setSent(false)} className="w-full">
              更换邮箱
            </Button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">邮箱地址</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-background/60"
              />
            </div>
            <Button type="submit" disabled={isSending || !email.trim()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {isSending ? '发送中...' : '发送登录链接'}
              {!isSending && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
