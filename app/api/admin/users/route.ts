import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT u.id, u.username, u.role, u.created_at,
                COUNT(DISTINCT qa.id) AS quiz_count
         FROM users u
         LEFT JOIN quiz_attempts qa ON qa.user_id = u.id
         GROUP BY u.id
         ORDER BY u.created_at DESC`,
    );
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const username: string = (body.username ?? '').trim();
    const password: string = body.password ?? '';
    const role: string = body.role === 'admin' ? 'admin' : 'user';

    if (!username || !password) {
        return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }
    if (username.length < 3 || username.length > 50) {
        return NextResponse.json({ error: 'Username must be 3–50 characters.' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json({ error: 'Username may only contain letters, numbers, and underscores.' }, { status: 400 });
    }
    if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);

    try {
        const [result] = await pool.execute<import('mysql2').ResultSetHeader>(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hash, role],
        );
        return NextResponse.json({ ok: true, id: result.insertId, username, role }, { status: 201 });
    } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException & { code?: string }).code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: 'Username already taken.' }, { status: 409 });
        }
        console.error('[admin/users POST]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
