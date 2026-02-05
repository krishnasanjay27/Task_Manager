'use client';

import React, { useState } from 'react';
import { useApp } from '@/components';
import { Button, Modal, Input } from '@/components/ui';
import { format } from 'date-fns';

export default function TodayPage() {
  const { habits, tasks, isHydrated } = useApp();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Get today's date
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Get today's tasks
  const todaysTasks = tasks.sortByPriority(tasks.getTodaysTasks());

  // Get active habits for checkbox
  const activeHabits = habits.activeHabits;

  // Check if habit is completed today
  const isHabitCompletedToday = (habitId: string) => {
    const habit = habits.habits.find(h => h.id === habitId);
    return habit?.completedDates.includes(todayStr) || false;
  };



  const handleQuickAddTask = () => {
    if (quickTaskTitle.trim()) {
      tasks.addTask(quickTaskTitle.trim(), 'Medium', undefined, todayStr);
      setQuickTaskTitle('');
      setShowQuickAdd(false);
    }
  };

  // Calculate today's completion stats - only after hydration
  const habitsCompletedToday = isHydrated
    ? activeHabits.filter(h => isHabitCompletedToday(h.id)).length
    : 0;
  const tasksCompletedToday = isHydrated
    ? tasks.completedTasks.filter(t =>
      t.dueDate === todayStr || format(new Date(t.createdAt), 'yyyy-MM-dd') === todayStr
    ).length
    : 0;

  // Show loading skeleton during hydration
  if (!isHydrated) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse">
        <header className="mb-8">
          <div className="h-4 w-24 bg-[var(--bg-secondary)] rounded mb-2" />
          <div className="h-8 w-48 bg-[var(--bg-secondary)] rounded mb-2" />
          <div className="h-4 w-64 bg-[var(--bg-secondary)] rounded" />
        </header>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4">
              <div className="h-8 w-16 bg-[var(--bg-secondary)] rounded mb-2" />
              <div className="h-4 w-24 bg-[var(--bg-secondary)] rounded" />
            </div>
          ))}
        </div>
        <div className="card p-6 mb-8">
          <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded mb-4" />
          <div className="h-10 w-48 bg-[var(--bg-secondary)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <p className="text-sm text-[var(--text-tertiary)] mb-1">
          {format(today, 'EEEE')}
        </p>
        <h1 className="text-2xl font-semibold">
          {format(today, 'MMMM d, yyyy')}
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Focus on what matters today.
        </p>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-2xl font-semibold">{habitsCompletedToday}/{activeHabits.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">Habits completed</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold">{tasksCompletedToday}</p>
          <p className="text-sm text-[var(--text-secondary)]">Tasks done</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-semibold">{todaysTasks.length}</p>
          <p className="text-sm text-[var(--text-secondary)]">Tasks remaining</p>
        </div>
      </div>



      {/* Today's Habits */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today's Habits</h2>
          <span className="text-sm text-[var(--text-secondary)]">
            {habitsCompletedToday} of {activeHabits.length}
          </span>
        </div>
        {activeHabits.length === 0 ? (
          <div className="card p-6 text-center text-[var(--text-secondary)]">
            <p>No habits yet. Create some in the Habits section.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeHabits.map((habit) => {
              const completed = isHabitCompletedToday(habit.id);
              const streak = habits.calculateStreak(habit);
              return (
                <div
                  key={habit.id}
                  className={`card card-hover p-4 flex items-center gap-4 cursor-pointer transition-all ${completed ? 'bg-[var(--success-light)] border-[var(--success)]' : ''
                    }`}
                  onClick={() => habits.toggleHabitCompletion(habit.id, today)}
                >
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${completed
                      ? 'bg-[var(--success)] border-[var(--success)]'
                      : 'border-[var(--border)]'
                      }`}
                  >
                    {completed && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2">
                        <path d="M3 7l3 3 5-5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${completed ? 'text-[var(--success)]' : ''}`}>
                      {habit.name}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {habit.category}
                    </p>
                  </div>
                  {streak > 0 && (
                    <span className="badge badge-neutral">
                      🔥 {streak} day{streak > 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this habit?')) {
                        habits.deleteHabit(habit.id);
                      }
                    }}
                    className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-light)] rounded transition-colors"
                    title="Delete habit"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M7 7v4M9 7v4M4 4l.5 8a1 1 0 001 1h5a1 1 0 001-1l.5-8" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Today's Tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Today's Tasks</h2>
          <Button variant="secondary" size="sm" onClick={() => setShowQuickAdd(true)}>
            + Add Task
          </Button>
        </div>
        {todaysTasks.length === 0 ? (
          <div className="card p-6 text-center text-[var(--text-secondary)]">
            <p>No tasks for today. Enjoy your free time!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className="card card-hover p-4 flex items-center gap-4"
              >
                <button
                  onClick={() => tasks.updateTaskStatus(task.id, 'Completed')}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors border-[var(--border)] hover:border-[var(--success)] hover:bg-[var(--success-light)]`}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" className="text-transparent hover:text-[var(--success)]">
                    <path d="M3 7l3 3 5-5" />
                  </svg>
                </button>
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs priority-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    {task.estimatedTime && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        Est: {task.estimatedTime}m
                      </span>
                    )}
                    {
                      task.dueDate && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          Due: {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Add Task Modal */}
      <Modal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        title="Quick Add Task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowQuickAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddTask}>
              Add Task
            </Button>
          </>
        }
      >
        <Input
          label="Task Title"
          placeholder="What needs to be done?"
          value={quickTaskTitle}
          onChange={(e) => setQuickTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAddTask()}
          autoFocus
        />
      </Modal>
    </div>
  );
}
