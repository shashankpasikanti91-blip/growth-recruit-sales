import api from '@/lib/api';

// ─── Candidates ──────────────────────────────────────────────────────────────

export const candidatesApi = {
  list: (params?: Record<string, any>) => api.get('/candidates', { params }).then(r => r.data),
  get: (id: string) => api.get(`/candidates/${id}`).then(r => r.data),
  create: (data: any) => api.post('/candidates', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/candidates/${id}`, data).then(r => r.data),
  archive: (id: string) => api.patch(`/candidates/${id}/archive`).then(r => r.data),
  addNote: (id: string, note: string) => api.post(`/candidates/${id}/notes`, { note }).then(r => r.data),
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (params?: Record<string, any>) => api.get('/jobs', { params }).then(r => r.data),
  get: (id: string) => api.get(`/jobs/${id}`).then(r => r.data),
  create: (data: any) => api.post('/jobs', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/jobs/${id}`, data).then(r => r.data),
  close: (id: string) => api.patch(`/jobs/${id}/close`).then(r => r.data),
};

// ─── Applications ─────────────────────────────────────────────────────────────

export const applicationsApi = {
  list: (params?: Record<string, any>) => api.get('/applications', { params }).then(r => r.data),
  get: (id: string) => api.get(`/applications/${id}`).then(r => r.data),
  create: (data: any) => api.post('/applications', data).then(r => r.data),
  screen: (id: string, resumeText?: string) => api.post(`/applications/${id}/screen`, { resumeText }).then(r => r.data),
  updateStage: (id: string, stage: string, stageNote?: string) =>
    api.patch(`/applications/${id}/stage`, { stage, stageNote }).then(r => r.data),
};

// ─── Leads ───────────────────────────────────────────────────────────────────

export const leadsApi = {
  list: (params?: Record<string, any>) => api.get('/leads', { params }).then(r => r.data),
  get: (id: string) => api.get(`/leads/${id}`).then(r => r.data),
  create: (data: any) => api.post('/leads', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data).then(r => r.data),
  updateStage: (id: string, stage: string, note?: string) =>
    api.patch(`/leads/${id}/stage`, { stage, note }).then(r => r.data),
  score: (id: string) => api.post(`/leads/${id}/score`).then(r => r.data),
  addNote: (id: string, note: string) => api.post(`/leads/${id}/notes`, { note }).then(r => r.data),
  importGoogleMaps: (data: { query: string; location: string; limit?: number }) =>
    api.post('/leads/import/google-maps', data).then(r => r.data),
  importApify: (items: any[]) => api.post('/leads/import/apify', { items }).then(r => r.data),
  generate: (data: { source: string; industry: string; location: string; jobTitles?: string; limit?: number }) =>
    api.post('/leads/generate', data).then(r => r.data),
  generateUsage: () => api.get('/leads/generate/usage').then(r => r.data),
};

// ─── Companies ───────────────────────────────────────────────────────────────

export const companiesApi = {
  list: (params?: Record<string, any>) => api.get('/companies', { params }).then(r => r.data),
  get: (id: string) => api.get(`/companies/${id}`).then(r => r.data),
  create: (data: any) => api.post('/companies', data).then(r => r.data),
};

// ─── Imports ─────────────────────────────────────────────────────────────────

