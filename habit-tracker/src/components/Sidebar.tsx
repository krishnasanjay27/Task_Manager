'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCalendar } from '@/hooks';
import { Modal } from '@/components/ui';
import { DataManagement } from './DataManagement';

const navItems = [
    { href: '/', label: 'Today', icon: 'today' },
    { href: '/habits', label: 'Habits', icon: 'habits' },
    { href: '/tasks', label: 'Tasks', icon: 'tasks' },
    { href: '/analytics', label: 'Analytics', icon: 'analytics' },
];

const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function NavIcon({ type }: { type: string }) {
    switch (type) {
        case 'today':
            return (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="10" cy="10" r="7" />
                    <path d="M10 6v4l2.5 2.5" />
                </svg>
            );
        case 'habits':
            return (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 10l4 4 8-8" />
                </svg>
            );
        case 'tasks':
            return (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="14" height="12" rx="2" />
                    <path d="M7 8h6M7 12h4" />
                </svg>
            );
        case 'analytics':
            return (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 16V10M8 16V6M12 16v-4M16 16V8" />
                </svg>
            );
        default:
            return null;
    }
}

interface SidebarProps {
    calendar: ReturnType<typeof useCalendar>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onDataImport?: () => void;
}

export function Sidebar({ calendar, isCollapsed, onToggleCollapse, onDataImport }: SidebarProps) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState<string>('');
    const [years, setYears] = useState<number[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    // Set date and years on client side only to avoid hydration mismatch
    useEffect(() => {
        const now = new Date();
        setCurrentDate(now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        }));
        setYears(Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i));
    }, []);

    const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center justify-between px-4 z-40">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label="Open menu"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <h1 className="font-semibold">Habit Tracker</h1>
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 -mr-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label="Settings"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="10" cy="10" r="2" />
                        <path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.5 3.5l1.5 1.5m10 10l1.5 1.5M3.5 16.5l1.5-1.5m10-10l1.5-1.5" />
                    </svg>
                </button>
            </div>

            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/30 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed left-0 top-0 h-full ${sidebarWidth} bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col z-50
                transition-all duration-200 ease-in-out
                lg:translate-x-0
                ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className={`px-4 py-5 border-b border-[var(--border)] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isCollapsed ? (
                        <>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">Habit Tracker</h1>
                                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Calm execution system</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="lg:hidden p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                aria-label="Close menu"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M15 5L5 15M5 5l10 10" />
                                </svg>
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onToggleCollapse}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            aria-label="Expand sidebar"
                            title="Expand sidebar"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Calendar Control - Hidden when collapsed */}
                {!isCollapsed && (
                    <div className="px-4 py-4 border-b border-[var(--border)]">
                        <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
                            Viewing Period
                        </p>
                        <div className="flex gap-2">
                            <select
                                value={calendar.month}
                                onChange={(e) => calendar.setMonth(Number(e.target.value))}
                                className="input text-sm flex-1"
                            >
                                {months.map((m, i) => (
                                    <option key={m} value={i}>{m}</option>
                                ))}
                            </select>
                            <select
                                value={calendar.year}
                                onChange={(e) => calendar.setYear(Number(e.target.value))}
                                className="input text-sm w-20"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={calendar.goToToday}
                            className="btn btn-ghost w-full mt-2 text-sm"
                        >
                            Go to Today
                        </button>
                    </div>
                )}

                {/* Collapsed Calendar Indicator */}
                {isCollapsed && (
                    <div className="px-2 py-3 border-b border-[var(--border)] text-center">
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                            {months[calendar.month]}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                            {calendar.year}
                        </p>
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-2">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`
                                            flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                            ${isActive
                                                ? 'bg-[var(--accent)] text-white'
                                                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                                            }
                                        `}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <NavIcon type={item.icon} />
                                        {!isCollapsed && item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Settings Button */}
                <div className="p-2 border-t border-[var(--border)]">
                    <button
                        onClick={() => setShowSettings(true)}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="9" cy="9" r="2" />
                            <path d="M9 1v2m0 12v2M1 9h2m12 0h2M3 3l1.5 1.5m9 9l1.5 1.5M3 15l1.5-1.5m9-9l1.5-1.5" />
                        </svg>
                        {!isCollapsed && <span>Settings</span>}
                    </button>
                </div>

                {/* Collapse Toggle - Desktop only */}
                <div className="hidden lg:block p-2 border-t border-[var(--border)]">
                    <button
                        onClick={onToggleCollapse}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className={`transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                        >
                            <path d="M10 4L6 8l4 4" />
                        </svg>
                        {!isCollapsed && <span>Collapse</span>}
                    </button>
                </div>

                {/* Footer */}
                <div className={`p-2 border-t border-[var(--border)] ${isCollapsed ? 'hidden' : ''}`}>
                    <p className="text-xs text-[var(--text-tertiary)] text-center">
                        {currentDate || 'Loading...'}
                    </p>
                </div>
            </aside>

            {/* Settings Modal */}
            <Modal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                title="Settings"
            >
                <DataManagement onImportSuccess={() => {
                    setShowSettings(false);
                    onDataImport?.();
                }} />
            </Modal>
        </>
    );
}

