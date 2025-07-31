import React from 'react';
import { HiPlus, HiPencil } from 'react-icons/hi';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'upload' | 'edit';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  icon?: 'plus' | 'pencil' | 'none';
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  className = '',
  icon = 'none'
}: ButtonProps) {
  const baseClasses = "rounded-lg flex items-center gap-2 transition-colors font-semibold";
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-white hover:bg-gray-50 text-blue-600 border border-gray-300 shadow-sm",
    upload: "bg-white hover:bg-gray-50 text-blue-600 border border-gray-300 shadow-sm",
    edit: "bg-white hover:bg-gray-50 text-blue-600 border border-gray-300 shadow-sm"
  };
  
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3"
  };
  
  const iconSize = {
    sm: "w-4 h-4",
    md: "w-4 h-4", 
    lg: "w-5 h-5"
  };
  
  const getIcon = () => {
    switch (icon) {
      case 'plus':
        return <HiPlus className={iconSize[size]} />;
      case 'pencil':
        return <HiPencil className={iconSize[size]} />;
      default:
        return null;
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {getIcon()}
      {children}
    </button>
  );
} 