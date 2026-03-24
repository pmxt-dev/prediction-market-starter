import { fetchEvent, fetchLiveMarketCount, fetchCategories } from "@/lib/api";
import EventClient from "./EventClient";
import Header from "@/components/Header";
import SubHeader from "@/components/SubHeader";

interface PageProps {
    params: { id: string };
}

export default async function EventPage({ params }: PageProps) {
    const { id } = await params;

    const [liveMarketCount, categories] = await Promise.allSettled([
        fetchLiveMarketCount(),
        fetchCategories(),
    ]).then(([countResult, categoriesResult]) => [
        countResult.status === 'fulfilled' ? countResult.value : 0,
        categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
    ]);

    try {
        const event = await fetchEvent(id);
        return (
            <EventClient
                event={event}
                liveMarketCount={liveMarketCount as number}
                categories={categories as string[]}
            />
        );
    } catch {
        // Event not found or API unavailable — show a fallback shell
        return (
            <div className="flex flex-col min-h-screen bg-bg-main">
                <Header />
                <SubHeader categories={categories as string[]} />
                <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 text-center text-text-muted">
                    <p className="text-[18px] font-semibold">Event not found.</p>
                    <p className="text-[14px] mt-2">The event &quot;{id}&quot; could not be loaded.</p>
                </main>
            </div>
        );
    }
}
