import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Converts technical exceptions, database errors, and raw server responses
 * into clean, user-friendly messages suitable for toast notifications.
 */
export function getFriendlyErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;

  let msg = '';
  if (typeof error === 'string') {
    msg = error;
  } else if (error.response?.data?.message) {
    msg = error.response.data.message;
  } else if (error.response?.data?.error) {
    msg = error.response.data.error;
  } else if (error.message) {
    msg = error.message;
  } else {
    msg = String(error);
  }

  msg = msg.trim();
  if (!msg) return fallback;

  const lower = msg.toLowerCase();

  // 1. Connection & Network Issues
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('load failed') ||
    lower.includes('network error') ||
    lower.includes('err_connection_refused')
  ) {
    return 'Unable to reach the server. Please check your internet connection or try again in a moment.';
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'The request took too long to complete. Please try again.';
  }

  // 2. Database & Constraint Violations
  if (lower.includes('unique constraint') || lower.includes('duplicate key')) {
    if (lower.includes('email')) {
      return 'An account with this email already exists.';
    }
    if (lower.includes('username')) {
      return 'This username is already taken. Please choose another.';
    }
    return 'A record with these details already exists.';
  }

  if (lower.includes('foreign key') || lower.includes('violates foreign key')) {
    return 'This item cannot be deleted because it is linked to other records.';
  }

  if (
    lower.includes('could not execute statement') ||
    lower.includes('sql') ||
    lower.includes('hibernate') ||
    lower.includes('psqlexception')
  ) {
    return 'We encountered a database error. Please try again in a few moments.';
  }

  // 3. Email & Verification Codes
  if (
    lower.includes('brevo') ||
    lower.includes('mail') ||
    lower.includes('smtp') ||
    lower.includes('otp verification email')
  ) {
    if (lower.includes('sender') || lower.includes('verified')) {
      return 'Email delivery failed. The sender address is not verified in the mail service.';
    }
    return 'Unable to deliver the verification email right now. Please verify your email address and try again.';
  }

  if (
    lower.includes('invalid or expired otp') ||
    lower.includes('invalid otp') ||
    lower.includes('expired otp')
  ) {
    return 'The verification code is incorrect or has expired. Please request a new one.';
  }

  // 4. Authentication & Authorization
  if (
    lower.includes('bad credentials') ||
    lower.includes('incorrect username/email') ||
    lower.includes('invalid credentials') ||
    lower.includes('bad password')
  ) {
    return 'Incorrect email/username or password. Please try again.';
  }

  if (lower.includes('unauthorized') || lower.includes('session expired') || lower.includes('jwt')) {
    return 'Your session has expired. Please log in again.';
  }

  if (lower.includes('access is denied') || lower.includes('forbidden') || lower.includes('accessdenied')) {
    return 'You do not have permission to perform this action.';
  }

  if (lower.includes('user not found') || lower.includes('account not found')) {
    return 'No account was found with the provided details.';
  }

  // 5. AI Services
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429')) {
    return 'AI request limit reached. Please wait a moment and try again.';
  }

  if (
    lower.includes('gemini') ||
    lower.includes('forecasting engine') ||
    lower.includes('assistant is busy') ||
    lower.includes('calculating right now')
  ) {
    return 'The AI assistant is momentarily busy. Please try again in a few seconds.';
  }

  // 6. Generic Cleanups
  // Strip common technical prefixes
  msg = msg.replace(/^(error:|runtimeexception:|exception:|failed:)\s*/i, '').trim();

  // Filter out raw stack traces or JSON blobs
  if (msg.length > 200 || msg.includes('at org.') || msg.includes('at com.') || msg.includes('java.lang.')) {
    return fallback;
  }

  // Clean up robotic jargon
  if (lower.includes('ledger item data point purged') || lower.includes('transaction drop operation')) {
    return 'Could not delete expense. Please try again.';
  }
  if (lower.includes('metrics ledger list') || lower.includes('sync expense records')) {
    return 'Could not load expenses. Please refresh the page.';
  }

  return msg;
}
