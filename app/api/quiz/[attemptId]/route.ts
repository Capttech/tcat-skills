import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';
import type { Question } from '@/lib/types';

interface AttemptRow extends RowDataPacket {
    id: number;
    user_id: number;
    score: number;
    total_questions: number;
    time_limit: number | null;
    start_time: string;
    end_time: string | null;
}
interface QuestionRow extends Question, RowDataPacket { }
interface ResponseRow extends RowDataPacket {
    question_id: number;
    user_choice: string | null;
    is_correct: number;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ attemptId: string }> },
) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { attemptId } = await params;
        const id = parseInt(attemptId);

        const [attempts] = await pool.execute<AttemptRow[]>(
            'SELECT * FROM quiz_attempts WHERE id = ?',
            [id],
        );
        const attempt = attempts[0];
        if (!attempt) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
        if (attempt.user_id !== session.userId && session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        }

        const [questions] = await pool.execute<QuestionRow[]>(
            `SELECT q.*
       FROM quiz_questions qq
       JOIN questions q ON q.id = qq.question_id
       WHERE qq.attempt_id = ?
       ORDER BY qq.question_order`,
            [id],
        );

        const [responses] = await pool.execute<ResponseRow[]>(
            'SELECT question_id, user_choice, is_correct FROM responses WHERE attempt_id = ?',
            [id],
        );

        const responseMap = new Map(responses.map((r) => [r.question_id, r]));

        return NextResponse.json({ attempt, questions, responseMap: Object.fromEntries(responseMap) });
    } catch (err) {
        console.error('[quiz/review]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
