
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverEffect?: boolean;
    variant?: 'default' | 'flat' | 'gradient';
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    onClick,
    hoverEffect = false,
    variant = 'default'
}) => {
    const baseStyles = "rounded-2xl transition-all duration-300 relative overflow-hidden";

    const variants = {
        default: "bg-white border border-slate-100 shadow-sm",
        flat: "bg-slate-50 border border-slate-200",
        gradient: "bg-gradient-to-br from-white to-slate-50 border border-white/50 shadow-md"
    };

    const hoverStyles = hoverEffect ? "hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.98]" : "";

    return (
        <div
            onClick={onClick}
            className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${className}`}
        >
            {children}
        </div>
    );
};
