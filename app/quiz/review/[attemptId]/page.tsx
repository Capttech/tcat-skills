'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCircleCheck,
    faCircleXmark,
    faMinus,
    faTrophy,
    faRotateLeft,
    faChevronDown,
    faChevronUp,
} from '@fortawesome/free-solid-svg-icons';
import type { QuizState, Question } from '@/lib/types';

type OptionKey = 'A' | 'B' | 'C' | 'D';

function getOption(q: Question, key: OptionKey): string {
    const map: Record<OptionKey, string> = {
        A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d,
    };
    return map[key];
}

interface ReviewData {
    attempt: { score: number; total_questions: number; start_time: string; end_time: string | null };
    questions: Question[];
    responseMap: Record<number, { user_choice: string | null; is_correct: number }>;
}

export default function ReviewPage() {
    const params = useParams();
    const router = useRouter();
    const attemptId = parseInt(params.attemptId as string);

    const [data, setData] = useState<ReviewData | null>(null);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState<Set<number>>(new Set());

    useEffect(() => {
        // Try localStorage first
        const raw = localStorage.getItem(`sb_quiz_${attemptId}`);
        if (raw) {
            const state: QuizState = JSON.parse(raw);
            if (state.submitted) {
                const responseMap: ReviewData['responseMap'] = {};
                state.questions.forEach((q) => {
                    const choice = state.answers[q.id] ?? null;
                    responseMap[q.id] = {
                        user_choice: choice,
                        is_correct: choice !== null && choice === q.correct_answer ? 1 : 0,
                    };
                });
                const score = Object.values(responseMap).filter((r) => r.is_correct).length;
                setData({
                    attempt: { score, total_questions: state.questions.length, start_time: '', end_time: null },
                    questions: state.questions,
                    responseMap,
                });
                return;
            }
        }

        // Fall back to API
        fetch(`/api/quiz/${attemptId}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.error) { setError(d.error); return; }
                setData(d);
            })
            .catch(() => setError('Failed to load review data.'));
    }, [attemptId]);

    function toggleExpand(id: number) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    if (error) return (
        <div className="flex flex-1 items-center justify-center text-red-400">
            {error}
        </div>
    );
    if (!data) return (
        <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
    );

    const { attempt, questions, responseMap } = data;
    const pct = Math.round((attempt.score / attempt.total_questions) * 100);
    const scoreColor = pct >= 80 ? 'text-accent' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';

    return (
        <div className="mx-auto max-w-3xl w-full px-4 py-10 space-y-8">
            {/* Score card */}
            <div className="card text-center space-y-4">
                <FontAwesomeIcon icon={faTrophy} className="h-10 w-10 text-accent" />
                <h1 className="text-2xl font-bold text-white">Quiz Complete!</h1>
                <div className={`text-6xl font-bold font-mono ${scoreColor} glow-text`}>{pct}%</div>
                <p className="text-zinc-400 text-lg">
                    {attempt.score} / {attempt.total_questions} correct
                </p>

                <div className="progress-bar max-w-xs mx-auto">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <Link href="/quiz" className="btn-accent">
                        <FontAwesomeIcon icon={faRotateLeft} className="h-4 w-4" />
                        New Quiz
                    </Link>
                    <Link href="/leaderboard" className="btn-ghost">
                        <FontAwesomeIcon icon={faTrophy} className="h-4 w-4" />
                        Leaderboard
                    </Link>
                </div>
            </div>

            {/* Per-question review */}
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-zinc-200">Detailed Review</h2>
                {questions.map((q, idx) => {
                    const resp = responseMap[q.id];
                    const choice = resp?.user_choice as OptionKey | null ?? null;
                    const correct = q.correct_answer as OptionKey;
                    const isRight = resp?.is_correct === 1;
                    const open = expanded.has(q.id);

                    return (
                        <div
                            key={q.id}
                            className={`card border ${isRight ? 'border-accent/30' : choice === null ? 'border-zinc-700' : 'border-red-800/50'}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="shrink-0 mt-0.5">
                                    {choice === null
                                        ? <FontAwesomeIcon icon={faMinus} className="h-5 w-5 text-zinc-500" />
                                        : isRight
                                            ? <FontAwesomeIcon icon={faCircleCheck} className="h-5 w-5 text-accent" />
                                            : <FontAwesomeIcon icon={faCircleXmark} className="h-5 w-5 text-red-400" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-zinc-400 font-mono mb-1">Q{idx + 1}</p>
                                    <p className="text-white leading-relaxed">{q.content}</p>

                                    {q.image_path && (
                                        <div className="mt-3 rounded-lg overflow-hidden border border-cyber-border max-w-sm">
                                            <Image src={q.image_path} alt="" width={400} height={225} className="w-full object-cover" unoptimized />
                                        </div>
                                    )}

                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {(['A', 'B', 'C', 'D'] as OptionKey[]).map((key) => {
                                            const text = getOption(q, key);
                                            const isCorrectOpt = key === correct;
                                            const isChosen = key === choice;
                                            return (
                                                <div
                                                    key={key}
                                                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm border ${isCorrectOpt
                                                            ? 'border-accent/60 bg-accent/10 text-accent'
                                                            : isChosen && !isCorrectOpt
                                                                ? 'border-red-700/60 bg-red-900/20 text-red-300'
                                                                : 'border-transparent text-zinc-500'
                                                        }`}
                                                >
                                                    <span className="font-bold shrink-0">{key}.</span>
                                                    <span>{text}</span>
                                                    {isCorrectOpt && <FontAwesomeIcon icon={faCircleCheck} className="ml-auto shrink-0 h-3.5 w-3.5" />}
                                                    {isChosen && !isCorrectOpt && <FontAwesomeIcon icon={faCircleXmark} className="ml-auto shrink-0 h-3.5 w-3.5" />}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {q.explanation && (
                                        <div className="mt-3">
                                            <button
                                                onClick={() => toggleExpand(q.id)}
                                                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-accent transition-colors"
                                            >
                                                <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} className="h-3 w-3" />
                                                {open ? 'Hide' : 'Show'} explanation
                                            </button>
                                            {open && (
                                                <div className="mt-2 text-sm text-zinc-300 bg-surface-raised border border-cyber-border rounded-lg px-4 py-3 leading-relaxed">
                                                    {q.explanation}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <span className={`shrink-0 badge badge-${q.difficulty.toLowerCase()}`}>
                                    {q.difficulty}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
