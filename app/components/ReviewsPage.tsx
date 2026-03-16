'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Star, MessageSquare, TrendingUp, Flag, Trash2,
    Pin, RefreshCw, Search, ChevronLeft, ChevronRight,
    EyeOff, CheckCircle2, X, BarChart3, Award, Sparkles,
} from 'lucide-react';
import { reviewsApi } from '../lib/api';

/* ── types ──────────────────────────────────────────────────────────── */
interface ReviewUser { _id: string; name: string; email: string; profilePhoto?: string }
interface Review {
    _id: string;
    userId: ReviewUser | null;
    sessionId?: string;
    interviewType?: string;
    rating: number;
    comment: string;
    flag: 'clean' | 'flagged' | 'hidden';
    isPinned: boolean;
    createdAt: string;
}
interface Stats {
    total: number;
    avgRating: number;
    fiveStarCount: number;
    fiveStarPct: number;
    flaggedCount: number;
    ratingDistribution: Record<number, number>;
    recentReviews: Review[];
}
interface ListResult { reviews: Review[]; total: number; page: number; limit: number; pages: number; }

/* ── helpers ─────────────────────────────────────────────────────────── */
function fmtDate(s: string) {
    return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtTimeAgo(s: string) {
    const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (sec < 60)    return `${sec}s ago`;
    if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
}

function Stars({ n, size = 14 }: { n: number; size?: number }) {
    return (
        <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={size} style={{
                    fill: i <= n ? '#f59e0b' : 'none',
                    color: i <= n ? '#f59e0b' : 'rgba(148,163,184,0.3)',
                    strokeWidth: 1.5, flexShrink: 0,
                }} />
            ))}
        </div>
    );
}

function Avatar({ user, size = 38 }: { user: ReviewUser | null; size?: number }) {
    const name = user?.name || '?';
    const initials = name.split(' ').map(w => w[0]?.toUpperCase()).slice(0, 2).join('');
    const hue = ((name.charCodeAt(0) || 0) * 37) % 360;
    if (user?.profilePhoto) {
        return <img src={user.profilePhoto} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
    }
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, hsl(${hue},60%,50%), hsl(${(hue + 40) % 360},70%,40%))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.36, fontWeight: 800, color: 'white', letterSpacing: '-0.5px',
            boxShadow: `0 2px 8px hsl(${hue},50%,40%,0.4)`,
        }}>{initials}</div>
    );
}

