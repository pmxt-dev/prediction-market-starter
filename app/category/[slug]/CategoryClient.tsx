'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import SubHeader from '@/components/SubHeader';
import Footer from '@/components/Footer';
import { MarketCard, MarketRow, formatVolume } from '@pmxt/components';
import type { CatalogMarketCard, CatalogEvent, CategoryMeta } from '@pmxt/components';
import { searchEvents, fetchPriceHistory } from '@/lib/api';
import type { CatalogOutcome } from '@pmxt/components';

type SortKey = 'volume' | 'volume24h' | 'newest';
type ColumnSortKey = 'price' | 'change24h' | 'change7d' | 'volume' | 'liquidity';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'grid';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'volume', label: 'Volume' },
    { key: 'volume24h', label: '24h Volume' },
    { key: 'newest', label: 'Newest' },
];

function getMarketColumnValue(market: CatalogMarketCard, column: ColumnSortKey): number {
    switch (column) {
        case 'price': {
            const lead = market.outcomes
                .filter(o => !o.description.toLowerCase().startsWith('not '))
                .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
            return lead?.price ?? 0;
        }
        case 'change24h': return market.change24h ?? 0;
        case 'change7d': return 0; // synthetic, no real data
        case 'volume': return market.volume ?? 0;
        case 'liquidity': return market.liquidity ?? 0;
    }
}

function SortArrow({ direction, active }: { readonly direction: SortDirection; readonly active: boolean }) {
    return (
        <svg
            className={`w-3 h-3 inline-block ml-0.5 transition-colors ${active ? 'text-text-primary' : 'text-transparent'}`}
            viewBox="0 0 12 12"
            fill="currentColor"
        >
            {direction === 'asc' ? (
                <path d="M6 2L10 8H2L6 2Z" />
            ) : (
                <path d="M6 10L2 4H10L6 10Z" />
            )}
        </svg>
    );
}

function SortableColumnHeader({ label, column, activeColumn, direction, onSort }: {
    readonly label: string;
    readonly column: ColumnSortKey;
    readonly activeColumn: ColumnSortKey | null;
    readonly direction: SortDirection;
    readonly onSort: (column: ColumnSortKey) => void;
}) {
    const active = activeColumn === column;
    return (
        <div className="flex justify-end">
            <button
                className={`bg-transparent border-0 p-0 cursor-pointer text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-text-primary inline-flex items-center gap-0.5 ${
                    active ? 'text-text-primary' : 'text-text-muted'
                }`}
                onClick={() => onSort(column)}
            >
                {label}
                {active && <SortArrow direction={direction} active />}
            </button>
        </div>
    );
}

/** Group individual binary markets by their parent event, merging outcomes and aggregating stats. */
function groupMarketsByEvent(markets: CatalogMarketCard[]): CatalogMarketCard[] {
    const groups = new Map<string, CatalogMarketCard[]>();

    for (const m of markets) {
        const key = m.event_pmxt_id;
        const group = groups.get(key);
        if (group) {
            group.push(m);
        } else {
            groups.set(key, [m]);
        }
    }

    return Array.from(groups.values()).map((group) => {
        const first = group[0];

        // Collect all non-"Not" outcomes across all markets in this event
        const allOutcomes: CatalogOutcome[] = group
            .flatMap(m => m.outcomes)
            .filter(o => !o.description.toLowerCase().startsWith('not '));

        // Sort by price descending so the lead outcome is first
        const sortedOutcomes = [...allOutcomes].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

        return {
            ...first,
            question: first.event_title,
            outcomes: sortedOutcomes,
            volume: group.reduce((sum, m) => sum + (m.volume ?? 0), 0),
            volume24h: group.reduce((sum, m) => sum + (m.volume24h ?? 0), 0),
            liquidity: group.reduce((sum, m) => sum + (m.liquidity ?? 0), 0),
            openInterest: group.reduce((sum, m) => sum + (m.openInterest ?? 0), 0),
            pmxt_id: first.event_pmxt_id,
        };
    });
}

interface CategoryClientProps {
    meta: CategoryMeta;
    markets: CatalogMarketCard[];
    categories: string[];
}

