'use client';

import Header from "@/components/Header";
import SubHeader from "@/components/SubHeader";
import Footer from "@/components/Footer";
import { EventCard, autoMaxOutcomes, FeaturedCarousel, SidebarBannerList, SidebarSection } from "@pmxt/components";
import { useState, useEffect, useMemo } from "react";
import type { CatalogEvent, SidebarData, PricePoint } from "@pmxt/components";
import type { CategoryEventGroup } from "@/lib/api";
import { fetchSidebar, searchEvents, fetchPriceHistory } from "@/lib/api";

interface HomeClientProps {
    topEvents: CatalogEvent[];
    categories: string[];
    categoryEventGroups: CategoryEventGroup[];
}

/**
 * Estimate relative card height based on outcome count.
 * Header ~60px, each outcome row ~44px, footer ~28px.
 */
function cardWeight(event: CatalogEvent): number {
    const outcomeCount = (event.markets ?? [])
        .flatMap(m => m.outcomes)
        .filter(o => !o.description.toLowerCase().startsWith('not ')).length;
    const visible = autoMaxOutcomes(outcomeCount);
    return 60 + visible * 44 + 28;
}

/**
 * Pick enough events to keep both masonry columns roughly balanced.
 * CSS columns fills top-to-bottom, left-to-right, so we simulate that
 * and stop adding events once both columns have meaningful content
 * (at least `minCards` total, and columns within 30% height of each other).
 */
function balancedSlice(events: readonly CatalogEvent[], minCards = 4): CatalogEvent[] {
    if (events.length <= minCards) return [...events];

    let colA = 0;
    let colB = 0;
    const result: CatalogEvent[] = [];

    for (const event of events) {
        const w = cardWeight(event);
        // CSS columns fills the shorter column first
        if (colA <= colB) {
            colA += w;
        } else {
            colB += w;
        }
        result.push(event);

        // Once we have enough cards, stop when columns are balanced
        if (result.length >= minCards) {
            const taller = Math.max(colA, colB);
            const shorter = Math.min(colA, colB);
            if (shorter / taller > 0.7) break;
        }
    }

    return result;
}

export default function HomeClient({ topEvents, categories, categoryEventGroups }: HomeClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CatalogEvent[]>([]);

    const [sidebar, setSidebar] = useState<SidebarData>({ banners: [], trending: [], primaries: [], sections: [] });
    const [priceHistories, setPriceHistories] = useState<ReadonlyMap<string, readonly PricePoint[]>>(new Map());

    useEffect(() => {
        let cancelled = false;
        fetchSidebar().then(data => {
            if (!cancelled) setSidebar(data);
        });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const allOutcomes = topEvents
            .flatMap(e => e.markets ?? [])
            .flatMap(m => m.outcomes)
            .filter(o => !o.description.toLowerCase().startsWith('not '));

        if (allOutcomes.length === 0) return;

        let cancelled = false;
        Promise.all(
            allOutcomes.map(o =>
                fetchPriceHistory(o.pmxt_id, 'max', 1440)
                    .then(history => [o.pmxt_id, history] as const)
                    .catch(() => null)
            )
        ).then(results => {
            if (cancelled) return;
            const entries = results.filter((r): r is [string, PricePoint[]] => r !== null);
            setPriceHistories(new Map(entries));
        });

        return () => { cancelled = true; };
    }, [topEvents]);

    useEffect(() => {
        let cancelled = false;
        searchEvents(searchQuery).then(results => {
            if (!cancelled) setSearchResults(results);
        });
        return () => { cancelled = true; };
    }, [searchQuery]);

    return (
        <div className="flex flex-col min-h-screen">
            <Header
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchResults={searchResults}
            />

            <SubHeader categories={categories} />

            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex gap-6">

                {/* Left Column: Event Cards */}
                <div className="flex-1 space-y-10 min-w-0">
                    <FeaturedCarousel events={topEvents} priceHistories={priceHistories} />

                    {/* Category Sections */}
                    {categoryEventGroups.map((group) => (
                        <section key={group.category}>
                            <h3 className="text-[20px] font-bold flex items-center gap-1.5 hover:text-primary cursor-pointer group transition-colors px-2 mb-4">
                                {group.category}
                                <svg className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </h3>
                            <div className="columns-2 gap-4">
                                {balancedSlice(group.events).map((event) => (
                                    <div key={event.pmxt_id} className="break-inside-avoid mb-4">
                                        <EventCard event={event} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Right Sidebar */}
                <aside className="w-[320px] space-y-8 mt-2">
                    <SidebarBannerList banners={sidebar.banners} />
                    <SidebarSection title="Trending" items={sidebar.trending} />
                    <SidebarSection title="2026 Primaries" items={sidebar.primaries} className="pt-2" />
                    {sidebar.sections.map((section) => (
                        <SidebarSection key={section.title} title={section.title} items={section.items} className="pt-2" />
                    ))}
                </aside>

            </main>

            <Footer />
        </div>
    );
}
