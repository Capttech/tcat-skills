import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';
import type { Question } from '@/lib/types';

interface QuestionRow extends Question, RowDataPacket { }

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
        const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
        const category = searchParams.get('category') ?? '';
        const difficulty = searchParams.get('difficulty') ?? '';
        const search = searchParams.get('search') ?? '';
        const offset = (page - 1) * limit;

        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (category) { conditions.push('category = ?'); params.push(category); }
        if (difficulty) { conditions.push('difficulty = ?'); params.push(difficulty); }
        if (search) { conditions.push('content LIKE ?'); params.push(`%${search}%`); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [countRows] = await pool.execute<(RowDataPacket & { total: number })[]>(
            `SELECT COUNT(*) AS total FROM questions ${where}`,
            params,
        );
        const total = countRows[0].total;

        const [rows] = await pool.execute<QuestionRow[]>(
            `SELECT * FROM questions ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset],
        );

        return NextResponse.json({ questions: rows, total, page, limit });
    } catch (err) {
        console.error('[questions GET]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
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
        if (!['Easy', 'Medium', 'Hard'].includes(difficulty ?? '')) {
            return NextResponse.json({ error: 'difficulty must be Easy, Medium, or Hard.' }, { status: 400 });
        }

        const [result] = await pool.execute<import('mysql2').ResultSetHeader>(
            `INSERT INTO questions
         (content, image_path, category, sub_category, difficulty,
          option_a, option_b, option_c, option_d, correct_answer, explanation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [content, image_path ?? null, category, sub_category ?? '', difficulty,
                option_a, option_b, option_c, option_d, correct_answer, explanation ?? null],
        );

        return NextResponse.json({ id: result.insertId }, { status: 201 });
    } catch (err) {
        console.error('[questions POST]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
