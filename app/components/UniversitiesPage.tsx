'use client';
import React, { useEffect, useState } from 'react';
import {
    Building2, Plus, Pencil, Trash2, X, Check,
    GraduationCap, RefreshCw, Globe, AlertCircle,
    Bell, Sparkles, ShieldCheck, BookOpen,
} from 'lucide-react';
import { API_BASE, getAccessToken } from '../lib/api';

interface University {
    _id: string;
    name: string;
    domain: string;
    isActive: boolean;
    resumeLimit: number;
    interviewLimit: number;
    allowedFeatures: string[];
    logoUrl?: string;
    adminEmail?: string;
    notes?: string;
    createdAt: string;
}

const empty = (): Omit<University, '_id' | 'createdAt'> => ({
    name: '',
    domain: '',
    isActive: true,
    resumeLimit: 5,
    interviewLimit: 10,
    allowedFeatures: [],
    logoUrl: '',
    adminEmail: '',
    notes: '',
});

const FEATURES = [
    { key: 'jobAlerts',   label: 'Job Alerts',    desc: 'Subscribe to job notifications', icon: Bell },
    { key: 'matchResume', label: 'Match Resume',   desc: 'AI-powered resume matching',     icon: Sparkles },
];

function UniAvatar({ name, domain, logoUrl }: { name: string; domain: string; logoUrl?: string }) {
    const [failed, setFailed] = useState(false);
    const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    if (logoUrl && !failed) {
        return <img src={logoUrl} alt={name} onError={() => setFailed(true)} className="w-9 h-9 rounded-xl object-contain bg-slate-800/80 border border-slate-700/50 p-0.5 shrink-0" />;
    }
    const src = `https://logo.clearbit.com/${domain}`;
    if (!failed) {
        return <img src={src} alt={name} onError={() => setFailed(true)} className="w-9 h-9 rounded-xl object-contain bg-slate-800/80 border border-slate-700/50 p-0.5 shrink-0" />;
    }
    return (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/90 to-violet-600/90 flex items-center justify-center text-white text-xs font-bold shrink-0 border border-white/5 shadow-sm">
            {initials}
        </div>
    );
}

