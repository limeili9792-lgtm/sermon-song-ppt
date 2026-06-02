import { useState, useEffect, useCallback } from 'react';
import { Hymn } from '@/types/slide';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

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

    const loadMyHymns = async () => {
      const { data, error } = await supabase
        .from('hymns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load my hymns:', error);
      } else {
        setMyHymns(data || []);
      }
      setLoading(false);
    };

    loadMyHymns();
  }, [user, authLoading]);

  // Add to current session (no DB)
  const addHymn = useCallback((hymn: Hymn) => {
    setHymns(prev => [...prev, hymn]);
  }, []);

  // Update in current session
  const updateHymn = useCallback((id: string, updates: Partial<Hymn>) => {
    setHymns(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  }, []);

  // Remove from current session
  const removeHymn = useCallback((id: string) => {
    setHymns(prev => prev.filter(h => h.id !== id));
  }, []);

  // Save one hymn to my library (upsert: update if same fingerprint, insert if new)
  const saveToMyHymns = useCallback(async (hymn: Hymn) => {
    if (!user) return;
    const fp = hymnFingerprint(hymn);

    const existing = myHymns.find(h => hymnFingerprint(h) === fp);

    if (existing) {
      const { error } = await supabase
        .from('hymns')
        .update({
          title: hymn.title,
          verses: hymn.verses,
          repeat_structure: hymn.repeatStructure || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Failed to update hymn:', error);
        toast.error('更新失败');
      } else {
        setMyHymns(prev => prev.map(h => h.id === existing.id ? { ...hymn, id: existing.id } : h));
        toast.success('已更新到诗歌库');
      }
      return;
    }

    const { data, error } = await supabase
      .from('hymns')
      .insert({
        id: hymn.id,
        user_id: user.id,
        title: hymn.title,
        verses: hymn.verses,
        repeat_structure: hymn.repeatStructure || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save hymn:', error);
      toast.error('保存失败');
    } else if (data) {
      setMyHymns(prev => [data, ...prev]);
      toast.success('已保存到诗歌库');
    }
  }, [user, myHymns]);

  // Auto-save current session hymns (for export)
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
        await supabase.from('hymns').update({
          title: hymn.title,
          verses: hymn.verses,
          repeat_structure: hymn.repeatStructure || null,
          updated_at: new Date().toISOString(),
        }).eq('id', dup.id);
        saved++;
      } else {
        await supabase.from('hymns').insert({
          id: hymn.id,
          user_id: user.id,
          title: hymn.title,
          verses: hymn.verses,
          repeat_structure: hymn.repeatStructure || null,
        });
        saved++;
      }
    }

    if (saved > 0) {
      // Refresh my hymns list
      const { data } = await supabase
        .from('hymns')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setMyHymns(data);
    }
  }, [user, hymns, myHymns]);

  // Add from my library to current session
  const addFromMyHymns = useCallback((hymn: Hymn) => {
    setHymns(prev => [...prev, { ...hymn, id: crypto.randomUUID() }]);
    toast.success(`已添加：${hymn.title}`);
  }, []);

  // Delete from my library
  const deleteMyHymn = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('hymns').delete().eq('id', id);
    if (error) {
      toast.error('删除失败');
    } else {
      setMyHymns(prev => prev.filter(h => h.id !== id));
      toast.success('已删除');
    }
  }, [user]);

  return {
    hymns, myHymns, loading,
    addHymn, updateHymn, removeHymn,
    saveToMyHymns, saveCurrentToMyHymns,
    addFromMyHymns, deleteMyHymn,
  };
}
