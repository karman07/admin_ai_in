'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    MessageSquare,
    Search,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    Award,
    Zap,
    CheckCircle,
    XCircle,
    Star,
    Filter,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { resultsApi } from '../lib/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function score100(v: number) {
    // values can come in as 0-100 or 0-10; normalise to 0-100
    if (v <= 10) return Math.round(v * 10);
    return Math.round(v);
}

function scoreColor(s: number) {
    if (s >= 75) return '#00d4aa';
    if (s >= 50) return '#ffb800';
    return '#ff4d4d';
}

const ROUND_COLORS: Record<string, { bg: string; color: string }> = {
    technical : { bg: 'rgba(66,165,245,0.12)',  color: '#42a5f5' },
    behavioral: { bg: 'rgba(171,71,188,0.12)',  color: '#ab47bc' },
    hr        : { bg: 'rgba(0,212,170,0.12)',   color: '#00d4aa' },
    problem   : { bg: 'rgba(255,167,38,0.12)',  color: '#ffa726' },
    general   : { bg: 'rgba(255,255,255,0.07)', color: '#888'    },
};

function RoundBadge({ type }: { type?: string }) {
    const t = (type ?? 'general').toLowerCase();
    const s = ROUND_COLORS[t] ?? ROUND_COLORS.general;
    return (
        <span style={{
            background: s.bg, color: s.color,
            padding: '3px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap',
        }}>
            {type || '—'}
        </span>
    );
}

