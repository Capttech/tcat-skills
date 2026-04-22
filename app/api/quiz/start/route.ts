import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { Question } from '@/lib/types';

interface QuestionRow extends Question, RowDataPacket { }

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const questionCount: number = Math.min(Math.max(parseInt(body.questionCount ?? '10'), 1), 200);
        const category: string = body.category ?? 'all';
        const timed: boolean = body.timed === true;
        const timeLimit: number | null = timed ? Math.max(60, parseInt(body.timeLimit ?? '600')) : null;

        // Fetch random questions
        let rows: QuestionRow[];
        if (category === 'all') {
            const [r] = await pool.execute<QuestionRow[]>(
                `SELECT * FROM questions ORDER BY RAND() LIMIT ?`,
                [questionCount],
            );
            rows = r;
        } else {
            const [r] = await pool.execute<QuestionRow[]>(
                `SELECT * FROM questions WHERE category = ? ORDER BY RAND() LIMIT ?`,
                [category, questionCount],
            );
            rows = r;
        }

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No questions available for the selected criteria.' }, { status: 404 });
        }

        // Create quiz attempt record
        const [attemptResult] = await pool.execute<ResultSetHeader>(
            'INSERT INTO quiz_attempts (user_id, score, total_questions, time_limit) VALUES (?, 0, ?, ?)',
            [session.userId, rows.length, timeLimit],
        );
        const attemptId = attemptResult.insertId;

        // Record the questions in quiz_questions table
        if (rows.length > 0) {
            const placeholders = rows.map(() => '(?, ?, ?)').join(', ');
            const values = rows.flatMap((q, i) => [attemptId, q.id, i]);
            await pool.execute(
                `INSERT INTO quiz_questions (attempt_id, question_id, question_order) VALUES ${placeholders}`,
                values,
            );
        }

        return NextResponse.json({ attemptId, questions: rows, timeLimit });
    } catch (err) {
        console.error('[quiz/start]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
