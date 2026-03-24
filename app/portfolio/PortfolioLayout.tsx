'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import Header from '@/components/Header';
import SubHeader from '@/components/SubHeader';
import { fetchPortfolio } from '@pmxt/sdk';
import type { PortfolioSummary } from '@pmxt/components';

function formatUsd(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface PortfolioLayoutProps {
    readonly categories: string[];
    readonly children: React.ReactNode;
}

export default function PortfolioLayout({ categories, children }: PortfolioLayoutProps) {
    const pathname = usePathname();
    const { address, isConnected } = useAccount();
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);

    const loadPortfolio = useCallback(() => {
        if (!address) return;
        fetchPortfolio(address)
            .then(data => setPortfolio(data))
            .catch(() => {});
    }, [address]);

    useEffect(() => {
        loadPortfolio();
        const interval = setInterval(loadPortfolio, 30000);
        return () => clearInterval(interval);
    }, [loadPortfolio]);

    const totalValue = portfolio ? portfolio.cashBalance + portfolio.positionsValue : 0;

    if (!isConnected) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <SubHeader categories={categories} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-[24px] font-bold mb-2">Connect your wallet</h2>
                        <p className="text-[15px] text-text-secondary">Sign in to view your portfolio and positions.</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!portfolio) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <SubHeader categories={categories} />
                <main className="flex-1 flex items-center justify-center">
                    <p className="text-[14px] text-text-muted">Loading portfolio...</p>
                </main>
            </div>
        );
    }

    const isPositionsTab = pathname === '/portfolio/positions';
    const isActivityTab = pathname === '/portfolio/activity';

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <SubHeader categories={categories} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
                {/* Summary cards */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <SummaryCard label="Portfolio Value" value={formatUsd(totalValue)} />
                    <SummaryCard label="Open Positions" value={formatUsd(portfolio.positionsValue)} />
                    <SummaryCard label="Cash" value={formatUsd(portfolio.cashBalance)} />
                    <SummaryCard
                        label="P&L"
                        value={`${portfolio.totalPnl >= 0 ? '+' : ''}${formatUsd(portfolio.totalPnl)}`}
                        valueColor={portfolio.totalPnl >= 0 ? 'text-primary' : 'text-red-500'}
                    />
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-border-subtle mb-6">
                    <TabLink href="/portfolio/positions" active={isPositionsTab}>
                        Positions
                    </TabLink>
                    <TabLink href="/portfolio/activity" active={isActivityTab}>
                        Activity
                    </TabLink>
                </div>

                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-border-subtle bg-header mt-auto">
                <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-[13px] text-text-muted">
                    <div>&copy; 2026 PMXT. All rights reserved.</div>
                    <div className="flex gap-6">
                        <a href="https://www.pmxt.dev/terms" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Terms</a>
                        <a href="https://www.pmxt.dev/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Privacy</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function SummaryCard({ label, value, valueColor = 'text-text-primary' }: {
    readonly label: string;
    readonly value: string;
    readonly valueColor?: string;
}) {
    return (
        <div className="bg-surface border border-border-subtle rounded-2xl p-5">
            <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-[22px] font-bold tabular-nums ${valueColor}`}>{value}</p>
        </div>
    );
}

function TabLink({ href, active, children }: {
    readonly href: string;
    readonly active: boolean;
    readonly children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className={`pb-3 text-[14px] font-semibold border-b-2 transition-colors no-underline ${
                active
                    ? 'text-text-primary border-b-text-primary'
                    : 'text-text-muted border-b-transparent hover:text-text-secondary'
            }`}
            style={{ borderBottomWidth: 2, borderBottomStyle: 'solid' }}
        >
            {children}
        </Link>
    );
}