export default function UniversitiesPage() {
    const [universities, setUniversities] = useState<University[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState(empty());
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const token = getAccessToken();
            const res = await fetch(`${API_BASE}/universities`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to load');
            setUniversities(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setForm(empty()); setEditId(null); setShowForm(true); };
    const openEdit = (u: University) => {
        setForm({ name: u.name, domain: u.domain, isActive: u.isActive, resumeLimit: u.resumeLimit, interviewLimit: u.interviewLimit, allowedFeatures: u.allowedFeatures ?? [], logoUrl: u.logoUrl ?? '', adminEmail: u.adminEmail ?? '', notes: u.notes ?? '' });
        setEditId(u._id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.domain.trim()) { setError('Name and domain are required'); return; }
        setSaving(true); setError('');
        try {
            const token = getAccessToken();
            const url = editId ? `${API_BASE}/universities/${editId}` : `${API_BASE}/universities`;
            const res = await fetch(url, {
                method: editId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            if (!res.ok) { const b = await res.json(); throw new Error(b.message || 'Save failed'); }
            setShowForm(false);
            await load();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const token = getAccessToken();
            await fetch(`${API_BASE}/universities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            setDeleteId(null);
            await load();
        } catch (e: any) {
            setError(e.message);
        }
    };

    const activeCount = universities.filter(u => u.isActive).length;

    return (
        <div className="px-5 py-6 md:px-8 md:py-8 animate-fadeIn">

            {/* ── Header ── */}
            <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-purple-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <GraduationCap size={22} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">Universities</h1>
                        <p className="text-sm text-slate-400">{universities.length} registered · {activeCount} active</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition" title="Refresh">
                        <RefreshCw size={15} />
                    </button>
                    <button
                        onClick={openCreate}
                        className="btn-primary"
                    >
                        <Plus size={16} />
                        Add University
                    </button>
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-3 gap-4" style={{ marginBottom: 28 }}>
                {[
                    { label: 'Total Universities', value: universities.length, color: 'purple', icon: Building2 },
                    { label: 'Active Domains', value: activeCount, color: 'green', icon: ShieldCheck },
                    { label: 'Features Enabled', value: universities.filter(u => (u.allowedFeatures ?? []).length > 0).length, color: 'amber', icon: Sparkles },
                ].map(s => (
                    <div key={s.label} className={`glass-card stat-card ${s.color} flex items-center justify-between`} style={{ padding: '22px 24px' }}>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">{s.label}</p>
                            <p className="text-3xl font-bold text-white leading-none">{s.value}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: s.color === 'purple' ? 'rgba(108, 99, 255, 0.1)' : s.color === 'green' ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 167, 38, 0.1)' }}>
                            <s.icon size={22} className={s.color === 'purple' ? 'text-purple-400' : s.color === 'green' ? 'text-[#00d4aa]' : 'text-amber-400'} />
                        </div>
                    </div>
                ))}
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 text-red-400 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={15} />
                    {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400"><X size={14} /></button>
                </div>
            )}

            {/* ── Table ── */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    Loading…
                </div>
            ) : universities.length === 0 ? (
                <div className="glass-card text-center py-20 text-slate-500" style={{ padding: 24 }}>
                    <Building2 size={44} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium text-slate-300">No universities yet</p>
                    <p className="text-sm mt-1">Click "Add University" to get started.</p>
                </div>
            ) : (
                <div className="glass-card animate-fadeIn overflow-hidden" style={{ padding: '24px' }}>
                    <div style={{ overflowX: 'auto', margin: '0 -8px' }}>
                        <table className="data-table w-full">
                            <thead>
                                <tr>
                                    <th className="custom-margin-left">University</th>
                                    <th>Domain</th>
                                    <th className="text-center">Resumes</th>
                                    <th className="text-center">Interviews</th>
                                    <th className="text-center">Status</th>
                                    <th>Features</th>
                                    <th className="text-right custom-margin-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {universities.map(u => (
                                    <tr key={u._id} className="group">
                                        <td className="custom-margin-left">
                                            <div className="flex items-center gap-3">
                                                <UniAvatar name={u.name} domain={u.domain} logoUrl={u.logoUrl} />
                                                <div>
                                                    <p className="font-semibold text-slate-200 leading-tight">{u.name}</p>
                                                    {u.adminEmail && <p className="text-xs text-slate-400 mt-0.5">{u.adminEmail}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center gap-1.5 text-purple-400 font-medium text-xs bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                                                <Globe size={11} />
                                                {u.domain}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className="inline-block min-w-[2rem] bg-slate-800 text-slate-200 text-xs font-bold px-2 py-1 rounded-md border border-slate-700">{u.resumeLimit}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className="inline-block min-w-[2rem] bg-indigo-950 text-indigo-300 text-xs font-bold px-2 py-1 rounded-md border border-indigo-900/40">{u.interviewLimit}</span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex justify-center">
                                                {u.isActive ? (
                                                    <span className="badge badge-active text-[11px]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-inactive text-[11px]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex flex-wrap gap-1.5">
                                                {(u.allowedFeatures ?? []).length === 0 ? (
                                                    <span className="text-slate-600">—</span>
                                                ) : (u.allowedFeatures ?? []).map(f => (
                                                    <span key={f} className="badge badge-purple text-[10px] font-semibold flex items-center gap-1 px-2 py-1">
                                                        {f === 'jobAlerts' ? <><Bell size={10} /> Job Alerts</> : f === 'matchResume' ? <><Sparkles size={10} /> Match Resume</> : f}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="custom-margin-right">
                                            <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(u._id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-950/30 text-slate-400 hover:text-red-400 transition"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Create / Edit Modal ── */}
            {showForm && (
                <div className="modal-overlay flex items-center justify-center p-4 fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
                    <div className="modal-content w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl m-auto shadow-2xl relative" style={{ padding: 32 }} onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                                    <GraduationCap size={16} className="text-white" />
                                </div>
                                <h2 className="font-bold text-white text-lg">{editId ? 'Edit University' : 'Add University'}</h2>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition">
                                <X size={17} />
                            </button>
                        </div>

                        <div className="py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">University Name *</label>
                                    <input placeholder="e.g. Thapar Institute of Engineering" className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Domain *</label>
                                    <input
                                        placeholder="e.g. thapar.edu"
                                        className="form-input"
                                        value={form.domain}
                                        onChange={e => setForm(f => ({ ...f, domain: e.target.value.toLowerCase() }))}
                                    />
                                    <p className="mt-1 text-xs text-slate-500">Students with @{form.domain || 'domain'} emails can log in</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Resume Limit</label>
                                    <input type="number" min={0} max={100} className="form-input" value={form.resumeLimit} onChange={e => setForm(f => ({ ...f, resumeLimit: Number(e.target.value) }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Interview Limit</label>
                                    <input type="number" min={0} max={200} className="form-input" value={form.interviewLimit} onChange={e => setForm(f => ({ ...f, interviewLimit: Number(e.target.value) }))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Logo URL (optional)</label>
                                    <input placeholder="https://…" className="form-input" value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Admin Email (optional)</label>
                                    <input type="email" placeholder="admin@university.edu" className="form-input" value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Notes (optional)</label>
                                    <textarea rows={2} className="form-input" placeholder="..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                                </div>

                                {/* Active toggle */}
                                <div className="col-span-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition ${form.isActive ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-400' : 'bg-slate-800/40 border-slate-800 text-slate-400'}`}
                                    >
                                        <div className={`w-9 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold leading-tight">{form.isActive ? 'Active' : 'Inactive'}</p>
                                            <p className="text-xs opacity-70">Students {form.isActive ? 'can' : 'cannot'} log in</p>
                                        </div>
                                    </button>
                                </div>

                                {/* Feature toggles */}
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Student Features</label>
                                    <p className="text-xs text-slate-500 mb-2">Enable premium features for students of this university.</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FEATURES.map(feat => {
                                            const enabled = form.allowedFeatures.includes(feat.key);
                                            return (
                                                <button
                                                    key={feat.key}
                                                    type="button"
                                                    onClick={() => setForm(f => ({
                                                        ...f,
                                                        allowedFeatures: enabled
                                                            ? f.allowedFeatures.filter(x => x !== feat.key)
                                                            : [...f.allowedFeatures, feat.key],
                                                    }))}
                                                    className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-left transition ${enabled ? 'bg-purple-950/30 border-purple-500/40 text-purple-300' : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'}`}
                                                >
                                                    <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center shrink-0 border transition ${enabled ? 'bg-purple-600 border-purple-600' : 'border-slate-600 bg-slate-800'}`}>
                                                        {enabled && <Check size={10} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold leading-tight">{feat.label}</p>
                                                        <p className="text-[10px] opacity-60 mt-0.5">{feat.desc}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg px-3 py-2 text-xs">
                                    <AlertCircle size={13} /> {error}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                            <button onClick={() => setShowForm(false)} className="btn-secondary py-2 px-4 text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add University'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirm ── */}
            {deleteId && (
                <div className="modal-overlay flex items-center justify-center p-4 fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
                    <div className="modal-content w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl m-auto text-center shadow-2xl relative" style={{ padding: 32 }}>
                        <div className="w-14 h-14 bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-900/50">
                            <Trash2 size={24} className="text-red-400" />
                        </div>
                        <h3 className="font-bold text-white text-lg mb-1">Delete University?</h3>
                        <p className="text-sm text-slate-400 mb-6">Students with this domain will no longer be able to log in. This action cannot be undone.</p>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => setDeleteId(null)} className="btn-secondary font-medium">Cancel</button>
                            <button onClick={() => handleDelete(deleteId)} className="btn-danger">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
