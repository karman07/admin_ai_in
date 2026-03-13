'use client';
import React, { useEffect, useState } from 'react';
import {
    Tag, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
    RefreshCw, X, BarChart2, Users, DollarSign, Copy, CheckCheck,
    Hash, AlertTriangle, Zap, TrendingUp, Gift,
    ShieldCheck, Clock, ChevronRight, Eye, Sparkles,
} from 'lucide-react';
import { discountsApi } from '../lib/api';

/* ── types ──────────────────────────────────────────────────────────── */
interface Coupon {
    _id: string; code: string; type: 'discount' | 'referral';
    discountType: 'percentage' | 'fixed'; discountValue: number;
    maxDiscountAmount?: number; minOrderAmount?: number; maxUses?: number;
    usedCount: number; isActive: boolean; expiresAt?: string;
    referrerId?: { _id: string; name: string; email: string };
    createdBy?: { name: string; email: string }; description?: string;
}
interface CouponStats {
    coupon: Coupon;
    stats: { totalUses: number; totalDiscountGranted: number; totalRevenue: number; averageDiscount: number };
    usages: { userId: { name: string; email: string }; discountAmount: number; finalAmount: number; subscriptionName: string; usedAt: string }[];
}
interface Analytics {
    totalCoupons: number; activeCoupons: number; totalUsages: number;
    totalDiscountGranted: number; totalRevenue: number;
    topCoupons: { _id: string; uses: number; totalDiscount: number; coupon: Coupon }[];
}
interface FormState {
    code: string; type: 'discount' | 'referral'; discountType: 'percentage' | 'fixed';
    discountValue: number; maxDiscountAmount: string; minOrderAmount: string;
    maxUses: string; isActive: boolean; expiresAt: string;
    referrerId: string; referrerRewardAmount: number; description: string;
}

