export interface User {
    id: number;
    username: string;
    role: 'user' | 'admin';
}

export interface Question {
    id: number;
    content: string;
    image_path: string | null;
    type: 'MCQ';
    category: string;
    sub_category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: 'A' | 'B' | 'C' | 'D';
    explanation: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface QuizAttempt {
    id: number;
    user_id: number;
    score: number;
    total_questions: number;
    time_limit: number | null;
    start_time: string;
    end_time: string | null;
}

export interface QuizState {
    attemptId: number;
    questions: Question[];
    answers: Record<number, 'A' | 'B' | 'C' | 'D' | null>;
    currentIndex: number;
    timeLimit: number | null;
    startTime: number;
    submitted: boolean;
}

export interface LeaderboardEntry {
    username: string;
    score: number;
    total_questions: number;
    percentage: number;
    duration_seconds: number;
}

export interface AnalyticsEntry {
    category: string;
    sub_category: string;
    total_responses: number;
    correct_count: number;
    incorrect_count: number;
    success_rate: number;
}

export interface UserAnalyticsEntry {
    username: string;
    total_responses: number;
    correct_count: number;
    incorrect_count: number;
    success_rate: number;
    quiz_count: number;
}

export interface UserCategoryBreakdown {
    category: string;
    sub_category: string;
    total: number;
    correct: number;
    incorrect: number;
    success_rate: number;
}

export interface UserRecentAttempt {
    id: number;
    score: number;
    total_questions: number;
    score_pct: number;
    duration_seconds: number | null;
    start_time: string;
}

export interface UserDetailAnalytics {
    username: string;
    role: string;
    member_since: string;
    quiz_count: number;
    total_responses: number;
    correct_count: number;
    incorrect_count: number;
    success_rate: number;
    avg_score_pct: number;
    best_score_pct: number;
    worst_score_pct: number;
    total_time_seconds: number;
    by_category: UserCategoryBreakdown[];
    recent_attempts: UserRecentAttempt[];
}

export interface ImportRow {
    content: string;
    category: string;
    sub_category: string;
    difficulty: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation?: string;
    image_path?: string;
}

export interface ImportRowValidated extends ImportRow {
    _valid: boolean;
    _errors: string[];
    _index: number;
}
