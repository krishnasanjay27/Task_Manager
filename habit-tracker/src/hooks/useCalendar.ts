'use client';

import { useState, useCallback } from 'react';
import { CalendarState } from '@/types';

export function useCalendar() {
    const now = new Date();
    const [calendar, setCalendar] = useState<CalendarState>({
        month: now.getMonth(),
        year: now.getFullYear(),
    });

    const setMonth = useCallback((month: number) => {
        setCalendar((prev) => ({ ...prev, month }));
    }, []);

    const setYear = useCallback((year: number) => {
        setCalendar((prev) => ({ ...prev, year }));
    }, []);

    const goToPreviousMonth = useCallback(() => {
        setCalendar((prev) => {
            if (prev.month === 0) {
                return { month: 11, year: prev.year - 1 };
            }
            return { ...prev, month: prev.month - 1 };
        });
    }, []);

    const goToNextMonth = useCallback(() => {
        setCalendar((prev) => {
            if (prev.month === 11) {
                return { month: 0, year: prev.year + 1 };
            }
            return { ...prev, month: prev.month + 1 };
        });
    }, []);

    const goToToday = useCallback(() => {
        const now = new Date();
        setCalendar({
            month: now.getMonth(),
            year: now.getFullYear(),
        });
    }, []);

    const monthName = new Date(calendar.year, calendar.month).toLocaleString('default', { month: 'long' });

    return {
        ...calendar,
        monthName,
        setMonth,
        setYear,
        goToPreviousMonth,
        goToNextMonth,
        goToToday,
    };
}
