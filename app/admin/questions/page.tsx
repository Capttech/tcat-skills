'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faEdit, faTrash, faSearch, faFilter, faSpinner,
    faChevronLeft, faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import type { Question } from '@/lib/types';

export default function QuestionsPage() {
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [deleting, setDeleting] = useState<number | null>(null);

    const LIMIT = 20;

    const fetchCategories = useCallback(async () => {
        const res = await fetch('/api/admin/categories');
        if (res.ok) setCategories(await res.json());
    }, []);

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: String(page),
            limit: String(LIMIT),
            ...(search && { search }),
            ...(category && { category }),
            ...(difficulty && { difficulty }),
        });
        const res = await fetch(`/api/questions?${params}`);
        if (res.ok) {
            const data = await res.json();
            setQuestions(data.questions);
            setTotal(data.total);
        }
        setLoading(false);
    }, [page, search, category, difficulty]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    async function handleDelete(id: number) {
        if (!confirm('Delete this question? This cannot be undone.')) return;
        setDeleting(id);
        const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setQuestions((prev) => prev.filter((q) => q.id !== id));
            setTotal((t) => t - 1);
        }
        setDeleting(null);
    }

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="p-6 space-y-6 max-w-6xl">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Question Bank</h1>
                    <p className="text-zinc-500 text-sm mt-0.5">{total} total questions</p>
                </div>
                <Link href="/admin/questions/new" className="btn-accent">
                    <FontAwesomeIcon icon={faPlus} className="h-4 w-4" />
                    Add Question
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                        type="search"
                        className="input pl-10"
                        placeholder="Search questions…"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <select
                    className="input w-auto"
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                >
                    <option value="">All Categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                    className="input w-auto"
                    value={difficulty}
                    onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
                >
                    <option value="">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 text-accent animate-spin" />
                </div>
            ) : questions.length === 0 ? (
                <div className="card text-center py-12 text-zinc-500">
                    No questions found.{' '}
                    <Link href="/admin/questions/new" className="text-accent hover:underline">Add one</Link>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden overflow-x-auto">
                    <table className="data-table min-w-160">
                        <thead>
                            <tr>
                                <th className="w-12">ID</th>
                                <th>Question</th>
                                <th>Category</th>
                                <th>Sub-Category</th>
                                <th>Difficulty</th>
                                <th>Answer</th>
                                <th className="w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map((q) => (
                                <tr key={q.id}>
                                    <td className="font-mono text-zinc-500 text-sm">{q.id}</td>
                                    <td className="max-w-xs">
                                        <p className="truncate text-zinc-200" title={q.content}>{q.content}</p>
                                    </td>
                                    <td className="text-zinc-400 text-sm">{q.category}</td>
                                    <td className="text-zinc-500 text-sm">{q.sub_category}</td>
                                    <td>
                                        <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                                    </td>
                                    <td className="font-bold text-accent font-mono">{q.correct_answer}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/admin/questions/${q.id}`}
                                                className="p-1.5 text-zinc-400 hover:text-accent transition-colors"
                                                title="Edit"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(q.id)}
                                                disabled={deleting === q.id}
                                                className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors"
                                                title="Delete"
                                            >
                                                {deleting === q.id
                                                    ? <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
                                                    : <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                                                }
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn-ghost px-3 py-2 disabled:opacity-30"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                    </button>
                    <span className="text-zinc-400 text-sm">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="btn-ghost px-3 py-2 disabled:opacity-30"
                    >
                        <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
