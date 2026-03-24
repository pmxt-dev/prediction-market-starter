'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { fetchPortfolio } from '@pmxt/sdk';
import type { PortfolioSummary } from '@pmxt/components';
import { ProfileButton } from '@pmxt/components';
import type { CatalogEvent } from '@pmxt/components';

interface HeaderProps {
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    searchResults?: CatalogEvent[];
}

export default function Header({ searchQuery = '', onSearchChange, searchResults = [] }: HeaderProps) {
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const showDropdown = isSearchFocused && searchQuery.length > 0 && searchResults.length > 0;

    const loadPortfolio = useCallback(() => {
        if (!address) return;
        fetchPortfolio(address)
            .then(data => setPortfolio(data))
            .catch(() => { /* portfolio unavailable */ });
    }, [address]);

    useEffect(() => {
        loadPortfolio();
        const interval = setInterval(loadPortfolio, 30000);
        const handleTradeRefresh = () => loadPortfolio();
        window.addEventListener('pmxt:portfolio-refresh', handleTradeRefresh);
        return () => {
            clearInterval(interval);
            window.removeEventListener('pmxt:portfolio-refresh', handleTradeRefresh);
        };
    }, [loadPortfolio]);

    const handleClickOutside = useCallback((e: MouseEvent) => {
        if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
            setIsSearchFocused(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

    return (
        <header className="sticky top-0 z-50 bg-header border-b border-border-subtle h-16">
            <div className="max-w-7xl mx-auto w-full h-full flex items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-1 shrink-0">
                    <div className="text-[20px] font-bold text-text-primary tracking-tight leading-none select-none">PMXT</div>
                </Link>

                <div className="flex-1 max-w-[640px] px-8" ref={searchRef}>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Trade on anything"
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className="w-full bg-input border-none rounded-full py-[10px] pl-12 pr-4 text-[14px] focus:outline-none focus:ring-0 placeholder-text-secondary"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>

                        {showDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-subtle rounded-xl shadow-lg overflow-hidden z-[60]">
                                {searchResults.slice(0, 8).map((event) => (
                                    <button
                                        key={event.pmxt_id}
                                        onClick={() => {
                                            setIsSearchFocused(false);
                                            onSearchChange?.('');
                                            router.push(`/event/${event.slug}`);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] transition-colors text-left border-0 bg-transparent cursor-pointer"
                                    >
                                        {event.image_url && (
                                            <img src={event.image_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[14px] font-semibold text-text-primary truncate">{event.title}</p>
                                            <p className="text-[12px] text-text-muted">{event.category}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isConnected && (
                        <Link href="/portfolio" className="text-[14px] font-semibold text-text-secondary hover:text-text-primary transition-colors no-underline">
                            Portfolio
                        </Link>
                    )}
                    <ProfileButton portfolio={portfolio} onFundsSuccess={loadPortfolio} />
                </div>
            </div>
        </header>
    );
}
