'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    GraduationCap, Users, FileText, BarChart2, Search,
    TrendingUp, ChevronUp, ChevronDown, RefreshCw, AlertCircle,
    Plus, Trash2, X, Eye, EyeOff, Building2, UserPlus, ArrowLeft,
} from 'lucide-react';
import { API_BASE, getAccessToken } from '../lib/api';

// ─────────────── Types ───────────────────────────────────────────────────────

interface University {
    _id: string;
    name: string;
    domain: string;
    logoUrl?: string;
    isActive: boolean;
    resumeLimit: number;
    interviewLimit: number;
    createdAt: string;
}

interface Teacher {
    _id: string;
    name: string;
    email: string;
    createdAt: string;
}

interface Student {
    _id: string;
    name: string;
    email: string;
    rollNumber?: string;
    resumeCount: number;
    interviewCount: number;
    createdAt: string;
    resumeUsage: { used: number; limit: number };
    interviewUsage: { used: number; limit: number };
}

interface UniversityStats {
    totalStudents: number;
    totalTeachers: number;
    totalInterviews: number;
    totalResumes: number;
    interviewLimit: number;
    resumeLimit: number;
}

type SortKey = 'name' | 'interviewCount' | 'resumeCount' | 'createdAt';
type SortDir = 'asc' | 'desc';
type View = 'list' | 'detail';

// ─────────────── Helpers ─────────────────────────────────────────────────────

