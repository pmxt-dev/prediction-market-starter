'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
    LightweightChart,
    ChartActions,
    OutcomeRow,
    TradePanel,
    downloadChartImage,
} from '@pmxt/components';
import type { LightweightChartHandle, LegendItem, CatalogEvent, CatalogOutcome, PricePoint } from '@pmxt/components';
import { fetchPriceHistoryBatch, fetchPortfolio } from '@pmxt/sdk';
import type { PortfolioSummary } from '@pmxt/components';
import { useAccount } from 'wagmi';
import Header from "@/components/Header";
import SubHeader from "@/components/SubHeader";

const OUTCOME_COLORS = ['#00a36c', '#0076ff', '#f59e0b', '#f97316', '#8b5cf6', '#ec4899'];

const RULES_PREVIEW_LENGTH = 180;

type TimeRange = '1H' | '6H' | '1D' | '1W' | '1M' | 'ALL';
const RANGE_POINT_COUNT: Record<TimeRange, number> = { '1H': 7, '6H': 14, '1D': 30, '1W': 60, '1M': 90, 'ALL': Infinity };

function RulesSection({ description }: { readonly description: string }) {
    const [expanded, setExpanded] = useState(false);
    const needsTruncation = description.length > RULES_PREVIEW_LENGTH;
    const displayText = expanded || !needsTruncation
        ? description
        : description.slice(0, RULES_PREVIEW_LENGTH).trimEnd() + '...';

    return (
        <div className="bg-surface border border-border-subtle rounded-card p-5">
            <h3 className="text-[15px] font-bold text-text-primary mb-3">Rules</h3>
            <p className="text-[14px] leading-relaxed text-text-secondary whitespace-pre-line">
                {displayText}
                {needsTruncation && (
                    <button
                        onClick={() => setExpanded(prev => !prev)}
                        className="ml-1 text-text-muted hover:text-text-primary font-medium transition-colors"
                    >
                        {expanded ? 'Show less' : 'Show more'}
                    </button>
                )}
            </p>
        </div>
    );
}

interface EventClientProps {
    event: CatalogEvent;
    liveMarketCount?: number;
    categories?: string[];
}

