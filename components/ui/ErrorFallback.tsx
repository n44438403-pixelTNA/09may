
import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorFallbackProps {
    message?: string;
    onRetry?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
    message = "Something went wrong.",
    onRetry
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-2xl border border-red-100 h-64">
            <div className="bg-red-100 p-3 rounded-full text-red-600 mb-4">
                <AlertCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-red-800 mb-2">Oops! Error</h3>
            <p className="text-sm text-red-600 mb-6">{message}</p>
            {onRetry && (
                <Button onClick={onRetry} variant="danger" size="sm" icon={<RotateCcw size={14} />}>
                    Try Again
                </Button>
            )}
        </div>
    );
};
