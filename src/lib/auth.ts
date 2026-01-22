import { supabase, getBrowserSupabase } from './supabase';
import { generateOTP, getOTPExpiry, isOTPExpired, OTP_EXPIRY_MINUTES } from './otp';

export interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface LoginResultWithToken extends AuthResult {
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterWithOTPResult extends AuthResult {
  email?: string;
  otpExpiry?: string;
}

export interface PendingUser {
  id?: string;
  email: string;
  password_hash: string;
  name: string;
  otp: string;
  otp_expiry: string;
  created_at?: string;
}

// Simple hash function for password (in production, use bcrypt on a secure backend)
// This is just for storing temporarily - actual hashing happens in Supabase Auth
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Server-side register with OTP - creates pending user and sends OTP
export async function registerWithOTP(
  email: string,
  password: string,
  name: string
): Promise<RegisterWithOTPResult> {
  try {
    // Check if email already exists in Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);

    if (userExists) {
      return {
        success: false,
        error: 'An account with this email already exists.',
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry();

    // Hash password for temporary storage
    const passwordHash = await hashPassword(password);

    // Check if there's already a pending registration for this email
    const { data: existingPending } = await supabase
      .from('pending_registrations')
      .select('id')
      .eq('email', email)
      .single();

    if (existingPending) {
      // Update existing pending registration
      const { error: updateError } = await supabase
        .from('pending_registrations')
        .update({
          password_hash: passwordHash,
          name,
          otp,
          otp_expiry: otpExpiry.toISOString(),
        })
        .eq('email', email);

      if (updateError) {
        console.error('Error updating pending registration:', updateError);
        return {
          success: false,
          error: 'Failed to update registration. Please try again.',
        };
      }
    } else {
      // Insert new pending registration
      const { error: insertError } = await supabase
        .from('pending_registrations')
        .insert({
          email,
          password_hash: passwordHash,
          name,
          otp,
          otp_expiry: otpExpiry.toISOString(),
        });

      if (insertError) {
        console.error('Error inserting pending registration:', insertError);
        return {
          success: false,
          error: 'Failed to save registration. Please try again.',
        };
      }
    }

    // Store plain password temporarily in memory for this request only
    // This is needed because we can't decrypt the hash
    pendingPasswords.set(email, password);

    // TODO: Send OTP via email service (SendGrid, AWS SES, etc.)
    // For development, log the OTP
    console.log(`[DEV] OTP for ${email}: ${otp}`);

    return {
      success: true,
      email,
      otpExpiry: otpExpiry.toISOString(),
      data: {
        message: `OTP sent to ${email}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      },
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: error.message || 'Registration failed. Please try again.',
    };
  }
}

// Temporary in-memory store for passwords (cleared after verification)
// In production, use encrypted storage or re-ask for password
const pendingPasswords = new Map<string, string>();

// Verify OTP and complete registration
export async function verifyOTPAndRegister(
  email: string,
  otp: string,
  password?: string // Optional: user can re-enter password if server restarted
): Promise<LoginResultWithToken> {
  try {
    // Get pending registration from database
    const { data: pendingUser, error: fetchError } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !pendingUser) {
      return {
        success: false,
        error: 'No pending registration found. Please register again.',
      };
    }

    // Check if OTP is expired
    if (isOTPExpired(pendingUser.otp_expiry)) {
      // Delete expired registration
      await supabase
        .from('pending_registrations')
        .delete()
        .eq('email', email);

      return {
        success: false,
        error: 'OTP has expired. Please register again.',
      };
    }

    // Verify OTP
    if (pendingUser.otp !== otp) {
      return {
        success: false,
        error: 'Invalid OTP. Please try again.',
      };
    }

    // Get password - from memory if available, otherwise require re-entry
    const userPassword = password || pendingPasswords.get(email);

    if (!userPassword) {
      return {
        success: false,
        error: 'Session expired. Please enter your password again.',
        data: { requirePassword: true },
      };
    }

    // OTP is valid - create the user in Supabase
    const { data, error } = await supabase.auth.signUp({
      email: pendingUser.email,
      password: userPassword,
      options: {
        data: {
          name: pendingUser.name,
          email_verified: true,
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to create account.',
      };
    }

    // Clean up
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('email', email);
    pendingPasswords.delete(email);

    // If auto-confirm is enabled, we'll have a session
    if (data.session) {
      return {
        success: true,
        data,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error('Verification error:', error);
    return {
      success: false,
      error: error.message || 'Verification failed. Please try again.',
    };
  }
}

// Resend OTP for pending registration
export async function resendOTP(email: string): Promise<RegisterWithOTPResult> {
  try {
    // Check if pending registration exists
    const { data: pendingUser, error: fetchError } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !pendingUser) {
      return {
        success: false,
        error: 'No pending registration found. Please register again.',
      };
    }

    // Generate new OTP
    const newOtp = generateOTP();
    const newExpiry = getOTPExpiry();

    // Update pending registration with new OTP
    const { error: updateError } = await supabase
      .from('pending_registrations')
      .update({
        otp: newOtp,
        otp_expiry: newExpiry.toISOString(),
      })
      .eq('email', email);

    if (updateError) {
      return {
        success: false,
        error: 'Failed to generate new OTP. Please try again.',
      };
    }

    // TODO: Send new OTP via email service
    console.log(`[DEV] New OTP for ${email}: ${newOtp}`);

    return {
      success: true,
      email,
      otpExpiry: newExpiry.toISOString(),
      data: {
        message: `New OTP sent to ${email}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to resend OTP.',
    };
  }
}

// Get pending registration info
export async function getPendingRegistration(email: string): Promise<PendingUser | null> {
  const { data } = await supabase
    .from('pending_registrations')
    .select('*')
    .eq('email', email)
    .single();

  return data;
}

// Legacy register function (kept for compatibility)
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
