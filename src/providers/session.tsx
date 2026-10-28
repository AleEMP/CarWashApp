import type { Session } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

export type Role = 'driver' | 'owner' | 'admin';

export type Profile = {
  id: string;
  role: Role;
  display_name: string | null;
  email: string | null;
};

type SessionContextValue = {
  isLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Explora la app sin cuenta («Explorar sin cuenta»). */
  guest: boolean;
  enterAsGuest: () => void;
  signOut: () => Promise<void>;
};

const GUEST_KEY = 'carwash:guest';

function readGuest(): boolean {
  try {
    return localStorage.getItem(GUEST_KEY) === '1';
  } catch {
    return false;
  }
}

function writeGuest(value: boolean) {
  try {
    if (value) {
      localStorage.setItem(GUEST_KEY, '1');
    } else {
      localStorage.removeItem(GUEST_KEY);
    }
  } catch {
    // Sin almacenamiento, el modo invitado solo dura hasta cerrar la app.
  }
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession debe usarse dentro de <SessionProvider />');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  // El perfil cargado recuerda de quién es, para no mostrar la app con el rol de otra cuenta.
  const [loaded, setLoaded] = useState<{ userId: string; profile: Profile | null } | null>(null);
  const [guest, setGuest] = useState(readGuest);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });

    // Sin await dentro del callback: Supabase puede quedarse esperando a sí mismo.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, role, display_name, email')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLoaded({ userId, profile: (data as Profile | null) ?? null });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const profileReady = userId === null || loaded?.userId === userId;
  const profile = userId !== null && loaded?.userId === userId ? loaded.profile : null;
  const isLoading = !sessionReady || !profileReady;

  const enterAsGuest = () => {
    writeGuest(true);
    setGuest(true);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    writeGuest(false);
    setGuest(false);
  };

  return (
    <SessionContext.Provider value={{ isLoading, session, profile, guest, enterAsGuest, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
