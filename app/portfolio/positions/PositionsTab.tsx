'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { fetchPortfolio } from '@pmxt/sdk';
import { TradePanel } from '@pmxt/components';
import type { PortfolioPosition, PortfolioSummary } from '@pmxt/components';

type PositionFilter = 'active' | 'closed';

function formatUsd(value: number): string {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPnlPercent(avgPrice: number, currentPrice: number): string {
    if (avgPrice === 0) return '0.0%';
    const pct = ((currentPrice - avgPrice) / avgPrice) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
}

function positionValue(pos: PortfolioPosition): number {
    return pos.shares * pos.currentPrice;
}

function positionPnl(pos: PortfolioPosition): number {
    return pos.shares * (pos.currentPrice - pos.avgPrice);
}

export default function PositionsTab() {
    const { address } = useAccount();
    const [positionFilter, setPositionFilter] = useState<PositionFilter>('active');
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
    const [tradingPosition, setTradingPosition] = useState<PortfolioPosition | null>(null);

    useEffect(() => {
        if (!address) return;
        let cancelled = false;
        fetchPortfolio(address).then(data => {
            if (!cancelled) setPortfolio(data);
        }).catch(() => {});
        return () => { cancelled = true; };
    }, [address]);

    const handleOpenTrade = useCallback((pos: PortfolioPosition) => {
        setTradingPosition(pos);
    }, []);

    const handleCloseTrade = useCallback(() => {
        setTradingPosition(null);
    }, []);

    if (!portfolio) {
        return (
            <div className="py-16 text-center text-text-muted text-[14px]">
                Loading positions...
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center gap-2 mb-5">
                <FilterPill active={positionFilter === 'active'} onClick={() => setPositionFilter('active')}>
                    Active
                </FilterPill>
                <FilterPill active={positionFilter === 'closed'} onClick={() => setPositionFilter('closed')}>
                    Closed
                </FilterPill>
            </div>

            {(() => {
                const filtered = portfolio.positions.filter(
                    (pos) => pos.status === positionFilter,
                );
                const emptyLabel = positionFilter === 'active' ? 'No open positions.' : 'No closed positions yet.';

                return filtered.length === 0 ? (
                    <div className="py-16 text-center text-text-muted text-[14px]">
                        {emptyLabel}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((pos) => (
                            <PositionRow
                                key={pos.id}
                                position={pos}
                                onTrade={positionFilter === 'active' ? handleOpenTrade : undefined}
                            />
                        ))}
                    </div>
                );
            })()}

            {tradingPosition && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={handleCloseTrade} />
                    <div className="relative bg-surface rounded-2xl border border-border-subtle shadow-xl w-full max-w-[420px] mx-4">
                        <div className="flex items-center justify-between px-6 pt-5 pb-2">
                            <div className="text-[15px] font-bold text-text-primary leading-snug max-w-[320px] line-clamp-2">
                                {tradingPosition.marketQuestion}
                            </div>
                            <button
                                onClick={handleCloseTrade}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-input transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <TradePanel
                            outcomeName={tradingPosition.outcomeName}
                            outcomeColor={tradingPosition.side === 'yes' ? '#00a36c' : '#ef4444'}
                            currentPrice={Math.round(tradingPosition.currentPrice * 100)}
                            yesTokenId={tradingPosition.id}
                            noTokenId={null}
                            portfolio={portfolio}
                            initialSide="yes"
                            onClose={handleCloseTrade}
                        />
                        <div className="text-center text-[12px] font-medium text-text-muted px-6 pb-5 pt-1">
                            By trading, you agree to the Terms of Use.
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function FilterPill({ active, onClick, children }: {
    readonly active: boolean;
    readonly onClick: () => void;
    readonly children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`h-8 px-4 rounded-full text-[13px] font-semibold transition-colors cursor-pointer border ${
                active
                    ? 'bg-text-primary text-text-inverse border-text-primary'
                    : 'bg-transparent text-text-secondary border-border-subtle hover:border-border-strong'
            }`}
        >
            {children}
        </button>
    );
}

function PositionRow({ position, onTrade }: {
    readonly position: PortfolioPosition;
    readonly onTrade?: (pos: PortfolioPosition) => void;
}) {
    const router = useRouter();
    const value = positionValue(position);
    const pnl = positionPnl(position);
    const pnlPct = formatPnlPercent(position.avgPrice, position.currentPrice);
    const isPositive = pnl >= 0;
    const hasEventLink = Boolean(position.eventSlug);

    const handleRowClick = useCallback(() => {
        if (hasEventLink) {
            router.push(`/event/${position.eventSlug}`);
        }
    }, [hasEventLink, position.eventSlug, router]);

    return (
        <div
            role={hasEventLink ? 'link' : undefined}
            onClick={handleRowClick}
            className={`flex items-center gap-4 p-4 rounded-2xl border border-border-subtle hover:border-text-muted transition-colors group ${
                hasEventLink ? 'cursor-pointer' : ''
            }`}
        >
            {position.imageUrl && (
                <img src={position.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                    {position.marketQuestion}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[12px] font-bold ${position.side === 'yes' ? 'text-primary' : 'text-red-500'}`}>
                        {position.outcomeName}
                    </span>
                    <span className="text-[12px] text-text-muted">
                        {position.shares} shares @ {Math.round(position.avgPrice * 100)}c
                    </span>
                </div>
            </div>
            <div className="text-right shrink-0">
                <p className="text-[14px] font-bold text-text-primary tabular-nums">{formatUsd(value)}</p>
                <p className={`text-[12px] font-semibold tabular-nums ${isPositive ? 'text-primary' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{formatUsd(pnl)} ({pnlPct})
                </p>
            </div>
            {onTrade && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onTrade(position);
                    }}
                    className="h-9 px-4 rounded-full border border-border-subtle text-[13px] font-semibold text-text-primary hover:border-text-muted transition-colors cursor-pointer bg-transparent shrink-0"
                >
                    Trade
                </button>
            )}
        </div>
    );
}
