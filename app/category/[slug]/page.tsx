import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchCategories, fetchMarketsByOneCategory, toCategorySlug, categoryFromSlug } from '@/lib/api';
import { getCategoryMeta } from '@pmxt/components';
import CategoryClient from './CategoryClient';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    const categories = await fetchCategories();
    return categories.map(c => ({ slug: toCategorySlug(c) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const name = await categoryFromSlug(slug);
    if (!name) return { title: 'Category Not Found — PMXT' };

    const meta = getCategoryMeta(name, slug);
    return {
        title: `${meta.name} Markets — PMXT`,
        description: meta.description,
    };
}

export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    const name = await categoryFromSlug(slug);
    if (!name) notFound();

    const [markets, allCategories] = await Promise.all([
        fetchMarketsByOneCategory(name),
        fetchCategories(),
    ]);

    const meta = getCategoryMeta(name, slug);

    return (
        <CategoryClient
            meta={meta}
            markets={markets}
            categories={allCategories}
        />
    );
}
