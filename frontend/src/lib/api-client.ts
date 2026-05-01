import api from '@/lib/api';

// ─── Candidates ──────────────────────────────────────────────────────────────

export const candidatesApi = {
  list: (params?: Record<string, any>) => api.get('/candidates', { params }).then(r => r.data),
  get: (id: string) => api.get(`/candidates/${id}`).then(r => r.data),
  create: (data: any) => api.post('/candidates', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/candidates/${id}`, data).then(r => r.data),
  archive: (id: string) => api.patch(`/candidates/${id}/archive`).then(r => r.data),
  addNote: (id: string, note: string) => api.post(`/candidates/${id}/notes`, { note }).then(r => r.data),
  uploadResume: (id: string, file: File) => {
    const form = new FormData();
    form.append('resume', file);
    return api.post(`/candidates/${id}/resume`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  listResumes: (id: string) => api.get(`/candidates/${id}/resumes`).then(r => r.data),
  getResumeDownloadUrl: (id: string, resumeId: string) =>
    api.get(`/candidates/${id}/resumes/${resumeId}/download-url`).then(r => r.data),
  updateStatus: (id: string, dto: { toStatus: string; notes?: string }) =>
    api.post(`/candidates/${id}/status`, dto).then(r => r.data),
  listStatusHistory: (id: string) => api.get(`/candidates/${id}/status-history`).then(r => r.data),
  getOnboarding: (id: string) => api.get(`/candidates/${id}/onboarding`).then(r => r.data),
  updateOnboarding: (id: string, dto: Record<string, any>) =>
    api.put(`/candidates/${id}/onboarding`, dto).then(r => r.data),
  booleanSearch: (dto: Record<string, any>) =>
    api.post('/candidates/boolean-search', dto).then(r => r.data),
  getPoolMemberships: (candidateId: string) =>
    api.get(`/candidates/${candidateId}/pool-memberships`).then(r => r.data),
};

// ─── Talent Pools ─────────────────────────────────────────────────────────────

export const talentPoolsApi = {
  list: () => api.get('/talent-pools').then(r => r.data),
  create: (dto: { name: string; description?: string }) =>
    api.post('/talent-pools', dto).then(r => r.data),
  get: (id: string) => api.get(`/talent-pools/${id}`).then(r => r.data),
  remove: (id: string) => api.delete(`/talent-pools/${id}`).then(r => r.data),
  addMember: (id: string, dto: { candidateId: string; notes?: string }) =>
    api.post(`/talent-pools/${id}/members`, dto).then(r => r.data),
  removeMember: (id: string, candidateId: string) =>
    api.delete(`/talent-pools/${id}/members/${candidateId}`).then(r => r.data),
  getCandidatePools: (candidateId: string) =>
    api.get(`/talent-pools/${candidateId}`).then(r => r.data),
};

// ─── Saved Searches ───────────────────────────────────────────────────────────

export const savedSearchesApi = {
  list: () => api.get('/saved-searches').then(r => r.data),
  create: (dto: { name: string; description?: string; queryJson: Record<string, any>; entityType?: string }) =>
    api.post('/saved-searches', dto).then(r => r.data),
  remove: (id: string) => api.delete(`/saved-searches/${id}`).then(r => r.data),
};

// ─── My Hub ───────────────────────────────────────────────────────────────────

export const myHubApi = {
  getProfile:       () => api.get('/my/profile').then(r => r.data),
  updateProfile:    (dto: { firstName?: string; lastName?: string; settings?: Record<string, any> }) =>
                      api.put('/my/profile', dto).then(r => r.data),
  getDashboard:     () => api.get('/my/dashboard').then(r => r.data),
  getMyJDs:         (params?: { page?: number; limit?: number }) =>
                      api.get('/my/jds', { params }).then(r => r.data),
  getMySubmissions: (params?: { page?: number; limit?: number; stage?: string }) =>
                      api.get('/my/submissions', { params }).then(r => r.data),
  getMyLeads:       (params?: { page?: number; limit?: number; stage?: string }) =>
                      api.get('/my/leads', { params }).then(r => r.data),
  getMyFollowUps:   (params?: { view?: string; page?: number; limit?: number }) =>
                      api.get('/my/follow-ups', { params }).then(r => r.data),
  getMyActivity:    (params?: { page?: number; limit?: number }) =>
                      api.get('/my/activity', { params }).then(r => r.data),
};

// ─── Connect (Phase 08 — Communication Channels) ─────────────────────────────

export const connectApi = {
  // Status
  getChannelStatuses: () => api.get('/integrations/connect/status').then(r => r.data),
  // Gmail (per-user)
  getGmailAuthUrl:    () => api.get('/integrations/gmail/auth-url').then(r => r.data as { url: string }),
  getGmailStatus:     () => api.get('/integrations/gmail/status').then(r => r.data),
  disconnectGmail:    () => api.delete('/integrations/gmail').then(r => r.data),
  // Outlook (per-user)
  getOutlookAuthUrl:  () => api.get('/integrations/outlook/auth-url').then(r => r.data as { url: string }),
  getOutlookStatus:   () => api.get('/integrations/outlook/status').then(r => r.data),
  disconnectOutlook:  () => api.delete('/integrations/outlook').then(r => r.data),
  // WhatsApp (admin/tenant)
  saveWhatsApp:       (dto: { phoneNumberId: string; accessToken: string }) =>
                        api.post('/integrations/whatsapp', dto).then(r => r.data),
  getWhatsAppStatus:  () => api.get('/integrations/whatsapp/status').then(r => r.data),
  // Telegram (admin/tenant)
  saveTelegram:       (dto: { botToken: string; teamChatId?: string }) =>
                        api.post('/integrations/telegram', dto).then(r => r.data),
  getTelegramStatus:  () => api.get('/integrations/telegram/status').then(r => r.data),
  // Microsoft Teams (admin/tenant)
  saveTeams:          (dto: { webhookUrl: string; channel?: string }) =>
                        api.post('/integrations/teams', dto).then(r => r.data),
  getTeamsStatus:     () => api.get('/integrations/teams/status').then(r => r.data),
  // Direct send
  sendEmail:          (dto: { to: string; toName?: string; subject: string; body: string }) =>
                        api.post('/integrations/send-email', dto).then(r => r.data),
  sendWhatsApp:       (dto: { to: string; text: string; templateName?: string }) =>
                        api.post('/integrations/send-whatsapp', dto).then(r => r.data),
  sendTelegram:       (dto: { chatId: string; text: string }) =>
                        api.post('/integrations/send-telegram', dto).then(r => r.data),
};

// ─── Reports & Analytics (Phase 09) ──────────────────────────────────────────

export const reportsApi = {
  placementVelocity:    (params?: Record<string, any>) =>
                          api.get('/reports/placement-velocity', { params }).then(r => r.data),
  salesPipeline:        (params?: Record<string, any>) =>
                          api.get('/reports/sales-pipeline', { params }).then(r => r.data),
  recruiterPerformance: (params?: Record<string, any>) =>
                          api.get('/reports/recruiter-performance', { params }).then(r => r.data),
  clientActivity:       (params?: Record<string, any>) =>
                          api.get('/reports/client-activity', { params }).then(r => r.data),
  aiUsage:              (params?: Record<string, any>) =>
                          api.get('/reports/ai-usage', { params }).then(r => r.data),
  getWidgetLayout:      () => api.get('/reports/dashboard/widgets').then(r => r.data),
  saveWidgetLayout:     (layout: string[]) =>
                          api.put('/reports/dashboard/widgets', { layout }).then(r => r.data),
  exportUrl:            (report: string, format: 'csv' | 'xlsx', params?: Record<string, any>) => {
    const q = new URLSearchParams({ ...params, format }).toString();
    return `/api/v1/reports/${report}?${q}`;
  },
};

// ─── Notifications ─────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }).then(r => r.data),
  unreadCount: () =>
    api.get('/notifications/unread-count').then(r => r.data as { count: number }),
  preview: () =>
    api.get('/notifications/preview').then(r => r.data as any[]),
  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () =>
    api.patch('/notifications/read-all').then(r => r.data),
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

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clientsApi = {
  list:    (params?: Record<string, any>) => api.get('/clients', { params }).then(r => r.data),
  get:     (id: string) => api.get(`/clients/${id}`).then(r => r.data),
  create:  (data: any) => api.post('/clients', data).then(r => r.data),
  update:  (id: string, data: any) => api.patch(`/clients/${id}`, data).then(r => r.data),
  remove:  (id: string) => api.delete(`/clients/${id}`).then(r => r.data),
  convert: (data: { leadId?: string; companyId?: string; salesOwnerId?: string; paymentTerms?: string; notes?: string }) =>
    api.post('/clients/convert', data).then(r => r.data),
  stats:   () => api.get('/clients/stats').then(r => r.data),
};

// ─── Opportunities ────────────────────────────────────────────────────────────

export const opportunitiesApi = {
  list:     (params?: Record<string, any>) => api.get('/opportunities', { params }).then(r => r.data),
  get:      (id: string) => api.get(`/opportunities/${id}`).then(r => r.data),
  create:   (data: any) => api.post('/opportunities', data).then(r => r.data),
  update:   (id: string, data: any) => api.patch(`/opportunities/${id}`, data).then(r => r.data),
  remove:   (id: string) => api.delete(`/opportunities/${id}`).then(r => r.data),
  pipeline: () => api.get('/opportunities/pipeline').then(r => r.data),
};

// ─── Follow Ups ───────────────────────────────────────────────────────────────

export const followUpsApi = {
  list:     (params?: Record<string, any>) => api.get('/follow-ups', { params }).then(r => r.data),
  get:      (id: string) => api.get(`/follow-ups/${id}`).then(r => r.data),
  create:   (data: any) => api.post('/follow-ups', data).then(r => r.data),
  update:   (id: string, data: any) => api.patch(`/follow-ups/${id}`, data).then(r => r.data),
  remove:   (id: string) => api.delete(`/follow-ups/${id}`).then(r => r.data),
  markDone: (id: string) => api.patch(`/follow-ups/${id}/done`).then(r => r.data),
  today:    () => api.get('/follow-ups/today').then(r => r.data),
};

// ─── Submissions ──────────────────────────────────────────────────────────────

export const submissionsApi = {
  list:   (params?: Record<string, any>) => api.get('/submissions', { params }).then(r => r.data),
  get:    (id: string) => api.get(`/submissions/${id}`).then(r => r.data),
  create: (data: any) => api.post('/submissions', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/submissions/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/submissions/${id}`).then(r => r.data),
  stats:  () => api.get('/submissions/stats').then(r => r.data),
  clientFeedback: (id: string, data: { feedback: string; stage?: string }) =>
    api.put(`/submissions/${id}/client-feedback`, data).then(r => r.data),
};

