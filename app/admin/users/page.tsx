'use client';

import { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserPlus, faKey, faTrash, faSpinner, faShieldHalved,
    faUser, faCheck, faXmark, faChevronDown, faSearch,
} from '@fortawesome/free-solid-svg-icons';

interface UserRow {
    id: number;
    username: string;
    role: 'user' | 'admin';
    created_at: string;
    quiz_count: number;
}

type Modal =
    | { type: 'create' }
    | { type: 'reset'; user: UserRow }
    | { type: 'role'; user: UserRow }
    | { type: 'delete'; user: UserRow }
    | null;

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Inline toast ─────────────────────────────────── */
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
    return (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium border ${ok ? 'bg-zinc-900 border-accent text-accent' : 'bg-zinc-900 border-red-500 text-red-400'}`}>
            <FontAwesomeIcon icon={ok ? faCheck : faXmark} className="h-4 w-4" />
            {msg}
        </div>
    );
}

/* ── Modal shell ──────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="card w-full max-w-md space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-white text-lg">{title}</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                        <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ── Create user form ─────────────────────────────── */
function CreateModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'user' | 'admin'>('user');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true); setError('');
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role }),
        });
        const json = await res.json();
        setBusy(false);
        if (!res.ok) { setError(json.error ?? 'Failed.'); return; }
        onDone(`Account "${username}" created.`);
    }

    return (
        <Modal title="Create Account" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="block text-xs text-zinc-400 mb-1">Username</label>
                    <input className="input w-full" placeholder="e.g. jsmith" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-xs text-zinc-400 mb-1">Password</label>
                    <input className="input w-full" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-xs text-zinc-400 mb-1">Role</label>
                    <div className="relative">
                        <select className="input w-full appearance-none pr-8" value={role} onChange={(e) => setRole(e.target.value as 'user' | 'admin')}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3 justify-end pt-1">
                    <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={busy} className="btn px-4 py-2 text-sm flex items-center gap-2">
                        {busy && <FontAwesomeIcon icon={faSpinner} className="animate-spin h-3.5 w-3.5" />}
                        Create Account
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ── Reset password form ──────────────────────────── */
function ResetModal({ user, onClose, onDone }: { user: UserRow; onClose: () => void; onDone: (msg: string) => void }) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        setBusy(true); setError('');
        const res = await fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        const json = await res.json();
        setBusy(false);
        if (!res.ok) { setError(json.error ?? 'Failed.'); return; }
        onDone(`Password reset for "${user.username}".`);
    }

    return (
        <Modal title={`Reset Password — ${user.username}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label className="block text-xs text-zinc-400 mb-1">New Password</label>
                    <input className="input w-full" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div>
                    <label className="block text-xs text-zinc-400 mb-1">Confirm Password</label>
                    <input className="input w-full" type="password" placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3 justify-end pt-1">
                    <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                    <button type="submit" disabled={busy} className="btn px-4 py-2 text-sm flex items-center gap-2">
                        {busy && <FontAwesomeIcon icon={faSpinner} className="animate-spin h-3.5 w-3.5" />}
                        Reset Password
                    </button>
                </div>
            </form>
        </Modal>
    );
}

/* ── Change role confirm ──────────────────────────── */
function RoleModal({ user, onClose, onDone }: { user: UserRow; onClose: () => void; onDone: (msg: string) => void }) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function confirm() {
        setBusy(true); setError('');
        const res = await fetch(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        });
        const json = await res.json();
        setBusy(false);
        if (!res.ok) { setError(json.error ?? 'Failed.'); return; }
        onDone(`${user.username} is now ${newRole}.`);
    }

    return (
        <Modal title="Change Role" onClose={onClose}>
            <p className="text-zinc-400 text-sm">
                Change <span className="text-white font-medium">{user.username}</span> from{' '}
                <span className="font-mono text-accent">{user.role}</span> to{' '}
                <span className="font-mono text-accent">{newRole}</span>?
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 justify-end pt-1">
                <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                <button onClick={confirm} disabled={busy} className="btn px-4 py-2 text-sm flex items-center gap-2">
                    {busy && <FontAwesomeIcon icon={faSpinner} className="animate-spin h-3.5 w-3.5" />}
                    Confirm
                </button>
            </div>
        </Modal>
    );
}

