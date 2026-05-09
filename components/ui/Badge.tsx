
import React from 'react';

interface BadgeProps {
    label: string | number;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
    size?: 'sm' | 'md';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, color = 'blue', size = 'md', className = '' }) => {
    const colors = {
        blue: "bg-blue-100 text-blue-700",
        green: "bg-green-100 text-green-700",
        red: "bg-red-100 text-red-700",
        yellow: "bg-yellow-100 text-yellow-800",
        purple: "bg-purple-100 text-purple-700",
        gray: "bg-slate-100 text-slate-600"
    };

    const sizes = {
        sm: "text-[9px] px-1.5 py-0.5",
        md: "text-xs px-2.5 py-1"
    };

    return (
        <span className={`rounded-full font-bold inline-flex items-center justify-center ${colors[color]} ${sizes[size]} ${className}`}>
            {label}
        </span>
    );
};
