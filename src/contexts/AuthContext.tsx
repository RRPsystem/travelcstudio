import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

interface ImpersonationContext {
  role: 'operator' | 'admin' | 'brand' | 'agent';
  brandId?: string;
  brandName?: string;
  agentId?: string;
  agentName?: string;
}

interface AvailableContext {
  type: 'operator' | 'admin' | 'brand' | 'agent';
  id?: string;
  name: string;
  brandId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isBrand: boolean;
  isOperator: boolean;
  isAgent: boolean;
  impersonationContext: ImpersonationContext | null;
  availableContexts: AvailableContext[];
  switchContext: (context: ImpersonationContext) => void;
  resetContext: () => void;
  effectiveBrandId: string | null;
  effectiveAgentId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonationContext, setImpersonationContext] = useState<ImpersonationContext | null>(null);
  const [availableContexts, setAvailableContexts] = useState<AvailableContext[]>([]);

  useEffect(() => {
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('🔐 Auth Init - Starting, current URL hash:', window.location.hash);
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 Auth Init - Session check:', {
          hasSession: !!session,
          hasToken: !!session?.access_token,
          userId: session?.user?.id
        });

        if (session?.access_token) {
          console.log('🔐 Auth Init - Session found, loading profile');
          await fetchUserProfile(session.access_token);
        } else {
          console.log('🔐 Auth Init - No session found');
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('🔐 Auth init error:', error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session?.access_token) {
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.access_token) {
        fetchUserProfile(session.access_token);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/get-user-profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch profile');
      }

      const { user: fetchedUser } = await response.json();
      console.log('🔐 User profile loaded:', { id: fetchedUser.id, role: fetchedUser.role, email: fetchedUser.email });

      setUser(prevUser => {
        if (prevUser?.id === fetchedUser.id && prevUser?.role === fetchedUser.role) {
          console.log('🔐 User unchanged, skipping state update');
          return prevUser;
        }
        return fetchedUser;
      });
    } catch (error) {
      console.error('🔐 Error fetching user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Invalid email or password');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    setUser(null);
    setImpersonationContext(null);
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) console.error('Signout error:', error);
  };

  useEffect(() => {
    if (user?.role === 'operator' && supabase) {
      loadAvailableContexts();
    }
  }, [user?.id]);

  const loadAvailableContexts = async () => {
    if (!supabase) return;

    try {
      const contexts: AvailableContext[] = [
        { type: 'operator', name: 'Operator View' },
        { type: 'admin', name: 'Admin View' }
      ];

      const { data: brands } = await supabase
        .from('brands')
        .select('id, name')
        .order('name');

      if (brands) {
        brands.forEach(brand => {
          contexts.push({
            type: 'brand',
            id: brand.id,
            name: brand.name,
            brandId: brand.id
          });
        });
      }

      const { data: agents } = await supabase
        .from('agents')
        .select('id, first_name, last_name, brand_id')
        .order('first_name');

      if (agents) {
        agents.forEach(agent => {
          contexts.push({
            type: 'agent',
            id: agent.id,
            name: `${agent.first_name} ${agent.last_name}`,
            brandId: agent.brand_id
          });
        });
      }

      setAvailableContexts(contexts);
    } catch (error) {
      console.error('Error loading available contexts:', error);
    }
  };

  const switchContext = (context: ImpersonationContext) => {
    setImpersonationContext(context);
    console.log('🔄 Switched context to:', context);
  };

  const resetContext = () => {
    setImpersonationContext(null);
    console.log('🔄 Reset to operator context');
  };

  const isAdmin = impersonationContext ? impersonationContext.role === 'admin' : user?.role === 'admin';
  const isBrand = impersonationContext ? impersonationContext.role === 'brand' : user?.role === 'brand';
  const isOperator = impersonationContext ? impersonationContext.role === 'operator' : user?.role === 'operator';
  const isAgent = impersonationContext ? impersonationContext.role === 'agent' : user?.role === 'agent';

  const effectiveBrandId = impersonationContext?.brandId || user?.brand_id || null;
  const effectiveAgentId = impersonationContext?.agentId || null;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      isAdmin,
      isBrand,
      isOperator,
      isAgent,
      impersonationContext,
      availableContexts,
      switchContext,
      resetContext,
      effectiveBrandId,
      effectiveAgentId
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}