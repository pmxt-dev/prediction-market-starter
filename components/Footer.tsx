export default function Footer() {
    return (
        <footer className="border-t border-border-subtle bg-header mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-[13px] text-text-muted">
                <div>&copy; 2026 PMXT. All rights reserved.</div>
                <div className="flex gap-6">
                    <a href="https://www.pmxt.dev/terms" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Terms</a>
                    <a href="https://www.pmxt.dev/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">Privacy</a>
                    <a href="#" className="hover:text-text-primary transition-colors">Contact</a>
                </div>
            </div>
        </footer>
    );
}
