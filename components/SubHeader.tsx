'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toCategorySlug } from '@/lib/api';

const VISIBLE_COUNT = 8;

interface SubHeaderProps {
    categories?: string[];
    activeCategory?: string;
}

export default function SubHeader({ categories = [], activeCategory = 'Trending' }: SubHeaderProps) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const visibleTopics = ['Trending', ...categories.slice(0, VISIBLE_COUNT)];
    const overflowTopics = categories.slice(VISIBLE_COUNT);

    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
            setOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    const isActiveInOverflow = overflowTopics.includes(activeCategory);

    return (
        <div className="border-b border-border-subtle bg-header shrink-0 h-12">
            <div className="max-w-7xl mx-auto w-full h-full flex items-center px-6">
                <div className="flex items-center gap-5 text-[14px] font-medium text-text-secondary h-full">
                    {visibleTopics.map((topic) => {
                        const isActive = topic === activeCategory;
                        const href = topic === 'Trending' ? '/' : `/category/${toCategorySlug(topic)}`;
                        return (
                            <Link
                                key={topic}
                                href={href}
                                className={`${isActive ? "text-text-primary border-b-2 border-text-primary font-bold px-1 mt-[2px]" : "hover:text-text-primary transition-colors"} whitespace-nowrap h-full flex items-center no-underline`}
                            >
                                {topic}
                            </Link>
                        );
                    })}

                    {overflowTopics.length > 0 && (
                        <div className="relative h-full flex items-center" ref={menuRef}>
                            <button
                                onClick={() => setOpen(prev => !prev)}
                                className={`${isActiveInOverflow ? "text-text-primary font-bold" : "hover:text-text-primary"} transition-colors whitespace-nowrap flex items-center gap-1 bg-transparent border-0 cursor-pointer text-[14px] font-medium text-text-secondary p-0`}
                            >
                                More
                                <svg
                                    className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {open && (
                                <div className="absolute top-full right-0 mt-1 bg-surface border border-border-subtle rounded-xl shadow-lg py-1 z-50 min-w-[180px] max-h-[320px] overflow-y-auto">
                                    {overflowTopics.map((topic) => {
                                        const isActive = topic === activeCategory;
                                        return (
                                            <Link
                                                key={topic}
                                                href={`/category/${toCategorySlug(topic)}`}
                                                onClick={() => setOpen(false)}
                                                className={`block px-4 py-2 text-[13px] no-underline transition-colors ${
                                                    isActive
                                                        ? 'text-text-primary font-semibold bg-black/[0.03]'
                                                        : 'text-text-secondary hover:text-text-primary hover:bg-black/[0.03]'
                                                }`}
                                            >
                                                {topic}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
