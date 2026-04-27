'use client';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi } from '@/lib/api-client';
import Link from 'next/link';
import { UserPlus, Search, Briefcase, Copy, Check, X, ChevronLeft, ChevronRight, Zap, Star, Filter, MapPin, ChevronDown } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { BulkScreenModal } from '@/components/candidates/BulkScreenModal';
import { TableWrapper } from '@/components/ui/table-wrapper';

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  SOURCED:      { label: 'Sourced',      color: 'bg-gray-100 text-gray-700' },
  SCREENED:     { label: 'Screened',     color: 'bg-purple-100 text-purple-700' },
  INTERVIEWING: { label: 'Interviewing', color: 'bg-blue-100 text-blue-700' },
  OFFERED:      { label: 'Offered',      color: 'bg-emerald-100 text-emerald-700' },
  PLACED:       { label: 'Placed',       color: 'bg-green-100 text-green-700' },
  REJECTED:     { label: 'Rejected',     color: 'bg-red-100 text-red-700' },
  WITHDRAWN:    { label: 'Withdrawn',    color: 'bg-amber-100 text-amber-700' },
};
const VISA_CONFIG: Record<string, string> = {
  CITIZEN:'bg-emerald-50 text-emerald-700', PR:'bg-green-50 text-green-700',
  VALID:'bg-blue-50 text-blue-700', EXPIRING_SOON:'bg-amber-50 text-amber-700', EXPIRED:'bg-red-50 text-red-700',
};
const SCORE_COLOR = (s: number) => s >= 75 ? 'text-green-600' : s >= 55 ? 'text-amber-600' : 'text-red-500';
const SCORE_BAR   = (s: number) => s >= 75 ? 'bg-green-500' : s >= 55 ? 'bg-amber-400' : 'bg-red-400';
const SCORE_LABEL = (s: number) => s >= 75 ? 'Hire-Ready' : s >= 55 ? 'KIV' : 'Reject';
const noticePeriodLabel = (d?: number | null) => { if (d == null) return null; if (d===0) return 'Immediate'; if (d<=14) return d+'d'; if (d<=60) return Math.round(d/7)+'w'; return Math.round(d/30)+'mo'; };
const EXP_FILTERS = ['Any','0-2 yrs','2-5 yrs','5-10 yrs','10+ yrs'];
const SOURCE_OPTS = ['MANUAL','LINKEDIN','REFERRAL','JOB_BOARD','CSV','APOLLO','SCRAPER','EMAIL'];

