import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';
import type { Question } from '@/lib/types';

interface QuestionRow extends Question, RowDataPacket { }

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [rows] = await pool.execute<QuestionRow[]>('SELECT * FROM questions WHERE id = ?', [id]);
    if (!rows[0]) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(rows[0]);
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { content, image_path, category, sub_category, difficulty,
        option_a, option_b, option_c, option_d, correct_answer, explanation } = body;

    if (!content || !category || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
        return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
        return NextResponse.json({ error: 'correct_answer must be A, B, C, or D.' }, { status: 400 });
    }

    await pool.execute(
        `UPDATE questions SET
       content=?, image_path=?, category=?, sub_category=?, difficulty=?,
       option_a=?, option_b=?, option_c=?, option_d=?, correct_answer=?, explanation=?
     WHERE id = ?`,
        [content, image_path ?? null, category, sub_category ?? '', difficulty,
            option_a, option_b, option_c, option_d, correct_answer, explanation ?? null, id],
    );

    return NextResponse.json({ ok: true });
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await pool.execute('DELETE FROM questions WHERE id = ?', [id]);
    return NextResponse.json({ ok: true });
}
