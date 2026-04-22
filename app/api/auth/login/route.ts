import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { createSessionToken, SESSION_COOKIE_OPTIONS } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface UserRow extends RowDataPacket {
    id: number;
    username: string;
    password_hash: string;
    role: 'user' | 'admin';
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const username: string = (body.username ?? '').trim();
        const password: string = body.password ?? '';

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
        }

        const [rows] = await pool.execute<UserRow[]>(
            'SELECT id, username, password_hash, role FROM users WHERE username = ?',
            [username],
        );

        const user = rows[0];
        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
        }

        const token = await createSessionToken({
            userId: user.id,
            username: user.username,
            role: user.role,
        });

        const res = NextResponse.json({ ok: true, role: user.role, username: user.username });
        res.cookies.set({ ...SESSION_COOKIE_OPTIONS, value: token });
        return res;
    } catch (err) {
        console.error('[login]', err);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