/* ── helpers ─────────────────────────────────────────────────────────── */
const EMPTY: FormState = {
    code: '', type: 'discount', discountType: 'percentage', discountValue: 10,
    maxDiscountAmount: '', minOrderAmount: '', maxUses: '', isActive: true,
    expiresAt: '', referrerId: '', referrerRewardAmount: 0, description: '',
};
const fmt = (p: number) => `\u20b9${(p / 100).toLocaleString('en-IN')}`;
const isExpired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt) < new Date();

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
        {children}
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
export default function DiscountsPage() {
    const [coupons, setCoupons]           = useState<Coupon[]>([]);
    const [analytics, setAnalytics]       = useState<Analytics | null>(null);
    const [loading, setLoading]           = useState(true);
    const [showModal, setShowModal]       = useState(false);
    const [editId, setEditId]             = useState<string | null>(null);
    const [form, setForm]                 = useState<FormState>({ ...EMPTY });
    const [saving, setSaving]             = useState(false);
    const [statsModal, setStatsModal]     = useState<CouponStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [copied, setCopied]             = useState<string | null>(null);
    const [filter, setFilter]             = useState<'all' | 'discount' | 'referral'>('all');

    const load = async () => {
        setLoading(true);
        try {
            const [cd, ad] = await Promise.all([discountsApi.getAll(), discountsApi.getAnalytics()]);
            setCoupons(cd); setAnalytics(ad);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const openCreate = () => { setForm({ ...EMPTY }); setEditId(null); setShowModal(true); };
    const openEdit = (c: Coupon) => {
        setForm({
            code: c.code, type: c.type, discountType: c.discountType, discountValue: c.discountValue,
            maxDiscountAmount: c.maxDiscountAmount ? String(c.maxDiscountAmount / 100) : '',
            minOrderAmount:    c.minOrderAmount    ? String(c.minOrderAmount    / 100) : '',
            maxUses: c.maxUses != null ? String(c.maxUses) : '', isActive: c.isActive,
            expiresAt: c.expiresAt ? c.expiresAt.substring(0, 10) : '',
            referrerId: (c.referrerId as any)?._id || '', referrerRewardAmount: 0, description: c.description || '',
        });
        setEditId(c._id); setShowModal(true);
    };
    const openStats = async (id: string) => {
        setLoadingStats(true); setStatsModal(null);
        try { setStatsModal(await discountsApi.getStats(id)); } catch (e) { console.error(e); } finally { setLoadingStats(false); }
    };
    const save = async () => {
        setSaving(true);
        try {
            const p: any = { code: form.code.toUpperCase(), type: form.type, discountType: form.discountType, discountValue: Number(form.discountValue), isActive: form.isActive };
            if (form.description)       p.description       = form.description;
            if (form.maxDiscountAmount) p.maxDiscountAmount  = Math.round(Number(form.maxDiscountAmount) * 100);
            if (form.minOrderAmount)    p.minOrderAmount     = Math.round(Number(form.minOrderAmount)    * 100);
            if (form.maxUses)           p.maxUses            = Number(form.maxUses);
            if (form.expiresAt)         p.expiresAt          = form.expiresAt;
            if (form.referrerId)        p.referrerId         = form.referrerId;
            editId ? await discountsApi.update(editId, p) : await discountsApi.create(p);
            setShowModal(false); await load();
        } catch (e: any) { alert(e.message || 'Failed'); } finally { setSaving(false); }
    };
    const toggle = async (id: string) => { try { await discountsApi.toggle(id); await load(); } catch (e) { console.error(e); } };
    const del    = async (id: string) => {
        if (!confirm('Delete this coupon?')) return;
        try { await discountsApi.delete(id); await load(); } catch (e: any) { alert(e.message); }
    };
    const copy = (code: string) => { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 2000); };

    const list = coupons.filter(c => filter === 'all' || c.type === filter);

    /* ── colour tokens (all resolved via CSS vars — no Tailwind colour classes) */
    const PRIMARY  = 'var(--primary)';
    const ACCENT   = 'var(--accent)';
    const SUCCESS  = 'var(--success)';
    const WARNING  = 'var(--warning)';
    const DANGER   = 'var(--danger)';
    const FG       = 'var(--foreground)';
    const MFG      = 'var(--muted-foreground)';
    const BORDER   = 'var(--card-border)';

    /* ── stat config ── */
    const stats = analytics ? [
        { label: 'Total Coupons',  val: analytics.totalCoupons,              sub: `${analytics.activeCoupons} active`, color: 'purple', icon: <Tag size={18} /> },
        { label: 'Total Uses',     val: analytics.totalUsages,               sub: 'across all codes',                  color: 'blue',   icon: <Users size={18} /> },
        { label: 'Discount Given', val: fmt(analytics.totalDiscountGranted),  sub: 'total savings',                     color: 'rose',   icon: <DollarSign size={18} /> },
        { label: 'Revenue',        val: fmt(analytics.totalRevenue),          sub: 'paid with coupons',                 color: 'teal',   icon: <TrendingUp size={18} /> },
        { label: 'Active Codes',   val: analytics.activeCoupons,             sub: `of ${analytics.totalCoupons} total`, color: 'green',  icon: <Zap size={18} /> },
    ] : [];

    return (
        <div style={{ padding: '24px', minHeight: '100vh' }}>

            {/* ── PAGE HEADER ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg,#6c63ff,#8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(108,99,255,0.3)', flexShrink: 0,
                    }}>
                        <Tag size={20} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, color: FG, margin: 0, letterSpacing: '-0.3px' }}>
                            Discounts &amp; Referrals
                        </h1>
                        <p style={{ fontSize: 13, color: MFG, marginTop: 2 }}>
                            Manage promo codes, referral links &amp; usage analytics
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={load}>
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button className="btn-primary" onClick={openCreate}>
                        <Plus size={15} /> New Coupon
                    </button>
                </div>
            </div>

            {/* ── STAT CARDS ──────────────────────────────────────────── */}
            {analytics && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
                    {stats.map(s => (
                        <div key={s.label} className={`glass-card stat-card ${s.color}`} style={{ padding: '16px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: MFG }}>{s.label}</span>
                                <span style={{ color: MFG, opacity: 0.6, display: 'flex' }}>{s.icon}</span>
                            </div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: FG }}>{s.val}</div>
                            <div style={{ fontSize: 11, color: MFG, marginTop: 3 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── FILTER TABS ─────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    {(['all', 'discount', 'referral'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            style={{
                                padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700,
                                background: filter === t ? PRIMARY : 'transparent',
                                color: filter === t ? 'white' : MFG,
                                transition: 'all 0.15s',
                            }}
                        >
                            {t === 'all' ? 'All Codes' : t === 'discount' ? 'Promo Codes' : 'Referrals'}
                        </button>
                    ))}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: MFG, background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    {list.length} {list.length === 1 ? 'coupon' : 'coupons'}
                </span>
            </div>

            {/* ── COUPON CARDS ─────────────────────────────────────────── */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />
                    ))}
                </div>
            ) : list.length === 0 ? (
                <div className="glass-card" style={{ padding: '64px 32px', textAlign: 'center' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: `1px solid rgba(108,99,255,0.2)` }}>
                        <Tag size={26} style={{ color: PRIMARY }} />
                    </div>
                    <p style={{ fontSize: 17, fontWeight: 800, color: FG, marginBottom: 6 }}>No coupons yet</p>
                    <p style={{ fontSize: 13, color: MFG, marginBottom: 20 }}>Create your first discount or referral code</p>
                    <button className="btn-primary" onClick={openCreate}><Plus size={14} /> Create Coupon</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
                    {list.map(c => {
                        const exp    = isExpired(c);
                        const isRef  = c.type === 'referral';
                        const mainC  = isRef ? ACCENT : PRIMARY;
                        const mainBg = isRef ? 'rgba(0,212,170,0.08)' : 'rgba(108,99,255,0.08)';
                        const pct    = c.maxUses ? Math.min(100, Math.round((c.usedCount / c.maxUses) * 100)) : 0;
                        const barC   = pct > 80 ? DANGER : pct > 50 ? WARNING : SUCCESS;
                        const dim    = !c.isActive || exp;

                        return (
                            <div
                                key={c._id}
                                className="glass-card"
                                style={{ overflow: 'hidden', opacity: dim ? 0.55 : 1, transition: 'opacity 0.2s' }}
                            >
                                {/* colour strip */}
                                <div style={{ height: 3, background: mainC }} />

                                <div style={{ padding: '16px 18px' }}>
                                    {/* ── code row ── */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <span style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 17, fontWeight: 900, letterSpacing: '0.1em', color: mainC, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                                                    {c.code}
                                                </span>
                                                <button
                                                    onClick={() => copy(c.code)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: MFG, padding: '2px 4px', lineHeight: 0, flexShrink: 0 }}
                                                >
                                                    {copied === c.code
                                                        ? <CheckCheck size={12} style={{ color: SUCCESS }} />
                                                        : <Copy size={12} />}
                                                </button>
                                            </div>
                                            {/* badges */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                <span className="badge" style={{ background: mainBg, color: mainC, fontSize: 10 }}>
                                                    {isRef ? <Gift size={9} /> : <Sparkles size={9} />} {c.type}
                                                </span>
                                                {!c.isActive && <span className="badge badge-inactive" style={{ fontSize: 10 }}>Paused</span>}
                                                {exp && (
                                                    <span className="badge badge-inactive" style={{ fontSize: 10 }}>
                                                        <AlertTriangle size={9} /> Expired
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* discount value chip */}
                                        <div style={{ textAlign: 'center', padding: '8px 12px', background: mainBg, borderRadius: 10, flexShrink: 0, marginLeft: 8 }}>
                                            <div style={{ fontSize: 20, fontWeight: 900, color: mainC, lineHeight: 1 }}>
                                                {c.discountType === 'percentage' ? `${c.discountValue}%` : fmt(c.discountValue)}
                                            </div>
                                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: MFG, marginTop: 2 }}>
                                                {c.discountType === 'percentage' ? 'off' : 'flat'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* description */}
                                    {c.description && (
                                        <p style={{ fontSize: 12, color: MFG, marginBottom: 10, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                            {c.description}
                                        </p>
                                    )}

                                    {/* referrer */}
                                    {c.referrerId && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: MFG, marginBottom: 10 }}>
                                            <Users size={11} /> By <strong style={{ color: FG }}>{c.referrerId.name}</strong>
                                        </div>
                                    )}

                                    {/* usage bar */}
                                    {c.maxUses ? (
                                        <div style={{ marginBottom: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: MFG, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                <span>Usage</span><span>{c.usedCount} / {c.maxUses}</span>
                                            </div>
                                            <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: barC, borderRadius: 99, transition: 'width 0.5s ease' }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: MFG, marginBottom: 10 }}>
                                            <Hash size={10} /> {c.usedCount} uses &middot; unlimited
                                        </div>
                                    )}

                                    {/* metadata chips */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                        {c.minOrderAmount && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: MFG }}>
                                                <ShieldCheck size={10} style={{ color: PRIMARY }} /> Min {fmt(c.minOrderAmount)}
                                            </span>
                                        )}
                                        {c.maxDiscountAmount && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: MFG }}>
                                                <Tag size={10} style={{ color: PRIMARY }} /> Cap {fmt(c.maxDiscountAmount)}
                                            </span>
                                        )}
                                        {c.expiresAt && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: exp ? DANGER : MFG }}>
                                                <Clock size={10} /> {new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                                            </span>
                                        )}
                                    </div>

                                    {/* actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                                        <button
                                            className={c.isActive ? 'btn-success' : 'btn-secondary'}
                                            style={{ padding: '5px 12px', fontSize: 12, gap: 5 }}
                                            onClick={() => toggle(c._id)}
                                        >
                                            {c.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                                            {c.isActive ? 'Live' : 'Paused'}
                                        </button>
                                        <div style={{ display: 'flex', gap: 5 }}>
                                            <button className="btn-secondary" style={{ padding: '5px 9px', lineHeight: 0 }} onClick={() => openStats(c._id)}>
                                                <BarChart2 size={13} />
                                            </button>
                                            <button className="btn-secondary" style={{ padding: '5px 9px', lineHeight: 0 }} onClick={() => openEdit(c)}>
                                                <Edit3 size={13} />
                                            </button>
                                            <button className="btn-danger" style={{ padding: '5px 9px', lineHeight: 0 }} onClick={() => del(c._id)}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══ CREATE / EDIT MODAL ══════════════════════════════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal-content" style={{ maxWidth: 560 }}>
                        {/* header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6c63ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Tag size={17} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 16, fontWeight: 800, color: FG, margin: 0 }}>{editId ? 'Edit Coupon' : 'New Coupon'}</h2>
                                    <p style={{ fontSize: 12, color: MFG, marginTop: 2 }}>{editId ? 'Update parameters' : 'Set up a new promo or referral code'}</p>
                                </div>
                            </div>
                            <button className="btn-secondary" style={{ padding: '6px 8px', lineHeight: 0 }} onClick={() => setShowModal(false)}>
                                <X size={15} />
                            </button>
                        </div>

                        {/* form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <Row label="Coupon Code *">
                                    <input
                                        className="form-input"
                                        style={{ fontFamily: 'var(--font-mono,monospace)', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}
                                        value={form.code}
                                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                        placeholder="SAVE20"
                                        disabled={!!editId}
                                    />
                                </Row>
                                <Row label="Type">
                                    <select className="form-input form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                                        <option value="discount">Promo Discount</option>
                                        <option value="referral">Referral Code</option>
                                    </select>
                                </Row>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <Row label="Discount Type">
                                    <select className="form-input form-select" value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}>
                                        <option value="percentage">% Percentage</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </Row>
                                <Row label={form.discountType === 'percentage' ? 'Value (%)' : 'Value (\u20b9)'}>
                                    <input type="number" className="form-input" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: Number(e.target.value) }))} min={1} />
                                </Row>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <Row label="Max Discount Cap (\u20b9)">
                                    <input type="number" className="form-input" value={form.maxDiscountAmount} onChange={e => setForm(f => ({ ...f, maxDiscountAmount: e.target.value }))} placeholder="Optional" />
                                </Row>
                                <Row label="Minimum Order (\u20b9)">
                                    <input type="number" className="form-input" value={form.minOrderAmount} onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))} placeholder="Optional" />
                                </Row>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <Row label="Max Uses">
                                    <input type="number" className="form-input" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="Unlimited" />
                                </Row>
                                <Row label="Expires At">
                                    <input type="date" className="form-input" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
                                </Row>
                            </div>

                            {form.type === 'referral' && (
                                <Row label="Referrer User ID">
                                    <input className="form-input" style={{ fontFamily: 'var(--font-mono,monospace)' }} value={form.referrerId} onChange={e => setForm(f => ({ ...f, referrerId: e.target.value }))} placeholder="MongoDB ObjectId" />
                                </Row>
                            )}

                            <Row label="Description (internal note)">
                                <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional note..." />
                            </Row>

                            {/* active toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: FG, margin: 0 }}>Active Status</p>
                                    <p style={{ fontSize: 12, color: MFG, marginTop: 2 }}>Coupon usable by customers immediately</p>
                                </div>
                                <button
                                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                    style={{ width: 46, height: 24, borderRadius: 99, background: form.isActive ? SUCCESS : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                                >
                                    <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'left 0.2s', left: form.isActive ? 24 : 2 }} />
                                </button>
                            </div>
                        </div>

                        {/* footer */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                            <button
                                className="btn-primary"
                                style={{ flex: 2 }}
                                onClick={save}
                                disabled={saving || !form.code || !form.discountValue}
                            >
                                {saving
                                    ? <><RefreshCw size={13} className="animate-spin" /> Saving…</>
                                    : <>{editId ? 'Update Coupon' : 'Create Coupon'} <ChevronRight size={13} /></>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ STATS MODAL ══════════════════════════════════════════ */}
            {(loadingStats || statsModal) && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setStatsModal(null); }}>
                    <div className="modal-content" style={{ maxWidth: 640 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <BarChart2 size={17} color="white" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 16, fontWeight: 800, color: FG, margin: 0 }}>Coupon Analytics</h2>
                                    <p style={{ fontSize: 12, color: MFG, marginTop: 2 }}>Usage breakdown</p>
                                </div>
                            </div>
                            <button className="btn-secondary" style={{ padding: '6px 8px', lineHeight: 0 }} onClick={() => setStatsModal(null)}>
                                <X size={15} />
                            </button>
                        </div>

                        {loadingStats && !statsModal ? (
                            <div style={{ textAlign: 'center', padding: '48px 0' }}>
                                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px', color: PRIMARY }} />
                                <p style={{ fontSize: 13, color: MFG }}>Loading stats…</p>
                            </div>
                        ) : statsModal ? (
                            <>
                                {/* identity card */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 12, marginBottom: 18 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Tag size={20} color="white" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontFamily: 'var(--font-mono,monospace)', fontSize: 20, fontWeight: 900, letterSpacing: '0.1em', color: PRIMARY, margin: 0 }}>{statsModal.coupon.code}</p>
                                        <p style={{ fontSize: 12, color: MFG, marginTop: 2 }}>{statsModal.coupon.description || 'No description'}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: 22, fontWeight: 900, color: PRIMARY, lineHeight: 1, margin: 0 }}>
                                            {statsModal.coupon.discountType === 'percentage' ? `${statsModal.coupon.discountValue}%` : fmt(statsModal.coupon.discountValue)}
                                        </p>
                                        <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: MFG, marginTop: 2 }}>{statsModal.coupon.discountType}</p>
                                    </div>
                                </div>

                                {/* 4 stats */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                                    {[
                                        { label: 'Total Uses',     val: statsModal.stats.totalUses,                     c: PRIMARY },
                                        { label: 'Discount Given', val: fmt(statsModal.stats.totalDiscountGranted),      c: DANGER },
                                        { label: 'Revenue',        val: fmt(statsModal.stats.totalRevenue),              c: SUCCESS },
                                        { label: 'Avg Discount',   val: fmt(statsModal.stats.averageDiscount),           c: ACCENT },
                                    ].map(s => (
                                        <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                                            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: MFG, marginBottom: 6 }}>{s.label}</p>
                                            <p style={{ fontSize: 18, fontWeight: 900, color: s.c, margin: 0 }}>{s.val}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* usage list */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: MFG, margin: 0 }}>Who Redeemed</p>
                                        <span className="badge badge-purple" style={{ fontSize: 10 }}>{statsModal.usages.length} users</span>
                                    </div>

                                    {statsModal.usages.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '32px 0', color: MFG }}>
                                            <Eye size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                                            <p style={{ fontSize: 13 }}>No redemptions yet</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                                            {statsModal.usages.map((u, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 8 }}>
                                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                                                        {(u.userId?.name || '?')[0].toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ fontSize: 13, fontWeight: 600, color: FG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{u.userId?.name || 'Unknown'}</p>
                                                        <p style={{ fontSize: 11, color: MFG, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{u.userId?.email}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <p style={{ fontSize: 12, fontWeight: 800, color: DANGER, margin: 0 }}>-{fmt(u.discountAmount)}</p>
                                                        <p style={{ fontSize: 10, color: MFG }}>{fmt(u.finalAmount)} paid</p>
                                                    </div>
                                                    <p style={{ fontSize: 10, color: MFG, flexShrink: 0 }}>
                                                        {new Date(u.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
