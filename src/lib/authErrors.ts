const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please confirm your email before signing in. Check your inbox and spam folder.',
  'User already registered': 'An account with this email already exists. Try signing in instead.',
  'Anonymous sign-in is disabled': 'Sign-in is currently unavailable. Please try again later.',
  'Signup requires a valid password': 'Please enter a valid password.',
  'Password should be at least 6 characters': 'Password must be at least 6 characters.',
  'rate limit': 'Too many signup attempts. Please wait a few minutes before trying again.',
  'Too many requests': 'Too many signup attempts. Please wait a few minutes before trying again.',
  'Network request failed': 'Unable to connect. Check your internet connection and try again.',
  'Failed to fetch': 'Unable to connect. Check your internet connection and try again.',
  'Email link is invalid or has expired': 'This confirmation link is invalid or expired. Request a new one.',
  'Email not authorized': 'This email is not authorized for sign-in. Contact support.',
  'Invalid email': 'Please enter a valid email address.',
  'Signup disabled': 'Sign-up is currently disabled. Please try again later.',
};

export function mapAuthError(errorMessage: string | null): string {
  if (!errorMessage) return '';
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return 'Something went wrong. Please try again.';
}

export function getErrorCategory(errorMessage: string | null): 'none' | 'email_not_confirmed' | 'rate_limited' | 'already_registered' | 'invalid_credentials' | 'validation' | 'network' | 'unknown' {
  if (!errorMessage) return 'none';
  const msg = errorMessage.toLowerCase();
  if (msg.includes('email not confirmed')) return 'email_not_confirmed';
  if (msg.includes('rate limit') || msg.includes('too many')) return 'rate_limited';
  if (msg.includes('already registered')) return 'already_registered';
  if (msg.includes('invalid login credentials')) return 'invalid_credentials';
  if (msg.includes('network') || msg.includes('fetch')) return 'network';
  if (msg.includes('password') || msg.includes('email')) return 'validation';
  return 'unknown';
}
