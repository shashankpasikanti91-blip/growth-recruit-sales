/**
 * User-facing message for failed API calls (network / ngrok / offline).
 */
export function apiErrorMessage(error, fallback = 'Something went wrong.') {
  const msg = error?.response?.data?.message;
  if (msg) return msg;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You appear to be offline. Check your connection.';
  }
  const code = error?.code;
  const message = error?.message || '';
  if (code === 'ERR_NETWORK' || message === 'Network Error' || message === 'Failed to fetch') {
    return 'Cannot reach the payroll server. On this machine: start the API on port 5000. For team access: restart ngrok so HTTPS forwards to port 5000, then open the new tunnel URL (update NEXT_PUBLIC_API_BASE_URL only if you use a split host/port setup).';
  }
  return fallback;
}
