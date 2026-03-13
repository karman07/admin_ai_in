'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Star, StarHalf, MessageSquare, TrendingUp, Flag, Trash2,
    Pin, RefreshCw, Search, ChevronLeft, ChevronRight,
    AlertTriangle, EyeOff, CheckCircle2, X, BarChart3, Users,
    Award, Filter, ThumbsUp, Sparkles,
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
const FG     = 'var(--foreground)';
const MFG    = 'var(--muted-foreground)';
const BORDER = 'var(--card-border)';
const P      = 'var(--primary)';
const SUCC   = 'var(--success)';
const WARN   = 'var(--warning)';
const DANGER = 'var(--danger)';
const ACCENT = 'var(--accent)';

function fmtDate(s: string) {
    return new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtTimeAgo(s: string) {
    const sec = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
    if (sec < 60)   return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
}

function StarRow({ n, size = 14, filled }: { n: number; size?: number; filled?: boolean }) {
    return (
        <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    size={size}
                    style={{
                        fill: i <= n ? '#f59e0b' : 'none',
                        color: i <= n ? '#f59e0b' : 'rgba(255,255,255,0.12)',
                        flexShrink: 0,
                        strokeWidth: 1.5,
                    }}
                />
            ))}
        </div>
    );
}

function Avatar({ user, size = 36 }: { user: ReviewUser | null; size?: number }) {
    const name = user?.name || '?';
    const initials = name.split(' ').map(w => w[0]?.toUpperCase()).slice(0, 2).join('');
    if (user?.profilePhoto) {
        return (
            <img
                src={user.profilePhoto}
                alt={name}
                style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
        );
    }
    const hue = ((name.charCodeAt(0) || 0) * 37) % 360;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: `hsl(${hue},60%,45%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, fontWeight: 800, color: 'white', letterSpacing: '-0.5px',
        }}>
            {initials}
        </div>
    );
}

function RatingBar({ rating, count, total }: { rating: number; count: number; total: number }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const barColor = rating >= 4 ? SUCC : rating === 3 ? WARN : DANGER;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 60, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: FG }}>{rating}</span>
                <Star size={11} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
            </div>
            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: MFG, width: 36, textAlign: 'right', flexShrink: 0 }}>{count}</span>
        </div>
    );
}

const FLAG_OPTIONS = [
    { val: 'clean',   label: 'Clean',   icon: <CheckCircle2 size={12} />, color: SUCC },
    { val: 'flagged', label: 'Flagged', icon: <Flag size={12} />,         color: WARN },
    { val: 'hidden',  label: 'Hidden',  icon: <EyeOff size={12} />,       color: DANGER },
];
const FLAG_COLORS: Record<string, string> = { clean: SUCC, flagged: WARN, hidden: DANGER };
const FLAG_BG:    Record<string, string>  = {
    clean:   'rgba(0,200,83,0.1)',
    flagged: 'rgba(255,167,38,0.1)',
    hidden:  'rgba(239,83,80,0.1)',
};

const TYPE_LABELS: Record<string, string> = {
    behavioral:    'Behavioral',
    technical:     'Technical',
    dsa:           'DSA',
    system_design: 'System Design',
};

const INTER_COLORS: Record<string, string> = {
    behavioral:    P,
    technical:     '#06b6d4',
    dsa:           ACCENT,
    system_design: '#8b5cf6',
};

/* ════════════════════════════════════════════════════════════════════ */
export default function ReviewsPage() {
    const [stats,   setStats]   = useState<Stats | null>(null);
    const [list,    setList]    = useState<ListResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadList, setLoadList] = useState(false);

    // filters
    const [ratingFilter, setRatingFilter] = useState<number | ''>('');
    const [flagFilter,   setFlagFilter]   = useState<string>('');
    const [searchQ,      setSearchQ]      = useState('');
    const [debouncedQ,   setDebouncedQ]   = useState('');
    const [page,         setPage]         = useState(1);

    // modals
    const [flagModal,  setFlagModal]  = useState<Review | null>(null);
    const [pendingFlag, setPending]   = useState<string>('');

    /* debounce search */
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedQ(searchQ); setPage(1); }, 420);
        return () => clearTimeout(t);
    }, [searchQ]);

    /* load stats once */
    useEffect(() => {
        reviewsApi.getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
    }, []);

    /* load list whenever filters change */
    const fetchList = useCallback(() => {
        setLoadList(true);
        reviewsApi.getAll({
            page,
            limit: 10,
            rating: ratingFilter !== '' ? Number(ratingFilter) : undefined,
            flag:   flagFilter   || undefined,
            search: debouncedQ   || undefined,
        })
            .then(setList)
            .catch(console.error)
            .finally(() => setLoadList(false));
    }, [page, ratingFilter, flagFilter, debouncedQ]);

    useEffect(() => { fetchList(); }, [fetchList]);

    const refresh = () => {
        reviewsApi.getStats().then(setStats).catch(console.error);
        fetchList();
    };

    const handleFlag = async () => {
        if (!flagModal || !pendingFlag) return;
        await reviewsApi.flag(flagModal._id, pendingFlag).catch(console.error);
        setFlagModal(null);
        refresh();
    };
    const handlePin = async (r: Review) => {
        await reviewsApi.pin(r._id, !r.isPinned).catch(console.error);
        refresh();
    };
    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this review?')) return;
        await reviewsApi.delete(id).catch(console.error);
        refresh();
    };

    /* ── RENDER ──────────────────────────────────────────────────── */
    return (
        <div style={{ padding: '24px', minHeight: '100vh' }}>

            {/* ── PAGE HEADER ─────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                    }}>
                        <Star size={20} color="white" fill="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 800, color: FG, margin: 0, letterSpacing: '-0.3px' }}>
                            Interview Reviews
                        </h1>
                        <p style={{ fontSize: 13, color: MFG, marginTop: 2 }}>
                            User feedback &amp; ratings after interview sessions
                        </p>
                    </div>
                </div>
                <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={refresh}>
                    <RefreshCw size={15} className={loading || loadList ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* ── STAT CARDS ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Reviews',   val: stats?.total          ?? '—', sub: 'all time',         color: 'purple', icon: <MessageSquare size={18} /> },
                    { label: 'Average Rating',  val: stats?.avgRating      ?? '—', sub: 'out of 5 stars',   color: 'teal',   icon: <Star size={18} /> },
                    { label: '5-Star Reviews',  val: stats ? `${stats.fiveStarPct}%` : '—', sub: `${stats?.fiveStarCount ?? 0} reviews`, color: 'green', icon: <Award size={18} /> },
                    { label: 'Flagged',         val: stats?.flaggedCount   ?? '—', sub: 'need review',      color: 'rose',   icon: <Flag size={18} /> },
                    { label: 'Avg Score',       val: stats?.avgRating      ? `${stats.avgRating}/5` : '—', sub: 'satisfaction', color: 'blue', icon: <TrendingUp size={18} /> },
                ].map(s => (
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

            {/* ── TOP ROW: Rating Distribution + Recent Best ── */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                    {/* Rating Distribution */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <BarChart3 size={16} style={{ color: P }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: FG }}>Rating Breakdown</span>
                        </div>
                        {stats.avgRating > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.15)' }}>
                                <span style={{ fontSize: 36, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{stats.avgRating}</span>
                                <div>
                                    <StarRow n={Math.round(stats.avgRating)} size={16} />
                                    <p style={{ fontSize: 11, color: MFG, marginTop: 4 }}>{stats.total} total reviews</p>
                                </div>
                            </div>
                        )}
                        {[5, 4, 3, 2, 1].map(r => (
                            <RatingBar key={r} rating={r} count={stats.ratingDistribution[r] ?? 0} total={stats.total} />
                        ))}
                    </div>

                    {/* 5-star highlight panel */}
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <Sparkles size={16} style={{ color: '#f59e0b' }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: FG }}>Top Reviews</span>
                            <span className="badge badge-purple" style={{ fontSize: 10, marginLeft: 'auto' }}>Recent</span>
                        </div>
                        {stats.recentReviews.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: MFG, fontSize: 13 }}>No reviews yet</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {stats.recentReviews.slice(0, 4).map(r => (
                                    <div key={r._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                                        <Avatar user={r.userId} size={30} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: FG }}>{r.userId?.name ?? 'Unknown'}</span>
                                                <StarRow n={r.rating} size={10} />
                                            </div>
                                            {r.comment && (
                                                <p style={{ fontSize: 11, color: MFG, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>"{r.comment}"</p>
                                            )}
                                        </div>
                                        <span style={{ fontSize: 10, color: MFG, flexShrink: 0, marginTop: 2 }}>{fmtTimeAgo(r.createdAt)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── FILTERS BAR ─────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: MFG, pointerEvents: 'none' }} />
                    <input
                        className="form-input"
                        placeholder="Search reviews or interview types…"
                        value={searchQ}
                        onChange={e => { setSearchQ(e.target.value); setPage(1); }}
                        style={{ paddingLeft: 32, fontSize: 13 }}
                    />
                </div>

                {/* Rating filter */}
                <select
                    className="form-input form-select"
                    value={ratingFilter}
                    onChange={e => { setRatingFilter(e.target.value === '' ? '' : Number(e.target.value) as any); setPage(1); }}
                    style={{ width: 140, fontSize: 13 }}
                >
                    <option value="">All Ratings</option>
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                </select>

                {/* Flag filter */}
                <select
                    className="form-input form-select"
                    value={flagFilter}
                    onChange={e => { setFlagFilter(e.target.value); setPage(1); }}
                    style={{ width: 140, fontSize: 13 }}
                >
                    <option value="">All Status</option>
                    <option value="clean">Clean</option>
                    <option value="flagged">Flagged</option>
                    <option value="hidden">Hidden</option>
                </select>

                {(ratingFilter !== '' || flagFilter || debouncedQ) && (
                    <button
                        className="btn-secondary"
                        style={{ padding: '8px 12px', fontSize: 12 }}
                        onClick={() => { setRatingFilter(''); setFlagFilter(''); setSearchQ(''); setPage(1); }}
                    >
                        <X size={12} /> Clear
                    </button>
                )}

                {list && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: MFG, background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderRadius: 8, border: `1px solid ${BORDER}`, marginLeft: 'auto' }}>
                        {list.total} {list.total === 1 ? 'review' : 'reviews'}
                    </span>
                )}
            </div>

            {/* ── REVIEWS LIST ────────────────────────────── */}
            {loadList && !list ? (
                <div style={{ display: 'grid', gap: 10 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: 100, borderRadius: 14 }} />
                    ))}
                </div>
            ) : list?.reviews.length === 0 ? (
                <div className="glass-card" style={{ padding: '56px 32px', textAlign: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                        <Star size={22} style={{ color: '#f59e0b' }} />
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: FG, marginBottom: 6 }}>No reviews found</p>
                    <p style={{ fontSize: 13, color: MFG }}>Try adjusting your filters</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(list?.reviews ?? []).map(r => {
                        const typeColor = r.interviewType ? (INTER_COLORS[r.interviewType] ?? P) : P;
                        const typeLabel = r.interviewType ? (TYPE_LABELS[r.interviewType] ?? r.interviewType) : null;

                        return (
                            <div
                                key={r._id}
                                className="glass-card"
                                style={{ overflow: 'hidden', opacity: r.flag === 'hidden' ? 0.5 : 1, transition: 'opacity 0.2s' }}
                            >
                                {/* left colour strip by rating */}
                                <div style={{ display: 'flex' }}>
                                    <div style={{ width: 4, background: r.rating >= 4 ? SUCC : r.rating === 3 ? WARN : DANGER, flexShrink: 0 }} />
                                    <div style={{ flex: 1, padding: '16px 18px' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                                            {/* avatar */}
                                            <Avatar user={r.userId} size={40} />

                                            {/* main body */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 14, fontWeight: 700, color: FG }}>
                                                        {r.userId?.name ?? 'Deleted User'}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: MFG }}>{r.userId?.email ?? ''}</span>

                                                    {typeLabel && (
                                                        <span className="badge" style={{ fontSize: 10, background: `${typeColor}18`, color: typeColor }}>
                                                            {typeLabel}
                                                        </span>
                                                    )}
                                                    {r.isPinned && (
                                                        <span className="badge badge-purple" style={{ fontSize: 10 }}>
                                                            <Pin size={9} /> Pinned
                                                        </span>
                                                    )}
                                                    {/* flag badge */}
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                                                        background: FLAG_BG[r.flag], color: FLAG_COLORS[r.flag],
                                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                                    }}>
                                                        {FLAG_OPTIONS.find(f => f.val === r.flag)?.icon} {r.flag}
                                                    </span>

                                                    <span style={{ fontSize: 11, color: MFG, marginLeft: 'auto' }}>{fmtDate(r.createdAt)}</span>
                                                </div>

                                                {/* stars */}
                                                <div style={{ marginBottom: r.comment ? 8 : 0 }}>
                                                    <StarRow n={r.rating} size={15} />
                                                </div>

                                                {/* comment */}
                                                {r.comment && (
                                                    <p style={{ fontSize: 13, color: MFG, lineHeight: 1.6, marginTop: 6 }}>
                                                        "{r.comment}"
                                                    </p>
                                                )}
                                            </div>

                                            {/* action buttons */}
                                            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                                <button
                                                    className="btn-secondary"
                                                    title={r.isPinned ? 'Unpin' : 'Pin to top'}
                                                    style={{ padding: '6px 8px', lineHeight: 0, opacity: r.isPinned ? 1 : 0.5 }}
                                                    onClick={() => handlePin(r)}
                                                >
                                                    <Pin size={13} style={{ color: r.isPinned ? '#f59e0b' : undefined }} />
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
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── PAGINATION ──────────────────────────────── */}
            {list && list.pages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                    <span style={{ fontSize: 12, color: MFG }}>
                        Page {list.page} of {list.pages} · {list.total} reviews
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            className="btn-secondary"
                            disabled={list.page <= 1}
                            style={{ padding: '6px 10px', lineHeight: 0, opacity: list.page <= 1 ? 0.3 : 1 }}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {Array.from({ length: Math.min(7, list.pages) }, (_, i) => {
                            const pg = list.pages <= 7 ? i + 1 : (
                                list.page <= 4 ? i + 1 :
                                list.page >= list.pages - 3 ? list.pages - 6 + i :
                                list.page - 3 + i
                            );
                            return (
                                <button
                                    key={pg}
                                    className={pg === list.page ? 'btn-primary' : 'btn-secondary'}
                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                    onClick={() => setPage(pg)}
                                >
                                    {pg}
                                </button>
                            );
                        })}
                        <button
                            className="btn-secondary"
                            disabled={list.page >= list.pages}
                            style={{ padding: '6px 10px', lineHeight: 0, opacity: list.page >= list.pages ? 0.3 : 1 }}
                            onClick={() => setPage(p => Math.min(list.pages, p + 1))}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ══ FLAG MODAL ══════════════════════════════ */}
            {flagModal && (
                <div
                    className="modal-overlay"
                    onClick={e => { if (e.target === e.currentTarget) setFlagModal(null); }}
                >
                    <div className="modal-content" style={{ maxWidth: 440 }}>
                        {/* header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,167,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Flag size={16} style={{ color: WARN }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: FG, margin: 0 }}>Moderate Review</h3>
                                    <p style={{ fontSize: 11, color: MFG, marginTop: 1 }}>Change visibility status</p>
                                </div>
                            </div>
                            <button className="btn-secondary" style={{ padding: '5px 7px', lineHeight: 0 }} onClick={() => setFlagModal(null)}>
                                <X size={14} />
                            </button>
                        </div>

                        {/* review preview */}
                        <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <Avatar user={flagModal.userId} size={28} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: FG }}>{flagModal.userId?.name ?? 'Unknown'}</span>
                                <StarRow n={flagModal.rating} size={12} />
                            </div>
                            {flagModal.comment && (
                                <p style={{ fontSize: 12, color: MFG, lineHeight: 1.5 }}>"{flagModal.comment}"</p>
                            )}
                        </div>

                        {/* flag options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                            {FLAG_OPTIONS.map(o => (
                                <button
                                    key={o.val}
                                    onClick={() => setPending(o.val)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: `2px solid ${pendingFlag === o.val ? o.color : BORDER}`,
                                        background: pendingFlag === o.val ? `${FLAG_BG[o.val]}` : 'transparent', cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    <span style={{ color: o.color, display: 'flex' }}>{o.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: o.color }}>{o.label}</span>
                                    <span style={{ fontSize: 11, color: MFG, marginLeft: 4 }}>
                                        {o.val === 'clean' ? '— visible to everyone' : o.val === 'flagged' ? '— needs admin review' : '— hidden from all users'}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setFlagModal(null)}>Cancel</button>
                            <button className="btn-primary" style={{ flex: 2 }} onClick={handleFlag}>Apply Status</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
