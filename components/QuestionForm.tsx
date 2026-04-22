'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faArrowLeft, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import type { Question } from '@/lib/types';

type DifficultyType = 'Easy' | 'Medium' | 'Hard';
type AnswerType = 'A' | 'B' | 'C' | 'D';

interface Props {
    /** Existing question data (edit mode) */
    initial?: Partial<Question>;
    /** Question ID for update; undefined means create */
    questionId?: number;
}

const DIFFICULTIES: DifficultyType[] = ['Easy', 'Medium', 'Hard'];
const ANSWERS: AnswerType[] = ['A', 'B', 'C', 'D'];

export default function QuestionForm({ initial, questionId }: Props) {
    const router = useRouter();

    const [content, setContent] = useState(initial?.content ?? '');
    const [imagePath, setImagePath] = useState(initial?.image_path ?? '');
    const [category, setCategory] = useState(initial?.category ?? '');
    const [subCategory, setSubCategory] = useState(initial?.sub_category ?? '');
    const [difficulty, setDifficulty] = useState<DifficultyType>(initial?.difficulty ?? 'Medium');
    const [optionA, setOptionA] = useState(initial?.option_a ?? '');
    const [optionB, setOptionB] = useState(initial?.option_b ?? '');
    const [optionC, setOptionC] = useState(initial?.option_c ?? '');
    const [optionD, setOptionD] = useState(initial?.option_d ?? '');
    const [correctAnswer, setCorrectAnswer] = useState<AnswerType>(initial?.correct_answer ?? 'A');
    const [explanation, setExplanation] = useState(initial?.explanation ?? '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const isEdit = questionId !== undefined;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSaving(true);

        const payload = {
            content: content.trim(),
            image_path: imagePath.trim() || null,
            category: category.trim(),
            sub_category: subCategory.trim(),
            difficulty,
            option_a: optionA.trim(),
            option_b: optionB.trim(),
            option_c: optionC.trim(),
            option_d: optionD.trim(),
            correct_answer: correctAnswer,
            explanation: explanation.trim() || null,
        };

        try {
            const res = await fetch(
                isEdit ? `/api/questions/${questionId}` : '/api/questions',
                {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                },
            );
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Save failed.'); return; }
            router.push('/admin/questions');
            router.refresh();
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    const optionFields: { key: AnswerType; value: string; setter: (v: string) => void }[] = [
        { key: 'A', value: optionA, setter: setOptionA },
        { key: 'B', value: optionB, setter: setOptionB },
        { key: 'C', value: optionC, setter: setOptionC },
        { key: 'D', value: optionD, setter: setOptionD },
    ];

    return (
        <div className="p-6 max-w-3xl space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/questions" className="btn-ghost px-3 py-2">
                    <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-white">{isEdit ? 'Edit Question' : 'Add Question'}</h1>
                    {isEdit && <p className="text-zinc-500 text-sm">ID: {questionId}</p>}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card space-y-5">
                {/* Question content */}
                <div>
                    <label className="label">Question *</label>
                    <textarea
                        className="input min-h-20 resize-y"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter the question text…"
                        required
                    />
                </div>

                {/* Image path */}
                <div>
                    <label className="label">Image Path (optional)</label>
                    <input
                        type="text"
                        className="input"
                        value={imagePath}
                        onChange={(e) => setImagePath(e.target.value)}
                        placeholder="/images/your-image.png"
                    />
                </div>

                {/* Category / Sub-category / Difficulty */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="label">Category *</label>
                        <input
                            type="text"
                            className="input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="e.g. Networking"
                            required
                        />
                    </div>
                    <div>
                        <label className="label">Sub-Category</label>
                        <input
                            type="text"
                            className="input"
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value)}
                            placeholder="e.g. TCP/IP"
                        />
                    </div>
                    <div>
                        <label className="label">Difficulty *</label>
                        <select
                            className="input"
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value as DifficultyType)}
                            required
                        >
                            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                {/* Options */}
                <div>
                    <label className="label">Answer Options *</label>
                    <div className="space-y-3">
                        {optionFields.map(({ key, value, setter }) => (
                            <div key={key} className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCorrectAnswer(key)}
                                    className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold border transition-colors ${correctAnswer === key
                                            ? 'border-accent bg-accent text-black'
                                            : 'border-zinc-600 text-zinc-400 hover:border-accent'
                                        }`}
                                    title={`Mark ${key} as correct`}
                                >
                                    {key}
                                </button>
                                <input
                                    type="text"
                                    className="input"
                                    value={value}
                                    onChange={(e) => setter(e.target.value)}
                                    placeholder={`Option ${key}`}
                                    required
                                />
                                {correctAnswer === key && (
                                    <span className="shrink-0 text-xs text-accent font-semibold">✓ Correct</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-zinc-600">Click the letter button to mark it as the correct answer.</p>
                </div>

                {/* Explanation */}
                <div>
                    <label className="label">Explanation (optional)</label>
                    <textarea
                        className="input min-h-15 resize-y"
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        placeholder="Explain why the answer is correct…"
                    />
                </div>

                {error && (
                    <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-md px-3 py-2">
                        {error}
                    </p>
                )}

                <div className="flex gap-3 pt-2">
                    <button type="submit" className="btn-accent" disabled={saving}>
                        {saving
                            ? <><FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> Saving…</>
                            : <><FontAwesomeIcon icon={faSave} className="h-4 w-4" /> {isEdit ? 'Update Question' : 'Add Question'}</>
                        }
                    </button>
                    <Link href="/admin/questions" className="btn-ghost">Cancel</Link>
                </div>
            </form>
        </div>
    );
}