export default function EventClient({ event, liveMarketCount, categories }: EventClientProps) {
    const outcomes = useMemo(() => {
        const allOutcomes = (event.markets || []).flatMap((m) => {
            // Resolve positive/negative token IDs for each market.
            // Polymarket outcomes use "Not X" prefix for the negative side.
            const yesToken = m.outcomes.find(o => !o.description.toLowerCase().startsWith('not '))?.token_id
                ?? m.outcomes[0]?.token_id ?? null;
            const noToken = m.outcomes.find(o => o.description.toLowerCase().startsWith('not '))?.token_id
                ?? m.outcomes[1]?.token_id ?? null;

            return m.outcomes.map((o) => ({
                id: String(o.id),
                name: o.description,
                probability: o.price != null ? Math.round(o.price * 100) : 0,
                buyYes: o.price != null ? `${Math.round(o.price * 100)}\u00A2` : '\u2014',
                buyNo: o.price != null ? `${Math.round((1 - o.price) * 100)}\u00A2` : '\u2014',
                tokenId: o.token_id ?? null,
                yesTokenId: yesToken,
                noTokenId: noToken,
                imageUrl: m.image_url ?? null,
                trend: null,
                trendAmount: null,
                volume: null,
            }));
        });

        return allOutcomes
            .filter((o) => !o.name.toLowerCase().startsWith('not '))
            .sort((a, b) => b.probability - a.probability)
            .map((o, idx) => ({
                ...o,
                color: OUTCOME_COLORS[idx % OUTCOME_COLORS.length],
            }));
    }, [event]);

    // Build a lookup from outcome id → token_id for the chart fetch
    const outcomeTokenMap = useMemo(() => {
        const raw = (event.markets ?? []).flatMap(m => m.outcomes);
        return new Map(raw.map((o: CatalogOutcome) => [String(o.id), o.token_id]));
    }, [event]);

    // Only fetch histories for the top 5 outcomes shown on the chart
    const topOutcomeIds = useMemo(() => outcomes.slice(0, 5).map(o => o.id), [outcomes]);

    const [priceHistories, setPriceHistories] = useState<ReadonlyMap<string, readonly PricePoint[]>>(new Map());

    useEffect(() => {
        const pairs = topOutcomeIds
            .map(id => [id, outcomeTokenMap.get(id)] as const)
            .filter((p): p is [string, string] => p[1] != null);

        if (pairs.length === 0) return;

        const tokenToOutcome = new Map(pairs.map(([id, tid]) => [tid, id]));
        const tokenIds = pairs.map(([, tid]) => tid);

        fetchPriceHistoryBatch(tokenIds, 'max', 1440)
            .then(histories => {
                const entries: [string, PricePoint[]][] = [];
                for (const [tokenId, history] of Object.entries(histories)) {
                    const outcomeId = tokenToOutcome.get(tokenId);
                    if (outcomeId) entries.push([outcomeId, history]);
                }
                setPriceHistories(new Map(entries));
            })
            .catch(() => {});
    }, [topOutcomeIds, outcomeTokenMap]);

    const chartSeries = useMemo(() => {
        return outcomes.map((o) => {
            const history = priceHistories.get(o.id);
            if (history && history.length > 0) {
                return history.map(pt => ({
                    time: pt.t as any,
                    value: pt.p * 100,
                }));
            }
            // Fallback: single point at current probability
            return [{ time: (Date.now() / 1000) as any, value: o.probability }];
        });
    }, [outcomes, priceHistories]);

    const chartColors = useMemo(() => outcomes.map((o) => o.color), [outcomes]);

    const { address } = useAccount();
    const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
    useEffect(() => {
        if (!address) return;
        let cancelled = false;
        fetchPortfolio(address)
            .then(data => { if (!cancelled) setPortfolio(data); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [address]);

    const [showAllOutcomes, setShowAllOutcomes] = useState(false);
    const displayedOutcomes = showAllOutcomes ? outcomes : outcomes.slice(0, 5);
    const topOutcomes = outcomes.slice(0, 5);
    const topChartSeries = chartSeries.slice(0, 5);
    const topChartColors = chartColors.slice(0, 5);

    const [activeRange, setActiveRange] = useState<TimeRange>('ALL');

    const filteredChartSeries = useMemo(() => {
        const count = RANGE_POINT_COUNT[activeRange];
        if (count === Infinity) return topChartSeries;
        return topChartSeries.map(series => series.slice(-count));
    }, [topChartSeries, activeRange]);

    const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
    const selectedOutcome = outcomes.find((o) => o.id === selectedOutcomeId) ?? outcomes[0];

    const [orderSide, setOrderSide] = useState<'yes' | 'no'>('yes');
    const handleOrderClose = useCallback(() => {
        // No-op -- panel stays visible in sidebar
    }, []);

    const chartHandleRef = useRef<LightweightChartHandle>(null);

    const handleDownload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const chartCanvas = chartHandleRef.current?.takeScreenshot();
        if (!chartCanvas) return;

        const legendItems: LegendItem[] = topOutcomes.map(o => ({
            label: o.name,
            value: `${o.probability}%`,
            color: o.color,
        }));

        downloadChartImage(chartCanvas, event.title, legendItems);
    }, [event.title, topOutcomes]);

    const handleOutcomeSelect = useCallback((id: string) => {
        setSelectedOutcomeId(prev => prev === id ? '' : id);
    }, []);

    const handleBuyYes = useCallback((id: string) => {
        setSelectedOutcomeId(id);
        setOrderSide('yes');
    }, []);

    const handleBuyNo = useCallback((id: string) => {
        setSelectedOutcomeId(id);
        setOrderSide('no');
    }, []);

    const resolutionDate = event.closes_at
        ? new Date(event.closes_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'TBD';

    return (
        <div className="flex flex-col min-h-screen bg-bg-main">
            <Header />
            <SubHeader categories={categories} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col md:flex-row gap-8">

                {/* Left Column */}
                <div className="flex-1 min-w-0 flex flex-col gap-6">

                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="text-[13px] font-semibold text-text-muted">{event.category}</div>
                        </div>

                        <div className="flex justify-between items-start gap-4">
                            <div className="flex items-center gap-3">
                                {event.image_url && (
                                    <img src={event.image_url} alt="" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover shrink-0" />
                                )}
                                <h1 className="text-[32px] md:text-[36px] font-bold tracking-tight text-text-primary leading-[1.1]">
                                    {event.title}
                                </h1>
                            </div>
                            <ChartActions onDownload={handleDownload} variant="subtle" className="shrink-0 mt-1" />
                        </div>

                        {/* Inline Legend */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[13px] font-semibold text-text-secondary">
                            {topOutcomes.map(outcome => (
                                <div key={outcome.id} className="flex items-center gap-1.5 cursor-pointer hover:opacity-80" onClick={() => handleOutcomeSelect(outcome.id)}>
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: outcome.color }}></span>
                                    <span>{outcome.name} <span className="text-text-primary ml-0.5">{outcome.probability}%</span></span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chart area */}
                    <div className="w-full h-[360px] bg-surface border border-border-subtle rounded-card p-4 relative flex flex-col group">
                        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => setActiveRange('1H')} className={`h-8 px-3 rounded-full text-[12px] font-bold text-text-primary ${activeRange === '1H' ? 'bg-black/10' : 'bg-black/5 hover:bg-black/10'}`}>1H</button>
                            <button onClick={() => setActiveRange('ALL')} className={`h-8 px-3 rounded-full text-[12px] font-bold text-text-primary ${activeRange === 'ALL' ? 'bg-black/10' : 'bg-black/5 hover:bg-black/10'}`}>ALL</button>
                        </div>
                        <div className="flex-1 w-full border-b border-l border-border-subtle/50 relative mt-4">
                            <LightweightChart ref={chartHandleRef} data={filteredChartSeries} colors={topChartColors} labels={topOutcomes.map(o => o.name)} />
                        </div>
                        <div className="flex items-center justify-between pt-4 pb-1">
                            <div className="flex items-center gap-3 text-[13px] font-semibold text-text-muted">
                                <span className="flex items-center gap-1">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    {resolutionDate}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-[12px] font-bold text-text-muted">
                                {(['1H', '6H', '1D', '1W', '1M', 'ALL'] as const).map(t => (
                                    <button key={t} onClick={() => setActiveRange(t)} className={`h-7 px-2.5 rounded-md hover:bg-black/5 transition-colors ${t === activeRange ? 'text-text-primary bg-black/5' : ''}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Rules */}
                    {event.description && <RulesSection description={event.description} />}

                    {/* Outcome rows */}
                    <div className="flex flex-col gap-2">
                        {displayedOutcomes.map((outcome) => (
                            <OutcomeRow
                                key={outcome.id}
                                id={outcome.id}
                                name={outcome.name}
                                probability={outcome.probability}
                                buyYes={outcome.buyYes}
                                buyNo={outcome.buyNo}
                                color={outcome.color}
                                isSelected={selectedOutcomeId === outcome.id}
                                imageUrl={outcome.imageUrl}
                                chartData={chartSeries[outcomes.findIndex(o => o.id === outcome.id)]}
                                onSelect={handleOutcomeSelect}
                                onBuyYes={handleBuyYes}
                                onBuyNo={handleBuyNo}
                            />
                        ))}

                        {outcomes.length > 5 ? (
                            <button
                                onClick={() => setShowAllOutcomes(!showAllOutcomes)}
                                className="w-full h-12 mt-2 rounded-xl font-bold text-[14px] text-text-secondary bg-black/[0.03] hover:bg-black/[0.06] hover:text-text-primary transition-colors flex items-center justify-center gap-2"
                            >
                                {showAllOutcomes ? 'Show less' : `Show ${outcomes.length - 5} more outcomes`}
                                <svg
                                    className={`w-4 h-4 transition-transform ${showAllOutcomes ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </button>
                        ) : (
                            <div className="text-center text-[13px] font-medium text-text-muted py-3">
                                Showing all {outcomes.length} outcomes
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Trade Panel */}
                {selectedOutcome && (
                    <aside className="w-full md:w-[380px] shrink-0">
                        <div className="sticky top-24 bg-surface border border-border-subtle rounded-[20px] shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 px-6 pt-6 pb-2">
                                {selectedOutcome.imageUrl ? (
                                    <img src={selectedOutcome.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                ) : (
                                    <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: selectedOutcome.color }} />
                                )}
                                <div className="text-[17px] font-bold text-text-primary leading-snug max-w-[240px] line-clamp-2">
                                    {selectedOutcome.name}
                                </div>
                            </div>

                            <TradePanel
                                outcomeName={selectedOutcome.name}
                                outcomeColor={selectedOutcome.color}
                                currentPrice={selectedOutcome.probability}
                                yesTokenId={selectedOutcome.yesTokenId}
                                noTokenId={selectedOutcome.noTokenId}
                                portfolio={portfolio}
                                initialSide={orderSide}
                                onClose={handleOrderClose}
                            />

                            <div className="text-center text-[12px] font-medium text-text-muted px-6 pb-5 pt-1">
                                By trading, you agree to the <a href="https://www.pmxt.dev/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-text-secondary transition-colors">Terms of Use</a>.
                            </div>
                        </div>
                    </aside>
                )}
            </main>
        </div>
    );
}
