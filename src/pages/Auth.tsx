import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles, Mail, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
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
    setLoading(false);
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
            <Button type="submit" disabled={loading || !email.trim()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {loading ? '发送中...' : '发送登录链接'}
              {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
