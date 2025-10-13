import React from 'react';
import { RequestStatus } from '../../types';

interface BadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusColors: Record<RequestStatus, string> = {
  [RequestStatus.APPROVED]: 'bg-gradient-to-r from-emerald-50 to-green-50 text-green-700 border border-green-200/50 shadow-soft',
  [RequestStatus.REJECTED]: 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200/50 shadow-soft',
  [RequestStatus.PENDING]: 'bg-gradient-to-r from-amber-50 to-yellow-50 text-yellow-700 border border-yellow-200/50 shadow-soft',
};

const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  return (
    <span
      className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusColors[status]} ${className}`}
    >
      {status}
    </span>
  );
};

export default Badge;