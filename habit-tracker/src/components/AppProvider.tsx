'use client';

import React, { createContext, useContext, ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { useCalendar, useHabits, useTasks } from '@/hooks';

// Create context for shared state
interface AppContextType {
    calendar: ReturnType<typeof useCalendar>;
    habits: ReturnType<typeof useHabits>;
    tasks: ReturnType<typeof useTasks>;
    isHydrated: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    const calendar = useCalendar();
    const habits = useHabits();
    const tasks = useTasks();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Both hooks need to be hydrated
    const isHydrated = habits.isHydrated && tasks.isHydrated;

    // Calculate main content margin based on sidebar state
    const mainMargin = isCollapsed ? 'lg:ml-16' : 'lg:ml-64';

    return (
        <AppContext.Provider value={{ calendar, habits, tasks, isHydrated }}>
            <div className="min-h-screen bg-[var(--bg-primary)]">
                <Sidebar
                    calendar={calendar}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                />
                {/* Main content with responsive margin */}
                <main className={`min-h-screen p-4 pt-18 lg:pt-8 ${mainMargin} lg:p-8 transition-all duration-200`}>
                    {children}
                </main>
            </div>
        </AppContext.Provider>
    );
}
