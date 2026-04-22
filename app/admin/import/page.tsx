'use client';

import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUpload, faFileCode, faFileCsv, faCircleCheck,
    faCircleXmark, faTriangleExclamation, faSpinner, faArrowRight,
    faCopy, faChevronDown, faChevronUp, faRobot,
} from '@fortawesome/free-solid-svg-icons';

const AI_PROMPT = `You are helping generate quiz questions for a Skills Bowl application. Please create questions in CSV format with exactly these columns (in this order):

content,category,sub_category,difficulty,option_a,option_b,option_c,option_d,correct_answer,explanation

Rules:
- content: the full question text
- category: broad topic (e.g. "Networking", "Programming", "Hardware")
- sub_category: specific topic within the category (e.g. "TCP/IP", "Python", "RAM")
- difficulty: must be exactly one of: Easy, Medium, Hard
- option_a through option_d: the four answer choices (do NOT include "A)", "B)" prefixes)
- correct_answer: must be exactly one of: A, B, C, D (uppercase)
- explanation: a brief explanation of why the correct answer is right (optional but recommended)

CSV formatting rules:
- Include the header row exactly as shown above
- Wrap any field containing a comma or quote in double-quotes
- Escape internal double-quotes by doubling them ("")
- Do not include an "image_path" column unless you have a file path to provide

Example rows:
content,category,sub_category,difficulty,option_a,option_b,option_c,option_d,correct_answer,explanation
What does CPU stand for?,Hardware,Processors,Easy,Central Processing Unit,Computer Power Unit,Control Processing Unit,Central Program Utility,A,CPU stands for Central Processing Unit — the primary component that executes instructions.
"Which protocol operates at Layer 4 of the OSI model?",Networking,OSI Model,Medium,HTTP,IP,TCP,DNS,C,TCP (Transmission Control Protocol) operates at Layer 4 — the Transport layer.

Generate [NUMBER] questions about [TOPIC]. Return only the CSV with no extra explanation.`;

import type { ImportRow, ImportRowValidated } from '@/lib/types';

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const VALID_ANSWERS = ['A', 'B', 'C', 'D'];
const REQUIRED: (keyof ImportRow)[] = [
    'content', 'category', 'sub_category', 'difficulty',
    'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer',
];

function validateRows(rows: ImportRow[]): ImportRowValidated[] {
    return rows.map((row, i) => {
        const errors: string[] = [];
        for (const field of REQUIRED) {
            if (!row[field] || String(row[field]).trim() === '') {
                errors.push(`Missing: ${field}`);
            }
        }
        const ans = row.correct_answer?.toUpperCase?.();
        if (ans && !VALID_ANSWERS.includes(ans)) {
            errors.push(`correct_answer must be A–D (got "${row.correct_answer}")`);
        }
        if (row.difficulty && !VALID_DIFFICULTIES.includes(row.difficulty)) {
            errors.push(`difficulty must be Easy/Medium/Hard`);
        }
        return { ...row, _valid: errors.length === 0, _errors: errors, _index: i + 1 };
    });
}

