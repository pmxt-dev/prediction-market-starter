'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { fetchTrades } from '@pmxt/sdk';
import type { Trade } from '@pmxt/sdk';

function formatDateTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function truncateHash(hash: string): string {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function StatusBadge({ status }: { readonly status: string }) {
    const colorClass =
        status === 'filled' ? 'bg-green-900/30 text-green-400' :
        status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
        status === 'failed' ? 'bg-red-900/30 text-red-400' :
        'bg-gray-900/30 text-gray-400';

    return (
        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${colorClass}`}>
            {status}
        </span>
    );
}

function ActivityRow({ trade }: { readonly trade: Trade }) {
    const router = useRouter();
    const isBuy = trade.side === 'buy';
    const hasEventLink = Boolean(trade.eventSlug);

    const handleRowClick = useCallback(() => {
        if (hasEventLink) {
            router.push(`/event/${trade.eventSlug}`);
        }
    }, [hasEventLink, trade.eventSlug, router]);

    return (
        <div
            role={hasEventLink ? 'link' : undefined}
            onClick={handleRowClick}
            className={`flex items-center gap-4 p-4 rounded-2xl border border-border-subtle hover:border-text-muted transition-colors group ${
                hasEventLink ? 'cursor-pointer' : ''
            }`}
        >
            {/* Market question */}
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                    {trade.marketQuestion || 'Unknown market'}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-[12px] text-text-muted">
                    <span>{formatDateTime(trade.createdAt)}</span>
                    <span className={`font-bold ${isBuy ? 'text-primary' : 'text-red-500'}`}>
                        {isBuy ? 'Buy' : 'Sell'}
                    </span>
                </div>
            </div>

            {/* Shares */}
            <div className="w-[80px] shrink-0 text-[13px] text-text-primary tabular-nums text-right">
                {trade.shares.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </div>

            {/* Price per share */}
            <div className="w-[80px] shrink-0 text-[13px] text-text-secondary tabular-nums text-right">
                {Math.round(trade.pricePerShare * 100)}c
            </div>

            {/* Total USDC */}
            <div className="w-[80px] shrink-0 text-[13px] font-semibold text-text-primary tabular-nums text-right">
                ${trade.totalUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            {/* Status */}
            <div className="w-[80px] shrink-0 text-center">
                <StatusBadge status={trade.status} />
            </div>

            {/* Tx hash */}
            <div className="w-[100px] shrink-0 text-[12px] text-text-muted text-right">
                {trade.txHash ? (
                    <span className="font-mono">{truncateHash(trade.txHash)}</span>
                ) : (
                    <span>--</span>
                )}
            </div>
        </div>
    );
}

export default function ActivityTab() {
    const { address } = useAccount();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [tradesLoading, setTradesLoading] = useState(false);

    useEffect(() => {
        if (!address) return;
        let cancelled = false;
        setTradesLoading(true);
        fetchTrades(address)
            .then(({ trades: data }) => {
                if (!cancelled) setTrades(data);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setTradesLoading(false);
            });
        return () => { cancelled = true; };
    }, [address]);

    if (!address) {
        return (
            <div className="py-16 text-center text-text-muted text-[14px]">
                Connect your wallet to view activity.
            </div>
        );
    }

    if (tradesLoading) {
        return (
            <div className="py-16 text-center text-text-muted text-[14px]">
                Loading trades...
            </div>
        );
    }

    if (trades.length === 0) {
        return (
            <div className="py-16 text-center text-text-muted text-[14px]">
                No trades yet.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {/* Column headers */}
            <div className="flex items-center gap-4 px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wide">
                <div className="flex-1 min-w-0">Market</div>
                <div className="w-[80px] shrink-0 text-right">Shares</div>
                <div className="w-[80px] shrink-0 text-right">Price</div>
                <div className="w-[80px] shrink-0 text-right">Total</div>
                <div className="w-[80px] shrink-0 text-center">Status</div>
                <div className="w-[100px] shrink-0 text-right">Tx</div>
            </div>
            {trades.map(trade => (
                <ActivityRow key={trade.id} trade={trade} />
            ))}
        </div>
    );
}
