import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface StatsRow extends RowDataPacket {
    total_questions: number;
    total_users: number;
    total_attempts: number;
    avg_score_pct: number;
}

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rows] = await pool.execute<StatsRow[]>(
        `SELECT
       (SELECT COUNT(*) FROM questions) AS total_questions,
       (SELECT COUNT(*) FROM users WHERE role = 'user') AS total_users,
       (SELECT COUNT(*) FROM quiz_attempts WHERE end_time IS NOT NULL) AS total_attempts,
       (SELECT ROUND(AVG(score / total_questions * 100), 1)
        FROM quiz_attempts WHERE end_time IS NOT NULL AND total_questions > 0) AS avg_score_pct`,
    );

    return NextResponse.json(rows[0] ?? {});
}
