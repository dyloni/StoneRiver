import React from 'react';
import Card from './Card';
import { SUFFIX_CODE_RANGES } from '../../constants';

interface SuffixCodeLegendProps {
  compact?: boolean;
}

const SuffixCodeLegend: React.FC<SuffixCodeLegendProps> = ({ compact = false }) => {
  const codeRanges = [
    {
      category: 'Principal Member',
      description: 'Policy holder (always 000)',
      code: SUFFIX_CODE_RANGES.PRINCIPAL.code,
      colorClass: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      category: 'Spouse',
      description: `Spouse(s) (${SUFFIX_CODE_RANGES.SPOUSE.start}-${SUFFIX_CODE_RANGES.SPOUSE.end})`,
      range: `${SUFFIX_CODE_RANGES.SPOUSE.start}+`,
      colorClass: 'bg-green-100 text-green-800 border-green-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      category: 'Children',
      description: `Children (${SUFFIX_CODE_RANGES.CHILD.start}-${SUFFIX_CODE_RANGES.CHILD.end})`,
      range: `${SUFFIX_CODE_RANGES.CHILD.start}+`,
      colorClass: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      category: 'Other Dependents',
      description: `Dependents (${SUFFIX_CODE_RANGES.DEPENDENT.start}-${SUFFIX_CODE_RANGES.DEPENDENT.end})`,
      range: `${SUFFIX_CODE_RANGES.DEPENDENT.start}+`,
      colorClass: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold text-brand-text-secondary">Suffix Codes:</span>
        {codeRanges.map((item) => (
          <div key={item.category} className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold rounded border ${item.colorClass}`}>
              {item.code || item.range}
            </span>
            <span className="text-xs text-brand-text-secondary">{item.category}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-brand-text-primary mb-2">Suffix Code System</h3>
          <p className="text-sm text-brand-text-secondary">
            Each participant is assigned a unique suffix code based on their relationship type.
            This code is combined with the policy number to create a unique identifier.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {codeRanges.map((item) => (
            <div
              key={item.category}
              className={`p-4 rounded-xl border ${item.colorClass} bg-opacity-50`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${item.colorClass}`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold mb-1">{item.category}</h4>
                  <p className="text-xs mb-2">{item.description}</p>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold rounded border ${item.colorClass}`}>
                    {item.code || item.range}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 border border-brand-border/50 rounded-xl p-4 space-y-3">
          <h4 className="font-bold text-brand-text-primary">Examples:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-brand-pink">SR-2024-001-000</span>
              <span className="text-brand-text-secondary">→ John Doe (Principal Member)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-brand-pink">SR-2024-001-101</span>
              <span className="text-brand-text-secondary">→ Jane Doe (Spouse)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-brand-pink">SR-2024-001-201</span>
              <span className="text-brand-text-secondary">→ Michael Doe (First Child)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-brand-pink">SR-2024-001-202</span>
              <span className="text-brand-text-secondary">→ Sarah Doe (Second Child)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-brand-pink">SR-2024-001-301</span>
              <span className="text-brand-text-secondary">→ Mary Smith (Grandparent - Dependent)</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">How Suffix Codes Work:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Principal member always gets code 000</li>
                <li>First spouse gets 101, second spouse (if any) gets 102</li>
                <li>Children are numbered sequentially starting at 201</li>
                <li>Other dependents (parents, siblings, etc.) start at 301</li>
                <li>Codes are automatically assigned when adding participants</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SuffixCodeLegend;