export default function CategoryClient({ meta, markets, categories }: CategoryClientProps) {
    const [sortBy, setSortBy] = useState<SortKey>('volume');
    const [columnSort, setColumnSort] = useState<{ column: ColumnSortKey; direction: SortDirection } | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CatalogEvent[]>([]);

    const fetchSparkline = useCallback(
        (outcomePmxtId: string) => fetchPriceHistory(outcomePmxtId, '1w'),
        [],
    );

    const eventRows = useMemo(() => groupMarketsByEvent(markets), [markets]);

    const handleColumnSort = useCallback((column: ColumnSortKey) => {
        setColumnSort(prev => ({
            column,
            direction: prev?.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
        }));
    }, []);

    const sortedMarkets = useMemo(() => {
        const sorted = [...eventRows];

        // If a column header is active, use that for sorting
        if (columnSort) {
            const multiplier = columnSort.direction === 'desc' ? -1 : 1;
            sorted.sort((a, b) =>
                multiplier * (getMarketColumnValue(a, columnSort.column) - getMarketColumnValue(b, columnSort.column))
            );
            return sorted;
        }

        // Otherwise use the pill sort
        switch (sortBy) {
            case 'volume24h':
                sorted.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
                break;
            case 'newest':
                sorted.sort((a, b) => {
                    const aId = typeof a.id === 'string' ? 0 : a.id;
                    const bId = typeof b.id === 'string' ? 0 : b.id;
                    return bId - aId;
                });
                break;
            default:
                sorted.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
        }
        return sorted;
    }, [eventRows, sortBy, columnSort]);

    useEffect(() => {
        let cancelled = false;
        searchEvents(searchQuery).then(results => {
            if (!cancelled) setSearchResults(results);
        });
        return () => { cancelled = true; };
    }, [searchQuery]);

    const totalVolume = markets.reduce((sum, m) => sum + (m.volume ?? 0), 0);
    const totalLiquidity = markets.reduce((sum, m) => sum + (m.liquidity ?? 0), 0);

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchResults={searchResults}
            />
            <SubHeader categories={categories} activeCategory={meta.name} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
                {/* Category header */}
                <div className="mb-6">
                    <h1 className="text-[28px] font-bold tracking-tight mb-1.5" style={{ color: meta.accent }}>
                        {meta.name}
                    </h1>
                    <p className="text-[14px] text-text-secondary max-w-2xl leading-relaxed">
                        {meta.description}
                    </p>
                </div>

                {/* Stats + controls bar */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-5 text-[13px]">
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-text-muted">Events</span>
                            <span className="font-bold text-text-primary">{eventRows.length}</span>
                        </div>
                        <div className="w-px h-3.5 bg-border-subtle" />
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-text-muted">Volume</span>
                            <span className="font-bold text-text-primary">{formatVolume(totalVolume)}</span>
                        </div>
                        <div className="w-px h-3.5 bg-border-subtle" />
                        <div className="flex items-center gap-1.5">
                            <span className="font-medium text-text-muted">Liquidity</span>
                            <span className="font-bold text-text-primary">{formatVolume(totalLiquidity)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Sort pills */}
                        <div className="flex items-center gap-1">
                            {SORT_OPTIONS.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => { setSortBy(key); setColumnSort(null); }}
                                    className={`px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors border-0 cursor-pointer ${
                                        sortBy === key
                                            ? 'text-white'
                                            : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-black/[0.04]'
                                    }`}
                                    style={sortBy === key ? { backgroundColor: meta.accent } : undefined}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-4 bg-border-subtle" />

                        {/* View toggle */}
                        <div className="flex items-center bg-black/[0.04] rounded-md p-0.5">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded transition-colors border-0 cursor-pointer ${viewMode === 'table' ? 'bg-white shadow-sm text-text-primary' : 'bg-transparent text-text-muted hover:text-text-primary'}`}
                                title="Table view"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded transition-colors border-0 cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-sm text-text-primary' : 'bg-transparent text-text-muted hover:text-text-primary'}`}
                                title="Grid view"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table view */}
                {viewMode === 'table' && (
                    <div className="border border-border-subtle rounded-xl overflow-hidden">
                        {/* Table header */}
                        <div
                            className="grid items-center gap-4 px-4 py-2.5 bg-black/[0.02] text-[11px] font-bold text-text-muted uppercase tracking-wider select-none"
                            style={{ gridTemplateColumns: '32px 1fr 80px 72px 72px 100px 100px 120px' }}
                        >
                            <span className="text-center">#</span>
                            <span>Event</span>
                            <SortableColumnHeader label="Price" column="price" activeColumn={columnSort?.column ?? null} direction={columnSort?.direction ?? 'desc'} onSort={handleColumnSort} />
                            <SortableColumnHeader label="24h" column="change24h" activeColumn={columnSort?.column ?? null} direction={columnSort?.direction ?? 'desc'} onSort={handleColumnSort} />
                            <SortableColumnHeader label="7d" column="change7d" activeColumn={columnSort?.column ?? null} direction={columnSort?.direction ?? 'desc'} onSort={handleColumnSort} />
                            <SortableColumnHeader label="Volume" column="volume" activeColumn={columnSort?.column ?? null} direction={columnSort?.direction ?? 'desc'} onSort={handleColumnSort} />
                            <SortableColumnHeader label="Liquidity" column="liquidity" activeColumn={columnSort?.column ?? null} direction={columnSort?.direction ?? 'desc'} onSort={handleColumnSort} />
                            <span className="text-right">7d Chart</span>
                        </div>

                        {sortedMarkets.map((market, idx) => (
                            <MarketRow
                                key={market.pmxt_id}
                                market={market}
                                rank={idx + 1}
                                accent={meta.accent}
                                fetchSparklineData={fetchSparkline}
                            />
                        ))}
                    </div>
                )}

                {/* Grid view */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-2 gap-4">
                        {sortedMarkets.map((market) => (
                            <MarketCard key={market.pmxt_id} market={market} />
                        ))}
                    </div>
                )}

                {sortedMarkets.length === 0 && (
                    <div className="bg-surface rounded-xl border border-border-subtle p-8 text-center">
                        <p className="text-[14px] text-text-secondary">No markets available in {meta.name} yet.</p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
