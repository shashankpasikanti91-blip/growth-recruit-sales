import api from './api';

/**
 * Open a protected API file route in a new tab (Bearer token via axios).
 * Use for ESS downloads instead of raw /uploads links.
 */
export async function openAuthenticatedFile(apiPath) {
  try {
    const res = await api.get(apiPath, { responseType: 'blob' });
    const blob = new Blob([res.data]);
    const url = URL.createObjectURL(blob);
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(url), 120000);
    }
  } catch (e) {
    const st = e.response?.status;
    if (typeof window !== 'undefined') {
      window.alert(st === 404 ? 'File not found.' : 'Could not open file. Try signing in again.');
    }
    throw e;
  }
}