function StarRating({ rating }: { rating: number }) {
  if (!rating) return <span className="text-gray-300 text-xs">-</span>;
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i=><Star key={i} className={"w-3 h-3 "+(i<=rating?'fill-amber-400 text-amber-400':'text-gray-200')} />)}</div>;
}
function SkeletonRow() {
  return <tr className="animate-pulse">{Array.from({length:17}).map((_,i)=><td key={i} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded w-20" /></td>)}</tr>;
}

export default function CandidatesPage() {
  const [search, setSearch]           = useState('');
  const [stageFilter, setStage]       = useState('');
  const [visaFilter, setVisa]         = useState('');
  const [expFilter, setExp]           = useState('');
  const [sourceFilter, setSource]     = useState('');
  const [skillsFilter, setSkills]     = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage]               = useState(1);
  const [copiedId, setCopiedId]       = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkScreen, setShowBulkScreen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, stageFilter, visaFilter, expFilter, sourceFilter, skillsFilter, page],
    queryFn: () => candidatesApi.list({ search: search || undefined, skills: skillsFilter || undefined, page, limit: 25 }),
    placeholderData: (prev: any) => prev,
  });

  const candidates: any[] = (() => {
    const list = data?.data ?? [];
    return list.filter((c: any) => {
      if (stageFilter && c.stage !== stageFilter) return false;
      if (visaFilter && c.visaStatus !== visaFilter) return false;
      if (sourceFilter && (c.sourceName ?? c.source ?? '').toUpperCase() !== sourceFilter) return false;
      if (expFilter && expFilter !== 'Any') {
        const y = c.yearsExperience ?? 0;
        if (expFilter === '0-2 yrs' && y > 2) return false;
        if (expFilter === '2-5 yrs' && (y < 2 || y > 5)) return false;
        if (expFilter === '5-10 yrs' && (y < 5 || y > 10)) return false;
        if (expFilter === '10+ yrs' && y < 10) return false;
      }
      return true;
    });
  })();

  const activeCount = [stageFilter, visaFilter, (expFilter && expFilter !== 'Any') ? expFilter : '', sourceFilter, skillsFilter].filter(Boolean).length;
  const clearFilters = useCallback(() => { setStage(''); setVisa(''); setExp(''); setSource(''); setSkills(''); setPage(1); }, []);
  const allSelected = candidates.length > 0 && candidates.every((c:any) => selectedIds.has(c.id));
  const toggleAll = () => allSelected ? setSelectedIds(new Set()) : setSelectedIds(new Set(candidates.map((c:any)=>c.id)));

  return (
    <div className="space-y-5">
      {showBulkScreen && (
        <BulkScreenModal selectedCandidates={candidates.filter((c:any)=>selectedIds.has(c.id))} onClose={()=>{setShowBulkScreen(false);setSelectedIds(new Set());}} />
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data?.meta?.total ?? '-'} total {activeCount > 0 && '· '+activeCount+' filter'+(activeCount>1?'s':'')+' active'}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && <button onClick={()=>setShowBulkScreen(true)} className="btn-primary flex items-center gap-2 text-sm"><Zap className="w-4 h-4" /> Screen {selectedIds.size} vs JD</button>}
          <Link href="/candidates/new" className="btn-secondary flex items-center gap-1.5 text-sm"><UserPlus className="w-4 h-4" /> Add Candidate</Link>
        </div>
      </div>
      <div className="card p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 text-sm" placeholder="Name, email, title, company..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} />
          </div>
          <button onClick={()=>setShowFilters(f=>!f)} className={"flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border transition-colors "+(showFilters||activeCount>0?'border-brand-400 text-brand-600 bg-brand-50':'border-gray-200 text-gray-600 hover:border-brand-300')}>
            <Filter className="w-4 h-4" /> Filters {activeCount>0&&<span className="ml-1 bg-brand-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeCount}</span>}
            <ChevronDown className={"w-3.5 h-3.5 transition-transform "+(showFilters?'rotate-180':'')} />
          </button>
          {(search||activeCount>0)&&<button onClick={()=>{setSearch('');clearFilters();}} className="flex items-center gap-1 text-xs text-gray-500 px-3 py-2 border border-gray-200 rounded-lg"><X className="w-3 h-3" /> Clear</button>}
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-gray-100">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Stage</label>
              <select className="input text-sm w-full" value={stageFilter} onChange={e=>{setStage(e.target.value);setPage(1);}}>
                <option value="">All stages</option>{Object.entries(STAGE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Visa</label>
              <select className="input text-sm w-full" value={visaFilter} onChange={e=>{setVisa(e.target.value);setPage(1);}}>
                <option value="">All</option>{Object.keys(VISA_CONFIG).map(k=><option key={k} value={k}>{k.replace('_',' ')}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Experience</label>
              <select className="input text-sm w-full" value={expFilter} onChange={e=>{setExp(e.target.value);setPage(1);}}>
                {EXP_FILTERS.map(f=><option key={f} value={f}>{f}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
              <select className="input text-sm w-full" value={sourceFilter} onChange={e=>{setSource(e.target.value);setPage(1);}}>
                <option value="">All</option>{SOURCE_OPTS.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Skills</label>
              <input className="input text-sm w-full" placeholder="React, Python..." value={skillsFilter} onChange={e=>{setSkills(e.target.value);setPage(1);}} /></div>
          </div>
        )}
      </div>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-50 border border-brand-200 rounded-xl text-sm">
          <span className="font-medium text-brand-700">{selectedIds.size} selected</span>
          <button onClick={()=>setShowBulkScreen(true)} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-medium"><Zap className="w-3.5 h-3.5" /> Bulk Screen</button>
          <button onClick={()=>setSelectedIds(new Set())} className="ml-auto text-brand-500"><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="card p-0 overflow-hidden">
        <TableWrapper>
          <table className="w-full text-sm min-w-[1400px]">
            <thead className="bg-gray-50 border-b border-gray-200" style={{position:'sticky',top:0,zIndex:20}}>
              <tr>
                <th className="px-3 py-3 w-10 bg-gray-50" style={{position:'sticky',left:0,zIndex:21}}>
                  <input type="checkbox" className="rounded border-gray-300 text-brand-600" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50" style={{position:'sticky',left:40,zIndex:21}}>Candidate ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50" style={{position:'sticky',left:160,zIndex:21}}>Name</th>
                {['Title / Company','Stage','Exp','Skills','Location','Visa','Notice','Source','Resume','Apps','AI Score','Rating','Last Activity','Created',''].map((h,i)=>(
                  <th key={i} className={"text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50"+(h===''?' w-16':'')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? Array.from({length:8}).map((_,i)=><SkeletonRow key={i}/>) :
               candidates.length === 0 ? (
                <tr><td colSpan={17} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Briefcase className="w-10 h-10 opacity-30" />
                    <p className="font-medium">No candidates found</p>
                    <p className="text-xs">Adjust search or filters</p>
                  </div>
                </td></tr>
               ) : candidates.map((c:any) => {
                const score = c.overallScore ?? c.scorecards?.[0]?.score ?? null;
                return (
                  <tr key={c.id} className={"hover:bg-brand-50/30 transition-colors group "+(selectedIds.has(c.id)?'bg-brand-50/50':'')}>
                    <td className="px-3 py-3" style={{position:'sticky',left:0,zIndex:10,background:selectedIds.has(c.id)?'rgb(var(--brand-50)/0.5)':'white'}}>
                      <input type="checkbox" className="rounded border-gray-300 text-brand-600" checked={selectedIds.has(c.id)} onChange={e=>{const n=new Set(selectedIds);e.target.checked?n.add(c.id):n.delete(c.id);setSelectedIds(n);}} />
                    </td>
                    <td className="px-4 py-3" style={{position:'sticky',left:40,zIndex:10,background:'white'}}>
                      <button onClick={()=>{navigator.clipboard.writeText(c.businessId??c.id);setCopiedId(c.id);setTimeout(()=>setCopiedId(null),2000);}} className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 font-mono" title="Copy ID">
                        <span className="truncate max-w-[100px]">{(c.businessId??c.id).slice(0,14)}</span>
                        {copiedId===c.id?<Check className="w-3 h-3 text-green-500 shrink-0"/>:<Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0"/>}
                      </button>
                    </td>
                    <td className="px-4 py-3" style={{position:'sticky',left:160,zIndex:10,background:'white'}}>
                      <Link href={'/candidates/'+c.id} className="font-semibold text-gray-900 hover:text-brand-600 whitespace-nowrap">{c.firstName} {c.lastName}</Link>
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{c.email??'-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800 font-medium truncate max-w-[180px]">{c.currentTitle??<span className="text-gray-300">-</span>}</div>
                      <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{c.currentCompany??'-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {c.stage?<span className={"inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full "+(STAGE_CONFIG[c.stage]?.color??'bg-gray-100 text-gray-600')}>{STAGE_CONFIG[c.stage]?.label??c.stage}</span>:<span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{c.yearsExperience!=null?c.yearsExperience+'yr':<span className="text-gray-300 text-xs">-</span>}</td>
                    <td className="px-4 py-3">
                      {c.skills?.length>0?(
                        <div className="flex flex-wrap gap-1">
                          {c.skills.slice(0,3).map((s:string)=><span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">{s}</span>)}
                          {c.skills.length>3&&<span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500">+{c.skills.length-3}</span>}
                        </div>
                      ):<span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.location?<span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-gray-300"/>{c.location}</span>:<span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3">{c.visaStatus?<span className={"inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded "+(VISA_CONFIG[c.visaStatus]??'bg-gray-100 text-gray-600')}>{c.visaType??c.visaStatus.replace('_',' ')}</span>:<span className="text-gray-300 text-xs">-</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{noticePeriodLabel(c.noticePeriodDays)??<span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.sourceName??c.source??<span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3">
                      {c._count?.resumes > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z"/></svg>
                          Resume
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">No resume</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={'/candidates/'+c.id+'?tab=applications'} className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600">
                        <Briefcase className="w-3.5 h-3.5 text-gray-300"/><span className="font-medium">{c._count?.applications??0}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">{score!=null?(
                      <div>
                        <div className="flex items-center gap-1"><span className={"font-bold text-sm "+SCORE_COLOR(score)}>{score}</span><span className="text-[10px] text-gray-400">/100</span></div>
                        <div className="w-16 h-1 bg-gray-100 rounded-full mt-0.5 overflow-hidden"><div className={"h-full rounded-full "+SCORE_BAR(score)} style={{width:score+'%'}} /></div>
                        <div className={"text-[10px] mt-0.5 "+SCORE_COLOR(score)}>{SCORE_LABEL(score)}</div>
                      </div>
                    ):<span className="text-gray-300 text-xs">-</span>}</td>
                    <td className="px-4 py-3"><StarRating rating={c.starRating??0} /></td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {c.lastActivityAt ? (
                        <div><div className="text-gray-600">{format(new Date(c.lastActivityAt),'dd MMM yyyy, HH:mm')}</div><div className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(c.lastActivityAt),{addSuffix:true})}</div></div>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {c.createdAt ? (
                        <div><div className="text-gray-600">{format(new Date(c.createdAt),'dd MMM yyyy, HH:mm')}</div><div className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(c.createdAt),{addSuffix:true})}</div></div>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 justify-end">
                        <Link href={'/candidates/'+c.id} className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium px-2 py-1 rounded-lg hover:bg-brand-50">View<ChevronRight className="w-3 h-3"/></Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrapper>
        {data?.meta && data.meta.total > 25 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">Showing {((page-1)*25)+1}-{Math.min(page*25,data.meta.total)} of {data.meta.total}</span>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed" disabled={page===1} onClick={()=>setPage(p=>p-1)}><ChevronLeft className="w-3.5 h-3.5"/> Previous</button>
              <span className="text-xs text-gray-600 font-medium px-2">{page} / {Math.ceil(data.meta.total/25)}</span>
              <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed" disabled={page>=Math.ceil(data.meta.total/25)} onClick={()=>setPage(p=>p+1)}>Next <ChevronRight className="w-3.5 h-3.5"/></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}