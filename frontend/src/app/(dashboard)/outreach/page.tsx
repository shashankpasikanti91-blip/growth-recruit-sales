'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outreachApi, candidatesApi, leadsApi, jobsApi } from '@/lib/api-client';
import {
  Mail, Zap, Linkedin, MessageCircle, Calendar, Clock, CheckCircle2,
  ChevronDown, ChevronRight, Video, Phone,
  MapPin, ExternalLink, Copy, Check, Info, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format, addDays } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray', PENDING_APPROVAL: 'badge-yellow', APPROVED: 'badge-blue',
  SENT: 'badge-blue', REPLIED: 'badge-green', BOUNCED: 'badge-red', SUPPRESSED: 'badge-red',
};

const CHANNEL_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  EMAIL:    { label: 'Email',    icon: Mail,          color: 'text-blue-600',  bg: 'bg-blue-50' },
  LINKEDIN: { label: 'LinkedIn', icon: Linkedin,      color: 'text-blue-700',  bg: 'bg-blue-100' },
  WHATSAPP: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
};

const PLAYBOOKS = [
  {
    id: 'recruitment', label: 'Recruitment Sequence', target: 'Candidates', color: 'border-blue-200 bg-blue-50',
    steps: [
      { day: 1,  channel: 'EMAIL',    title: 'Introduction',    desc: 'Introduce yourself, share the role, and ask if they are open to a conversation.' },
      { day: 3,  channel: 'LINKEDIN', title: 'LinkedIn Connect', desc: 'Send a personalised LinkedIn connection request mentioning the opportunity.' },
      { day: 7,  channel: 'EMAIL',    title: 'Follow-up 1',     desc: 'Short follow-up email referencing the original. Add one new compelling detail.' },
      { day: 12, channel: 'EMAIL',    title: 'Follow-up 2',     desc: 'Check if timing is right — offer a different approach or role if applicable.' },
      { day: 18, channel: 'EMAIL',    title: 'Final Touch',     desc: 'Respectful closing email. Leave the door open for future opportunities.' },
    ],
  },
  {
    id: 'sales', label: 'Sales / Lead Sequence', target: 'Leads', color: 'border-purple-200 bg-purple-50',
    steps: [
      { day: 1,  channel: 'EMAIL',    title: 'Introduction',    desc: 'Introduce your platform, personalised to their industry and company size.' },
      { day: 2,  channel: 'LINKEDIN', title: 'LinkedIn Connect', desc: 'Connect on LinkedIn — reference the email for context.' },
      { day: 5,  channel: 'EMAIL',    title: 'Value Email',     desc: 'Share a relevant case study or ROI stat. No hard sell.' },
      { day: 9,  channel: 'WHATSAPP', title: 'WhatsApp Ping',   desc: 'Short, warm WhatsApp message for warm leads only. Use chat tone, not email tone.' },
      { day: 14, channel: 'EMAIL',    title: 'Follow-up 2',     desc: 'Ask a direct question: "Would 15 minutes this week make sense?" Offer booking link.' },
      { day: 21, channel: 'EMAIL',    title: 'Break-up Email',  desc: 'Final email. Honest and respectful. Offer to reconnect at a better time.' },
    ],
  },
  {
    id: 'reengagement', label: 'Re-engagement Sequence', target: 'Cold leads / past candidates', color: 'border-amber-200 bg-amber-50',
    steps: [
      { day: 1,  channel: 'EMAIL',    title: 'Reconnect',    desc: 'Reference your last interaction. Acknowledge the time gap. Keep it warm and personal.' },
      { day: 5,  channel: 'LINKEDIN', title: 'LinkedIn DM',  desc: 'Quick LinkedIn message — "Thought of you when I saw this role / news."' },
      { day: 10, channel: 'EMAIL',    title: 'New Angle',    desc: 'Share something genuinely useful — a market insight, salary benchmark, or intro.' },
    ],
  },
];

