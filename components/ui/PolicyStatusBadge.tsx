import React from 'react';
import { PolicyStatus } from '../../types';

interface PolicyStatusBadgeProps {
  status: PolicyStatus;
  className?: string;
}

const statusStyles: Record<PolicyStatus, string> = {
  [PolicyStatus.ACTIVE]: 'bg-gradient-to-r from-emerald-50 to-green-50 text-green-700 border border-green-200/50 shadow-soft',
  [PolicyStatus.INACTIVE]: 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 border border-gray-200/50 shadow-soft',
  [PolicyStatus.CANCELLED]: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-500 border border-gray-300/50 shadow-soft line-through',
  [PolicyStatus.OVERDUE]: 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200/50 shadow-soft',
  [PolicyStatus.SUSPENDED]: 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200/50 shadow-soft',
  [PolicyStatus.EXPRESS]: 'bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 border border-cyan-200/50 shadow-soft',
};

const PolicyStatusBadge: React.FC<PolicyStatusBadgeProps> = ({ status, className = '' }) => {
  return (
    <span
      className={`px-3 py-1 inline-flex text-sm leading-5 font-bold rounded-full ${statusStyles[status]} ${className}`}
    >
      {status}
    </span>
  );
};

export default PolicyStatusBadge;