import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, className = '', variant = 'primary', size = 'md', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform active:scale-95';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: 'text-white bg-gradient-to-r from-brand-pink to-brand-dark-pink hover:shadow-medium hover:-translate-y-0.5 focus:ring-brand-pink shadow-soft',
    secondary: 'text-brand-text-primary bg-slate-100 hover:bg-slate-200 hover:shadow-soft focus:ring-slate-300',
    outline: 'text-brand-pink bg-transparent border-2 border-brand-pink hover:bg-brand-pink/5 hover:shadow-soft focus:ring-brand-pink',
    ghost: 'text-brand-text-secondary hover:bg-slate-100 hover:text-brand-text-primary focus:ring-slate-300',
    danger: 'text-white bg-gradient-to-r from-brand-danger to-red-600 hover:shadow-medium hover:-translate-y-0.5 focus:ring-brand-danger shadow-soft',
  };

  return (
    <button
      type="button"
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