function HireBadge({ rec }: { rec?: string }) {
    const label = rec || 'unknown';
    const lower = label.toLowerCase();
    const positive = lower.includes('strong') || lower.includes('hire') || lower === 'yes';
    const color = positive ? '#00d4aa' : lower.includes('consider') ? '#ffb800' : '#ff4d4d';
    return (
        <span style={{
            background: `${color}22`,
            color,
            padding: '3px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
            {label}
        </span>
    );
}

// ── QA transcript expander ────────────────────────────────────────────────────

function QAItem({ item, idx }: { item: any; idx: number }) {
    const [open, setOpen] = useState(false);
    const s = score100(item.score ?? 0);

    return (
        <div style={{
            background: open ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${open ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 8,
            marginBottom: 6,
        }}>
            {/* header — always visible, question truncates to 2 lines */}
            <div
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
                onClick={() => setOpen(o => !o)}
            >
                <span style={{ color: '#475569', fontSize: 11, fontWeight: 700, minWidth: 24, paddingTop: 2, flexShrink: 0 }}>Q{idx + 1}</span>
                <div style={{ flexShrink: 0, paddingTop: 3 }}>
                    {item.isCorrect
                        ? <CheckCircle size={13} color="#00d4aa" />
                        : <XCircle size={13} color="#ff4d4d" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: 13, color: '#cbd5e1', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: open ? undefined : 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        {item.question}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 1 }}>
                    <span style={{
                        fontSize: 11, fontWeight: 700, color: scoreColor(s),
                        background: `${scoreColor(s)}15`, borderRadius: 6,
                        padding: '2px 7px', whiteSpace: 'nowrap',
                    }}>
                        {s}/100
                    </span>
                    {open ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
                </div>
            </div>

            {/* expanded body */}
            {open && (
                <div style={{ padding: '0 12px 12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ marginTop: 12, marginBottom: 10 }}>
                        <div style={{ color: '#6c63ff', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Candidate Answer</div>
                        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>
                            {item.answer || <span style={{ color: '#334155', fontStyle: 'italic' }}>No answer recorded</span>}
                        </div>
                    </div>
                    {item.explanation && (
                        <div>
                            <div style={{ color: '#ffb800', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Evaluation</div>
                            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>{item.explanation}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Result row (expandable) ───────────────────────────────────────────────────

function ResultRow({ result }: { result: any }) {
    const [open, setOpen] = useState(false);

    const user    = result.user;
    const name    = user?.name || user?.displayName || user?.email?.split('@')[0] || 'Unknown';
    const email   = user?.email || '—';
    const score   = score100(result.summary?.overall_score ?? 0);
    const items: any[] = result.items ?? result.question_wise_analysis ?? [];
    const date    = result.createdAt
        ? new Date(result.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
    const tokens   = result.tokenUsage?.totalTokens ?? 0;
    const costUsd  = result.tokenUsage?.costUsd ?? 0;
    const expRating = result.feedback?.experienceRating ?? null;
    const resRating = result.feedback?.resultRating ?? null;
    const fbComment = result.feedback?.comment ?? '';

    return (
        <div style={{
            background: open ? 'rgba(108,99,255,0.03)' : 'transparent',
            border: `1px solid ${open ? 'rgba(108,99,255,0.2)' : 'var(--card-border)'}`,
            borderRadius: 12,
            marginBottom: 6,
            overflow: 'hidden',
        }}>
            {/* ── Collapsed row ── */}
            <div
                style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', gap: 12 }}
                onClick={() => setOpen(o => !o)}
            >
                {/* Avatar */}
                <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: '#6c63ff22', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#a48fff',
                }}>
                    {name[0]?.toUpperCase()}
                </div>

                {/* Name / email / role — left, grows */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                    <div style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {email}
                        {result.role && (
                            <span style={{ color: '#334155' }}> · {result.role}</span>
                        )}
                    </div>
                </div>

                {/* Right-side pills — flex-shrink, never overflow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <RoundBadge type={result.roundType} />

                    {/* Score */}
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: `${scoreColor(score)}15`,
                        border: `2px solid ${scoreColor(score)}40`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>{score}</span>
                        <span style={{ fontSize: 8, color: scoreColor(score), opacity: 0.6, lineHeight: 1 }}>/100</span>
                    </div>

                    {/* Tokens */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: tokens > 0 ? 'rgba(108,99,255,0.1)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${tokens > 0 ? 'rgba(108,99,255,0.18)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 16, padding: '3px 9px',
                    }}>
                        <Zap size={11} color={tokens > 0 ? '#a48fff' : '#334155'} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: tokens > 0 ? '#a48fff' : '#334155' }}>
                            {tokens > 0 ? (tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens) : '—'}
                        </span>
                    </div>

                    {/* User rating pill (collapsed) */}
                    {expRating !== null && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)',
                            borderRadius: 16, padding: '3px 8px',
                        }}>
                            <Star size={10} fill="#ffb800" color="#ffb800" />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffb800' }}>{expRating}</span>
                        </div>
                    )}

                    {/* Date */}
                    <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>{date}</span>

                    {/* Chevron */}
                    <div style={{ color: open ? '#6c63ff' : '#334155', display: 'flex' }}>
                        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
            </div>

            {/* ── Expanded panel ── */}
            {open && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px 18px' }}>

                    {/* Meta row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {result.summary?.hire_recommendation && (
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 12px' }}>
                                <div style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>Hire Rec</div>
                                <HireBadge rec={result.summary.hire_recommendation} />
                            </div>
                        )}
                        {result.summary?.seniority_assessment && (
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 12px' }}>
                                <div style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>Seniority</div>
                                <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{result.summary.seniority_assessment}</div>
                            </div>
                        )}
                        {result.summary?.confidence_assessment && (
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 12px' }}>
                                <div style={{ color: '#475569', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>Confidence</div>
                                <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{result.summary.confidence_assessment}</div>
                            </div>
                        )}
                        {tokens > 0 && (
                            <div style={{ background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.15)', borderRadius: 8, padding: '7px 12px' }}>
                                <div style={{ color: '#7c70cc', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>Tokens Used</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <Zap size={12} color="#a48fff" />
                                    <span style={{ color: '#a48fff', fontSize: 12, fontWeight: 700 }}>{tokens.toLocaleString()}</span>
                                    {costUsd > 0 && <span style={{ color: '#475569', fontSize: 11 }}> · ${costUsd.toFixed(4)}</span>}
                                </div>
                            </div>
                        )}
                        {result.feedback && (
                            <div style={{ background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.18)', borderRadius: 8, padding: '7px 12px', minWidth: 140 }}>
                                <div style={{ color: '#a37800', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>User Feedback</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {expRating !== null && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ color: '#64748b', fontSize: 10, width: 90 }}>Experience</span>
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                {[1,2,3,4,5].map(n => (
                                                    <Star key={n} size={11}
                                                        fill={n <= expRating ? '#ffb800' : 'none'}
                                                        color={n <= expRating ? '#ffb800' : '#334155'}
                                                    />
                                                ))}
                                            </div>
                                            <span style={{ color: '#ffb800', fontSize: 11, fontWeight: 700 }}>{expRating}/5</span>
                                        </div>
                                    )}
                                    {resRating !== null && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ color: '#64748b', fontSize: 10, width: 90 }}>Result accuracy</span>
                                            <div style={{ display: 'flex', gap: 2 }}>
                                                {[1,2,3,4,5].map(n => (
                                                    <Star key={n} size={11}
                                                        fill={n <= resRating ? '#a48fff' : 'none'}
                                                        color={n <= resRating ? '#a48fff' : '#334155'}
                                                    />
                                                ))}
                                            </div>
                                            <span style={{ color: '#a48fff', fontSize: 11, fontWeight: 700 }}>{resRating}/5</span>
                                        </div>
                                    )}
                                    {fbComment && (
                                        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>"{fbComment}"</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Strengths / Areas */}
                    {(result.summary?.key_strengths?.length > 0 || result.summary?.key_areas_for_improvement?.length > 0) && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
                            {result.summary?.key_strengths?.length > 0 && (
                                <div style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.1)', borderRadius: 8, padding: '10px 12px' }}>
                                    <div style={{ color: '#00d4aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Strengths</div>
                                    {result.summary.key_strengths.map((s: string, i: number) => (
                                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                                            <CheckCircle size={11} color="#00d4aa" style={{ flexShrink: 0, marginTop: 3 }} />
                                            <span style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{s}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {result.summary?.key_areas_for_improvement?.length > 0 && (
                                <div style={{ background: 'rgba(255,77,77,0.04)', border: '1px solid rgba(255,77,77,0.1)', borderRadius: 8, padding: '10px 12px' }}>
                                    <div style={{ color: '#ff4d4d', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Areas to Improve</div>
                                    {result.summary.key_areas_for_improvement.map((a: string, i: number) => (
                                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                                            <XCircle size={11} color="#ff4d4d" style={{ flexShrink: 0, marginTop: 3 }} />
                                            <span style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{a}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transcript */}
                    {items.length > 0 && (
                        <div>
                            <div style={{ color: '#334155', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                Interview Transcript · {items.length} question{items.length !== 1 ? 's' : ''}
                            </div>
                            {items.map((itm: any, i: number) => (
                                <QAItem key={i} item={itm} idx={i} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ROUND_OPTIONS = ['', 'technical', 'behavioral', 'hr', 'problem', 'general'];

export default function InterviewChatsPage() {
    const [data, setData]       = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch]   = useState('');
    const [roundType, setRoundType] = useState('');
    const [page, setPage]       = useState(1);
    const limit = 20;

    const fetchData = useCallback(async (p = page, rt = roundType, s = search) => {
        setLoading(true);
        try {
            const res = await resultsApi.getAllAdmin({ page: p, limit, roundType: rt || undefined, search: s || undefined });
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, roundType, search]);

    useEffect(() => {
        fetchData(page, roundType, search);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, roundType]);

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            setPage(1);
            fetchData(1, roundType, search);
        }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const results: any[] = data?.results ?? [];
    const total: number  = data?.total   ?? 0;
    const pages: number  = data?.pages   ?? 1;

    // ── stat cards ────────────────────────────────────────────────────────────
    const avgScore = results.length
        ? Math.round(results.reduce((acc, r) => acc + score100(r.summary?.overall_score ?? 0), 0) / results.length)
        : 0;
    const hireCount = results.filter(r =>
        (r.summary?.hire_recommendation ?? '').toLowerCase().includes('hire') ||
        (r.summary?.hire_recommendation ?? '').toLowerCase().includes('strong')
    ).length;

    const totalTokens = results.reduce((acc: number, r: any) => acc + (r.tokenUsage?.totalTokens ?? 0), 0);

    return (
        <div style={{ padding: '20px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MessageSquare size={28} color="#6c63ff" />
                        Interview <span className="gradient-text" style={{ marginLeft: 6 }}>Chats</span>
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4 }}>
                        All user interview sessions — transcripts, scores, and AI evaluation
                    </p>
                </div>
                <button
                    className="btn-secondary"
                    onClick={() => fetchData(page, roundType, search)}
                    style={{ borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                    { icon: <MessageSquare size={18} color="#6c63ff" />, label: 'Total Interviews', value: total.toLocaleString(), color: '#6c63ff' },
                    { icon: <Award size={18} color="#ffb800" />, label: 'Avg Score (page)', value: `${avgScore}/100`, color: '#ffb800' },
                    { icon: <Zap size={18} color="#a48fff" />, label: 'Tokens (page)', value: totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : totalTokens.toLocaleString(), color: '#a48fff' },
                    { icon: <CheckCircle size={18} color="#00d4aa" />, label: 'Hire Recs (page)', value: hireCount.toString(), color: '#00d4aa' },
                ].map((c, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: `${c.color}18`, borderRadius: 8, padding: 8, flexShrink: 0 }}>{c.icon}</div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginTop: 2 }}>{c.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                    <input
                        type="text"
                        placeholder="Search by user, role, company…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            paddingLeft: 36,
                            paddingRight: 12,
                            paddingTop: 10,
                            paddingBottom: 10,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 10,
                            color: '#f8fafc',
                            fontSize: 14,
                            outline: 'none',
                            boxSizing: 'border-box',
                        }}
                    />
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Filter size={16} color="#475569" />
                    <select
                        value={roundType}
                        onChange={e => { setRoundType(e.target.value); setPage(1); }}
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 10,
                            color: '#f8fafc',
                            fontSize: 14,
                            padding: '10px 14px',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <option value="">All Round Types</option>
                        {ROUND_OPTIONS.filter(Boolean).map(rt => (
                            <option key={rt} value={rt}>{rt.charAt(0).toUpperCase() + rt.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Results list */}
            {loading ? (
                <div>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 64, borderRadius: 14, marginBottom: 10 }} />
                    ))}
                </div>
            ) : results.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
                    <MessageSquare size={40} style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 16, fontWeight: 600 }}>No interview results found</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters or wait for users to complete interviews</div>
                </div>
            ) : (
                results.map((r: any) => <ResultRow key={r._id} result={r} />)
            )}

            {/* Pagination */}
            {pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24 }}>
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 8,
                            padding: '8px 14px',
                            color: page <= 1 ? '#333' : '#f8fafc',
                            cursor: page <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        <ChevronLeft size={16} /> Prev
                    </button>
                    <span style={{ color: '#64748b', fontSize: 14 }}>
                        Page {page} of {pages} <span style={{ color: '#334155' }}>({total.toLocaleString()} total)</span>
                    </span>
                    <button
                        disabled={page >= pages}
                        onClick={() => setPage(p => Math.min(pages, p + 1))}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--card-border)',
                            borderRadius: 8,
                            padding: '8px 14px',
                            color: page >= pages ? '#333' : '#f8fafc',
                            cursor: page >= pages ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
