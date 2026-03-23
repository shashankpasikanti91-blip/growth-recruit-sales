'use client';
import { useState } from 'react';
import { Linkedin, Copy, CheckCheck, Sparkles, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

type Tool = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  promptKey: string;
};

const TOOLS: Tool[] = [
  {
    id: 'post',
    label: 'LinkedIn Post',
    description: 'Generate an engaging LinkedIn post from a topic or idea.',
    placeholder: 'e.g. "5 lessons learned hiring 50 engineers in 6 months"',
    promptKey: 'linkedin_post',
  },
  {
    id: 'connection',
    label: 'Connection Request Note',
    description: 'Write a personalised connection request message.',
    placeholder: 'e.g. "Reached out after seeing their post on AI in recruitment"',
    promptKey: 'linkedin_connection',
  },
  {
    id: 'inmailrec',
    label: 'Recruiter InMail',
    description: 'Craft a compelling recruiter InMail for a specific role.',
    placeholder: 'e.g. "Senior React Engineer at a Series B fintech, remote-first"',
    promptKey: 'linkedin_inmail_recruiter',
  },
  {
    id: 'inmailsales',
    label: 'Sales InMail',
    description: 'Write a sales outreach InMail to a B2B prospect.',
    placeholder: 'e.g. "CTO at a 50-person logistics company in Germany"',
    promptKey: 'linkedin_inmail_sales',
  },
  {
    id: 'profile',
    label: 'Profile About Section',
    description: 'Rewrite or generate your LinkedIn About section.',
    placeholder: 'e.g. "10 years in SaaS sales, recently moved into recruitment tech"',
    promptKey: 'linkedin_profile_about',
  },
  {
    id: 'comment',
    label: 'Thoughtful Comment',
    description: 'Generate an insightful comment to add value to a post.',
    placeholder: 'e.g. "Post about AI replacing developers, I want to add a nuanced view"',
    promptKey: 'linkedin_comment',
  },
];

export default function LinkedInPage() {
  const [activeTool, setActiveTool] = useState<Tool>(TOOLS[0]);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput('');
    try {
      const { data } = await api.post('/ai/linkedin', {
        type: activeTool.promptKey,
        context: input.trim(),
      });
      setOutput(data.content ?? data.result ?? JSON.stringify(data));
    } catch {
      setOutput('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0077B5] flex items-center justify-center">
          <Linkedin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LinkedIn AI Assistant</h1>
          <p className="text-gray-500 text-sm">AI-powered content generation for LinkedIn — no bots, just ideas</p>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => { setActiveTool(tool); setInput(''); setOutput(''); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium text-center transition-colors border ${
              activeTool.id === tool.id
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {tool.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">{activeTool.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{activeTool.description}</div>
          </div>
          <textarea
            rows={6}
            placeholder={activeTool.placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={generate}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors w-full justify-center"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {/* Output */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-900 text-sm">Generated Content</div>
            {output && (
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 transition-colors"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
          {output ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg px-4 py-3 min-h-[160px]">
              {output}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[160px] text-gray-300">
              <Sparkles className="w-10 h-10 mb-2" />
              <p className="text-sm">Your content will appear here</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        <strong>Note:</strong> This tool provides AI-generated suggestions to inspire your content. Always review and personalise before posting. This assistant does not automate LinkedIn actions or scrape data.
      </div>
    </div>
  );
}
