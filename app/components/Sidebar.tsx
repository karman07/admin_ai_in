'use client';
import React from 'react';
import Image from 'next/image';
import {
    LayoutDashboard,
    Users,
    UserCog,
    BarChart3,
    CreditCard,
    BookOpen,
    GraduationCap,
    HelpCircle,
    LogOut,
    ChevronLeft,
    ChevronRight,
    FileText,
    Cpu,
    Ticket
} from 'lucide-react';

export type Page =
    | 'dashboard'
    | 'analytics'
    | 'visitors'
    | 'users'
    | 'subscriptions'
    | 'payments'
    | 'subjects'
    | 'lessons'
    | 'quizzes'
    | 'resources'
    | 'ai-usage'
    | 'discounts';

const navItems: { id: Page; label: string; icon: React.ReactNode; group: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, group: 'Overview' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} />, group: 'Overview' },
    { id: 'visitors', label: 'Visitors', icon: <Users size={18} />, group: 'Overview' },
    { id: 'users', label: 'Users', icon: <UserCog size={18} />, group: 'Management' },
    { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={18} />, group: 'Management' },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={18} />, group: 'Management' },
    { id: 'discounts', label: 'Discounts', icon: <Ticket size={18} />, group: 'Management' },
    { id: 'subjects', label: 'Subjects', icon: <BookOpen size={18} />, group: 'Content' },
    { id: 'lessons', label: 'Lessons', icon: <GraduationCap size={18} />, group: 'Content' },
    { id: 'quizzes', label: 'Quizzes', icon: <HelpCircle size={18} />, group: 'Content' },
    { id: 'resources', label: 'Resources', icon: <FileText size={18} />, group: 'Content' },
    { id: 'ai-usage', label: 'AI Usage', icon: <Cpu size={18} />, group: 'Overview' },
];

export default function Sidebar({
    activePage,
    onPageChange,
    collapsed,
    onToggle,
    adminUser,
    onLogout,
}: {
    activePage: Page;
    onPageChange: (page: Page) => void;
    collapsed: boolean;
    onToggle: () => void;
    adminUser?: any;
    onLogout?: () => void;
}) {
    const groups = [...new Set(navItems.map((n) => n.group))];

    return (
        <aside
            style={{
                width: collapsed ? 72 : 260,
                background: 'var(--sidebar-bg)',
                borderRight: '1px solid var(--card-border)',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: 40,
                transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
                overflow: 'hidden',
            }}
        >
            {/* Logo */}
            <div
                style={{
                    padding: collapsed ? '20px 12px' : '20px 20px',
                    borderBottom: '1px solid var(--card-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 72,
                }}
            >
                {!collapsed && (
                    <div style={{ overflow: 'hidden' }}>
                        <div
                            style={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#6c63ff',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            AI for Job
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                            Admin Panel
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                {groups.map((group) => (
                    <div key={group} style={{ marginBottom: 16 }}>
                        {!collapsed && (
                            <div
                                style={{
                                    padding: '4px 16px',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: 'var(--muted-foreground)',
                                    opacity: 0.6,
                                    marginBottom: 4,
                                }}
                            >
                                {group}
                            </div>
                        )}
                        {navItems
                            .filter((n) => n.group === group)
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
                                    onClick={() => onPageChange(item.id)}
                                    style={{
                                        justifyContent: collapsed ? 'center' : 'flex-start',
                                        padding: collapsed ? '10px' : '10px 16px',
                                        marginBottom: 2,
                                    }}
                                    title={collapsed ? item.label : undefined}
                                >
                                    {item.icon}
                                    {!collapsed && <span>{item.label}</span>}
                                </div>
                            ))}
                    </div>
                ))}
            </nav>

            {/* Bottom section */}
            <div
                style={{
                    padding: '8px 8px 12px',
                    borderTop: '1px solid var(--card-border)',
                }}
            >
                {/* Admin info */}
                {adminUser && !collapsed && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 16px',
                            marginBottom: 4,
                        }}
                    >
                        <div
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: '#6c63ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'white',
                                flexShrink: 0,
                            }}
                        >
                            {adminUser.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {adminUser.name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {adminUser.email}
                            </div>
                        </div>
                    </div>
                )}
                {onLogout && (
                    <div
                        className="sidebar-item"
                        onClick={onLogout}
                        style={{
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            padding: collapsed ? '10px' : '10px 16px',
                            color: '#f87171',
                            marginBottom: 4,
                        }}
                        title={collapsed ? 'Logout' : undefined}
                    >
                        <LogOut size={18} />
                        {!collapsed && <span>Logout</span>}
                    </div>
                )}
                <div
                    className="sidebar-item"
                    onClick={onToggle}
                    style={{
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        padding: collapsed ? '10px' : '10px 16px',
                    }}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    {!collapsed && <span>Collapse</span>}
                </div>
            </div>
        </aside>
    );
}
