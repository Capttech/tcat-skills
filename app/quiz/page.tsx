import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import QuizSetupForm from '@/components/QuizSetupForm';

interface CatRow extends RowDataPacket {
    category: string;
}

export default async function QuizPage() {
    const [rows] = await pool.execute<CatRow[]>(
        'SELECT DISTINCT category FROM questions ORDER BY category',
    );
    const categories = rows.map((r) => r.category);

    return (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
            <QuizSetupForm categories={categories} />
        </div>
    );
}
