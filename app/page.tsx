import { fetchTopEvents, fetchCategories, fetchEventsByCategory } from "@/lib/api";
import type { CategoryEventGroup } from "@/lib/api";
import HomeClient from "./HomeClient";

export default async function Home() {
  const [topEvents, categories, categoryEventGroups] = await Promise.allSettled([
    fetchTopEvents(5),
    fetchCategories(),
    fetchEventsByCategory(10),
  ]).then(([eventsResult, categoriesResult, groupsResult]) => [
    eventsResult.status === 'fulfilled' ? eventsResult.value : [],
    categoriesResult.status === 'fulfilled' ? categoriesResult.value : [],
    groupsResult.status === 'fulfilled' ? groupsResult.value : [],
  ]);

  return (
    <HomeClient
      topEvents={topEvents as Awaited<ReturnType<typeof fetchTopEvents>>}
      categories={categories as string[]}
      categoryEventGroups={categoryEventGroups as CategoryEventGroup[]}
    />
  );
}