const FLAG_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
    clean:   { label: 'Clean',   icon: <CheckCircle2 size={11} />, color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
    flagged: { label: 'Flagged', icon: <Flag size={11} />,         color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
    hidden:  { label: 'Hidden',  icon: <EyeOff size={11} />,       color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

const TYPE_META: Record<string, { label: string; color: string }> = {
    behavioral:    { label: 'Behavioral',   color: '#8b5cf6' },
    technical:     { label: 'Technical',    color: '#06b6d4' },
    dsa:           { label: 'DSA',          color: '#f59e0b' },
    system_design: { label: 'System Design',color: '#3b82f6' },
};

const RATING_COLOR = (n: number) => n >= 4 ? '#22c55e' : n === 3 ? '#f59e0b' : '#ef4444';

/* ════════════════════════════════════════════════════════════════════ */
export default function ReviewsPage() {
    const [stats,    setStats]    = useState<Stats | null>(null);
    const [list,     setList]     = useState<ListResult | null>(null);
    const [loading,  setLoading]  = useState(true);
    const [loadList, setLoadList] = useState(false);

    const [ratingFilter, setRatingFilter] = useState<number | ''>('');
    const [flagFilter,   setFlagFilter]   = useState<string>('');
    const [searchQ,      setSearchQ]      = useState('');
    const [debouncedQ,   setDebouncedQ]   = useState('');
    const [page,         setPage]         = useState(1);

    const [flagModal,   setFlagModal]  = useState<Review | null>(null);
    const [pendingFlag, setPending]    = useState<string>('');

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedQ(searchQ); setPage(1); }, 420);
        return () => clearTimeout(t);
    }, [searchQ]);

    useEffect(() => {
        reviewsApi.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
    }, []);

    const fetchList = useCallback(() => {
        setLoadList(true);
        reviewsApi.getAll({
            page, limit: 10,
            rating: ratingFilter !== '' ? Number(ratingFilter) : undefined,
            flag:   flagFilter || undefined,
            search: debouncedQ || undefined,
        }).then(setList).catch(console.error).finally(() => setLoadList(false));
    }, [page, ratingFilter, flagFilter, debouncedQ]);

    useEffect(() => { fetchList(); }, [fetchList]);

    const refresh = () => {
        reviewsApi.getStats().then(setStats).catch(console.error);
        fetchList();
    };

    const handleFlag = async () => {
        if (!flagModal || !pendingFlag) return;
        await reviewsApi.flag(flagModal._id, pendingFlag).catch(console.error);
        setFlagModal(null); refresh();
    };
    const handlePin = async (r: Review) => {
        await reviewsApi.pin(r._id, !r.isPinned).catch(console.error); refresh();
    };
    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this review?')) return;
        await reviewsApi.delete(id).catch(console.error); refresh();
    };

    const hasFilters = ratingFilter !== '' || flagFilter || debouncedQ;

    /* ── RENDER ─────────────────────────────────────────────────── */
    return (
        <div style={{ padding: '28px 32px', minHeight: '100vh', maxWidth: 1200 }}>

            {/* ── HEADER ─────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                        background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(245,158,11,0.35)',
                    }}>
                        <Star size={22} color="white" fill="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--foreground)', margin: 0, letterSpacing: '-0.5px' }}>
                            Interview Reviews
                        </h1>
                        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginTop: 3 }}>
                            User feedback &amp; ratings after interview sessions
                        </p>
                    </div>
                </div>
                <button
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', fontSize: 13, fontWeight: 600 }}
                    onClick={refresh}
                >
                    <RefreshCw size={14} className={loading || loadList ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* ── STAT CARDS ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
                {[
                    {
                        label: 'Total Reviews', val: stats?.total ?? '—', sub: 'all time',
                        gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', shadow: 'rgba(99,102,241,0.35)',
                        icon: <MessageSquare size={20} color="white" />,
                    },
                    {
                        label: 'Avg Rating', val: stats?.avgRating ? `${stats.avgRating} / 5` : '—', sub: 'overall score',
                        gradient: 'linear-gradient(135deg,#f59e0b,#f97316)', shadow: 'rgba(245,158,11,0.35)',
                        icon: <Star size={20} color="white" fill="white" />,
                    },
                    {
                        label: '5-Star Rate', val: stats ? `${stats.fiveStarPct}%` : '—', sub: `${stats?.fiveStarCount ?? 0} reviews`,
                        gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', shadow: 'rgba(34,197,94,0.35)',
                        icon: <Award size={20} color="white" />,
                    },
                    {
                        label: 'Flagged', val: stats?.flaggedCount ?? '—', sub: 'need attention',
                        gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', shadow: 'rgba(239,68,68,0.35)',
                        icon: <Flag size={20} color="white" />,
                    },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px',
                            background: s.gradient, opacity: 0.12,
                        }} />
                        <div style={{
                            width: 40, height: 40, borderRadius: 11, marginBottom: 14,
                            background: s.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: `0 6px 18px ${s.shadow}`,
                        }}>{s.icon}</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--foreground)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                            {s.val}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>{s.sub}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginTop: 8, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>
                            {s.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── ANALYTICS ROW ──────────────────────────── */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>

                    {/* Rating distribution */}
                    <div className="glass-card" style={{ padding: '22px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <BarChart3 size={16} style={{ color: '#f59e0b' }} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>Rating Breakdown</span>
                        </div>

                        {/* Big avg number */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'rgba(245,158,11,0.07)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.18)', marginBottom: 18 }}>
                            <span style={{ fontSize: 44, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{stats.avgRating}</span>
                            <div>
                                <Stars n={Math.round(stats.avgRating)} size={18} />
                                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 5 }}>Based on {stats.total} reviews</p>
                            </div>
                        </div>

                        {/* Bars */}
                        {[5, 4, 3, 2, 1].map(r => {
                            const count = stats.ratingDistribution[r] ?? 0;
                            const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                            return (
                                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 44, flexShrink: 0 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>{r}</span>
                                        <Star size={11} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
                                    </div>
                                    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', width: `${pct}%`,
                                            background: RATING_COLOR(r),
                                            borderRadius: 99, transition: 'width 0.7s cubic-bezier(0.34,1.56,0.64,1)',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', width: 28, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Recent top reviews */}
                    <div className="glass-card" style={{ padding: '22px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={16} style={{ color: '#8b5cf6' }} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>Recent Feedback</span>
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: '#8b5cf6' }}>
                                Latest
                            </span>
                        </div>

                        {stats.recentReviews.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-foreground)', fontSize: 13 }}>
                                No reviews yet
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {stats.recentReviews.slice(0, 5).map(r => (
                                    <div key={r._id} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 14px', borderRadius: 12,
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        transition: 'background 0.15s',
                                    }}>
                                        <Avatar user={r.userId} size={34} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                                                    {r.userId?.name ?? 'Unknown'}
                                                </span>
                                                <Stars n={r.rating} size={10} />
                                            </div>
                                            {r.comment && (
                                                <p style={{ fontSize: 11, color: 'var(--muted-foreground)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                    {r.comment}
                                                </p>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 10, color: 'var(--muted-foreground)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                            {fmtTimeAgo(r.createdAt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── FILTERS ─────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                padding: '14px 18px', borderRadius: 14,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                flexWrap: 'wrap',
            }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
                    <input
                        className="form-input"
                        placeholder="Search by name, comment, type…"
                        value={searchQ}
                        onChange={e => { setSearchQ(e.target.value); setPage(1); }}
                        style={{ paddingLeft: 36, fontSize: 13, borderRadius: 10 }}
                    />
                </div>

                <select className="form-input form-select" value={ratingFilter}
                    onChange={e => { setRatingFilter(e.target.value === '' ? '' : Number(e.target.value) as any); setPage(1); }}
                    style={{ width: 140, fontSize: 13, borderRadius: 10 }}>
                    <option value="">All Ratings</option>
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                </select>

                <select className="form-input form-select" value={flagFilter}
                    onChange={e => { setFlagFilter(e.target.value); setPage(1); }}
                    style={{ width: 140, fontSize: 13, borderRadius: 10 }}>
                    <option value="">All Status</option>
                    <option value="clean">✅ Clean</option>
                    <option value="flagged">⚠️ Flagged</option>
                    <option value="hidden">🚫 Hidden</option>
                </select>

                {hasFilters && (
                    <button className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, borderRadius: 10 }}
                        onClick={() => { setRatingFilter(''); setFlagFilter(''); setSearchQ(''); setPage(1); }}>
                        <X size={12} /> Clear filters
                    </button>
                )}

                {list && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {loadList && <RefreshCw size={12} style={{ color: 'var(--muted-foreground)' }} className="animate-spin" />}
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                            {list.total} {list.total === 1 ? 'review' : 'reviews'}
                        </span>
                    </div>
                )}
            </div>

            {/* ── REVIEW CARDS ────────────────────────────── */}
            {loadList && !list ? (
                <div style={{ display: 'grid', gap: 12 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />)}
                </div>
            ) : list?.reviews.length === 0 ? (
                <div className="glass-card" style={{ padding: '64px 32px', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(245,158,11,0.2)' }}>
                        <Star size={24} style={{ color: '#f59e0b' }} />
                    </div>
                    <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--foreground)', marginBottom: 8 }}>No reviews found</p>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{hasFilters ? 'Try adjusting your filters' : 'Reviews will appear here after users complete sessions'}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(list?.reviews ?? []).map(r => {
                        const flagM = FLAG_META[r.flag] ?? FLAG_META.clean;
                        const typeM = r.interviewType ? (TYPE_META[r.interviewType] ?? { label: r.interviewType, color: '#6366f1' }) : null;
                        const rColor = RATING_COLOR(r.rating);

                        return (
                            <div
                                key={r._id}
                                className="glass-card"
                                style={{
                                    overflow: 'hidden',
                                    opacity: r.flag === 'hidden' ? 0.55 : 1,
                                    transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.15s',
                                    borderLeft: `3px solid ${rColor}`,
                                }}
                            >
                                <div style={{ padding: '18px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                                        {/* Avatar */}
                                        <Avatar user={r.userId} size={42} />

                                        {/* Body */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* Top row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>
                                                    {r.userId?.name ?? 'Deleted User'}
                                                </span>
                                                {r.userId?.email && (
                                                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{r.userId.email}</span>
                                                )}

                                                {/* Tags */}
                                                {typeM && (
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${typeM.color}18`, color: typeM.color, border: `1px solid ${typeM.color}30` }}>
                                                        {typeM.label}
                                                    </span>
                                                )}
                                                {r.isPinned && (
                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: 3, border: '1px solid rgba(245,158,11,0.25)' }}>
                                                        <Pin size={9} /> Pinned
                                                    </span>
                                                )}
                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: flagM.bg, color: flagM.color, display: 'inline-flex', alignItems: 'center', gap: 3, border: `1px solid ${flagM.border}` }}>
                                                    {flagM.icon} {flagM.label}
                                                </span>
                                                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-foreground)', flexShrink: 0 }}>
                                                    {fmtDate(r.createdAt)}
                                                </span>
                                            </div>

                                            {/* Stars + rating */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: r.comment ? 10 : 0 }}>
                                                <Stars n={r.rating} size={15} />
                                                <span style={{ fontSize: 12, fontWeight: 700, color: rColor }}>
                                                    {r.rating}.0
                                                </span>
                                                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>/ 5</span>
                                            </div>

                                            {/* Comment */}
                                            {r.comment && (
                                                <div style={{
                                                    marginTop: 6, padding: '10px 14px',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    borderRadius: 10,
                                                    borderLeft: `2px solid ${rColor}50`,
                                                    position: 'relative',
                                                }}>
                                                    <span style={{ position: 'absolute', top: 6, left: 10, fontSize: 22, color: rColor, opacity: 0.25, lineHeight: 1, fontFamily: 'Georgia, serif', fontWeight: 900 }}>"</span>
                                                    <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.65, paddingLeft: 16, margin: 0, opacity: 0.85 }}>
                                                        {r.comment}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                            <button
                                                className="btn-secondary"
                                                title={r.isPinned ? 'Unpin' : 'Pin to top'}
                                                style={{ padding: '6px 8px', lineHeight: 0 }}
                                                onClick={() => handlePin(r)}
                                            >
                                                <Pin size={13} style={{ color: r.isPinned ? '#f59e0b' : undefined, fill: r.isPinned ? '#f59e0b' : 'none' }} />
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                title="Moderate"
                                                style={{ padding: '6px 8px', lineHeight: 0 }}
                                                onClick={() => { setFlagModal(r); setPending(r.flag); }}
                                            >
                                                <Flag size={13} />
                                            </button>
                                            <button
                                                className="btn-danger"
                                                title="Delete"
                                                style={{ padding: '6px 8px', lineHeight: 0 }}
                                                onClick={() => handleDelete(r._id)}
                                            >
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

            {/* ── PAGINATION ──────────────────────────────── */}
            {list && list.pages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                        Page {list.page} of {list.pages} · {list.total} total reviews
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-secondary" disabled={list.page <= 1}
                            style={{ padding: '7px 11px', lineHeight: 0, opacity: list.page <= 1 ? 0.3 : 1, borderRadius: 10 }}
                            onClick={() => setPage(p => Math.max(1, p - 1))}>
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(7, list.pages) }, (_, i) => {
                            const pg = list.pages <= 7 ? i + 1 : (
                                list.page <= 4 ? i + 1 :
                                list.page >= list.pages - 3 ? list.pages - 6 + i :
                                list.page - 3 + i
                            );
                            return (
                                <button key={pg}
                                    className={pg === list.page ? 'btn-primary' : 'btn-secondary'}
                                    style={{ padding: '7px 13px', fontSize: 12, fontWeight: 700, borderRadius: 10, minWidth: 36 }}
                                    onClick={() => setPage(pg)}>
                                    {pg}
                                </button>
                            );
                        })}
                        <button className="btn-secondary" disabled={list.page >= list.pages}
                            style={{ padding: '7px 11px', lineHeight: 0, opacity: list.page >= list.pages ? 0.3 : 1, borderRadius: 10 }}
                            onClick={() => setPage(p => Math.min(list.pages, p + 1))}>
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ══ FLAG MODAL ══════════════════════════════ */}
            {flagModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setFlagModal(null); }}>
                    <div className="modal-content" style={{ maxWidth: 460 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    <Flag size={17} style={{ color: '#f59e0b' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--foreground)', margin: 0 }}>Moderate Review</h3>
                                    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>Change visibility status</p>
                                </div>
                            </div>
                            <button className="btn-secondary" style={{ padding: '6px 8px', lineHeight: 0 }} onClick={() => setFlagModal(null)}>
                                <X size={14} />
                            </button>
                        </div>

                        {/* Preview */}
                        <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <Avatar user={flagModal.userId} size={30} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{flagModal.userId?.name ?? 'Unknown'}</span>
                                <Stars n={flagModal.rating} size={12} />
                                <span style={{ fontSize: 10, color: 'var(--muted-foreground)', marginLeft: 'auto' }}>{fmtDate(flagModal.createdAt)}</span>
                            </div>
                            {flagModal.comment && (
                                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6, margin: 0 }}>"{flagModal.comment}"</p>
                            )}
                        </div>

                        {/* Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                            {Object.entries(FLAG_META).map(([val, m]) => (
                                <button key={val} onClick={() => setPending(val)} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                                    border: `2px solid ${pendingFlag === val ? m.color : 'rgba(255,255,255,0.08)'}`,
                                    background: pendingFlag === val ? m.bg : 'transparent',
                                }}>
                                    <span style={{ color: m.color, display: 'flex' }}>{m.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.label}</span>
                                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                                        {val === 'clean' ? '— visible to everyone' : val === 'flagged' ? '— needs admin review' : '— hidden from all users'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setFlagModal(null)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 2 }} onClick={handleFlag}>Apply Status</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
