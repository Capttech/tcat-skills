'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTrophy,
    faShieldHalved,
    faRightFromBracket,
    faBars,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import type { SessionPayload } from '@/lib/auth';

interface NavbarProps {
    user: SessionPayload;
}

export default function Navbar({ user }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    }

    const links = [
        { href: '/quiz', label: 'Quiz', icon: faTrophy },  // placeholder, quiz uses its own icon below
        { href: '/leaderboard', label: 'Leaderboard', icon: faTrophy },
        ...(user.role === 'admin'
            ? [{ href: '/admin', label: 'Admin', icon: faShieldHalved }]
            : []),
    ];

    return (
        <nav className="sticky top-0 z-50 border-b border-cyber-border bg-black/90 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-14 items-center justify-between">
                    {/* Logo */}
                    <Link href="/quiz" className="flex items-center gap-2 font-mono font-bold text-accent text-lg glow-text">
                        <Image src="/logo.svg" alt="Skills Bowl logo" width={24} height={24} />
                        Skills Bowl
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden sm:flex items-center gap-1">
                        {links.map(({ href, label, icon }) => {
                            const active = pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active
                                        ? 'bg-accent/10 text-accent'
                                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* User + logout */}
                    <div className="hidden sm:flex items-center gap-3">
                        <span className="text-sm text-zinc-500">
                            <span className="text-zinc-300 font-medium">{user.username}</span>
                            {user.role === 'admin' && (
                                <span className="ml-2 badge badge-admin">admin</span>
                            )}
                        </span>
                        <button
                            onClick={handleLogout}
                            className="btn-ghost text-sm px-3 py-1.5"
                            title="Log out"
                        >
                            <FontAwesomeIcon icon={faRightFromBracket} className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Logout</span>
                        </button>
                    </div>

                    {/* Mobile burger */}
                    <button
                        className="sm:hidden p-2 text-zinc-400"
                        onClick={() => setOpen((v) => !v)}
                    >
                        <FontAwesomeIcon icon={open ? faTimes : faBars} className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {open && (
                <div className="sm:hidden border-t border-cyber-border bg-black px-4 py-3 space-y-1">
                    {links.map(({ href, label, icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-300 hover:text-accent hover:bg-zinc-900"
                        >
                            <FontAwesomeIcon icon={icon} className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-red-400"
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
                        Logout ({user.username})
                    </button>
                </div>
            )}
        </nav>
    );
}
