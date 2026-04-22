import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface OverallRow extends RowDataPacket {
    username: string;
    role: string;
    member_since: string;
    quiz_count: number;
    total_responses: number;
    correct_count: number;
    incorrect_count: number;
    success_rate: number;
    avg_score_pct: number;
    best_score_pct: number;
    worst_score_pct: number;
    total_time_seconds: number;
}

interface CategoryRow extends RowDataPacket {
    category: string;
    sub_category: string;
    total: number;
    correct: number;
    incorrect: number;
    success_rate: number;
}

interface AttemptRow extends RowDataPacket {
    id: number;
    score: number;
    total_questions: number;
    score_pct: number;
    duration_seconds: number | null;
    start_time: string;
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const username = new URL(req.url).searchParams.get('username') ?? '';
    if (!username) {
        return NextResponse.json({ error: 'username is required' }, { status: 400 });
    }

    // Overall stats
    const [overallRows] = await pool.execute<OverallRow[]>(
        `SELECT
           u.username,
           u.role,
           DATE_FORMAT(u.created_at, '%Y-%m-%dT%H:%i:%sZ') AS member_since,
           COUNT(DISTINCT qa.id)                                          AS quiz_count,
           COUNT(r.id)                                                    AS total_responses,
           SUM(r.is_correct)                                              AS correct_count,
           COUNT(r.id) - SUM(r.is_correct)                               AS incorrect_count,
           ROUND(SUM(r.is_correct) / COUNT(r.id) * 100, 1)               AS success_rate,
           ROUND(AVG(qa.score / qa.total_questions * 100), 1)            AS avg_score_pct,
           ROUND(MAX(qa.score / qa.total_questions * 100), 1)            AS best_score_pct,
           ROUND(MIN(qa.score / qa.total_questions * 100), 1)            AS worst_score_pct,
           COALESCE(SUM(TIMESTAMPDIFF(SECOND, qa.start_time, qa.end_time)), 0) AS total_time_seconds
         FROM users u
         JOIN quiz_attempts qa ON qa.user_id = u.id
         JOIN responses r      ON r.attempt_id = qa.id
         WHERE u.username = ?
         GROUP BY u.id, u.username, u.role, u.created_at`,
        [username],
    );

    if (overallRows.length === 0) {
        return NextResponse.json({ error: 'User not found or no quiz data.' }, { status: 404 });
    }

    // Per-category breakdown
    const [categoryRows] = await pool.execute<CategoryRow[]>(
        `SELECT
           q.category,
           q.sub_category,
           COUNT(r.id)                                        AS total,
           SUM(r.is_correct)                                  AS correct,
           COUNT(r.id) - SUM(r.is_correct)                   AS incorrect,
           ROUND(SUM(r.is_correct) / COUNT(r.id) * 100, 1)   AS success_rate
         FROM users u
         JOIN quiz_attempts qa ON qa.user_id = u.id
         JOIN responses r      ON r.attempt_id = qa.id
         JOIN questions q      ON q.id = r.question_id
         WHERE u.username = ?
         GROUP BY q.category, q.sub_category
         ORDER BY success_rate DESC, total DESC`,
        [username],
    );

    // Recent attempts (last 15)
    const [attemptRows] = await pool.execute<AttemptRow[]>(
        `SELECT
           qa.id,
           qa.score,
           qa.total_questions,
           ROUND(qa.score / qa.total_questions * 100, 1)              AS score_pct,
           TIMESTAMPDIFF(SECOND, qa.start_time, qa.end_time)          AS duration_seconds,
           DATE_FORMAT(qa.start_time, '%Y-%m-%dT%H:%i:%sZ')           AS start_time
         FROM quiz_attempts qa
         JOIN users u ON u.id = qa.user_id
         WHERE u.username = ?
         ORDER BY qa.start_time DESC
         LIMIT 15`,
        [username],
    );

    return NextResponse.json({
        ...overallRows[0],
        by_category: categoryRows,
        recent_attempts: attemptRows,
    });
}
