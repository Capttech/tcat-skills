import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface AnalyticsRow extends RowDataPacket {
    category: string;
    sub_category: string;
    total_responses: number;
    correct_count: number;
    incorrect_count: number;
    success_rate: number;
}

interface UserAnalyticsRow extends RowDataPacket {
    username: string;
    total_responses: number;
    correct_count: number;
    incorrect_count: number;
    success_rate: number;
    quiz_count: number;
}

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') ?? 'category';
    const category = searchParams.get('category') ?? '';
    const subCategory = searchParams.get('subCategory') ?? '';

    if (view === 'user') {
        const conditions: string[] = [];
        const params: string[] = [];
        if (category) { conditions.push('q.category = ?'); params.push(category); }
        if (subCategory) { conditions.push('q.sub_category = ?'); params.push(subCategory); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const joinQuestions = conditions.length ? 'JOIN questions q ON q.id = r.question_id' : '';

        const [rows] = await pool.execute<UserAnalyticsRow[]>(
            `SELECT
               u.username,
               COUNT(r.id)                                        AS total_responses,
               SUM(r.is_correct)                                  AS correct_count,
               COUNT(r.id) - SUM(r.is_correct)                   AS incorrect_count,
               ROUND(SUM(r.is_correct) / COUNT(r.id) * 100, 1)   AS success_rate,
               COUNT(DISTINCT qa.id)                              AS quiz_count
             FROM users u
             JOIN quiz_attempts qa ON qa.user_id = u.id
             JOIN responses r ON r.attempt_id = qa.id
             ${joinQuestions}
             ${where}
             GROUP BY u.id, u.username
             ORDER BY success_rate DESC, total_responses DESC`,
            params,
        );
        return NextResponse.json(rows);
    }

    // Default: by category
    const conditions: string[] = [];
    const params: string[] = [];
    if (category) { conditions.push('q.category = ?'); params.push(category); }
    if (subCategory) { conditions.push('q.sub_category = ?'); params.push(subCategory); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute<AnalyticsRow[]>(
        `SELECT
       q.category,
       q.sub_category,
       COUNT(r.id)                                        AS total_responses,
       SUM(r.is_correct)                                  AS correct_count,
       COUNT(r.id) - SUM(r.is_correct)                   AS incorrect_count,
       ROUND(SUM(r.is_correct) / COUNT(r.id) * 100, 1)   AS success_rate
     FROM questions q
     JOIN responses r ON r.question_id = q.id
     ${where}
     GROUP BY q.category, q.sub_category
     ORDER BY q.category, q.sub_category`,
        params,
    );

    return NextResponse.json(rows);
}
