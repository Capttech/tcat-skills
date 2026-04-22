import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface SessionPayload {
    userId: number;
    username: string;
    role: 'user' | 'admin';
}

const COOKIE_NAME = 'sb_session';
const EXPIRY = '24h';

function getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET env var must be at least 32 characters.');
    }
    return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
    return new SignJWT({ ...payload } as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(EXPIRY)
        .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret());
        return payload as unknown as SessionPayload;
    } catch {
        return null;
    }
}

/** Read + verify the session from the cookie store (Server Components / Route Handlers). */
export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
}

/** Read + verify the session from an incoming middleware request. */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
}

export const SESSION_COOKIE_OPTIONS = {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 86400, // 24 h
    secure: true,
};
