// Re-export all API functions from the shared @pmxt/sdk package.
// Consumer-specific overrides can be added here if needed.
export {
    fetchTopMarkets,
    fetchAllMarkets,
    fetchLiveMarketCount,
    fetchCategories,
    fetchEvent,
    fetchTopEvents,
    fetchEvents,
    fetchSidebar,
    toCategorySlug,
    categoryFromSlug,
    fetchMarketsByOneCategory,
    fetchPortfolio,
    fetchHoldings,
    searchMarkets,
    searchEvents,
    fetchMarketsByCategory,
    fetchEventsByCategory,
    toEventSlug,
    fetchPriceHistory,
} from '@pmxt/sdk';

export type { CategoryGroup, CategoryEventGroup } from '@pmxt/sdk';
