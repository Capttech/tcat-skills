'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlay,
    faClock,
    faListOl,
    faFilter,
    faArrowRight,
    faRotateLeft,
    faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import type { QuizState } from '@/lib/types';

const COUNT_OPTIONS = [5, 10, 20, 30, 50];
const TIME_OPTIONS = [
    { label: '30 s / question', value: 300 },
    { label: '1 min / question', value: 600 },
    { label: '2 min / question', value: 1200 },
    { label: '5 min total', value: 300 },
    { label: '10 min total', value: 600 },
    { label: '20 min total', value: 1200 },
    { label: 'Custom…', value: -1 },
];

interface Props {
    categories: string[];
}

export default function QuizSetupForm({ categories }: Props) {
    const router = useRouter();

    const [count, setCount] = useState(10);
    const [category, setCategory] = useState('all');
    const [timed, setTimed] = useState(false);
    const [timeLimit, setTimeLimit] = useState(600);
    const [customTime, setCustomTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pendingAttemptId, setPendingAttemptId] = useState<number | null>(null);

    // Check for a pending (un-submitted) quiz in localStorage
    useEffect(() => {
        const active = localStorage.getItem('sb_active_quiz');
        if (active) {
            try {
                const { attemptId } = JSON.parse(active) as { attemptId: number };
                const stored = localStorage.getItem(`sb_quiz_${attemptId}`);
                if (stored) {
                    const state: QuizState = JSON.parse(stored);
                    if (!state.submitted) setPendingAttemptId(attemptId);
                }
            } catch {
                localStorage.removeItem('sb_active_quiz');
            }
        }
    }, []);

    function discardPending() {
        if (!pendingAttemptId) return;
        localStorage.removeItem(`sb_quiz_${pendingAttemptId}`);
        localStorage.removeItem('sb_active_quiz');
        setPendingAttemptId(null);
    }

    async function handleStart(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const effectiveTime = timeLimit === -1 ? (parseInt(customTime) * 60 || 600) : timeLimit;

        try {
            const res = await fetch('/api/quiz/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionCount: count,
                    category,
                    timed,
                    timeLimit: timed ? effectiveTime : null,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Failed to start quiz.');
                return;
            }

            const state: QuizState = {
                attemptId: data.attemptId,
                questions: data.questions,
                answers: {},
                currentIndex: 0,
                timeLimit: data.timeLimit,
                startTime: Date.now(),
                submitted: false,
            };

            localStorage.setItem(`sb_quiz_${data.attemptId}`, JSON.stringify(state));
            localStorage.setItem('sb_active_quiz', JSON.stringify({ attemptId: data.attemptId }));

            router.push(`/quiz/${data.attemptId}`);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-lg space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white glow-text">Start a Quiz</h1>
                <p className="mt-2 text-zinc-500 text-sm">Configure your session below</p>
            </div>

            {/* Resume banner */}
            {pendingAttemptId && (
                <div className="card border-accent/40 bg-accent/5 flex items-center justify-between gap-4">
                    <div>
                        <p className="font-semibold text-accent text-sm">You have an unfinished quiz!</p>
                        <p className="text-zinc-400 text-xs mt-0.5">Resume where you left off.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push(`/quiz/${pendingAttemptId}`)}
                            className="btn-accent text-sm px-4 py-2"
                        >
                            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                            Resume
                        </button>
                        <button onClick={discardPending} className="btn-ghost text-sm px-3 py-2">
                            <FontAwesomeIcon icon={faRotateLeft} className="h-3.5 w-3.5" />
                            Discard
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleStart} className="card space-y-6">
                {/* Question count */}
                <div>
                    <label className="label">
                        <FontAwesomeIcon icon={faListOl} className="mr-1.5" />
                        Number of Questions
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {COUNT_OPTIONS.map((n) => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => setCount(n)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${count === n
                                        ? 'bg-accent text-black border-accent'
                                        : 'border-cyber-border text-zinc-400 hover:border-accent hover:text-accent'
                                    }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label htmlFor="category" className="label">
                        <FontAwesomeIcon icon={faFilter} className="mr-1.5" />
                        Category
                    </label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="input"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Timed mode */}
                <div>
                    <label className="label">
                        <FontAwesomeIcon icon={faClock} className="mr-1.5" />
                        Timed Mode
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={timed}
                            onClick={() => setTimed((v) => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${timed ? 'bg-accent' : 'bg-zinc-700'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${timed ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className="text-sm text-zinc-400">{timed ? 'Enabled' : 'Disabled'}</span>
                    </div>

                    {timed && (
                        <div className="mt-3 space-y-2">
                            <select
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                                className="input"
                            >
                                {TIME_OPTIONS.map((opt) => (
                                    <option key={opt.label} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {timeLimit === -1 && (
                                <input
                                    type="number"
                                    className="input"
                                    placeholder="Total minutes (e.g. 15)"
                                    value={customTime}
                                    onChange={(e) => setCustomTime(e.target.value)}
                                    min={1}
                                />
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-md px-3 py-2">
                        {error}
                    </p>
                )}

                <button type="submit" className="btn-accent w-full justify-center text-base py-3" disabled={loading}>
                    {loading
                        ? <><FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> Starting…</>
                        : <><FontAwesomeIcon icon={faPlay} className="h-4 w-4" /> Start Quiz</>
                    }
                </button>
            </form>
        </div>
    );
}
