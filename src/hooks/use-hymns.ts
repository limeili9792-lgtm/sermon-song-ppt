import { useState, useEffect, useCallback } from 'react';
import { Hymn } from '@/types/slide';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

const API = 'https://arxwgfifkrppkqcqtksr.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeHdnZmlma3JwcGtxY3F0a3NyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTYwODcsImV4cCI6MjA5NTg5MjA4N30.Rz26BRgAP120mUitnIfLMGwmvbXq0BxihK374CNeyG4';

function headers(): Record<string, string> {
  return { apikey: KEY, 'Content-Type': 'application/json' };
}

async function fetchHymns(): Promise<Hymn[]> {
  const resp = await fetch(API + '/rest/v1/hymns?select=*&order=created_at.desc', { headers: headers() });
  return resp.ok ? (resp.json() as Promise<Hymn[]>) : [];
}

async function upsertHymn(hymn: Hymn, userId: string): Promise<boolean> {
  const resp = await fetch(API + '/rest/v1/hymns?id=eq.' + encodeURIComponent(hymn.id), {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({
      user_id: userId,
      title: hymn.title,
      verses: hymn.verses,
      repeat_structure: hymn.repeatStructure || null,
      updated_at: new Date().toISOString(),
    }),
  });
  return resp.ok;
}

async function insertHymn(hymn: Hymn, userId: string): Promise<Hymn | null> {
  const resp = await fetch(API + '/rest/v1/hymns', {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify({
      id: hymn.id,
      user_id: userId,
      title: hymn.title,
      verses: hymn.verses,
      repeat_structure: hymn.repeatStructure || null,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data[0] || null;
}

async function deleteHymnById(id: string): Promise<boolean> {
  const resp = await fetch(API + '/rest/v1/hymns?id=eq.' + encodeURIComponent(id), {
    method: 'DELETE',
    headers: headers(),
  });
  return resp.ok;
}

function hymnFingerprint(hymn: Hymn): string {
  const firstVerseText = hymn.verses[0]?.text?.slice(0, 20) || '';
  return `${hymn.title}||${firstVerseText}`;
}

export function useHymns() {
  const { user, loading: authLoading } = useAuth();
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [myHymns, setMyHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);

  // Load my hymns from Supabase
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMyHymns([]);
      setLoading(false);
      return;
    }

    fetchHymns()
      .then(data => setMyHymns(data))
      .catch(e => console.error('Failed to load hymns:', e))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const addHymn = useCallback((hymn: Hymn) => {
    setHymns(prev => [...prev, hymn]);
  }, []);

  const updateHymn = useCallback((id: string, updates: Partial<Hymn>) => {
    setHymns(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  }, []);

  const removeHymn = useCallback((id: string) => {
    setHymns(prev => prev.filter(h => h.id !== id));
  }, []);

  const saveToMyHymns = useCallback(async (hymn: Hymn) => {
    if (!user) return;
    const fp = hymnFingerprint(hymn);
    const existing = myHymns.find(h => hymnFingerprint(h) === fp);

    if (existing) {
      const ok = await upsertHymn(hymn, user.id);
      if (ok) {
        setMyHymns(prev => prev.map(h => h.id === existing.id ? { ...hymn, id: existing.id } : h));
        toast.success('已更新到诗歌库');
      } else {
        toast.error('更新失败');
      }
      return;
    }

    const newHymn = await insertHymn(hymn, user.id);
    if (newHymn) {
      setMyHymns(prev => [newHymn, ...prev]);
      toast.success('已保存到诗歌库');
    } else {
      toast.error('保存失败');
    }
  }, [user, myHymns]);

  const saveCurrentToMyHymns = useCallback(async () => {
    if (!user || hymns.length === 0) return;

    const fingerprints = new Set<string>();
    let saved = 0;

    for (const hymn of hymns) {
      const fp = hymnFingerprint(hymn);
      if (fingerprints.has(fp)) continue;
      fingerprints.add(fp);

      const dup = myHymns.find(h => hymnFingerprint(h) === fp);
      if (dup) {
        await upsertHymn(hymn, user.id);
      } else {
        await insertHymn(hymn, user.id);
      }
      saved++;
    }

    if (saved > 0) {
      const data = await fetchHymns();
      if (data) setMyHymns(data);
    }
  }, [user, hymns, myHymns]);

  const addFromMyHymns = useCallback((hymn: Hymn) => {
    setHymns(prev => [...prev, { ...hymn, id: crypto.randomUUID() }]);
    toast.success(`已添加：${hymn.title}`);
  }, []);

  const deleteMyHymn = useCallback(async (id: string) => {
    if (!user) return;
    const ok = await deleteHymnById(id);
    if (ok) {
      setMyHymns(prev => prev.filter(h => h.id !== id));
      toast.success('已删除');
    } else {
      toast.error('删除失败');
    }
  }, [user]);

  return {
    hymns, myHymns, loading,
    addHymn, updateHymn, removeHymn,
    saveToMyHymns, saveCurrentToMyHymns,
    addFromMyHymns, deleteMyHymn,
  };
}
