import { NextResponse } from 'next/server';
import { SESSION_COOKIE_OPTIONS } from '@/lib/auth';

export async function POST() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...SESSION_COOKIE_OPTIONS, value: '', maxAge: 0 });
    return res;
}
