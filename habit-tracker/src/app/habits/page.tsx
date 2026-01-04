'use client';

import React, { useState } from 'react';
import { useApp } from '@/components';
import { Button, Modal, Input, Select } from '@/components/ui';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth } from 'date-fns';
import { HabitCategory } from '@/types';

const categories: { value: HabitCategory; label: string }[] = [
    { value: 'Health', label: 'Health' },
    { value: 'Work', label: 'Work' },
    { value: 'Study', label: 'Study' },
    { value: 'Personal', label: 'Personal' },
    { value: 'Custom', label: 'Custom' },
];

const categoryColors: Record<HabitCategory, string> = {
    Health: 'bg-emerald-100 text-emerald-700',
    Work: 'bg-blue-100 text-blue-700',
    Study: 'bg-purple-100 text-purple-700',
    Personal: 'bg-orange-100 text-orange-700',
    Custom: 'bg-gray-100 text-gray-700',
};

export default function HabitsPage() {
    const { habits, calendar } = useApp();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<HabitCategory | 'All'>('All');

    // Form state
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState<HabitCategory>('Health');
    const [newTarget, setNewTarget] = useState('20');

    // Get days for calendar
    const monthStart = startOfMonth(new Date(calendar.year, calendar.month));
    const monthEnd = endOfMonth(new Date(calendar.year, calendar.month));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = getDay(monthStart);

    // Filter habits
    const displayHabits = showArchived ? habits.archivedHabits : habits.activeHabits;
    const filteredHabits = selectedCategory === 'All'
        ? displayHabits
        : displayHabits.filter(h => h.category === selectedCategory);

    const handleAddHabit = () => {
        if (newName.trim() && parseInt(newTarget) > 0) {
            habits.addHabit(newName.trim(), newCategory, parseInt(newTarget));
            setNewName('');
            setNewCategory('Health');
            setNewTarget('20');
            setShowAddModal(false);
        }
    };

    const isDateCompleted = (habitId: string, date: Date) => {
        const habit = habits.habits.find(h => h.id === habitId);
        return habit?.completedDates.includes(format(date, 'yyyy-MM-dd')) || false;
    };

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold">Habits</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {calendar.monthName} {calendar.year}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant={showArchived ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? 'Show Active' : 'Show Archived'}
                    </Button>
                    <Button onClick={() => setShowAddModal(true)}>
                        + New Habit
                    </Button>
                </div>
            </header>

            {/* Category Filter */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
                <button
                    onClick={() => setSelectedCategory('All')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === 'All'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                        }`}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.value
                            ? 'bg-[var(--accent)] text-white'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Habits List */}
            {filteredHabits.length === 0 ? (
                <div className="card p-12 text-center">
                    <p className="text-[var(--text-secondary)] mb-4">
                        {showArchived ? 'No archived habits' : 'No habits yet. Start building good habits!'}
                    </p>
                    {!showArchived && (
                        <Button onClick={() => setShowAddModal(true)}>
                            Create Your First Habit
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredHabits.map(habit => {
                        const streak = habits.calculateStreak(habit);
                        const monthlyCompletion = habits.getMonthlyCompletion(habit, calendar.year, calendar.month);
                        const completedDays = habits.getCompletedDaysInMonth(habit, calendar.year, calendar.month).length;

                        return (
                            <div key={habit.id} className="card overflow-hidden">
                                {/* Habit Header */}
                                <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <h3 className="font-semibold">{habit.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`badge ${categoryColors[habit.category]}`}>
                                                    {habit.category}
                                                </span>
                                                <span className="text-xs text-[var(--text-tertiary)]">
                                                    Target: {habit.monthlyTarget} days/month
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-2xl font-semibold">{monthlyCompletion}%</p>
                                            <p className="text-xs text-[var(--text-tertiary)]">
                                                {completedDays}/{daysInMonth.length} days
                                            </p>
                                        </div>
                                        {streak > 0 && (
                                            <div className="text-center px-3 py-1 bg-[var(--warning-light)] rounded-lg">
                                                <p className="text-lg font-semibold text-[var(--warning)]">🔥 {streak}</p>
                                                <p className="text-xs text-[var(--warning)]">streak</p>
                                            </div>
                                        )}
                                        <div className="flex gap-1">
                                            {showArchived ? (
                                                <Button variant="ghost" size="sm" onClick={() => habits.unarchiveHabit(habit.id)}>
                                                    Restore
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => habits.archiveHabit(habit.id)}>
                                                    Archive
                                                </Button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (confirm('Delete this habit permanently?')) {
                                                        habits.deleteHabit(habit.id);
                                                    }
                                                }}
                                                className="p-2 text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-light)] rounded-lg transition-colors"
                                                title="Delete habit"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M7 7v4M9 7v4M4 4l.5 8a1 1 0 001 1h5a1 1 0 001-1l.5-8" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div className="p-4">
                                    {/* Day Headers */}
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} className="text-center text-xs font-medium text-[var(--text-tertiary)] py-1">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Days */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {/* Empty cells for days before month starts */}
                                        {Array.from({ length: startDayOfWeek }).map((_, i) => (
                                            <div key={`empty-${i}`} className="aspect-square" />
                                        ))}

                                        {/* Days of the month */}
                                        {daysInMonth.map(day => {
                                            const isCompleted = isDateCompleted(habit.id, day);
                                            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                                            const isFuture = day > new Date();

                                            return (
                                                <button
                                                    key={day.toISOString()}
                                                    onClick={() => !isFuture && habits.toggleHabitCompletion(habit.id, day)}
                                                    disabled={isFuture}
                                                    className={`
                            aspect-square rounded-md text-sm flex items-center justify-center transition-all
                            ${isCompleted
                                                            ? 'bg-[var(--success)] text-white font-medium'
                                                            : isFuture
                                                                ? 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] cursor-not-allowed'
                                                                : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                                        }
                            ${isToday ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''}
                          `}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Habit Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Create New Habit"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddHabit}>
                            Create Habit
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Habit Name"
                        placeholder="e.g., Morning Exercise"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        autoFocus
                    />
                    <Select
                        label="Category"
                        options={categories}
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as HabitCategory)}
                    />
                    <Input
                        label="Monthly Target (days)"
                        type="number"
                        min="1"
                        max="31"
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                    />
                </div>
            </Modal>
        </div>
    );
}
