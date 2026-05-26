'use client';
import React, { useEffect, useState } from 'react';
import { Cpu, DollarSign, Activity, Users, Briefcase, BookOpen } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { analyticsApi } from '../lib/api';

const PIE_COLORS = ['#6c63ff', '#00d4aa', '#ffa726', '#ef5350'];

// Avatar colours cycle deterministically by name initial
const AVATAR_PALETTE = ['#6c63ff', '#00d4aa', '#ffa726', '#ef5350', '#42a5f5', '#ab47bc', '#26a69a', '#ec407a'];
function avatarColor(name: string): string {
    const idx = name.charCodeAt(0) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[idx];
}

// ─── Source badge ────────────────────────────────────────────────────────────
const SOURCE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
    interview: { bg: 'rgba(108, 99, 255, 0.15)', color: '#a48fff', label: 'Interview' },
    resume   : { bg: 'rgba(0, 212, 170, 0.15)', color: '#00d4aa', label: 'Resume'    },
    cv       : { bg: 'rgba(66, 165, 245, 0.15)', color: '#42a5f5', label: 'CV'       },
    tts      : { bg: 'rgba(255, 167, 38, 0.12)', color: '#ffa726', label: 'TTS'      },
    other    : { bg: 'rgba(255,255,255,0.07)',    color: '#aaa',    label: 'Other'    },
};
function SourceBadge({ source }: { source?: string }) {
    const s = SOURCE_STYLES[source ?? 'other'] ?? SOURCE_STYLES.other;
    return (
        <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            {s.label}
        </span>
    );
}

// ─── Interview type badge ─────────────────────────────────────────────────────
const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
    technical : { bg: 'rgba(66,165,245,0.12)', color: '#42a5f5' },
    behavioral: { bg: 'rgba(171,71,188,0.12)', color: '#ab47bc' },
    hr        : { bg: 'rgba(0,212,170,0.12)',  color: '#00d4aa' },
    problem   : { bg: 'rgba(255,167,38,0.12)', color: '#ffa726' },
    general   : { bg: 'rgba(255,255,255,0.07)',color: '#888'    },
};
function TypeBadge({ type }: { type?: string }) {
    if (!type) return <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>—</span>;
    const s = TYPE_STYLES[type] ?? TYPE_STYLES.general;
    return (
        <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {type}
        </span>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--card-border)',
            padding: 24,
            borderRadius: 16,
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div>
                <div style={{ color: 'var(--muted-foreground)', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
            </div>
            <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `var(--${color}-transparent, rgba(108, 99, 255, 0.1))`
            }}>
                {icon}
            </div>
        </div>
    );
}

