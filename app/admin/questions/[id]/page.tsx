import { notFound } from 'next/navigation';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import type { Question } from '@/lib/types';
import QuestionForm from '@/components/QuestionForm';

interface QuestionRow extends Question, RowDataPacket { }

export default async function EditQuestionPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const [rows] = await pool.execute<QuestionRow[]>(
        'SELECT * FROM questions WHERE id = ?',
        [id],
    );
    const question = rows[0];
    if (!question) notFound();

    return <QuestionForm initial={question} questionId={question.id} />;
}
