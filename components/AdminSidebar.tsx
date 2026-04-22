'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faGauge,
    faCircleQuestion,
    faFileImport,
    faChartBar,
    faUsers,
} from '@fortawesome/free-solid-svg-icons';

const NAV = [
    { href: '/admin', label: 'Dashboard', icon: faGauge, exact: true },
    { href: '/admin/questions', label: 'Questions', icon: faCircleQuestion, exact: false },
    { href: '/admin/import', label: 'Import', icon: faFileImport, exact: false },
    { href: '/admin/analytics', label: 'Analytics', icon: faChartBar, exact: false },
    { href: '/admin/users', label: 'Users', icon: faUsers, exact: false },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-56 shrink-0 border-r border-cyber-border bg-surface hidden lg:flex flex-col py-6 px-3 gap-1">
            <p className="px-3 mb-3 text-xs font-bold uppercase tracking-widest text-zinc-600">Admin</p>
            {NAV.map(({ href, label, icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active
                            ? 'bg-accent/10 text-accent'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-surface-raised'
                            }`}
                    >
                        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
                        {label}
                    </Link>
                );
            })}
        </aside>
    );
}