export default function AIUsagePage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        analyticsApi.getAIUsageStats()
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 24 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                    <div className="skeleton" style={{ height: 350 }} />
                    <div className="skeleton" style={{ height: 350 }} />
                </div>
            </div>
        );
    }

    if (!data) {
        return <div style={{ padding: 32, textAlign: 'center' }}>Failed to load AI Usage data.</div>;
    }

    const { tokensByPlan, usageOverTime, totalAICost, recentSessions } = data;
    const totalTokens = tokensByPlan?.reduce((acc: number, curr: any) => acc + curr.totalTokens, 0) || 0;
    const avgTokensPerSession = recentSessions?.length
        ? Math.round(recentSessions.reduce((acc: number, s: any) => acc + s.totalTokens, 0) / recentSessions.length)
        : 0;

    // Count sessions by source
    const interviewCount = recentSessions?.filter((s: any) => s.source === 'interview' || !s.source).length || 0;
    const resumeCount    = recentSessions?.filter((s: any) => s.source === 'resume' || s.source === 'cv').length || 0;

    return (
        <div style={{ padding: '24px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }} className="animate-fadeIn">
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>
                    AI <span className="gradient-text">Usage</span>
                </h1>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4 }}>
                    Monitor Gemini token consumption and estimated costs across interviews and resumes
                </p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard
                    icon={<Cpu size={22} color="#6c63ff" />}
                    label="Total Tokens Used"
                    value={totalTokens > 1_000_000 ? `${(totalTokens / 1_000_000).toFixed(2)}M` : totalTokens.toLocaleString()}
                    color="purple"
                />
                <StatCard
                    icon={<DollarSign size={22} color="#ef5350" />}
                    label="Total AI Cost"
                    value={`$${(totalAICost ?? 0).toFixed(4)}`}
                    color="red"
                />
                <StatCard
                    icon={<Activity size={22} color="#00d4aa" />}
                    label="Avg Tokens / Session"
                    value={avgTokensPerSession.toLocaleString()}
                    color="teal"
                />
                <StatCard
                    icon={<Users size={22} color="#ffa726" />}
                    label="Sessions Tracked"
                    value={recentSessions?.length?.toString() || '0'}
                    color="amber"
                />
                <StatCard
                    icon={<Briefcase size={22} color="#6c63ff" />}
                    label="Interview Sessions"
                    value={interviewCount.toString()}
                    color="purple"
                />
                <StatCard
                    icon={<BookOpen size={22} color="#42a5f5" />}
                    label="Resume Enhancements"
                    value={resumeCount.toString()}
                    color="blue"
                />
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>

                {/* Usage Over Time */}
                <div className="card-container">
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Daily Token Usage</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>Last 30 days token consumption</p>
                    </div>
                    <div style={{ padding: 24, height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={usageOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v > 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#111928', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="tokens" name="Tokens" stroke="#6c63ff" strokeWidth={2} fillOpacity={1} fill="url(#colorTokens)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Usage by Plan */}
                <div className="card-container">
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Usage by Plan</h3>
                    </div>
                    <div style={{ padding: 24, height: 320, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={tokensByPlan} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="totalTokens" nameKey="plan">
                                        {tokensByPlan?.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ background: '#111928', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                                        formatter={(value) => (typeof value === 'number' ? value.toLocaleString() : String(value ?? ''))}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                            {tokensByPlan?.map((plan: any, i: number) => (
                                <div key={plan.plan} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                    <span style={{ fontSize: 13, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{plan.plan}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Sessions Table */}
            <div className="card-container">
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recent Sessions</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>Latest 100 AI sessions — interviews, resumes &amp; more</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--muted-foreground)' }}>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>User</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>Source</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>Type</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>Role / Company</th>
                                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 500, whiteSpace: 'nowrap' }}>Model</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Input tkns</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Output tkns</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Total</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Cost</th>
                                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSessions?.map((session: any) => {
                                const name  = session.user?.name  || '';
                                const email = session.user?.email || '';
                                const initial = name ? name.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : '?';
                                const aColor  = avatarColor(initial);
                                const roleStr    = session.role    || '';
                                const companyStr = session.company || '';
                                const roleCompany = [roleStr, companyStr].filter(Boolean).join(' @ ') || '';
                                return (
                                    <tr key={session._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                                        {/* User */}
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${aColor}22`, border: `2px solid ${aColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: aColor, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                                                    {initial}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                                                        {name || (email ? email.split('@')[0] : 'Unknown User')}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                                                        {email || 'No email'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Source */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <SourceBadge source={session.source} />
                                        </td>

                                        {/* Interview Type */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <TypeBadge type={session.interviewType || ''} />
                                        </td>

                                        {/* Role / Company */}
                                        <td style={{ padding: '14px 16px', maxWidth: 180 }}>
                                            {roleCompany ? (
                                                <span style={{ fontSize: 13, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                                    {roleCompany}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>—</span>
                                            )}
                                        </td>

                                        {/* Model */}
                                        <td style={{ padding: '14px 16px' }}>
                                            <span style={{ background: 'rgba(255,255,255,0.07)', padding: '3px 8px', borderRadius: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
                                                {session.model || '—'}
                                            </span>
                                        </td>

                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{(session.inputTokens ?? 0).toLocaleString()}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{(session.outputTokens ?? 0).toLocaleString()}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{(session.totalTokens ?? 0).toLocaleString()}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: '#ef5350', fontVariantNumeric: 'tabular-nums' }}>${(session.costUsd ?? 0).toFixed(4)}</td>
                                        <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--muted-foreground)', fontSize: 12, whiteSpace: 'nowrap' }}>
                                            {new Date(session.timestamp).toLocaleDateString()}<br />
                                            <span style={{ fontSize: 11 }}>{new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!recentSessions || recentSessions.length === 0) && (
                                <tr>
                                    <td colSpan={10} style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                        No AI usage sessions found yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
