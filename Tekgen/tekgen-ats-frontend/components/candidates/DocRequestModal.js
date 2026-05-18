import { useState } from 'react';
import { Send, Check } from 'lucide-react';

const LOCAL_DOCS = [
  'Educational Documents',
  'Last 3 Months Pay Slips',
  'Previous Employment Offer Letters',
  'Filled Bestinet Application Form',
  'IC Copy',
];

const EXPAT_DOCS = [
  'Educational Documents (10th, 12th, Degree)',
  'Passport-size Photo (Blue Background)',
  'Last 3 Months Pay Slips',
  'Experience Letters (Previous Employments)',
  'Full Passport Copy (All Pages)',
];

export default function DocRequestModal({ candidate, onClose }) {
  const [type, setType]     = useState('LOCAL');
  const [checked, setChecked] = useState({});
  const [note, setNote]     = useState('');
  const [copied, setCopied] = useState(false);

  const docs = type === 'LOCAL' ? LOCAL_DOCS : EXPAT_DOCS;
  const fullName = ((candidate?.firstName || '') + ' ' + (candidate?.lastName || '')).trim();

  const toggleAll = () => {
    const m = {};
    docs.forEach((_, i) => { m[i] = true; });
    setChecked(m);
  };

  const handleCopy = () => {
    const selected = docs.filter((_, i) => checked[i]);
    if (selected.length === 0) return;
    const list = selected.map((d, i) => `${i + 1}. ${d}`).join('\n');
    const body = `Dear ${fullName},\n\nCongratulations on your selection! We are pleased to have you onboard at Tekgen.\n\nKindly send us the following documents at your earliest to proceed with the joining formalities:\n\n${list}${note ? `\n\nAdditional Note:\n${note}` : ''}\n\nPlease send all documents in PDF / scanned format to recruitment@tekgen.com.\n\nWarm regards,\nTekgen Recruitment Team`;
    navigator.clipboard.writeText(`Subject: Required Documents – Joining Formalities | Tekgen\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Request Documents</h2>
            <p className="text-xs text-slate-500">{fullName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">&times;</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {['LOCAL', 'EXPAT'].map(t => (
              <button key={t} onClick={() => { setType(t); setChecked({}); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  type === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>{t === 'LOCAL' ? 'Local (Malaysian)' : 'Expat (Foreign)'}</button>
            ))}
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-700">Required Documents</p>
              <button onClick={toggleAll} className="text-[11px] text-indigo-600 hover:underline">Select All</button>
            </div>
            <div className="space-y-2">
              {docs.map((d, i) => (
                <label key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={!!checked[i]} onChange={() => setChecked(p => ({ ...p, [i]: !p[i] }))}
                    className="w-4 h-4 rounded text-indigo-500" />
                  <span className="text-xs text-slate-700">{d}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Note */}
          <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
            placeholder="Additional instructions (optional)"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none" />
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="py-1.5 px-4 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">Cancel</button>
          <button onClick={handleCopy} disabled={Object.values(checked).every(v => !v)}
            className="py-1.5 px-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5">
            {copied ? <><Check size={11} /> Copied!</> : <><Send size={11} /> Copy Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}
