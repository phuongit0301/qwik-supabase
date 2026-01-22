import { supabase, getBrowserSupabase } from './supabase';

export interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface LoginResultWithToken extends AuthResult {
  accessToken?: string;
  refreshToken?: string;
}

// Server-side register (used in routeAction$)
export async function register(email: string, password: string, redirectTo?: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
      }
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.',
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

// Server-side login - returns tokens to be stored on client
export async function login(email: string, password: string): Promise<LoginResultWithToken> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'Invalid email or password. Please try again.',
        };
      }

      return {
        success: false,
        error: error.message || 'Login failed. Please try again.',
      };
    }

    // Return tokens to be stored on client side
    return {
      success: true,
      data,
      accessToken: data.session?.access_token,
      refreshToken: data.session?.refresh_token,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

// Browser-side: Set session with tokens from server
export async function setSessionOnClient(accessToken: string, refreshToken: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const client = getBrowserSupabase();
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  } catch {
    return false;
  }
}

// Browser-side logout
export async function logout(): Promise<AuthResult> {
  try {
    const client = typeof window !== 'undefined' ? getBrowserSupabase() : supabase;
    const { error } = await client.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message || 'Logout failed',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

// Get session - uses browser client when available
export async function getSession() {
  const client = typeof window !== 'undefined' ? getBrowserSupabase() : supabase;
  return client.auth.getSession();
}

// Browser-side check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const { data } = await getSession();
  return !!data.session;
}
