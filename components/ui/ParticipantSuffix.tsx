import React from 'react';
import { SUFFIX_CODE_RANGES } from '../../constants';

interface ParticipantSuffixProps {
  suffix: string;
  showLabel?: boolean;
}

const getSuffixCategory = (suffix: string): string => {
  const suffixNum = parseInt(suffix, 10);

  if (suffixNum === 0) return 'Principal';
  if (suffixNum >= SUFFIX_CODE_RANGES.SPOUSE.start && suffixNum <= SUFFIX_CODE_RANGES.SPOUSE.end) return 'Spouse';
  if (suffixNum >= SUFFIX_CODE_RANGES.CHILD.start && suffixNum <= SUFFIX_CODE_RANGES.CHILD.end) return 'Child';
  if (suffixNum >= SUFFIX_CODE_RANGES.DEPENDENT.start && suffixNum <= SUFFIX_CODE_RANGES.DEPENDENT.end) return 'Dependent';

  return 'Unknown';
};

const getSuffixColor = (suffix: string): string => {
  const suffixNum = parseInt(suffix, 10);

  if (suffixNum === 0) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (suffixNum >= SUFFIX_CODE_RANGES.SPOUSE.start && suffixNum <= SUFFIX_CODE_RANGES.SPOUSE.end) return 'bg-green-100 text-green-800 border-green-200';
  if (suffixNum >= SUFFIX_CODE_RANGES.CHILD.start && suffixNum <= SUFFIX_CODE_RANGES.CHILD.end) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (suffixNum >= SUFFIX_CODE_RANGES.DEPENDENT.start && suffixNum <= SUFFIX_CODE_RANGES.DEPENDENT.end) return 'bg-gray-100 text-gray-800 border-gray-200';

  return 'bg-slate-100 text-slate-800 border-slate-200';
};

const ParticipantSuffix: React.FC<ParticipantSuffixProps> = ({ suffix, showLabel = false }) => {
  const category = getSuffixCategory(suffix);
  const colorClass = getSuffixColor(suffix);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold rounded border ${colorClass}`}>
      {showLabel && <span className="font-sans">{category}:</span>}
      {suffix}
    </span>
  );
};

export default ParticipantSuffix;