function authHeaders() {
    const token = getAccessToken();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const color = pct >= 90 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-purple-500';
    return (
        <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-bold tabular-nums ${pct >= 90 ? 'text-rose-400' : 'text-slate-400'}`}>
                {used}/{limit}
            </span>
        </div>
    );
}

function Avatar({ name }: { name: string }) {
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const hue = name.charCodeAt(0) * 13 % 360;
    return (
        <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
            style={{ background: `hsl(${hue},55%,45%)` }}
        >
            {initials}
        </div>
    );
}

// ─────────────── University list view ────────────────────────────────────────

function UniversityList({
    universities,
    onSelect,
}: {
    universities: University[];
    onSelect: (u: University) => void;
}) {
    const [search, setSearch] = useState('');
    const filtered = universities.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.domain.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {/* search */}
            <div className="relative w-full md:max-w-sm" style={{ marginBottom: 24 }}>
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search universities…"
                    className="form-input w-full"
                    style={{ paddingLeft: 40 }}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="glass-card text-center py-16 text-slate-500">
                    <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-slate-400">No universities found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(u => (
                        <button
                            key={u._id}
                            onClick={() => onSelect(u)}
                            className="glass-card text-left hover:border-purple-500/40 hover:shadow-purple-500/5 transition-all group"
                            style={{ padding: '20px 22px' }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-violet-600/30 border border-purple-500/20 flex items-center justify-center">
                                    <GraduationCap size={18} className="text-purple-400" />
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${u.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                    {u.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="font-bold text-slate-100 leading-tight mb-1 group-hover:text-purple-300 transition-colors">{u.name}</p>
                            <p className="text-xs text-purple-400 font-mono mb-3">@{u.domain}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><FileText size={11} /> {u.resumeLimit} resumes</span>
                                <span className="flex items-center gap-1"><BarChart2 size={11} /> {u.interviewLimit} interviews</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────── University detail view ──────────────────────────────────────

function UniversityDetail({
    university,
    onBack,
}: {
    university: University;
    onBack: () => void;
}) {
    const [stats, setStats] = useState<UniversityStats | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('createdAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');

    // Teacher creation form
    const [showAddTeacher, setShowAddTeacher] = useState(false);
    const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '' });
    const [showPass, setShowPass] = useState(false);
    const [savingTeacher, setSavingTeacher] = useState(false);
    const [teacherError, setTeacherError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [analyticsRes, studentsRes, teachersRes] = await Promise.all([
                fetch(`${API_BASE}/universities/${university._id}/analytics`, { headers: authHeaders() }),
                fetch(`${API_BASE}/universities/${university._id}/students`, { headers: authHeaders() }),
                fetch(`${API_BASE}/universities/${university._id}/teachers`, { headers: authHeaders() }),
            ]);
            if (!analyticsRes.ok || !studentsRes.ok || !teachersRes.ok) {
                throw new Error('Failed to load university data');
            }
            const [analyticsData, studentsData, teachersData] = await Promise.all([
                analyticsRes.json(),
                studentsRes.json(),
                teachersRes.json(),
            ]);
            setStats(analyticsData.stats);
            setStudents(studentsData.students ?? []);
            setTeachers(teachersData);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [university._id]);

    useEffect(() => { load(); }, [load]);

    const handleAddTeacher = async () => {
        if (!teacherForm.name.trim() || !teacherForm.email.trim() || !teacherForm.password.trim()) {
            setTeacherError('All fields are required'); return;
        }
        setSavingTeacher(true); setTeacherError('');
        try {
            const res = await fetch(`${API_BASE}/universities/${university._id}/teachers`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify(teacherForm),
            });
            if (!res.ok) { const b = await res.json(); throw new Error(b.message || 'Failed to create teacher'); }
            setShowAddTeacher(false);
            setTeacherForm({ name: '', email: '', password: '' });
            await load();
        } catch (e: any) {
            setTeacherError(e.message);
        } finally {
            setSavingTeacher(false);
        }
    };

    const handleDeleteTeacher = async (teacherId: string) => {
        if (!confirm('Remove this teacher? They will no longer be able to access the portal.')) return;
        try {
            await fetch(`${API_BASE}/universities/${university._id}/teachers/${teacherId}`, {
                method: 'DELETE',
                headers: authHeaders(),
            });
            await load();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const SortIcon = ({ k }: { k: SortKey }) =>
        sortKey === k
            ? sortDir === 'asc'
                ? <ChevronUp size={11} className="inline ml-0.5 text-purple-400" />
                : <ChevronDown size={11} className="inline ml-0.5 text-purple-400" />
            : <ChevronDown size={11} className="inline ml-0.5 opacity-20" />;

    const filteredStudents = students
        .filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase()) ||
            (s.rollNumber ?? '').toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            let va: any = a[sortKey], vb: any = b[sortKey];
            if (sortKey === 'name') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
            if (sortKey === 'createdAt') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

    const statCards = stats ? [
        { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'purple' },
        { label: 'Total Interviews', value: stats.totalInterviews, icon: BarChart2, color: 'blue' },
        { label: 'Total Resumes', value: stats.totalResumes, icon: FileText, color: 'violet' },
        {
            label: 'Avg Interview Usage',
            value: stats.totalStudents > 0
                ? `${((stats.totalInterviews / (stats.totalStudents * stats.interviewLimit)) * 100).toFixed(0)}%`
                : '0%',
            icon: TrendingUp,
            color: 'green',
        },
    ] : [];

    const iconColorMap: Record<string, string> = {
        purple: 'text-purple-400', blue: 'text-blue-400',
        violet: 'text-violet-400', green: 'text-emerald-400',
    };

    return (
        <div>
            {/* back + header */}
            <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={15} /> All Universities
                </button>
                <div className="w-px h-4 bg-slate-700" />
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-violet-600/30 border border-purple-500/20 flex items-center justify-center">
                        <GraduationCap size={16} className="text-purple-400" />
                    </div>
                    <div>
                        <p className="font-bold text-white leading-tight">{university.name}</p>
                        <p className="text-xs text-purple-400 font-mono">@{university.domain}</p>
                    </div>
                </div>
                <button onClick={load} className="ml-auto p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition" title="Refresh">
                    <RefreshCw size={14} />
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 text-red-400 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={14} /> {error}
                    <button onClick={() => setError('')} className="ml-auto"><X size={13} /></button>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    {/* stat cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: 24 }}>
                        {statCards.map(card => (
                            <div key={card.label} className="glass-card" style={{ padding: '20px 22px' }}>
                                <card.icon size={18} className={`mb-3 ${iconColorMap[card.color]}`} />
                                <p className="text-2xl font-black text-white">{card.value}</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{card.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* tabs */}
                    <div className="flex items-center gap-2 bg-slate-800/60 rounded-2xl p-1.5 w-fit" style={{ marginBottom: 32 }}>
                        {(['students', 'teachers'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`rounded-xl text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {tab}
                                <span className={`text-[10px] font-black rounded-full ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`} style={{ padding: '4px 8px' }}>
                                    {tab === 'students' ? students.length : teachers.length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ── Students tab ── */}
                    {activeTab === 'students' && (
                        <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
                            <div className="px-6 py-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center gap-4">
                                <h3 className="font-bold text-white flex-1">Students</h3>
                                <div className="relative w-full md:w-60">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search…"
                                        className="form-input w-full md:w-60"
                                        style={{ paddingLeft: 36 }}
                                    />
                                </div>
                            </div>
                            {filteredStudents.length === 0 ? (
                                <div className="py-16 text-center text-slate-500">
                                    <Users size={36} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-semibold text-slate-400">{search ? 'No matches' : 'No students yet'}</p>
                                    <p className="text-xs mt-1">Students who sign in with @{university.domain} emails appear here.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ paddingLeft: 24 }} className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                                                    Student <SortIcon k="name" />
                                                </th>
                                                <th>Roll No.</th>
                                                <th className="cursor-pointer select-none" onClick={() => toggleSort('interviewCount')}>
                                                    Interviews <SortIcon k="interviewCount" />
                                                </th>
                                                <th className="cursor-pointer select-none" onClick={() => toggleSort('resumeCount')}>
                                                    Resumes <SortIcon k="resumeCount" />
                                                </th>
                                                <th className="cursor-pointer select-none" style={{ paddingRight: 24 }} onClick={() => toggleSort('createdAt')}>
                                                    Joined <SortIcon k="createdAt" />
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStudents.map(s => (
                                                <tr key={s._id}>
                                                    <td style={{ paddingLeft: 24 }}>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={s.name} />
                                                            <div>
                                                                <p className="font-semibold text-slate-200 leading-tight">{s.name}</p>
                                                                <p className="text-xs text-slate-500 mt-0.5">{s.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {s.rollNumber
                                                            ? <span className="text-xs font-mono font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-lg">{s.rollNumber}</span>
                                                            : <span className="text-slate-600">—</span>}
                                                    </td>
                                                    <td><UsageBar used={s.interviewUsage.used} limit={s.interviewUsage.limit} /></td>
                                                    <td><UsageBar used={s.resumeUsage.used} limit={s.resumeUsage.limit} /></td>
                                                    <td style={{ paddingRight: 24 }} className="text-xs text-slate-500">
                                                        {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Teachers tab ── */}
                    {activeTab === 'teachers' && (
                        <div className="glass-card overflow-hidden" style={{ padding: 0 }}>
                            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                                <h3 className="font-bold text-white flex-1">Teachers / Portal Accounts</h3>
                                <button
                                    onClick={() => { setShowAddTeacher(true); setTeacherError(''); setTeacherForm({ name: '', email: '', password: '' }); }}
                                    className="btn-primary text-sm"
                                >
                                    <UserPlus size={14} /> Add Teacher
                                </button>
                            </div>

                            {/* Add teacher inline form */}
                            {showAddTeacher && (
                                <div className="px-6 py-5 border-b border-slate-800 bg-slate-800/30 space-y-3">
                                    <p className="text-sm font-bold text-slate-300">New Teacher Account</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <input
                                            placeholder="Full name"
                                            className="form-input"
                                            value={teacherForm.name}
                                            onChange={e => setTeacherForm(f => ({ ...f, name: e.target.value }))}
                                        />
                                        <input
                                            placeholder="Email address"
                                            type="email"
                                            className="form-input"
                                            value={teacherForm.email}
                                            onChange={e => setTeacherForm(f => ({ ...f, email: e.target.value }))}
                                        />
                                        <div className="relative">
                                            <input
                                                placeholder="Password"
                                                type={showPass ? 'text' : 'password'}
                                                className="form-input pr-10 w-full"
                                                value={teacherForm.password}
                                                onChange={e => setTeacherForm(f => ({ ...f, password: e.target.value }))}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(p => !p)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                            >
                                                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    {teacherError && (
                                        <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{teacherError}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={handleAddTeacher} disabled={savingTeacher} className="btn-primary text-sm">
                                            {savingTeacher ? 'Creating…' : 'Create Account'}
                                        </button>
                                        <button onClick={() => setShowAddTeacher(false)} className="btn-secondary text-sm">Cancel</button>
                                    </div>
                                </div>
                            )}

                            {teachers.length === 0 ? (
                                <div className="py-16 text-center text-slate-500">
                                    <Users size={36} className="mx-auto mb-3 opacity-20" />
                                    <p className="font-semibold text-slate-400">No teachers yet</p>
                                    <p className="text-xs mt-1">Click "Add Teacher" to create a portal account for a teacher.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ paddingLeft: 24 }}>Teacher</th>
                                                <th>Email</th>
                                                <th>Created</th>
                                                <th style={{ paddingRight: 24 }} className="text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {teachers.map(t => (
                                                <tr key={t._id} className="group">
                                                    <td style={{ paddingLeft: 24 }}>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={t.name} />
                                                            <p className="font-semibold text-slate-200">{t.name}</p>
                                                        </div>
                                                    </td>
                                                    <td className="text-slate-400 text-sm">{t.email}</td>
                                                    <td className="text-xs text-slate-500">
                                                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td style={{ paddingRight: 24 }} className="text-right">
                                                        <button
                                                            onClick={() => handleDeleteTeacher(t._id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-950/30 text-slate-500 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                                                            title="Remove teacher"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─────────────── Main page ────────────────────────────────────────────────────

export default function UniversityPortalPage() {
    const [universities, setUniversities] = useState<University[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUniversity, setSelectedUniversity] = useState<University | null>(null);
    const [view, setView] = useState<View>('list');

    const loadUniversities = async () => {
        setLoading(true); setError('');
        try {
            const res = await fetch(`${API_BASE}/universities`, { headers: authHeaders() });
            if (!res.ok) throw new Error('Failed to load universities');
            setUniversities(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUniversities(); }, []);

    const handleSelect = (u: University) => {
        setSelectedUniversity(u);
        setView('detail');
    };

    const handleBack = () => {
        setSelectedUniversity(null);
        setView('list');
    };

    return (
        <div className="px-5 py-6 md:px-8 md:py-8 animate-fadeIn">
            {/* header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <GraduationCap size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">University Portal</h1>
                        <p className="text-sm text-slate-400">
                            {view === 'list'
                                ? `${universities.length} universities — click one to manage teachers & view student analytics`
                                : selectedUniversity?.name}
                        </p>
                    </div>
                </div>
                {view === 'list' && (
                    <button onClick={loadUniversities} className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition" title="Refresh">
                        <RefreshCw size={15} />
                    </button>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 text-red-400 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={14} /> {error}
                    <button onClick={() => setError('')} className="ml-auto"><X size={13} /></button>
                </div>
            )}

            {loading && view === 'list' ? (
                <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    Loading…
                </div>
            ) : view === 'list' ? (
                <UniversityList universities={universities} onSelect={handleSelect} />
            ) : selectedUniversity ? (
                <UniversityDetail university={selectedUniversity} onBack={handleBack} />
            ) : null}
        </div>
    );
}
