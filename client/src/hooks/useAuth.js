import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import api from '../lib/api.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) syncProfile();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await syncProfile();
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function syncProfile() {
    try {
      const { data } = await api.post('/api/auth/sync');
      setProfile(data.user);
    } catch (err) {
      console.error('Profile sync failed:', err);
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  async function updateProfile(updates) {
    const { data } = await api.patch('/api/auth/profile', updates);
    setProfile(data.user);
    return data.user;
  }

  return { user, profile, loading, signIn, signUp, signOut, updateProfile };
}