const CHANNEL_RULES = [
  { channel: 'Email',    icon: Mail,          color: 'text-blue-600',  rules: ['Max 5–6 emails per campaign','Min 3 days between emails','Include unsubscribe link in every email','Use your own SMTP account'] },
  { channel: 'LinkedIn', icon: Linkedin,      color: 'text-blue-700',  rules: ['Max 2–3 messages per contact','Personalise every connection request','Use InMail for warm prospects only','Comply with LinkedIn ToS'] },
  { channel: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', rules: ['Only for warm / known contacts','Strictly via WhatsApp Business API','Max 2 messages per campaign','Honour opt-out immediately'] },
];

function PlaybookPanel() {
  const [open, setOpen] = useState<string | null>('recruitment');
  const today = new Date();
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-brand-600" />
        <h2 className="font-semibold text-gray-900">Follow-up Sequence Playbook</h2>
        <span className="ml-auto text-xs text-gray-400">Recommended best practice</span>
      </div>
      <p className="text-xs text-gray-500">
        Use the Generate tab to create AI messages for any of these steps. Each step is sent via a different channel to maximise response rates.
      </p>
      <div className="space-y-3">
        {PLAYBOOKS.map(pb => {
          const isOpen = open === pb.id;
          return (
            <div key={pb.id} className={`rounded-xl border-2 ${pb.color} overflow-hidden`}>
              <button className="w-full flex items-center justify-between px-4 py-3 text-left" onClick={() => setOpen(isOpen ? null : pb.id)}>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900 text-sm">{pb.label}</span>
                  <span className="text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">{pb.target}</span>
                  <span className="text-xs text-gray-400">{pb.steps.length} steps</span>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="relative">
                    <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-3">
                      {pb.steps.map((step, idx) => {
                        const ch = CHANNEL_CONFIG[step.channel];
                        const Icon = ch.icon;
                        const dateLabel = format(addDays(today, step.day - 1), 'MMM d');
                        return (
                          <div key={idx} className="flex gap-3 relative">
                            <div className={`relative z-10 w-10 h-10 rounded-full ${ch.bg} flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm`}>
                              <Icon className={`w-4 h-4 ${ch.color}`} />
                            </div>
                            <div className="flex-1 bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ch.bg} ${ch.color}`}>Day {step.day}</span>
                                <span className="font-semibold text-gray-800 text-xs">{step.title}</span>
                                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{ch.label}</span>
                                <span className="text-xs text-gray-400">{dateLabel}</span>
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Channel Best Practices</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CHANNEL_RULES.map(({ channel, icon: Icon, color, rules }) => (
            <div key={channel} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="font-semibold text-gray-800 text-sm">{channel}</span>
              </div>
              <ul className="space-y-1.5">
                {rules.map(r => (
                  <li key={r} className="flex items-start gap-1.5 text-xs text-gray-500">
                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />{r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GenerateForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ targetType: 'CANDIDATE', targetId: '', channel: 'EMAIL', sequenceSteps: 1, jobId: '', tone: 'Professional', purpose: 'Introduction' });
  const { data: candidatesData } = useQuery({ queryKey: ['outreach-candidates'], queryFn: () => candidatesApi.list({ limit: 100 }) });
  const { data: leadsData }      = useQuery({ queryKey: ['outreach-leads'],      queryFn: () => leadsApi.list({ limit: 100 }) });
  const { data: jobsData }       = useQuery({ queryKey: ['outreach-jobs'],       queryFn: () => jobsApi.list({ limit: 100 }) });
  const candidates: any[] = candidatesData?.data ?? [];
  const leads: any[]      = leadsData?.data ?? [];
  const jobs: any[]       = jobsData?.data ?? [];
  const mutation = useMutation({
    mutationFn: () => outreachApi.generate({ ...form, metadata: { tone: form.tone, purpose: form.purpose } }),
    onSuccess: () => { toast.success('Outreach generated!'); queryClient.invalidateQueries({ queryKey: ['outreach-messages'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Generation failed'),
  });
  const ch = CHANNEL_CONFIG[form.channel];
  const ChIcon = ch.icon;
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Zap className="w-4 h-4 text-purple-500" /> Generate Outreach Message</h2>
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-xs text-amber-700">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>Messages are <strong>AI-drafted</strong> and saved as DRAFT. Review before sending. Configure SMTP or channel keys in <a href="/settings" className="underline font-semibold">Settings</a>.</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Target Type</label>
          <select className="input" value={form.targetType} onChange={e => setForm(f => ({ ...f, targetType: e.target.value, targetId: '' }))}>
            <option value="CANDIDATE">👤 Candidate</option>
            <option value="LEAD">🎯 Lead</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
          <select className="input" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
            <option value="EMAIL">📧 Email</option>
            <option value="LINKEDIN">💼 LinkedIn</option>
            <option value="WHATSAPP">💬 WhatsApp</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">{form.targetType === 'CANDIDATE' ? 'Select Candidate' : 'Select Lead'}</label>
        {form.targetType === 'CANDIDATE' ? (
          <select className="input" value={form.targetId} onChange={e => setForm(f => ({ ...f, targetId: e.target.value }))}>
            <option value="">— Choose a candidate —</option>
            {candidates.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.currentTitle ? ` — ${c.currentTitle}` : ''}{c.currentCompany ? ` @ ${c.currentCompany}` : ''}</option>)}
          </select>
        ) : (
          <select className="input" value={form.targetId} onChange={e => setForm(f => ({ ...f, targetId: e.target.value }))}>
            <option value="">— Choose a lead —</option>
            {leads.map((l: any) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}{l.title ? ` — ${l.title}` : ''}{l.company?.name ? ` @ ${l.company.name}` : ''}</option>)}
          </select>
        )}
      </div>
      {form.targetType === 'CANDIDATE' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Job Context (optional)</label>
          <select className="input" value={form.jobId} onChange={e => setForm(f => ({ ...f, jobId: e.target.value }))}>
            <option value="">— No specific job —</option>
            {jobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}{j.location ? ` · ${j.location}` : ''}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
          <select className="input" value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
            <option>Professional</option><option>Warm</option><option>Bold</option><option>Casual</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Purpose</label>
          <select className="input" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
            <option>Introduction</option><option>Follow-up</option><option>Re-engagement</option><option>Proposal</option><option>Meeting Request</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Steps in sequence</label>
          <input type="number" min={1} max={6} className="input" value={form.sequenceSteps} onChange={e => setForm(f => ({ ...f, sequenceSteps: Number(e.target.value) }))} />
        </div>
      </div>
      <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.targetId} className="btn-primary flex items-center gap-2">
        {mutation.isPending ? <><RefreshCw className="w-4 h-4 animate-spin" />Generating...</> : <><ChIcon className="w-4 h-4" />Generate {ch.label} Message</>}
      </button>
    </div>
  );
}

function MeetingScheduler() {
  const [form, setForm] = useState({ title: '', targetType: 'CANDIDATE', targetId: '', date: format(addDays(new Date(), 1), 'yyyy-MM-dd'), time: '10:00', duration: '30', type: 'VIDEO', location: '', notes: '' });
  const [scheduled, setScheduled] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: candidatesData } = useQuery({ queryKey: ['meet-candidates'], queryFn: () => candidatesApi.list({ limit: 100 }) });
  const { data: leadsData }      = useQuery({ queryKey: ['meet-leads'],      queryFn: () => leadsApi.list({ limit: 100 }) });
  const candidates: any[] = candidatesData?.data ?? [];
  const leads: any[]      = leadsData?.data ?? [];
  const people = form.targetType === 'CANDIDATE' ? candidates : leads;
  const selectedPerson = people.find((p: any) => p.id === form.targetId);

  const buildGCalLink = () => {
    if (!form.date || !form.time || !form.targetId) return null;
    const [h, m] = form.time.split(':').map(Number);
    const dur = parseInt(form.duration);
    const endH = h + Math.floor((m + dur) / 60);
    const endM = (m + dur) % 60;
    const start = `${form.date.replace(/-/g, '')}T${String(h).padStart(2,'0')}${String(m).padStart(2,'0')}00`;
    const end   = `${form.date.replace(/-/g, '')}T${String(endH).padStart(2,'0')}${String(endM).padStart(2,'0')}00`;
    const person = selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : '';
    const title   = encodeURIComponent(form.title || `Meeting with ${person}`);
    const details = encodeURIComponent(form.notes || 'Scheduled via SRP AI Labs');
    const loc     = encodeURIComponent(form.location || '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${loc}`;
  };

  const handleSchedule = () => {
    if (!form.targetId || !form.date || !form.time) { toast.error('Please fill in all required fields'); return; }
    const person = selectedPerson ? `${selectedPerson.firstName} ${selectedPerson.lastName}` : 'Contact';
    setScheduled({ ...form, personName: person, gcalLink: buildGCalLink() });
    toast.success(`Meeting scheduled with ${person}!`);
  };

  const MEETING_TYPES = [{ value: 'VIDEO', label: 'Video Call', icon: Video }, { value: 'PHONE', label: 'Phone Call', icon: Phone }, { value: 'IN_PERSON', label: 'In Person', icon: MapPin }];
  const DURATIONS     = [{ value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '45', label: '45 min' }, { value: '60', label: '1 hour' }, { value: '90', label: '1.5 hrs' }];

  return (
    <div className="card space-y-5">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-600" /> Schedule a Meeting</h2>
      {scheduled ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Meeting scheduled with {scheduled.personName}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-400 mb-1">Date & Time</p>
                <p className="font-semibold text-gray-800">{format(new Date(`${scheduled.date}T${scheduled.time}`), 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-gray-600">{scheduled.time} · {scheduled.duration} min</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-400 mb-1">Type</p>
                <p className="font-semibold text-gray-800">{MEETING_TYPES.find(t => t.value === scheduled.type)?.label}</p>
                {scheduled.location && <p className="text-gray-500 text-xs truncate">{scheduled.location}</p>}
              </div>
            </div>
            {scheduled.notes && <div className="bg-white rounded-lg p-3 border border-green-100"><p className="text-xs text-gray-400 mb-1">Notes</p><p className="text-sm text-gray-700">{scheduled.notes}</p></div>}
            {scheduled.gcalLink && (
              <div className="flex gap-2">
                <a href={scheduled.gcalLink} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 text-sm bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-700 transition-colors">
                  <ExternalLink className="w-4 h-4" /> Add to Google Calendar
                </a>
                <button onClick={() => { navigator.clipboard.writeText(scheduled.gcalLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-2 text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setScheduled(null)} className="text-sm text-brand-600 font-medium hover:underline">← Schedule another meeting</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Title</label>
            <input type="text" className="input" placeholder="e.g. Initial interview call, Discovery meeting..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Meeting with</label>
              <select className="input" value={form.targetType} onChange={e => setForm(f => ({ ...f, targetType: e.target.value, targetId: '' }))}>
                <option value="CANDIDATE">👤 Candidate</option><option value="LEAD">🎯 Lead</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Select person *</label>
              <select className="input" value={form.targetId} onChange={e => setForm(f => ({ ...f, targetId: e.target.value }))}>
                <option value="">— Select —</option>
                {people.map((p: any) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.title ? ` — ${p.title}` : ''}{(p.company?.name || p.currentCompany) ? ` @ ${p.company?.name || p.currentCompany}` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" className="input" value={form.date} min={format(new Date(), 'yyyy-MM-dd')} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Time *</label>
              <input type="time" className="input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
              <select className="input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}>
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Meeting Type</label>
            <div className="flex gap-2">
              {MEETING_TYPES.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setForm(f => ({ ...f, type: value, location: '' }))}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-colors ${form.type === value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{form.type === 'VIDEO' ? 'Video Link (Zoom/Teams/Meet)' : form.type === 'PHONE' ? 'Phone Number' : 'Location Address'}</label>
            <input type="text" className="input" placeholder={form.type === 'VIDEO' ? 'https://meet.google.com/...' : form.type === 'PHONE' ? '+60 12-345-6789' : 'Office address or venue...'} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Agenda</label>
            <textarea rows={3} className="input resize-none" placeholder="Agenda, preparation notes, key topics..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={handleSchedule} disabled={!form.targetId || !form.date || !form.time} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            <Calendar className="w-4 h-4" />Schedule Meeting & Get Calendar Link
          </button>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'playbook', label: 'Follow-up Playbook', icon: Calendar },
  { id: 'generate', label: 'Generate Message',   icon: Zap },
  { id: 'schedule', label: 'Schedule Meeting',   icon: Video },
  { id: 'messages', label: 'All Messages',        icon: Mail },
];

export default function OutreachPage() {
  const [tab, setTab] = useState('playbook');
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['outreach-messages', status],
    queryFn: () => outreachApi.listMessages({ status: status || undefined, limit: 50 }),
    enabled: tab === 'messages',
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
        <p className="text-gray-500 text-sm mt-1">AI-generated messages · Multi-channel sequences · Meeting scheduling</p>
      </div>
      <div className="flex gap-3 flex-wrap">
        {Object.entries(CHANNEL_CONFIG).map(([key, ch]) => {
          const Icon = ch.icon;
          return (
            <div key={key} className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${ch.bg}`}>
              <Icon className={`w-3.5 h-3.5 ${ch.color}`} />
              <span className={ch.color}>{ch.label}</span>
            </div>
          );
        })}
      </div>
      <div className="border-b border-gray-200">
        <div className="flex">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tab === 'playbook' && <PlaybookPanel />}
      {tab === 'generate' && <GenerateForm />}
      {tab === 'schedule' && <MeetingScheduler />}
      {tab === 'messages' && (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900 text-sm">All Messages</span>
            <select className="input ml-auto w-40 text-xs" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {['DRAFT','PENDING_APPROVAL','APPROVED','SENT','REPLIED','BOUNCED','SUPPRESSED'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Channel','Recipient','Subject / Message','Status','Step','Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : !data?.data?.length ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No messages yet — use the Generate tab to create your first outreach</td></tr>
              ) : data?.data?.map((msg: any) => {
                const ch = CHANNEL_CONFIG[msg.channel];
                const Icon = ch?.icon ?? Mail;
                return (
                  <tr key={msg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${ch?.bg ?? 'bg-gray-100'} ${ch?.color ?? 'text-gray-600'}`}>
                        <Icon className="w-3 h-3" />{ch?.label ?? msg.channel}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{msg.candidate ? `${msg.candidate.firstName} ${msg.candidate.lastName}` : msg.lead ? `${msg.lead.firstName} ${msg.lead.lastName}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate text-xs">{msg.subject ?? msg.body?.slice(0, 60) ?? '—'}</td>
                    <td className="px-4 py-3"><span className={STATUS_BADGE[msg.status] ?? 'badge-gray'}>{msg.status}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">Step {msg.stepNumber}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}