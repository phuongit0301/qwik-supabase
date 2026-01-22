// OTP utility functions

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = parseInt(import.meta.env.PUBLIC_OTP_EXPIRY_MINUTES || '5', 10);

// Generate a random 6-digit OTP
export function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

// Calculate OTP expiry timestamp
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
}

// Check if OTP is expired
export function isOTPExpired(expiryTime: Date | string): boolean {
  const expiry = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  return new Date() > expiry;
}

// Format remaining time for display
export function formatRemainingTime(expiryTime: Date | string): string {
  const expiry = typeof expiryTime === 'string' ? new Date(expiryTime) : expiryTime;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return '0:00';

  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Validate OTP format (6 digits)
export function isValidOTPFormat(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}
