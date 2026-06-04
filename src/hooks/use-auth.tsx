import { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
});

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('supabase.auth.token');
    if (!raw) return null;
    const data = JSON.parse(raw);
    const session = data?.currentSession;
    if (!session) return null;
    if (session.expires_at && Date.now() > new Date(session.expires_at).getTime()) return null;
    return session.user || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored);
    setLoading(false);

    const onStorage = () => {
      const stored = getStoredUser();
      setUser(stored);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('supabase.auth.token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
