'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faLock, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') ?? '/quiz';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Login failed.');
                return;
            }

            router.push(data.role === 'admin' ? '/admin' : next);
            router.refresh();
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center px-4 py-16">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 border border-accent/30 mb-4">
                        <Image src="/logo.svg" alt="Skills Bowl logo" width={40} height={40} priority />
                    </div>
                    <h1 className="text-3xl font-bold text-white glow-text">Skills Bowl</h1>
                    <p className="mt-2 text-zinc-500 text-sm">Sign in to your account</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="label">Username</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faUser} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                <input
                                    id="username"
                                    type="text"
                                    autoComplete="username"
                                    className="input pl-10"
                                    placeholder="your_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="label">Password</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    className="input pl-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-md px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button type="submit" className="btn-accent w-full justify-center" disabled={loading}>
                            {loading && <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />}
                            {loading ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>

                    <p className="mt-5 text-center text-sm text-zinc-500">
                        No account?{' '}
                        <Link href="/register" className="text-accent hover:underline font-medium">
                            Register here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
