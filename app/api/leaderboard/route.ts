import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';

interface LeaderRow extends RowDataPacket {
    username: string;
    score: number;
    total_questions: number;
    percentage: number;
    duration_seconds: number;
}

export async function GET() {
    try {
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
        return NextResponse.json(rows);
    } catch (err) {
        console.error('[leaderboard]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
