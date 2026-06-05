import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles, Mail, Loader2, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

const API = 'https://arxwgfifkrppkqcqtksr.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeHdnZmlma3JwcGtxY3F0a3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTYwODcsImV4cCI6MjA5NTg5MjA4N30.Rz26BRgAP120mUitnIfLMGwmvbXq0BxihK374CNeyG4';

function saveSession(data: { access_token: string; refresh_token: string; expires_in: number; user: any }) {
  localStorage.setItem(
    'supabase.auth.token',
    JSON.stringify({
      currentSession: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        user: data.user,
      },
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    })
  );
  window.dispatchEvent(new Event('storage'));
}

export default function Auth() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        // 注册
        const resp = await fetch(API + '/auth/v1/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: KEY },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await resp.json();
        if (resp.ok && data.user) {
          // 注册成功但可能没有token（需确认邮箱），尝试自动登入
          if (data.session) {
            saveSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_in: data.session.expires_in,
              user: data.user,
            });
            window.location.pathname = '/';
          } else {
            toast.success('注册成功，请登录');
            setIsSignUp(false);
          }
        } else {
          toast.error(data.msg || data.message || '注册失败');
        }
      } else {
        // 登录
        const resp = await fetch(API + '/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: KEY },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        const data = await resp.json();
        if (resp.ok && data.access_token) {
          saveSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            user: data.user,
          });
          window.location.pathname = '/';
        } else {
          toast.error(data.error_description || data.msg || '登录失败');
        }
      }
    } catch (err: any) {
      toast.error(err.message || '操作失败');
    }
    setIsSubmitting(false);
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
          <p className="text-sm text-muted-foreground">
            {isSignUp ? '创建账户加入共享诗歌库' : '登录以保存和同步诗歌'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">邮箱</label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="bg-background/60"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">密码</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              className="bg-background/60"
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !email.trim() || !password}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isSignUp ? (
              <Mail className="w-4 h-4 mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            {isSubmitting ? '处理中...' : isSignUp ? '注册' : '登录'}
            {!isSubmitting && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? '已有账户？' : '没有账户？'}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-1 text-accent hover:underline font-medium"
          >
            {isSignUp ? '去登录' : '注册新账户'}
          </button>
        </p>
      </Card>
    </div>
  );
}
