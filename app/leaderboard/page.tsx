import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward, faClock } from '@fortawesome/free-solid-svg-icons';

interface LeaderRow extends RowDataPacket {
    username: string;
    score: number;
    total_questions: number;
    percentage: number;
    duration_seconds: number;
}

function formatDuration(s: number): string {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec ? `${m}m ${sec}s` : `${m}m`;
}

const rankIcons = [
    <FontAwesomeIcon key={1} icon={faTrophy} className="h-5 w-5 text-yellow-400" />,
    <FontAwesomeIcon key={2} icon={faMedal} className="h-5 w-5 text-zinc-300" />,
    <FontAwesomeIcon key={3} icon={faAward} className="h-5 w-5 text-amber-600" />,
];

export default async function LeaderboardPage() {
    const [rows] = await pool.execute<LeaderRow[]>(
        `SELECT
       u.username,
       qa.score,
       qa.total_questions,
       ROUND((qa.score / qa.total_questions) * 100, 1) AS percentage,
       TIMESTAMPDIFF(SECOND, qa.start_time, qa.end_time) AS duration_seconds
     FROM quiz_attempts qa
     JOIN users u ON u.id = qa.user_id
     WHERE qa.end_time IS NOT NULL AND qa.total_questions > 0
     ORDER BY percentage DESC, duration_seconds ASC
     LIMIT 25`,
    );

    return (
        <div className="mx-auto max-w-3xl w-full px-4 py-10 space-y-8">
            <div className="text-center space-y-2">
                <FontAwesomeIcon icon={faTrophy} className="h-12 w-12 text-accent" />
                <h1 className="text-3xl font-bold text-white glow-text">Leaderboard</h1>
                <p className="text-zinc-500 text-sm">All-time top scores · Tie-broken by fastest completion</p>
            </div>

            {rows.length === 0 ? (
                <div className="card text-center text-zinc-500 py-12">
                    No completed quizzes yet. Be the first!
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-12 text-center">#</th>
                                <th>Player</th>
                                <th className="text-right">Score</th>
                                <th className="text-right">%</th>
                                <th className="text-right">
                                    <FontAwesomeIcon icon={faClock} className="mr-1 h-3.5 w-3.5" />
                                    Time
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i} className={i < 3 ? 'bg-accent/5' : ''}>
                                    <td className="text-center">
                                        {i < 3 ? rankIcons[i] : <span className="text-zinc-600 font-mono text-sm">{i + 1}</span>}
                                    </td>
                                    <td className={`font-semibold ${i === 0 ? 'text-yellow-300' : i === 1 ? 'text-zinc-200' : 'text-zinc-300'}`}>
                                        {row.username}
                                    </td>
                                    <td className="text-right font-mono text-zinc-300">
                                        {row.score}/{row.total_questions}
                                    </td>
                                    <td className="text-right">
                                        <span className={`font-bold font-mono ${row.percentage >= 80 ? 'text-accent'
                                                : row.percentage >= 60 ? 'text-yellow-400'
                                                    : 'text-red-400'
                                            }`}>
                                            {row.percentage}%
                                        </span>
                                    </td>
                                    <td className="text-right text-zinc-500 font-mono text-sm">
                                        {formatDuration(row.duration_seconds)}
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
