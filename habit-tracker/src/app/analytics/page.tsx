'use client';

import React from 'react';
import { useApp } from '@/components';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

// Muted color palette for charts
const COLORS = {
    primary: '#374151',
    success: '#059669',
    warning: '#D97706',
    muted: '#9CA3AF',
    light: '#E5E7EB',
};

export default function AnalyticsPage() {
    const { habits, tasks, calendar } = useApp();

    // Get the selected month's date range
    const monthStart = startOfMonth(new Date(calendar.year, calendar.month));
    const monthEnd = endOfMonth(new Date(calendar.year, calendar.month));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Calculate daily completion data for line chart
    const dailyCompletionData = daysInMonth.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const activeHabits = habits.activeHabits;
        const completedCount = activeHabits.filter(h =>
            h.completedDates.includes(dateStr)
        ).length;
        const percentage = activeHabits.length > 0
            ? Math.round((completedCount / activeHabits.length) * 100)
            : 0;

        return {
            date: format(day, 'd'),
            fullDate: dateStr,
            completed: completedCount,
            total: activeHabits.length,
            percentage,
        };
    });

    // Calculate weekly totals for bar chart
    const weeklyData = [];
    for (let week = 0; week < 5; week++) {
        const weekStart = week * 7;
        const weekEnd = Math.min(weekStart + 7, daysInMonth.length);
        const weekDays = daysInMonth.slice(weekStart, weekEnd);

        if (weekDays.length === 0) break;

        let totalCompleted = 0;
        weekDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            totalCompleted += habits.activeHabits.filter(h =>
                h.completedDates.includes(dateStr)
            ).length;
        });

        weeklyData.push({
            week: `Week ${week + 1}`,
            completed: totalCompleted,
            possible: weekDays.length * habits.activeHabits.length,
        });
    }

    // Calculate monthly completion for donut chart
    const totalPossible = daysInMonth.length * habits.activeHabits.length;
    let totalCompleted = 0;
    daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        totalCompleted += habits.activeHabits.filter(h =>
            h.completedDates.includes(dateStr)
        ).length;
    });
    const monthlyPercentage = totalPossible > 0
        ? Math.round((totalCompleted / totalPossible) * 100)
        : 0;

    const donutData = [
        { name: 'Completed', value: totalCompleted },
        { name: 'Remaining', value: Math.max(0, totalPossible - totalCompleted) },
    ];

    // Calculate habit rankings
    const habitRankings = habits.activeHabits
        .map(habit => {
            const completedInMonth = habit.completedDates.filter(dateStr => {
                const date = parseISO(dateStr);
                return date >= monthStart && date <= monthEnd;
            }).length;
            const percentage = daysInMonth.length > 0
                ? Math.round((completedInMonth / daysInMonth.length) * 100)
                : 0;
            return {
                ...habit,
                completedInMonth,
                percentage,
                streak: habits.calculateStreak(habit),
            };
        })
        .sort((a, b) => b.percentage - a.percentage);

    // Task analytics
    const tasksThisMonth = tasks.tasks.filter(t => {
        const createdDate = parseISO(t.createdAt);
        return createdDate >= monthStart && createdDate <= monthEnd;
    });
    const completedTasksThisMonth = tasksThisMonth.filter(t => t.status === 'Completed').length;
    const totalTimeSpent = tasks.tasks.reduce((acc, t) => acc + t.actualTime, 0);

    // Calculate today's stats
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const habitsCompletedToday = habits.activeHabits.filter(h =>
        h.completedDates.includes(todayStr)
    ).length;
    const dailyPercentage = habits.activeHabits.length > 0
        ? Math.round((habitsCompletedToday / habits.activeHabits.length) * 100)
        : 0;

    // Weekly consistency (last 7 days)
    let consistentDays = 0;
    for (let i = 0; i < 7; i++) {
        const day = subDays(today, i);
        const dateStr = format(day, 'yyyy-MM-dd');
        const allCompleted = habits.activeHabits.every(h =>
            h.completedDates.includes(dateStr)
        );
        if (allCompleted && habits.activeHabits.length > 0) consistentDays++;
    }
    const weeklyConsistency = Math.round((consistentDays / 7) * 100);

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-2xl font-semibold">Analytics</h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    {calendar.monthName} {calendar.year}
                </p>
            </header>

            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="card p-5">
                    <p className="text-3xl font-semibold">{dailyPercentage}%</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Today's Completion</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        {habitsCompletedToday}/{habits.activeHabits.length} habits
                    </p>
                </div>
                <div className="card p-5">
                    <p className="text-3xl font-semibold">{weeklyConsistency}%</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Weekly Consistency</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        {consistentDays}/7 perfect days
                    </p>
                </div>
                <div className="card p-5">
                    <p className="text-3xl font-semibold">{monthlyPercentage}%</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Monthly Completion</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        {totalCompleted}/{totalPossible} check-ins
                    </p>
                </div>
                <div className="card p-5">
                    <p className="text-3xl font-semibold">{formatTime(totalTimeSpent)}</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Time Tracked</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-2">
                        {completedTasksThisMonth} tasks completed
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Line Chart - Daily Consistency */}
                <div className="card p-5 col-span-2">
                    <h3 className="font-semibold mb-4">Daily Consistency</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyCompletionData}>
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.muted, fontSize: 12 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.muted, fontSize: 12 }}
                                    domain={[0, 100]}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: `1px solid ${COLORS.light}`,
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                    }}
                                    formatter={(value) => [`${value ?? 0}%`, 'Completion']}
                                    labelFormatter={(label) => `Day ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="percentage"
                                    stroke={COLORS.primary}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, fill: COLORS.primary }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart - Monthly Completion */}
                <div className="card p-5">
                    <h3 className="font-semibold mb-4">Monthly Overview</h3>
                    <div className="h-64 flex flex-col items-center justify-center">
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    <Cell fill={COLORS.success} />
                                    <Cell fill={COLORS.light} />
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: `1px solid ${COLORS.light}`,
                                        borderRadius: '8px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <p className="text-center text-sm text-[var(--text-secondary)]">
                            <span className="text-2xl font-semibold text-[var(--text-primary)]">{monthlyPercentage}%</span>
                            <br />complete
                        </p>
                    </div>
                </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-2 gap-6">
                {/* Bar Chart - Weekly Totals */}
                <div className="card p-5">
                    <h3 className="font-semibold mb-4">Weekly Totals</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <XAxis
                                    dataKey="week"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.muted, fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: COLORS.muted, fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: 'white',
                                        border: `1px solid ${COLORS.light}`,
                                        borderRadius: '8px',
                                    }}
                                    formatter={(value, name) => [
                                        value ?? 0,
                                        name === 'completed' ? 'Completed' : 'Possible'
                                    ]}
                                />
                                <Bar dataKey="completed" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Habit Rankings */}
                <div className="card p-5">
                    <h3 className="font-semibold mb-4">Top Habits</h3>
                    {habitRankings.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
                            No habits to rank yet
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {habitRankings.map((habit, index) => (
                                <div key={habit.id} className="flex items-center gap-3">
                                    <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                    ${index === 0 ? 'bg-[var(--warning-light)] text-[var(--warning)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}
                  `}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{habit.name}</p>
                                        <p className="text-xs text-[var(--text-tertiary)]">
                                            {habit.completedInMonth}/{daysInMonth.length} days
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-sm">{habit.percentage}%</p>
                                        {habit.streak > 0 && (
                                            <p className="text-xs text-[var(--warning)]">🔥 {habit.streak}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Task Summary */}
            <div className="card p-5 mt-6">
                <h3 className="font-semibold mb-4">Task Summary</h3>
                <div className="grid grid-cols-4 gap-4">
                    <div>
                        <p className="text-2xl font-semibold">{tasks.backlogTasks.length}</p>
                        <p className="text-sm text-[var(--text-secondary)]">Backlog</p>
                    </div>
                    <div>
                        <p className="text-2xl font-semibold">{tasks.plannedTasks.length}</p>
                        <p className="text-sm text-[var(--text-secondary)]">Planned</p>
                    </div>
                    <div>
                        <p className="text-2xl font-semibold">{tasks.inProgressTasks.length}</p>
                        <p className="text-sm text-[var(--text-secondary)]">In Progress</p>
                    </div>
                    <div>
                        <p className="text-2xl font-semibold text-[var(--success)]">{tasks.completedTasks.length}</p>
                        <p className="text-sm text-[var(--text-secondary)]">Completed</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
