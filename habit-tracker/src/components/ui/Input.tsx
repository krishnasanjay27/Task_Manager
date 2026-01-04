'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-[var(--text-primary)]"
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`input ${error ? 'border-[var(--error)]' : ''} ${className}`}
                {...props}
            />
            {error && (
                <span className="text-xs text-[var(--error)]">{error}</span>
            )}
        </div>
    );
}
