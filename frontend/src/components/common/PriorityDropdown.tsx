import React, { useState, useRef, useEffect } from 'react';

export const getPriorityIconSVG = (p?: string, className: string = "w-4 h-4") => {
    if (p === "urgent" || p === "highest") {
        return (
            <svg className={className} viewBox="0 0 16 16" fill="none">
                <path d="M8 2L3 7L4.4 8.4L8 4.8L11.6 8.4L13 7L8 2Z" fill="#ef4444"/>
                <path d="M8 7L3 12L4.4 13.4L8 9.8L11.6 13.4L13 12L8 7Z" fill="#ef4444"/>
            </svg>
        );
    }
    if (p === "high") {
        return (
            <svg className={className} viewBox="0 0 16 16" fill="none">
                <path d="M8 4L3 9L4.4 10.4L8 6.8L11.6 10.4L13 9L8 4Z" fill="#ef4444"/>
            </svg>
        );
    }
    if (p === "low" || p === "lowest") {
        return (
            <svg className={className} viewBox="0 0 16 16" fill="none">
                <path d="M8 12L13 7L11.6 5.6L8 9.2L4.4 5.6L3 7L8 12Z" fill="#3b82f6"/>
            </svg>
        );
    }
    // medium/default
    return (
        <svg className={className} viewBox="0 0 16 16" fill="none">
            <path d="M3 6H13V8H3V6ZM3 10H13V12H3V10Z" fill="#f97316"/>
        </svg>
    );
};

interface PriorityDropdownProps {
    value: string;
    onChange: (val: string) => void;
    readonly?: boolean;
    iconOnly?: boolean;
}

export default function PriorityDropdown({ value, onChange, readonly = false, iconOnly = false }: PriorityDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const options = [
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
    ];

    const currentOption = options.find(o => o.value === value) || options[2];

    return (
        <div className="relative inline-block" ref={ref}>
            <div 
                className={`inline-flex items-center gap-2 border border-transparent hover:border-gray-200 hover:bg-gray-50 p-1 rounded transition-colors ${readonly ? '' : 'cursor-pointer'}`}
                onClick={() => !readonly && setOpen(!open)}
            >
                {getPriorityIconSVG(currentOption.value)}
                {!iconOnly && <span className="text-[13px] font-medium text-gray-800">{currentOption.label}</span>}
            </div>
            
            {open && !readonly && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            className={`flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer hover:bg-gray-100 ${value === option.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        >
                            {getPriorityIconSVG(option.value)}
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
