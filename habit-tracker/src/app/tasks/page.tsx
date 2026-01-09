'use client';

import React, { useState } from 'react';
import { useApp } from '@/components';
import { Button, Modal, Input, Select } from '@/components/ui';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { format } from 'date-fns';

const priorities: { value: TaskPriority; label: string }[] = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Critical', label: 'Critical' },
];

const statusColumns: { status: TaskStatus; label: string }[] = [
    { status: 'Backlog', label: 'Backlog' },
    { status: 'Planned', label: 'Planned' },
    { status: 'InProgress', label: 'In Progress' },
    { status: 'Completed', label: 'Completed' },
];

const priorityColors: Record<TaskPriority, string> = {
    Low: 'bg-gray-100 text-gray-600',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
};

export default function TasksPage() {
    const { tasks } = useApp();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [draggedTask, setDraggedTask] = useState<string | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formPriority, setFormPriority] = useState<TaskPriority>('Medium');
    const [formDueDate, setFormDueDate] = useState('');
    const [formDueTime, setFormDueTime] = useState('');
    const [formEstimatedTime, setFormEstimatedTime] = useState('');
    const [formTags, setFormTags] = useState('');

    const resetForm = () => {
        setFormTitle('');
        setFormDescription('');
        setFormPriority('Medium');
        setFormDueDate('');
        setFormDueTime('');
        setFormEstimatedTime('');
        setFormTags('');
        setEditingTask(null);
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setFormTitle(task.title);
        setFormDescription(task.description || '');
        setFormPriority(task.priority);
        // Extract date and time from dueDate if it's a full datetime
        if (task.dueDate) {
            const [datePart, timePart] = task.dueDate.includes('T')
                ? task.dueDate.split('T')
                : [task.dueDate, ''];
            setFormDueDate(datePart);
            setFormDueTime(timePart ? timePart.slice(0, 5) : '');
        } else {
            setFormDueDate('');
            setFormDueTime('');
        }
        setFormEstimatedTime(task.estimatedTime?.toString() || '');
        setFormTags(task.tags.join(', '));
        setShowAddModal(true);
    };

    const handleSaveTask = () => {
        if (!formTitle.trim()) return;

        const tagsArray = formTags.split(',').map(t => t.trim()).filter(t => t);

        // Combine date and time into ISO datetime if both provided
        let fullDueDate: string | undefined;
        if (formDueDate) {
            if (formDueTime) {
                // Full datetime: "2026-01-09T18:30:00"
                fullDueDate = `${formDueDate}T${formDueTime}:00`;
            } else {
                // Date only - default to end of day for notifications
                fullDueDate = `${formDueDate}T23:59:00`;
            }
        }

        if (editingTask) {
            tasks.updateTask(editingTask.id, {
                title: formTitle.trim(),
                description: formDescription.trim() || undefined,
                priority: formPriority,
                dueDate: fullDueDate,
                estimatedTime: formEstimatedTime ? parseInt(formEstimatedTime) : undefined,
                tags: tagsArray,
            });
        } else {
            tasks.addTask(
                formTitle.trim(),
                formPriority,
                formDescription.trim() || undefined,
                fullDueDate,
                formEstimatedTime ? parseInt(formEstimatedTime) : undefined,
                tagsArray
            );
        }

        resetForm();
        setShowAddModal(false);
    };

    const handleDragStart = (taskId: string) => {
        setDraggedTask(taskId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (status: TaskStatus) => {
        if (draggedTask) {
            tasks.updateTaskStatus(draggedTask, status);
            setDraggedTask(null);
        }
    };

    const getTasksByStatus = (status: TaskStatus) => {
        return tasks.sortByPriority(tasks.tasks.filter(t => t.status === status));
    };

    const formatTimeSpent = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <div className="h-[calc(100vh-4rem)]">
            {/* Header */}
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Tasks</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {tasks.tasks.length} total • {tasks.completedTasks.length} completed
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                    + New Task
                </Button>
            </header>

            {/* Kanban Board */}
            <div className="grid grid-cols-4 gap-4 h-[calc(100%-5rem)]">
                {statusColumns.map(({ status, label }) => {
                    const columnTasks = getTasksByStatus(status);
                    return (
                        <div
                            key={status}
                            className="flex flex-col bg-[var(--bg-secondary)] rounded-xl"
                            onDragOver={handleDragOver}
                            onDrop={() => handleDrop(status)}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3 border-b border-[var(--border)]">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm">{label}</h3>
                                    <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-card)] px-2 py-0.5 rounded-full">
                                        {columnTasks.length}
                                    </span>
                                </div>
                            </div>

                            {/* Tasks */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {columnTasks.map(task => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={() => handleDragStart(task.id)}
                                        className={`
                        card p-3 cursor-grab active:cursor-grabbing transition-all
                        ${draggedTask === task.id ? 'opacity-50' : ''}
                      `}
                                    >
                                        {/* Priority & Actions */}
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`badge text-xs ${priorityColors[task.priority]}`}>
                                                {task.priority}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditModal(task)}
                                                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M10 2l2 2-8 8H2v-2l8-8z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => tasks.deleteTask(task.id)}
                                                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--error)]"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M6 7v3M8 7v3M4 4l.5 7a1 1 0 001 1h3a1 1 0 001-1l.5-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Title */}
                                        <h4 className="font-medium text-sm mb-1">{task.title}</h4>

                                        {/* Description */}
                                        {task.description && (
                                            <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}

                                        {/* Tags */}
                                        {task.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {task.tags.map(tag => (
                                                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-[var(--bg-secondary)] rounded">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Meta Info */}
                                        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                                            {task.dueDate && (
                                                <span>Due: {format(new Date(task.dueDate), task.dueDate.includes('T') ? 'MMM d, h:mm a' : 'MMM d')}</span>
                                            )}
                                            {task.estimatedTime && (
                                                <span>Est: {task.estimatedTime}m</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add/Edit Task Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => { setShowAddModal(false); resetForm(); }}
                title={editingTask ? 'Edit Task' : 'Create New Task'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => { setShowAddModal(false); resetForm(); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTask}>
                            {editingTask ? 'Save Changes' : 'Create Task'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Title"
                        placeholder="What needs to be done?"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        autoFocus
                    />
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-[var(--text-primary)]">
                            Description
                        </label>
                        <textarea
                            className="input min-h-[80px] resize-none"
                            placeholder="Add details (optional)"
                            value={formDescription}
                            onChange={(e) => setFormDescription(e.target.value)}
                        />
                    </div>
                    <Select
                        label="Priority"
                        options={priorities}
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Due Date"
                            type="date"
                            value={formDueDate}
                            onChange={(e) => setFormDueDate(e.target.value)}
                        />
                        <Input
                            label="Due Time (optional)"
                            type="time"
                            value={formDueTime}
                            onChange={(e) => setFormDueTime(e.target.value)}
                        />
                    </div>
                    <Input
                        label="Estimated Time (minutes)"
                        type="number"
                        min="1"
                        placeholder="e.g., 30"
                        value={formEstimatedTime}
                        onChange={(e) => setFormEstimatedTime(e.target.value)}
                    />
                    <Input
                        label="Tags (comma separated)"
                        placeholder="e.g., urgent, meeting, design"
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                    />
                </div>
            </Modal>
        </div>
    );
}
