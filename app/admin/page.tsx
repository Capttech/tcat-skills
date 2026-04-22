import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleQuestion,
    faUsers,
    faClipboardList,
    faPercent,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

interface StatsRow extends RowDataPacket {
    total_questions: number;
    total_users: number;
    total_attempts: number;
    avg_score_pct: number | null;
}

const StatCard = ({
    icon, label, value, href,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    href?: string;
}) => {
    const inner = (
        <div className="card flex items-center gap-4 hover:border-accent/40 transition-colors">
            <div className="p-3 rounded-lg bg-accent/10 text-accent">{icon}</div>
            <div>
                <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
                <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wide font-semibold">{label}</p>
            </div>
        </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
};

export default async function AdminDashboard() {
    const [rows] = await pool.execute<StatsRow[]>(
        `SELECT
       (SELECT COUNT(*) FROM questions) AS total_questions,
       (SELECT COUNT(*) FROM users WHERE role = 'user') AS total_users,
       (SELECT COUNT(*) FROM quiz_attempts WHERE end_time IS NOT NULL) AS total_attempts,
       (SELECT ROUND(AVG(score / total_questions * 100), 1)
        FROM quiz_attempts WHERE end_time IS NOT NULL AND total_questions > 0) AS avg_score_pct`,
    );
    const stats = rows[0];

    const [recentRows] = await pool.execute<
        (RowDataPacket & { username: string; score: number; total_questions: number; end_time: string })[]
    >(
        `SELECT u.username, qa.score, qa.total_questions, qa.end_time
     FROM quiz_attempts qa
     JOIN users u ON u.id = qa.user_id
     WHERE qa.end_time IS NOT NULL
     ORDER BY qa.end_time DESC
     LIMIT 10`,
    );

    return (
        <div className="p-6 space-y-8 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-zinc-500 text-sm mt-1">Platform overview</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                    icon={<FontAwesomeIcon icon={faCircleQuestion} className="h-6 w-6" />}
                    label="Questions"
                    value={stats?.total_questions ?? 0}
                    href="/admin/questions"
                />
                <StatCard
                    icon={<FontAwesomeIcon icon={faUsers} className="h-6 w-6" />}
                    label="Users"
                    value={stats?.total_users ?? 0}
                />
                <StatCard
                    icon={<FontAwesomeIcon icon={faClipboardList} className="h-6 w-6" />}
                    label="Attempts"
                    value={stats?.total_attempts ?? 0}
                />
                <StatCard
                    icon={<FontAwesomeIcon icon={faPercent} className="h-6 w-6" />}
                    label="Avg Score"
                    value={stats?.avg_score_pct != null ? `${stats.avg_score_pct}%` : '—'}
                    href="/admin/analytics"
                />
            </div>

            {/* Recent attempts */}
            <div>
                <h2 className="text-base font-semibold text-zinc-300 mb-3">Recent Attempts</h2>
                {recentRows.length === 0 ? (
                    <div className="card text-zinc-500 text-sm py-8 text-center">No attempts yet.</div>
                ) : (
                    <div className="card p-0 overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th className="text-right">Score</th>
                                    <th className="text-right">%</th>
                                    <th className="text-right">Completed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRows.map((r, i) => (
                                    <tr key={i}>
                                        <td className="font-medium text-zinc-200">{r.username}</td>
                                        <td className="text-right font-mono">{r.score}/{r.total_questions}</td>
                                        <td className="text-right">
                                            <span className={`font-bold font-mono ${(r.score / r.total_questions) >= 0.8 ? 'text-accent'
                                                    : (r.score / r.total_questions) >= 0.6 ? 'text-yellow-400'
                                                        : 'text-red-400'
                                                }`}>
                                                {Math.round((r.score / r.total_questions) * 100)}%
                                            </span>
                                        </td>
                                        <td className="text-right text-zinc-500 text-sm">
                                            {new Date(r.end_time).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Quick links */}
            <div className="flex flex-wrap gap-3">
                <Link href="/admin/questions/new" className="btn-accent">Add Question</Link>
                <Link href="/admin/import" className="btn-ghost">Bulk Import</Link>
                <Link href="/admin/analytics" className="btn-ghost">View Analytics</Link>
            </div>
        </div>
    );
}
