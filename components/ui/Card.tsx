import React from 'react';

const Card: React.FC<{
  title?: string;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}> = ({ title, children, className, hover = false }) => {
  const hoverStyles = hover ? 'hover:shadow-elevated hover:-translate-y-1 cursor-pointer' : '';

  return (
    <div className={`bg-brand-surface rounded-2xl shadow-soft border border-brand-border/50 transition-all duration-300 ${hoverStyles} ${className}`}>
      {title && (
        <div className="px-5 py-4 border-b border-brand-border/50 sm:px-6">
          <h3 className="text-lg leading-6 font-bold text-brand-text-primary tracking-tight">
            {title}
          </h3>
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
};

export default Card;
