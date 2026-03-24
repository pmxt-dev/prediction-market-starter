import { fetchCategories } from '@/lib/api';
import PortfolioLayout from './PortfolioLayout';

export const metadata = {
    title: 'Portfolio | PMXT',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
    const categories = await fetchCategories();
    return <PortfolioLayout categories={categories}>{children}</PortfolioLayout>;
}
