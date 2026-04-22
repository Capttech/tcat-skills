import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { RowDataPacket } from 'mysql2';

interface Params { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }

    const body = await req.json();

    // Reset password
    if (body.password !== undefined) {
        const password: string = body.password ?? '';
        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
        }
        const hash = await bcrypt.hash(password, 12);
        await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
        return NextResponse.json({ ok: true });
    }

    // Change role
    if (body.role !== undefined) {
        const role = body.role === 'admin' ? 'admin' : 'user';

        // Prevent demoting the last admin
        if (role === 'user') {
            const [rows] = await pool.execute<RowDataPacket[]>(
                'SELECT COUNT(*) AS cnt FROM users WHERE role = ?', ['admin'],
            );
            if ((rows[0] as RowDataPacket).cnt <= 1) {
                return NextResponse.json({ error: 'Cannot demote the last admin account.' }, { status: 400 });
            }
        }

        await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: Params) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
        return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === session.userId) {
        return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    // Prevent deleting last admin
    const [targetRows] = await pool.execute<RowDataPacket[]>(
        'SELECT role FROM users WHERE id = ?', [userId],
    );
    if (!targetRows.length) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (targetRows[0].role === 'admin') {
        const [countRows] = await pool.execute<RowDataPacket[]>(
            'SELECT COUNT(*) AS cnt FROM users WHERE role = ?', ['admin'],
        );
        if ((countRows[0] as RowDataPacket).cnt <= 1) {
            return NextResponse.json({ error: 'Cannot delete the last admin account.' }, { status: 400 });
        }
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    return NextResponse.json({ ok: true });
}
