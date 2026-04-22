import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

interface AttemptRow extends RowDataPacket {
    id: number;
    user_id: number;
    end_time: string | null;
}

interface QuestionAnswerRow extends RowDataPacket {
    question_id: number;
    correct_answer: string;
}

interface AnswerInput {
    questionId: number;
    choice: string | null;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const attemptId: number = parseInt(body.attemptId);
        const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : [];

        if (!attemptId) return NextResponse.json({ error: 'Missing attemptId.' }, { status: 400 });

        // Verify ownership
        const [attempts] = await pool.execute<AttemptRow[]>(
            'SELECT id, user_id, end_time FROM quiz_attempts WHERE id = ?',
            [attemptId],
        );
        const attempt = attempts[0];
        if (!attempt) return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
        if (attempt.user_id !== session.userId && session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        }
        if (attempt.end_time) {
            return NextResponse.json({ error: 'Attempt already submitted.' }, { status: 409 });
        }

        // Get correct answers for questions in this attempt
        const [questionRows] = await pool.execute<QuestionAnswerRow[]>(
            `SELECT q.id AS question_id, q.correct_answer
       FROM quiz_questions qq
       JOIN questions q ON q.id = qq.question_id
       WHERE qq.attempt_id = ?`,
            [attemptId],
        );
        const correctMap = new Map(questionRows.map((r) => [r.question_id, r.correct_answer]));

        // Score and build response rows
        let score = 0;
        const responseValues: (number | string | null)[] = [];

        for (const ans of answers) {
            const qId = ans.questionId;
            const choice = ans.choice ?? null;
            const correct = correctMap.get(qId);
            if (!correct) continue; // question not in this attempt – skip
            const isCorrect = choice !== null && choice === correct;
            if (isCorrect) score++;
            responseValues.push(attemptId, qId, choice, isCorrect ? 1 : 0);
        }

        if (responseValues.length > 0) {
            const placeholders = answers
                .filter((a) => correctMap.has(a.questionId))
                .map(() => '(?, ?, ?, ?)')
                .join(', ');
            await pool.execute<ResultSetHeader>(
                `INSERT INTO responses (attempt_id, question_id, user_choice, is_correct) VALUES ${placeholders}`,
                responseValues,
            );
        }

        // Update attempt with final score and end time
        await pool.execute(
            'UPDATE quiz_attempts SET score = ?, end_time = NOW() WHERE id = ?',
            [score, attemptId],
        );

        return NextResponse.json({ ok: true, score, total: questionRows.length });
    } catch (err) {
        console.error('[quiz/submit]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
