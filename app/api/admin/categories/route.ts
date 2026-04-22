import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface CatRow extends RowDataPacket { category: string; }
interface SubCatRow extends RowDataPacket { sub_category: string; }

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    if (category) {
        const [rows] = await pool.execute<SubCatRow[]>(
            'SELECT DISTINCT sub_category FROM questions WHERE category = ? ORDER BY sub_category',
            [category],
        );
        return NextResponse.json(rows.map((r) => r.sub_category).filter(Boolean));
    }

    const [rows] = await pool.execute<CatRow[]>(
        'SELECT DISTINCT category FROM questions ORDER BY category',
    );
    return NextResponse.json(rows.map((r) => r.category));
}
