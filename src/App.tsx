import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function CallbackHandler({ children }: { children: React.ReactNode }) {
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=')) {
      setProcessing(false);
      return;
    }

    const params = new URLSearchParams(hash.replace('#', ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const expires_in = parseInt(params.get('expires_in') || '3600');

    if (!access_token || !refresh_token) {
      setProcessing(false);
      return;
    }

    // 先存 session 立即跳转，避免白屏等待
    localStorage.setItem(
      'supabase.auth.token',
      JSON.stringify({
        currentSession: {
          access_token,
          refresh_token,
          expires_in,
          user: { id: 'loading', email: '...' }, // 临时占位
        },
        expiresAt: Date.now() + expires_in * 1000,
      })
    );
    window.location.hash = '';
    window.location.pathname = '/';

    // 后台获取用户信息
    fetch('https://arxwgfifkrppkqcqtksr.supabase.co/auth/v1/user', {
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeHdnZmlma3JwcGtxY3F0a3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTYwODcsImV4cCI6MjA5NTg5MjA4N30.Rz26BRgAP120mUitnIfLMGwmvbXq0BxihK374CNeyG4',
        Authorization: 'Bearer ' + access_token,
      },
    })
      .then(resp => resp.json())
      .then(userData => {
        if (userData.id) {
          localStorage.setItem(
            'supabase.auth.token',
            JSON.stringify({
              currentSession: {
                access_token,
                refresh_token,
                expires_in,
                user: userData,
              },
              expiresAt: Date.now() + expires_in * 1000,
            })
          );
          window.dispatchEvent(new Event('storage'));
        }
      });
  }, []);

  if (processing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CallbackHandler>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CallbackHandler>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
