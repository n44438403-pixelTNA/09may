
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    isLoading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    icon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    // Base Styles
    const baseStyles = "font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    // Variants
    const variants = {
        primary: "bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700",
        secondary: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
        danger: "bg-red-500 text-white shadow-lg shadow-red-200 hover:bg-red-600",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
        outline: "bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
    };

    // Sizes
    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2.5 text-sm",
        lg: "px-6 py-3.5 text-base",
        xl: "px-8 py-4 text-lg"
    };

    return (
        <button
            className={`
                ${baseStyles}
                ${variants[variant]}
                ${sizes[size]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? <Loader2 size={size === 'sm' ? 14 : 18} className="animate-spin" /> : icon}
            {children}
        </button>
    );
};
