
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
    const baseClass = "bg-slate-200 animate-pulse";
    const variants = {
        text: "h-4 rounded",
        circular: "rounded-full",
        rectangular: "rounded-lg"
    };

    return (
        <div className={`${baseClass} ${variants[variant]} ${className}`}></div>
    );
};