export const importsApi = {
  list: () => api.get('/imports').then(r => r.data),
  get: (id: string) => api.get(`/imports/${id}`).then(r => r.data),
  getRows: (id: string) => api.get(`/imports/${id}/rows`).then(r => r.data),
  create: (data: any) => api.post('/imports', data).then(r => r.data),
  upload: (id: string, file: File, mappingId?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (mappingId) form.append('mappingTemplateId', mappingId);
    return api.post(`/imports/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  retry: (id: string) => api.post(`/imports/${id}/retry`).then(r => r.data),
  bulkResume: (files: File[]) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return api.post('/imports/bulk-resume', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
};

// ─── Outreach ─────────────────────────────────────────────────────────────────

export const outreachApi = {
  generate: (data: any) => api.post('/outreach/generate', data).then(r => r.data),
  listMessages: (params?: Record<string, any>) => api.get('/outreach/messages', { params }).then(r => r.data),
  listSequences: () => api.get('/outreach/sequences').then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/outreach/messages/${id}/status`, { status }).then(r => r.data),
  sendMessage: (id: string) => api.post(`/outreach/messages/${id}/send`).then(r => r.data),
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export const analyticsApi = {
  recruitment: (days = 30) => api.get('/analytics/recruitment', { params: { days } }).then(r => r.data),
  sales: (days = 30) => api.get('/analytics/sales', { params: { days } }).then(r => r.data),
  aiUsage: (days = 30) => api.get('/analytics/ai-usage', { params: { days } }).then(r => r.data),
  workflows: (days = 30) => api.get('/analytics/workflows', { params: { days } }).then(r => r.data),
  dashboard: () => api.get('/analytics/dashboard').then(r => r.data),
};

// ─── Billing ──────────────────────────────────────────────────────────────────

export const billingApi = {
  plans: () => api.get('/billing/plans').then(r => r.data),
  subscription: () => api.get('/billing/subscription').then(r => r.data),
  usage: () => api.get('/billing/usage').then(r => r.data),
  invoices: (page = 1) => api.get('/billing/invoices', { params: { page } }).then(r => r.data),
  changePlan: (planId: string, billingCycle: 'MONTHLY' | 'ANNUAL') =>
    api.post('/billing/change-plan', { planId, billingCycle }).then(r => r.data),
};
// ─── Countries & Visa Rules ──────────────────────────────────────────────────

export const countriesApi = {
  list: () => api.get('/countries').then(r => r.data),
  visaRules: () => api.get('/countries/visa-rules').then(r => r.data),
  visaRulesByCountry: (code: string) => api.get(`/countries/${code}/visa-rules`).then(r => r.data),
  visaRuleDetail: (code: string, visaType: string) =>
    api.get(`/countries/${code}/visa-rules/${visaType}`).then(r => r.data),
};
// ─── Search ──────────────────────────────────────────────────────────────────

export const searchApi = {
  global: (params: { q: string; types?: string; limit?: number; offset?: number }) =>
    api.get('/search', { params }).then(r => r.data),
};

// ─── Tenant Usage ────────────────────────────────────────────────────────────

export const tenantUsageApi = {
  get: () => api.get('/billing/tenant/usage').then(r => r.data),
};

// ─── AI ───────────────────────────────────────────────────────────────────────

export const aiApi = {
  screenResume: (data: { resumeText: string; jobDescription?: string; candidateId?: string; jobId?: string }) =>
    api.post('/ai/screen-resume', data).then(r => r.data),
  parseJd: (text: string) => api.post('/ai/parse-jd', { jobDescription: text }).then(r => r.data),
  parseResume: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/ai/parse-resume', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
};

// ─── Documents ───────────────────────────────────────────────────────────────

export const documentsApi = {
  list: (params?: Record<string, any>) => api.get('/documents', { params }).then(r => r.data),
  get: (id: string) => api.get(`/documents/${id}`).then(r => r.data),
  upload: (file: File, type: string, linkedEntity?: { candidateId?: string; leadId?: string; companyId?: string; contactId?: string; jobId?: string }) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    if (linkedEntity?.candidateId) form.append('candidateId', linkedEntity.candidateId);
    if (linkedEntity?.leadId) form.append('leadId', linkedEntity.leadId);
    if (linkedEntity?.companyId) form.append('companyId', linkedEntity.companyId);
    if (linkedEntity?.contactId) form.append('contactId', linkedEntity.contactId);
    if (linkedEntity?.jobId) form.append('jobId', linkedEntity.jobId);
    return api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  getDownloadUrl: (id: string) => api.get(`/documents/${id}/download-url`).then(r => r.data),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  link: (id: string, data: { candidateId?: string; leadId?: string; companyId?: string; contactId?: string; jobId?: string }) =>
    api.patch(`/documents/${id}/link`, data).then(r => r.data),
  reparse: (id: string) => api.post(`/documents/${id}/reparse`).then(r => r.data),
  delete: (id: string) => api.delete(`/documents/${id}`).then(r => r.data),
};

// ─── Workflows ────────────────────────────────────────────────────────────────

export const workflowsApi = {
  list: (params?: Record<string, any>) => api.get('/workflows/runs', { params }).then(r => r.data),
  get: (id: string) => api.get(`/workflows/runs/${id}`).then(r => r.data),
  stats: (days = 30) => api.get('/workflows/stats', { params: { days } }).then(r => r.data),
  pause: (id: string, reason: string) => api.patch(`/workflows/runs/${id}/pause`, { reason }).then(r => r.data),
  resume: (id: string) => api.patch(`/workflows/runs/${id}/resume`).then(r => r.data),
  retry: (id: string) => api.patch(`/workflows/runs/${id}/retry`).then(r => r.data),
  cancel: (id: string, reason?: string) => api.patch(`/workflows/runs/${id}/cancel`, { reason }).then(r => r.data),
  override: (id: string, note: string, forceStatus?: string) =>
    api.post(`/workflows/runs/${id}/override`, { note, forceStatus }).then(r => r.data),
};

// ─── Audit ────────────────────────────────────────────────────────────────────

export const auditApi = {
  list: (params?: {
    entityType?: string;
    userId?: string;
    action?: string;
    entityId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => api.get('/audit', { params }).then(r => r.data),
};

// ─── Owner (SUPER_ADMIN only) ─────────────────────────────────────────────────

export const ownerApi = {
  overview: () => api.get('/owner/overview').then(r => r.data),
  tenants: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/owner/tenants', { params }).then(r => r.data),
  subscriptions: () => api.get('/owner/subscriptions').then(r => r.data),
  signups: (days?: number) => api.get('/owner/signups', { params: { days } }).then(r => r.data),
  aiUsage: (days?: number) => api.get('/owner/ai-usage', { params: { days } }).then(r => r.data),
};
