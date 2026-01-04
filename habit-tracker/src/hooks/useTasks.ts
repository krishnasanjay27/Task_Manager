'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Task, TaskPriority, TaskStatus } from '@/types';

export function useTasks() {
    const [tasks, setTasks, isHydrated] = useLocalStorage<Task[]>('tasks', []);

    const generateId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const addTask = useCallback((
        title: string,
        priority: TaskPriority = 'Medium',
        description?: string,
        dueDate?: string,
        estimatedTime?: number,
        tags: string[] = []
    ) => {
        const newTask: Task = {
            id: generateId(),
            title,
            description,
            priority,
            status: 'Backlog',
            dueDate,
            estimatedTime,
            actualTime: 0,
            tags,
            createdAt: new Date().toISOString(),
        };
        setTasks((prev) => [...prev, newTask]);
        return newTask;
    }, [setTasks]);

    const updateTask = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    }, [setTasks]);

    const deleteTask = useCallback((id: string) => {
        setTasks((prev) => prev.filter((t) => t.id !== id));
    }, [setTasks]);

    const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    }, [setTasks]);

    const startTimer = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) =>
                t.id === id ? { ...t, timerStartedAt: new Date().toISOString() } : t
            )
        );
    }, [setTasks]);

    const stopTimer = useCallback((id: string) => {
        setTasks((prev) =>
            prev.map((t) => {
                if (t.id !== id || !t.timerStartedAt) return t;
                const startTime = new Date(t.timerStartedAt).getTime();
                const elapsed = Math.floor((Date.now() - startTime) / 60000); // minutes
                return {
                    ...t,
                    actualTime: t.actualTime + elapsed,
                    timerStartedAt: undefined,
                };
            })
        );
    }, [setTasks]);

    const getElapsedTime = useCallback((task: Task): number => {
        if (!task.timerStartedAt) return task.actualTime;
        const startTime = new Date(task.timerStartedAt).getTime();
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        return task.actualTime + elapsed;
    }, []);

    // Priority order for sorting
    const priorityOrder: Record<TaskPriority, number> = {
        Critical: 0,
        High: 1,
        Medium: 2,
        Low: 3,
    };

    const sortByPriority = useCallback((taskList: Task[]): Task[] => {
        return [...taskList].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }, []);

    const getTasksByStatus = useCallback((status: TaskStatus): Task[] => {
        return tasks.filter((t) => t.status === status);
    }, [tasks]);

    const getTodaysTasks = useCallback((): Task[] => {
        const today = new Date().toISOString().split('T')[0];
        return tasks.filter((t) => {
            if (t.status === 'Completed') return false;
            if (t.dueDate === today) return true;
            if (t.status === 'InProgress') return true;
            if (t.status === 'Planned') return true;
            return false;
        });
    }, [tasks]);

    const backlogTasks = tasks.filter((t) => t.status === 'Backlog');
    const plannedTasks = tasks.filter((t) => t.status === 'Planned');
    const inProgressTasks = tasks.filter((t) => t.status === 'InProgress');
    const completedTasks = tasks.filter((t) => t.status === 'Completed');

    return {
        tasks,
        backlogTasks,
        plannedTasks,
        inProgressTasks,
        completedTasks,
        isHydrated,
        addTask,
        updateTask,
        deleteTask,
        updateTaskStatus,
        startTimer,
        stopTimer,
        getElapsedTime,
        sortByPriority,
        getTasksByStatus,
        getTodaysTasks,
    };
}
