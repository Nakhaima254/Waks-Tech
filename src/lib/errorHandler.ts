/**
 * Safe Error Handler Utility
 * Sanitizes error messages to prevent exposing internal details to users
 */

// Known safe error patterns that can be shown to users
const SAFE_ERROR_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /invalid login credentials/i, message: 'Invalid email or password' },
  { pattern: /user already registered/i, message: 'An account with this email already exists' },
  { pattern: /email not confirmed/i, message: 'Please verify your email address' },
  { pattern: /invalid email/i, message: 'Please enter a valid email address' },
  { pattern: /password.*too short/i, message: 'Password must be at least 6 characters' },
  { pattern: /rate limit/i, message: 'Too many attempts. Please try again later' },
  { pattern: /network/i, message: 'Network error. Please check your connection' },
  { pattern: /timeout/i, message: 'Request timed out. Please try again' },
  { pattern: /not found/i, message: 'The requested resource was not found' },
  { pattern: /unauthorized|not authorized/i, message: 'You are not authorized to perform this action' },
  { pattern: /forbidden/i, message: 'Access denied' },
  { pattern: /duplicate key/i, message: 'This record already exists' },
  { pattern: /foreign key/i, message: 'Cannot complete this action due to related records' },
  { pattern: /violates.*constraint/i, message: 'Invalid data provided' },
];

// Patterns that indicate internal errors that should never be exposed
const INTERNAL_ERROR_PATTERNS: RegExp[] = [
  /postgres/i,
  /sql/i,
  /database/i,
  /supabase/i,
  /connection refused/i,
  /ECONNREFUSED/i,
  /stack trace/i,
  /at\s+\w+\s*\(/i, // Stack trace patterns
  /\.ts:\d+/i, // TypeScript file references
  /\.js:\d+/i, // JavaScript file references
  /node_modules/i,
  /internal server/i,
  /undefined is not/i,
  /cannot read prop/i,
  /null reference/i,
];

// Generic fallback message
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export interface SanitizedError {
  userMessage: string;
  isInternal: boolean;
  originalError?: unknown;
}

/**
 * Extracts the error message from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    // Handle Supabase error format
    if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
    // Handle error with error_description (OAuth errors)
    if ('error_description' in error && typeof (error as { error_description: unknown }).error_description === 'string') {
      return (error as { error_description: string }).error_description;
    }
  }
  return GENERIC_ERROR_MESSAGE;
}

/**
 * Checks if an error message contains internal/sensitive information
 */
function isInternalError(message: string): boolean {
  return INTERNAL_ERROR_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Finds a safe, user-friendly message for known error patterns
 */
function findSafeMessage(message: string): string | null {
  for (const { pattern, message: safeMessage } of SAFE_ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return safeMessage;
    }
  }
  return null;
}

/**
 * Sanitizes an error and returns a safe message for users
 * Logs the original error for debugging purposes
 */
export function sanitizeError(error: unknown): SanitizedError {
  const originalMessage = extractErrorMessage(error);
  
  // Check for known safe patterns first
  const safeMessage = findSafeMessage(originalMessage);
  if (safeMessage) {
    return {
      userMessage: safeMessage,
      isInternal: false,
      originalError: error,
    };
  }
  
  // Check if this is an internal error that should be hidden
  if (isInternalError(originalMessage)) {
    // Log the actual error for debugging (only in development)
    if (import.meta.env.DEV) {
      console.error('[Internal Error]', error);
    }
    
    return {
      userMessage: GENERIC_ERROR_MESSAGE,
      isInternal: true,
      originalError: error,
    };
  }
  
  // For other errors, use a generic message to be safe
  // But log in development for debugging
  if (import.meta.env.DEV) {
    console.error('[Unhandled Error]', error);
  }
  
  return {
    userMessage: GENERIC_ERROR_MESSAGE,
    isInternal: false,
    originalError: error,
  };
}

/**
 * Quick helper to get just the user-safe message
 */
export function getSafeErrorMessage(error: unknown): string {
  return sanitizeError(error).userMessage;
}

/**
 * Logs an error safely - full details in dev, sanitized in production
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  } else {
    // In production, only log sanitized info
    const { userMessage, isInternal } = sanitizeError(error);
    console.error(`[${context}] ${isInternal ? 'Internal error occurred' : userMessage}`);
  }
}
