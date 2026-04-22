import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { ImportRow } from '@/lib/types';

const REQUIRED_FIELDS: (keyof ImportRow)[] = [
    'content', 'category', 'sub_category', 'difficulty',
    'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer',
];
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_ANSWERS = ['A', 'B', 'C', 'D'];

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body: ImportRow[] = await req.json();
        if (!Array.isArray(body) || body.length === 0) {
            return NextResponse.json({ error: 'Expected a non-empty JSON array.' }, { status: 400 });
        }

        // Validate every row
        const errors: { index: number; errors: string[] }[] = [];
        for (let i = 0; i < body.length; i++) {
            const row = body[i];
            const rowErrors: string[] = [];

            for (const field of REQUIRED_FIELDS) {
                if (!row[field] || String(row[field]).trim() === '') {
                    rowErrors.push(`Missing field: ${field}`);
                }
            }
            if (row.correct_answer && !VALID_ANSWERS.includes(row.correct_answer.toUpperCase())) {
                rowErrors.push(`correct_answer must be A, B, C, or D (got "${row.correct_answer}")`);
            }
            if (row.difficulty && !VALID_DIFFICULTIES.includes(row.difficulty)) {
                rowErrors.push(`difficulty must be Easy, Medium, or Hard (got "${row.difficulty}")`);
            }

            if (rowErrors.length) errors.push({ index: i, errors: rowErrors });
        }

        if (errors.length) {
            return NextResponse.json({ error: 'Validation failed.', details: errors }, { status: 422 });
        }

        // Bulk insert
        const placeholders = body.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',');
        const values = body.flatMap((r) => [
            r.content.trim(),
            r.image_path?.trim() || null,
            r.category.trim(),
            (r.sub_category ?? '').trim(),
            r.difficulty.trim(),
            r.option_a.trim(),
            r.option_b.trim(),
            r.option_c.trim(),
            r.option_d.trim(),
            r.correct_answer.toUpperCase().trim(),
            r.explanation?.trim() || null,
        ]);

        await pool.execute(
            `INSERT INTO questions
         (content, image_path, category, sub_category, difficulty,
          option_a, option_b, option_c, option_d, correct_answer, explanation)
       VALUES ${placeholders}`,
            values,
        );

        return NextResponse.json({ ok: true, inserted: body.length });
    } catch (err) {
        console.error('[admin/import]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