// ─── Interviews ───────────────────────────────────────────────────────────────

export const interviewsApi = {
  list:   (params?: Record<string, any>) => api.get('/interviews', { params }).then(r => r.data),
  get:    (id: string) => api.get(`/interviews/${id}`).then(r => r.data),
  create: (data: any) => api.post('/interviews', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/interviews/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/interviews/${id}`).then(r => r.data),
  stats:  () => api.get('/interviews/stats').then(r => r.data),
};

// ─── Offers ───────────────────────────────────────────────────────────────────

export const offersApi = {
  list:   (params?: Record<string, any>) => api.get('/offers', { params }).then(r => r.data),
  get:    (id: string) => api.get(`/offers/${id}`).then(r => r.data),
  create: (data: any) => api.post('/offers', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/offers/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/offers/${id}`).then(r => r.data),
  stats:  () => api.get('/offers/stats').then(r => r.data),
};

// ─── Proposals ────────────────────────────────────────────────────────────────

export const proposalsApi = {
  list:   (params?: Record<string, any>) => api.get('/proposals', { params }).then(r => r.data),
  get:    (id: string) => api.get(`/proposals/${id}`).then(r => r.data),
  create: (data: any) => api.post('/proposals', data).then(r => r.data),
  update: (id: string, data: any) => api.patch(`/proposals/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/proposals/${id}`).then(r => r.data),
  stats:  () => api.get('/proposals/stats').then(r => r.data),
};

// ─── Users (Team) ─────────────────────────────────────────────────────────────

export const usersApi = {
  list: (params?: Record<string, any>) => api.get('/users', { params }).then(r => r.data),
  get: (id: string) => api.get(`/users/${id}`).then(r => r.data),
  me: () => api.get('/users/me').then(r => r.data),
  listRecruiters: () => api.get('/team/recruiters').then(r => r.data),
};

