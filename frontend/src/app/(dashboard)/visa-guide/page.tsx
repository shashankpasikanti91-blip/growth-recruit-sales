'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { countriesApi } from '@/lib/api-client';
import {
  Globe, FileText, Clock, DollarSign, AlertCircle, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Lightbulb, Bell, Briefcase, Users, GraduationCap, Eye,
} from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  WORK: { label: 'Work', icon: Briefcase, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  DEPENDENT: { label: 'Dependent', icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  STUDENT: { label: 'Student', icon: GraduationCap, color: 'text-green-600 bg-green-50 border-green-200' },
  VISITOR: { label: 'Visitor', icon: Eye, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  PR: { label: 'Permanent Residence', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
};

const COUNTRY_FLAGS: Record<string, string> = {
  MY: '🇲🇾', SG: '🇸🇬', AU: '🇦🇺', AE: '🇦🇪', US: '🇺🇸', GB: '🇬🇧', IN: '🇮🇳',
  CA: '🇨🇦', DE: '🇩🇪', JP: '🇯🇵', NZ: '🇳🇿', HK: '🇭🇰',
};

const COUNTRY_FULL_NAMES: Record<string, string> = {
  MY: 'Malaysia', SG: 'Singapore', AU: 'Australia', AE: 'United Arab Emirates',
  US: 'United States', GB: 'United Kingdom', IN: 'India',
  CA: 'Canada', DE: 'Germany', JP: 'Japan', NZ: 'New Zealand', HK: 'Hong Kong',
};

function VisaCard({ rule }: { rule: any }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[rule.category] || CATEGORY_CONFIG.WORK;
  const CatIcon = cat.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={clsx('px-2 py-1 rounded-lg text-xs font-medium border', cat.color)}>
            <CatIcon className="w-3 h-3 inline mr-1" />
            {cat.label}
          </span>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{rule.visaName}</div>
            <div className="text-xs text-gray-500">{rule.visaType}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {rule.validityMonths > 0 && (
            <span className="text-xs text-gray-500 hidden sm:block">
              <Clock className="w-3 h-3 inline mr-1" />
              {rule.validityMonths >= 12 ? `${Math.floor(rule.validityMonths / 12)} yr${rule.validityMonths >= 24 ? 's' : ''}` : `${rule.validityMonths} mo`}
            </span>
          )}
          {rule.validityMonths === 0 && <span className="text-xs font-medium text-emerald-600 hidden sm:block">Permanent</span>}
          {rule.processingTimeDays && (
            <span className="text-xs text-gray-500 hidden md:block">
              ~{rule.processingTimeDays} days
            </span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-600">{rule.description}</p>

          {/* Key Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Processing Time</div>
              <div className="text-sm font-semibold text-gray-900">{rule.processingTimeDays ? `${rule.processingTimeDays} days` : 'Varies'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Validity</div>
              <div className="text-sm font-semibold text-gray-900">
                {rule.validityMonths > 0 ? `${rule.validityMonths} months` : 'Permanent'}
              </div>
            </div>
            {rule.salaryThreshold && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Min Salary</div>
                <div className="text-sm font-semibold text-gray-900">
                  {rule.fees?.processingCurrency} {rule.salaryThreshold?.toLocaleString()}/mo
                </div>
              </div>
            )}
            {rule.quotaInfo && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Quota</div>
                <div className="text-sm font-semibold text-gray-900 text-xs">{rule.quotaInfo}</div>
              </div>
            )}
          </div>

          {/* Eligibility */}
          {rule.eligibility?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" /> Eligibility
              </h4>
              <ul className="space-y-1">
                {rule.eligibility.map((item: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Documents */}
          {rule.requiredDocuments?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-500" /> Required Documents
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {rule.requiredDocuments.map((doc: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fees */}
          {rule.fees && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-500" /> Fees ({rule.fees.processingCurrency})
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(rule.fees)
                  .filter(([k]) => k !== 'processingCurrency')
                  .map(([key, val]) => (
                    <div key={key} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                      <div className="text-xs text-amber-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="text-sm font-semibold text-amber-800">
                        {rule.fees.processingCurrency} {Number(val).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Renewal Info */}
          {rule.renewalInfo && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-700 mb-1">Renewal</h4>
              <p className="text-sm text-gray-600">{rule.renewalInfo}</p>
            </div>
          )}

          {/* Latest Updates */}
          {rule.latestUpdates?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Bell className="w-3 h-3 text-red-500" /> Latest Updates
              </h4>
              <div className="space-y-1.5">
                {rule.latestUpdates.map((update: string, i: number) => (
                  <div key={i} className="text-sm text-gray-600 flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    {update}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {rule.tips?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-yellow-500" /> Pro Tips
              </h4>
              <div className="space-y-1.5">
                {rule.tips.map((tip: string, i: number) => (
                  <div key={i} className="text-sm text-gray-600 flex items-start gap-2 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-100">
                    <Lightbulb className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VisaGuidePage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['visa-rules'],
    queryFn: () => countriesApi.visaRules(),
  });

  const countries = data || [];
  const activeCountry = selectedCountry
    ? countries.find((c: any) => c.countryCode === selectedCountry)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-brand-600" /> Visa & Immigration Guide
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Country-wise visa rules, requirements, fees, and latest updates for hiring foreign talent
        </p>
      </div>

      {/* Country Selector */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-gray-400">Loading visa rules...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {countries.map((country: any) => (
              <button
                key={country.countryCode}
                onClick={() => setSelectedCountry(
                  selectedCountry === country.countryCode ? null : country.countryCode
                )}
                className={clsx(
                  'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                  selectedCountry === country.countryCode
                    ? 'border-brand-500 bg-brand-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-sm'
                )}
              >
                <span className="text-3xl">{COUNTRY_FLAGS[country.countryCode] || '🏳️'}</span>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">{COUNTRY_FULL_NAMES[country.countryCode] || country.countryName}</div>
                  <div className="text-xs text-gray-500">{country.visaTypes?.length || 0} visa types</div>
                </div>
              </button>
            ))}
          </div>

          {/* Visa Rules Display */}
          {!selectedCountry && (
            <div className="text-center py-12 text-gray-400">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a country above to view visa rules and requirements</p>
            </div>
          )}

          {activeCountry && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{COUNTRY_FLAGS[activeCountry.countryCode] || '🏳️'}</span>
                {COUNTRY_FULL_NAMES[activeCountry.countryCode] || activeCountry.countryName} — Immigration & Visa Guide
              </h2>
              {activeCountry.visaTypes?.map((rule: any) => (
                <VisaCard key={rule.visaType} rule={rule} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
