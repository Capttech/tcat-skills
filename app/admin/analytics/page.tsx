'use client';

import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilter, faSpinner, faCircleCheck, faCircleXmark,
    faLayerGroup, faUser, faArrowLeft, faTrophy, faFire,
    faChartBar, faClock, faCalendar, faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';
import type { AnalyticsEntry, UserAnalyticsEntry, UserDetailAnalytics } from '@/lib/types';

type View = 'category' | 'user';

function fmtDuration(seconds: number): string {
    if (!seconds) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function fmtDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function pctColor(pct: number) {
    if (pct >= 70) return 'text-accent';
    if (pct >= 50) return 'text-yellow-400';
    return 'text-red-400';
}

function pctBg(pct: number) {
    if (pct >= 70) return 'bg-accent';
    if (pct >= 50) return 'bg-yellow-400';
    return 'bg-red-500';
}

/* ── User Detail Panel ─────────────────────────────────── */
function UserDetail({ username, onBack }: { username: string; onBack: () => void }) {
    const [detail, setDetail] = useState<UserDetailAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/analytics/user?username=${encodeURIComponent(username)}`)
            .then((r) => r.json())
            .then((d) => { setDetail(d); setLoading(false); })
            .catch(() => { setError('Failed to load user data.'); setLoading(false); });
    }, [username]);

    if (loading) return (
        <div className="flex justify-center py-24">
            <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 text-accent animate-spin" />
        </div>
    );
    if (error || !detail) return (
        <div className="card text-center py-12 text-red-400">{error || 'No data.'}</div>
    );

    const best3 = [...detail.by_category].slice(0, 3);
    const worst3 = [...detail.by_category].reverse().slice(0, 3);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 flex-wrap">
                <button onClick={onBack} className="btn-ghost px-3 py-1.5 text-sm flex items-center gap-2">
                    <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" />
                    All Users
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
                        <FontAwesomeIcon icon={faUser} className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{detail.username}</h2>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                            <FontAwesomeIcon icon={detail.role === 'admin' ? faShieldHalved : faUser} className="h-3 w-3" />
                            <span className="capitalize">{detail.role}</span>
                            <span>·</span>
                            <FontAwesomeIcon icon={faCalendar} className="h-3 w-3" />
                            <span>Member since {fmtDate(detail.member_since)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Overall Score', value: `${detail.success_rate ?? 0}%`, color: pctColor(detail.success_rate ?? 0) },
                    { label: 'Avg Per Quiz', value: `${detail.avg_score_pct ?? 0}%`, color: pctColor(detail.avg_score_pct ?? 0) },
                    { label: 'Best Quiz', value: `${detail.best_score_pct ?? 0}%`, color: 'text-accent' },
                    { label: 'Worst Quiz', value: `${detail.worst_score_pct ?? 0}%`, color: 'text-red-400' },
                ].map((s) => (
                    <div key={s.label} className="card text-center space-y-1">
                        <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-zinc-500">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Quizzes Taken', value: detail.quiz_count, icon: faChartBar },
                    { label: 'Total Answers', value: detail.total_responses, icon: faCircleCheck },
                    { label: 'Correct', value: detail.correct_count, icon: faCircleCheck },
                    { label: 'Time Spent', value: fmtDuration(detail.total_time_seconds), icon: faClock },
                ].map((s) => (
                    <div key={s.label} className="card flex items-center gap-3">
                        <FontAwesomeIcon icon={s.icon} className="h-5 w-5 text-zinc-500 shrink-0" />
                        <div>
                            <p className="font-bold text-white text-lg leading-tight">{s.value}</p>
                            <p className="text-xs text-zinc-500">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Best / Worst highlights */}
            {detail.by_category.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="card space-y-3">
                        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                            <FontAwesomeIcon icon={faTrophy} className="h-4 w-4 text-accent" />
                            Best Sections
                        </p>
                        {best3.map((r, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{r.category}</p>
                                    {r.sub_category && <p className="text-xs text-zinc-500 truncate">{r.sub_category}</p>}
                                </div>
                                <span className={`font-bold font-mono text-sm shrink-0 ${pctColor(r.success_rate)}`}>{r.success_rate}%</span>
                            </div>
                        ))}
                    </div>
                    <div className="card space-y-3">
                        <p className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                            <FontAwesomeIcon icon={faFire} className="h-4 w-4 text-red-400" />
                            Needs Improvement
                        </p>
                        {worst3.map((r, i) => (
                            <div key={i} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm text-white truncate">{r.category}</p>
                                    {r.sub_category && <p className="text-xs text-zinc-500 truncate">{r.sub_category}</p>}
                                </div>
                                <span className={`font-bold font-mono text-sm shrink-0 ${pctColor(r.success_rate)}`}>{r.success_rate}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Full category breakdown */}
            <div className="card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="font-semibold text-white text-sm">Performance by Category</p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                            <th className="text-left px-4 py-2">Category</th>
                            <th className="text-left px-4 py-2">Sub-category</th>
                            <th className="text-right px-4 py-2">Answers</th>
                            <th className="text-right px-4 py-2 text-accent">Correct</th>
                            <th className="text-right px-4 py-2 text-red-400">Wrong</th>
                            <th className="text-right px-4 py-2">Score</th>
                            <th className="px-4 py-2 w-28">Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detail.by_category.map((row, i) => (
                            <tr key={i} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/40">
                                <td className="px-4 py-2.5 text-zinc-200">{row.category}</td>
                                <td className="px-4 py-2.5 text-zinc-500">{row.sub_category || '—'}</td>
                                <td className="px-4 py-2.5 text-right text-zinc-400">{row.total}</td>
                                <td className="px-4 py-2.5 text-right text-accent">{row.correct}</td>
                                <td className="px-4 py-2.5 text-right text-red-400">{row.incorrect}</td>
                                <td className={`px-4 py-2.5 text-right font-bold font-mono ${pctColor(row.success_rate)}`}>{row.success_rate}%</td>
                                <td className="px-4 py-2.5">
                                    <div className="h-2 rounded bg-zinc-800 overflow-hidden">
                                        <div className={`h-full ${pctBg(row.success_rate)} rounded`} style={{ width: `${row.success_rate}%` }} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Recent attempts */}
            {detail.recent_attempts.length > 0 && (
                <div className="card p-0 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-800">
                        <p className="font-semibold text-white text-sm">Recent Quiz Attempts</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                                <th className="text-left px-4 py-2">Date</th>
                                <th className="text-right px-4 py-2">Score</th>
                                <th className="text-right px-4 py-2">Questions</th>
                                <th className="text-right px-4 py-2">Result</th>
                                <th className="text-right px-4 py-2">Duration</th>
                                <th className="px-4 py-2 w-28">Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detail.recent_attempts.map((a) => (
                                <tr key={a.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/40">
                                    <td className="px-4 py-2.5 text-zinc-400">{fmtDate(a.start_time)}</td>
                                    <td className="px-4 py-2.5 text-right text-zinc-300">{a.score}/{a.total_questions}</td>
                                    <td className="px-4 py-2.5 text-right text-zinc-500">{a.total_questions}</td>
                                    <td className={`px-4 py-2.5 text-right font-bold font-mono ${pctColor(a.score_pct)}`}>{a.score_pct}%</td>
                                    <td className="px-4 py-2.5 text-right text-zinc-500">{fmtDuration(a.duration_seconds ?? 0)}</td>
                                    <td className="px-4 py-2.5">
                                        <div className="h-2 rounded bg-zinc-800 overflow-hidden">
                                            <div className={`h-full ${pctBg(a.score_pct)} rounded`} style={{ width: `${a.score_pct}%` }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* ── Main Analytics Page ───────────────────────────────── */
export default function AnalyticsPage() {
    const [view, setView] = useState<View>('category');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [categoryData, setCategoryData] = useState<AnalyticsEntry[]>([]);
    const [userData, setUserData] = useState<UserAnalyticsEntry[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [subCats, setSubCats] = useState<string[]>([]);
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        const res = await fetch('/api/admin/categories');
        if (res.ok) setCategories(await res.json());
    }, []);

    const fetchSubCats = useCallback(async (cat: string) => {
        if (!cat) { setSubCats([]); return; }
        const res = await fetch(`/api/admin/categories?category=${encodeURIComponent(cat)}`);
        if (res.ok) setSubCats(await res.json());
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ view });
        if (category) params.set('category', category);
        if (subCategory) params.set('subCategory', subCategory);
        const res = await fetch(`/api/admin/analytics?${params}`);
        if (res.ok) {
            const json = await res.json();
            if (view === 'user') setUserData(json);
            else setCategoryData(json);
        }
        setLoading(false);
    }, [view, category, subCategory]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { fetchSubCats(category); setSubCategory(''); }, [category, fetchSubCats]);
    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setSelectedUser(null); }, [view]);

    const maxTotal = view === 'category'
        ? Math.max(...categoryData.map((d) => d.total_responses), 1)
        : Math.max(...userData.map((d) => d.total_responses), 1);

    return (
        <div className="p-6 max-w-5xl space-y-6">
            {!selectedUser && (
                <div>
                    <h1 className="text-2xl font-bold text-white">Analytics</h1>
                    <p className="text-zinc-500 text-sm mt-1">Success/failure rates by category or user</p>
                </div>
            )}

            {/* If a user is selected, show their detail panel */}
            {selectedUser ? (
                <UserDetail username={selectedUser} onBack={() => setSelectedUser(null)} />
            ) : (
                <>
                    {/* View tabs */}
                    <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit">
                        <button
                            onClick={() => setView('category')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'category' ? 'bg-accent text-black' : 'text-zinc-400 hover:text-zinc-100'}`}
                        >
                            <FontAwesomeIcon icon={faLayerGroup} className="h-3.5 w-3.5" />
                            By Category
                        </button>
                        <button
                            onClick={() => setView('user')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'user' ? 'bg-accent text-black' : 'text-zinc-400 hover:text-zinc-100'}`}
                        >
                            <FontAwesomeIcon icon={faUser} className="h-3.5 w-3.5" />
                            By User
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <FontAwesomeIcon icon={faFilter} className="h-4 w-4 text-zinc-500" />
                        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="">All Categories</option>
                            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {subCats.length > 0 && (
                            <select className="input w-auto" value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
                                <option value="">All Sub-categories</option>
                                {subCats.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Data */}
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 text-accent animate-spin" />
                        </div>
                    ) : view === 'category' ? (
                        categoryData.length === 0 ? (
                            <div className="card text-center py-12 text-zinc-500">
                                No response data yet. Users need to complete quizzes first.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {categoryData.map((row, i) => {
                                    const pct = row.success_rate ?? 0;
                                    return (
                                        <div key={i} className="card space-y-3">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div>
                                                    <p className="font-semibold text-white">{row.category}</p>
                                                    {row.sub_category && <p className="text-sm text-zinc-500">{row.sub_category}</p>}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-zinc-400">{row.total_responses} responses</span>
                                                    <span className="flex items-center gap-1 text-accent">
                                                        <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5" />
                                                        {row.correct_count}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-red-400">
                                                        <FontAwesomeIcon icon={faCircleXmark} className="h-3.5 w-3.5" />
                                                        {row.incorrect_count}
                                                    </span>
                                                    <span className={`font-bold font-mono text-base ${pctColor(pct)}`}>{pct}%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex gap-1 h-4 rounded overflow-hidden bg-zinc-800">
                                                    <div className={`${pctBg(pct)} transition-all`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <div className="flex justify-between text-xs text-zinc-600">
                                                    <span>0%</span><span>100%</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 rounded bg-zinc-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-zinc-500 rounded"
                                                    style={{ width: `${(row.total_responses / maxTotal) * 100}%` }}
                                                    title={`${row.total_responses} of ${maxTotal} total responses`}
                                                />
                                            </div>
                                            <p className="text-xs text-zinc-600">Response volume (relative)</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        userData.length === 0 ? (
                            <div className="card text-center py-12 text-zinc-500">
                                No response data yet. Users need to complete quizzes first.
                            </div>
                        ) : (
                            <div className="card p-0 overflow-hidden">
                                <div className="px-4 py-3 border-b border-zinc-800 text-xs text-zinc-500">
                                    Click a row to view detailed stats for that user.
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                                            <th className="text-left px-4 py-3">User</th>
                                            <th className="text-right px-4 py-3">Quizzes</th>
                                            <th className="text-right px-4 py-3">Responses</th>
                                            <th className="text-right px-4 py-3 text-accent">Correct</th>
                                            <th className="text-right px-4 py-3 text-red-400">Incorrect</th>
                                            <th className="text-right px-4 py-3">Score</th>
                                            <th className="px-4 py-3 w-36">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userData.map((row, i) => {
                                            const pct = row.success_rate ?? 0;
                                            return (
                                                <tr
                                                    key={i}
                                                    onClick={() => setSelectedUser(row.username)}
                                                    className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                                >
                                                    <td className="px-4 py-3 font-medium text-accent hover:underline">{row.username}</td>
                                                    <td className="px-4 py-3 text-right text-zinc-400">{row.quiz_count}</td>
                                                    <td className="px-4 py-3 text-right text-zinc-400">{row.total_responses}</td>
                                                    <td className="px-4 py-3 text-right text-accent">{row.correct_count}</td>
                                                    <td className="px-4 py-3 text-right text-red-400">{row.incorrect_count}</td>
                                                    <td className={`px-4 py-3 text-right font-bold font-mono ${pctColor(pct)}`}>{pct}%</td>
                                                    <td className="px-4 py-3">
                                                        <div className="h-2 rounded bg-zinc-800 overflow-hidden">
                                                            <div className={`h-full ${pctBg(pct)} rounded transition-all`} style={{ width: `${pct}%` }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
}
