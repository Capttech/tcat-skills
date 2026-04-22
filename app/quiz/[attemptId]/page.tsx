'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faClock,
    faArrowLeft,
    faArrowRight,
    faFlag,
    faXmark,
    faCircleCheck,
    faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';
import type { QuizState, Question } from '@/lib/types';

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
type OptionKey = typeof OPTION_LABELS[number];

function getOption(q: Question, key: OptionKey): string {
    const map: Record<OptionKey, string> = {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
    };
    return map[key];
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

export default function QuizAttemptPage() {
    const params = useParams();
    const router = useRouter();
    const attemptId = parseInt(params.attemptId as string);

    const [quizState, setQuizState] = useState<QuizState | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const submittedRef = useRef(false);

    // ── Load state from localStorage ────────────────────────────────────────
    useEffect(() => {
        const raw = localStorage.getItem(`sb_quiz_${attemptId}`);
        if (!raw) { setNotFound(true); return; }

        const state: QuizState = JSON.parse(raw);
        if (state.submitted) {
            router.replace(`/quiz/review/${attemptId}`);
            return;
        }
        setQuizState(state);

        if (state.timeLimit) {
            const elapsed = (Date.now() - state.startTime) / 1000;
            const remaining = Math.max(0, state.timeLimit - elapsed);
            setTimeRemaining(remaining);
        }
    }, [attemptId, router]);

    // ── Countdown timer ─────────────────────────────────────────────────────
    const handleSubmit = useCallback(
        async (state: QuizState) => {
            if (submittedRef.current) return;
            submittedRef.current = true;
            setSubmitting(true);

            const answers = state.questions.map((q) => ({
                questionId: q.id,
                choice: state.answers[q.id] ?? null,
            }));

            try {
                await fetch('/api/quiz/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attemptId, answers }),
                });
                const newState: QuizState = { ...state, submitted: true };
                localStorage.setItem(`sb_quiz_${attemptId}`, JSON.stringify(newState));
                localStorage.removeItem('sb_active_quiz');
                router.push(`/quiz/review/${attemptId}`);
            } catch {
                submittedRef.current = false;
                setSubmitting(false);
            }
        },
        [attemptId, router],
    );

    useEffect(() => {
        if (!quizState?.timeLimit) return;

        const tick = () => {
            const elapsed = (Date.now() - quizState.startTime) / 1000;
            const remaining = Math.max(0, quizState.timeLimit! - elapsed);
            setTimeRemaining(remaining);

            if (remaining <= 0 && !submittedRef.current) {
                handleSubmit(quizState);
            }
        };

        tick();
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [quizState, handleSubmit]);

    // ── Helpers ─────────────────────────────────────────────────────────────
    function saveState(next: QuizState) {
        localStorage.setItem(`sb_quiz_${attemptId}`, JSON.stringify(next));
        setQuizState(next);
    }

    function selectAnswer(key: OptionKey) {
        if (!quizState) return;
        const q = quizState.questions[quizState.currentIndex];
        const next = { ...quizState, answers: { ...quizState.answers, [q.id]: key } };
        saveState(next);
    }

    function navigate(delta: number) {
        if (!quizState) return;
        const i = quizState.currentIndex + delta;
        if (i < 0 || i >= quizState.questions.length) return;
        saveState({ ...quizState, currentIndex: i });
    }

    function handleQuit() {
        localStorage.removeItem(`sb_quiz_${attemptId}`);
        localStorage.removeItem('sb_active_quiz');
        router.push('/quiz');
    }

    // ── Render guards ────────────────────────────────────────────────────────
    if (notFound) {
        return (
            <div className="flex flex-1 items-center justify-center text-zinc-500">
                Quiz not found.{' '}
                <button className="ml-2 text-accent underline" onClick={() => router.push('/quiz')}>
                    Start new quiz
                </button>
            </div>
        );
    }
    if (!quizState) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
        );
    }

    const { questions, currentIndex, answers, timeLimit } = quizState;
    const q = questions[currentIndex];
    const chosen = answers[q.id] ?? null;
    const answered = Object.values(answers).filter(Boolean).length;
    const progress = ((currentIndex + 1) / questions.length) * 100;
    const isLast = currentIndex === questions.length - 1;
    const urgent = timeRemaining !== null && timeRemaining < 60;

    return (
        <div className="flex flex-1 flex-col">
            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="sticky top-0 z-10 border-b border-cyber-border bg-black/95 px-4 py-3">
                <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-zinc-400">
                            <span className="font-bold text-white">{currentIndex + 1}</span>
                            <span className="text-zinc-600"> / {questions.length}</span>
                        </span>
                        <span className="text-xs text-zinc-600">
                            {answered} answered
                        </span>
                    </div>

                    {timeLimit && (
                        <div className={`flex items-center gap-2 font-mono text-lg font-bold ${urgent ? 'text-red-400 animate-pulse' : 'text-accent'}`}>
                            <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                            {formatTime(timeRemaining ?? 0)}
                        </div>
                    )}

                    <button
                        onClick={handleQuit}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
                    >
                        <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
                        Quit
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mx-auto mt-2 max-w-3xl progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* ── Question card ────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
                    <div className="card space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <p className="text-lg font-medium text-white leading-relaxed">{q.content}</p>
                            <span className={`shrink-0 badge badge-${q.difficulty.toLowerCase()}`}>
                                {q.difficulty}
                            </span>
                        </div>

                        {q.image_path && (
                            <div className="rounded-lg overflow-hidden border border-cyber-border">
                                <Image
                                    src={q.image_path}
                                    alt="Question illustration"
                                    width={640}
                                    height={360}
                                    className="w-full object-cover"
                                    unoptimized
                                />
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        {OPTION_LABELS.map((key) => {
                            const text = getOption(q, key);
                            const selected = chosen === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => selectAnswer(key)}
                                    className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all ${selected
                                            ? 'border-accent bg-accent/10 text-white'
                                            : 'border-cyber-border bg-surface text-zinc-300 hover:border-zinc-500 hover:bg-surface-raised'
                                        }`}
                                >
                                    <span className={`shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border ${selected ? 'border-accent bg-accent text-black' : 'border-zinc-600 text-zinc-400'
                                        }`}>
                                        {key}
                                    </span>
                                    <span className="leading-relaxed">{text}</span>
                                    {selected && (
                                        <FontAwesomeIcon icon={faCircleCheck} className="ml-auto shrink-0 mt-0.5 h-5 w-5 text-accent" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={() => navigate(-1)}
                            disabled={currentIndex === 0}
                            className="btn-ghost disabled:opacity-30"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                            Previous
                        </button>

                        {/* Question dots (mini map) */}
                        <div className="hidden sm:flex flex-wrap justify-center gap-1 max-w-xs">
                            {questions.map((qi, i) => {
                                const ans = answers[qi.id];
                                return (
                                    <button
                                        key={qi.id}
                                        onClick={() => saveState({ ...quizState, currentIndex: i })}
                                        title={`Question ${i + 1}`}
                                        className={`h-2.5 w-2.5 rounded-full transition-colors ${i === currentIndex
                                                ? 'bg-accent scale-125'
                                                : ans
                                                    ? 'bg-accent/50'
                                                    : 'bg-zinc-700 hover:bg-zinc-500'
                                            }`}
                                    />
                                );
                            })}
                        </div>

                        {isLast ? (
                            <button
                                onClick={() => handleSubmit(quizState)}
                                disabled={submitting}
                                className="btn-accent"
                            >
                                <FontAwesomeIcon icon={faFlag} className="h-4 w-4" />
                                {submitting ? 'Submitting…' : 'Submit Quiz'}
                            </button>
                        ) : (
                            <button onClick={() => navigate(1)} className="btn-accent">
                                Next
                                <FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Unanswered warning */}
                    {isLast && answered < questions.length && (
                        <p className="text-yellow-400 text-sm bg-yellow-900/20 border border-yellow-800/40 rounded-md px-3 py-2">
                            <FontAwesomeIcon icon={faCircleXmark} className="mr-2" />
                            {questions.length - answered} question{questions.length - answered > 1 ? 's' : ''} unanswered. You can still submit.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