export default function ImportPage() {
    const [rows, setRows] = useState<ImportRowValidated[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ inserted: number } | null>(null);
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [promptOpen, setPromptOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopyPrompt() {
        navigator.clipboard.writeText(AI_PROMPT).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const processFile = useCallback((file: File) => {
        setResult(null);
        setError('');

        if (file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target?.result as string);
                    const data: ImportRow[] = Array.isArray(parsed) ? parsed : [parsed];
                    setRows(validateRows(data));
                } catch {
                    setError('Invalid JSON file.');
                }
            };
            reader.readAsText(file);
            return;
        }

        // CSV
        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
            complete: (results) => {
                const data = results.data as unknown as ImportRow[];
                setRows(validateRows(data));
            },
            error: () => setError('Failed to parse CSV file.'),
        });
    }, []);

    function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }

    async function handleImport() {
        const validRows = rows.filter((r) => r._valid);
        if (validRows.length === 0) return;

        setImporting(true);
        setError('');
        try {
            const payload: ImportRow[] = validRows.map(({ _valid, _errors, _index, ...rest }) => ({
                ...rest,
                correct_answer: rest.correct_answer.toUpperCase(),
            }));

            const res = await fetch('/api/admin/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? 'Import failed.'); return; }
            setResult({ inserted: data.inserted });
            setRows([]);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setImporting(false);
        }
    }

    const validCount = rows.filter((r) => r._valid).length;
    const invalidCount = rows.length - validCount;

    return (
        <div className="p-6 max-w-5xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Bulk Import</h1>
                <p className="text-zinc-500 text-sm mt-1">Upload a CSV or JSON file to import questions.</p>
            </div>

            {/* AI Prompt helper */}
            <div className="card text-sm">
                <button
                    type="button"
                    onClick={() => setPromptOpen((o) => !o)}
                    className="flex w-full items-center justify-between text-left"
                >
                    <span className="flex items-center gap-2 font-semibold text-zinc-200">
                        <FontAwesomeIcon icon={faRobot} className="h-4 w-4 text-accent" />
                        Generate questions with AI
                    </span>
                    <FontAwesomeIcon icon={promptOpen ? faChevronUp : faChevronDown} className="h-3.5 w-3.5 text-zinc-500" />
                </button>

                {promptOpen && (
                    <div className="mt-4 space-y-3">
                        <p className="text-zinc-400 text-xs">
                            Copy this prompt into any AI assistant (ChatGPT, Claude, Gemini, etc.), fill in the topic and number of questions, then save the output as a <span className="text-accent">.csv</span> file and upload it below.
                        </p>
                        <div className="relative">
                            <pre className="text-xs text-zinc-300 bg-black rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                {AI_PROMPT}
                            </pre>
                            <button
                                type="button"
                                onClick={handleCopyPrompt}
                                className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                            >
                                <FontAwesomeIcon icon={faCopy} className="h-3 w-3" />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Format guide */}
            <div className="card text-sm space-y-2">
                <p className="text-zinc-300 font-semibold">Expected columns/fields:</p>
                <code className="block text-xs text-accent bg-black rounded p-3 overflow-x-auto whitespace-pre">
                    {`content, category, sub_category, difficulty (Easy/Medium/Hard),
option_a, option_b, option_c, option_d,
correct_answer (A/B/C/D), explanation (optional), image_path (optional)`}
                </code>
                <p className="text-zinc-600 text-xs">For JSON, provide an array of objects with these keys.</p>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragOver ? 'border-accent bg-accent/5' : 'border-zinc-700 hover:border-zinc-500'
                    }`}
            >
                <input
                    type="file"
                    accept=".csv,.json"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileInput}
                />
                <FontAwesomeIcon icon={faUpload} className="h-8 w-8 text-zinc-500 mb-3" />
                <p className="text-zinc-300 font-medium">Drop a file here or click to browse</p>
                <p className="text-zinc-600 text-sm mt-1">
                    <FontAwesomeIcon icon={faFileCsv} className="mr-1 text-green-400" /> CSV
                    {' · '}
                    <FontAwesomeIcon icon={faFileCode} className="mr-1 text-blue-400" /> JSON
                </p>
            </div>

            {/* Success */}
            {result && (
                <div className="flex items-center gap-3 bg-accent/10 border border-accent/40 rounded-lg px-4 py-3 text-accent">
                    <FontAwesomeIcon icon={faCircleCheck} className="h-5 w-5" />
                    <span className="font-semibold">Imported {result.inserted} question{result.inserted !== 1 ? 's' : ''} successfully!</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3 text-red-400">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="h-5 w-5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Preview table */}
            {rows.length > 0 && (
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-zinc-400">{rows.length} rows parsed</span>
                            {validCount > 0 && <span className="text-accent font-semibold"><FontAwesomeIcon icon={faCircleCheck} className="mr-1" />{validCount} valid</span>}
                            {invalidCount > 0 && <span className="text-red-400 font-semibold"><FontAwesomeIcon icon={faCircleXmark} className="mr-1" />{invalidCount} invalid</span>}
                        </div>
                        <button
                            onClick={handleImport}
                            disabled={validCount === 0 || importing}
                            className="btn-accent"
                        >
                            {importing
                                ? <><FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" /> Importing…</>
                                : <><FontAwesomeIcon icon={faArrowRight} className="h-4 w-4" /> Import {validCount} Valid Row{validCount !== 1 ? 's' : ''}</>
                            }
                        </button>
                    </div>

                    {/* Table */}
                    <div className="card p-0 overflow-hidden overflow-x-auto">
                        <table className="data-table min-w-225 text-xs">
                            <thead>
                                <tr>
                                    <th className="w-8">#</th>
                                    <th className="w-6"></th>
                                    <th>Question</th>
                                    <th>Category</th>
                                    <th>Difficulty</th>
                                    <th>Answer</th>
                                    <th>Errors</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r._index} className={r._valid ? '' : 'bg-red-900/10'}>
                                        <td className="text-zinc-600 font-mono">{r._index}</td>
                                        <td>
                                            {r._valid
                                                ? <FontAwesomeIcon icon={faCircleCheck} className="h-3.5 w-3.5 text-accent" />
                                                : <FontAwesomeIcon icon={faCircleXmark} className="h-3.5 w-3.5 text-red-400" />
                                            }
                                        </td>
                                        <td className="max-w-50">
                                            <span className="block truncate text-zinc-300" title={r.content}>{r.content || '—'}</span>
                                        </td>
                                        <td className="text-zinc-400">{r.category}</td>
                                        <td>
                                            {r.difficulty && (
                                                <span className={`badge badge-${r.difficulty?.toLowerCase()}`}>{r.difficulty}</span>
                                            )}
                                        </td>
                                        <td className="font-bold text-accent font-mono">{r.correct_answer?.toUpperCase()}</td>
                                        <td className="text-red-400 text-xs">
                                            {r._errors.join('; ') || <span className="text-zinc-700">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