/* ── Delete confirm ───────────────────────────────── */
function DeleteModal({ user, onClose, onDone }: { user: UserRow; onClose: () => void; onDone: (msg: string) => void }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function confirm() {
        setBusy(true); setError('');
        const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
        const json = await res.json();
        setBusy(false);
        if (!res.ok) { setError(json.error ?? 'Failed.'); return; }
        onDone(`"${user.username}" has been deleted.`);
    }

    return (
        <Modal title="Delete Account" onClose={onClose}>
            <p className="text-zinc-400 text-sm">
                Permanently delete <span className="text-white font-medium">{user.username}</span>?
                This will also remove all their quiz attempts and responses.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3 justify-end pt-1">
                <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
                <button onClick={confirm} disabled={busy} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    {busy && <FontAwesomeIcon icon={faSpinner} className="animate-spin h-3.5 w-3.5" />}
                    Delete Account
                </button>
            </div>
        </Modal>
    );
}

/* ── Main page ────────────────────────────────────── */
export default function UsersPage() {
    const [users, setUsers] = useState<UserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState<Modal>(null);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/admin/users');
        if (res.ok) setUsers(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    function showToast(msg: string, ok = true) {
        setModal(null);
        setToast({ msg, ok });
        load();
        setTimeout(() => setToast(null), 3500);
    }

    const filtered = users.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="p-6 max-w-4xl space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">User Manager</h1>
                    <p className="text-zinc-500 text-sm mt-1">{users.length} account{users.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => setModal({ type: 'create' })}
                    className="btn flex items-center gap-2 px-4 py-2 text-sm"
                >
                    <FontAwesomeIcon icon={faUserPlus} className="h-4 w-4" />
                    Create Account
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                <input
                    className="input w-full pl-9"
                    placeholder="Search users…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <FontAwesomeIcon icon={faSpinner} className="h-8 w-8 text-accent animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card text-center py-12 text-zinc-500">No users found.</div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wide">
                                <th className="text-left px-4 py-3">User</th>
                                <th className="text-left px-4 py-3">Role</th>
                                <th className="text-right px-4 py-3">Quizzes</th>
                                <th className="text-left px-4 py-3">Joined</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => (
                                <tr key={u.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/40 transition-colors">
                                    <td className="px-4 py-3 font-medium text-white">{u.username}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setModal({ type: 'role', user: u })}
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${u.role === 'admin' ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}
                                            title="Click to change role"
                                        >
                                            <FontAwesomeIcon icon={u.role === 'admin' ? faShieldHalved : faUser} className="h-3 w-3" />
                                            {u.role}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right text-zinc-400">{u.quiz_count}</td>
                                    <td className="px-4 py-3 text-zinc-500">{fmtDate(u.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => setModal({ type: 'reset', user: u })}
                                                className="p-2 rounded-lg text-zinc-500 hover:text-accent hover:bg-accent/10 transition-colors"
                                                title="Reset password"
                                            >
                                                <FontAwesomeIcon icon={faKey} className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setModal({ type: 'delete', user: u })}
                                                className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Delete account"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals */}
            {modal?.type === 'create' && (
                <CreateModal onClose={() => setModal(null)} onDone={(msg) => showToast(msg)} />
            )}
            {modal?.type === 'reset' && (
                <ResetModal user={modal.user} onClose={() => setModal(null)} onDone={(msg) => showToast(msg)} />
            )}
            {modal?.type === 'role' && (
                <RoleModal user={modal.user} onClose={() => setModal(null)} onDone={(msg) => showToast(msg)} />
            )}
            {modal?.type === 'delete' && (
                <DeleteModal user={modal.user} onClose={() => setModal(null)} onDone={(msg) => showToast(msg)} />
            )}

            {/* Toast */}
            {toast && <Toast msg={toast.msg} ok={toast.ok} />}
        </div>
    );
}
