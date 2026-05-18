/**
 * Smoke / E2E: Finance API (dashboard, invoices list, clients for finance role)
 * Run with API listening (default PORT from env or 5000).
 * Usage: node test-e2e-finance.js
 */

const axios = require('axios');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const API_BASE = process.env.API_BASE || `http://localhost:${PORT}/api`;

let token;

async function login() {
  const res = await axios.post(`${API_BASE}/auth/login`, {
    email: 'finance.manager@tekgen.com',
    password: 'Finance@2026',
  });
  const payload = res.data?.data;
  if (!payload?.token) throw new Error('Login response missing token');
  token = payload.token;
  console.log('✅ Finance login:', payload.user?.email, payload.user?.role);
}

function authHeaders() {
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  console.log('\n=== Finance API smoke ===\n');
  await login();

  const dash = await axios.get(`${API_BASE}/finance/dashboard`, { headers: authHeaders() });
  console.log('✅ GET /finance/dashboard', dash.data?.data?.kpis ? 'KPIs OK' : dash.data);

  const inv = await axios.get(`${API_BASE}/finance/invoices?limit=5`, { headers: authHeaders() });
  const list = inv.data?.data?.invoices;
  console.log('✅ GET /finance/invoices count:', Array.isArray(list) ? list.length : inv.data);

  const clients = await axios.get(`${API_BASE}/sales/clients?limit=3`, { headers: authHeaders() });
  const cl = clients.data?.data?.clients;
  console.log('✅ GET /sales/clients (for invoice form):', Array.isArray(cl) ? cl.length : clients.data);

  if (Array.isArray(cl) && cl[0]?.id) {
    const body = {
      clientId: cl[0].id,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
      lineItems: [{ description: 'E2E test line', quantity: 1, rate: 100, unit: 'ITEMS' }],
    };
    const created = await axios.post(`${API_BASE}/finance/invoices`, body, { headers: authHeaders() });
    console.log('✅ POST /finance/invoices →', created.data?.data?.displayId || created.data);
  } else {
    console.log('⚠️  Skip create-invoice: no client in DB');
  }

  console.log('\n=== Done ===\n');
}

main().catch((err) => {
  console.error('❌', err.response?.data || err.message);
  process.exit(1);
});
