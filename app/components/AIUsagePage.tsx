'use client';
import React, { useEffect, useState } from 'react';
import { Cpu, DollarSign, Activity, Users, ChevronRight } from 'lucide-react';
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
        ? Math.round(recentSessions.reduce((acc: number, curr: any) => acc + curr.totalTokens, 0) / recentSessions.length)
        : 0;

    return (
        <div style={{ padding: '24px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }} className="animate-fadeIn">
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>
                    AI <span className="gradient-text">Usage</span>
                </h1>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4 }}>
                    Monitor Gemini token consumption and estimated costs
                </p>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard
                    icon={<Cpu size={22} color="#6c63ff" />}
                    label="Total Tokens Used"
                    value={totalTokens > 1_000_000 ? `${(totalTokens / 1_000_000).toFixed(2)}M` : totalTokens.toLocaleString()}
                    color="purple"
                />
                <StatCard
                    icon={<DollarSign size={22} color="#ef5350" />}
                    label="Total AI Cost"
                    value={`$${totalAICost.toFixed(2)}`}
                    color="red"
                />
                <StatCard
                    icon={<Activity size={22} color="#00d4aa" />}
                    label="Avg Tokens / Interview"
                    value={avgTokensPerSession.toLocaleString()}
                    color="teal"
                />
                <StatCard
                    icon={<Users size={22} color="#ffa726" />}
                    label="Interviews Tracked"
                    value={recentSessions?.length?.toString() || '0'}
                    color="amber"
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
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
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
                                    <Pie
                                        data={tokensByPlan}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="totalTokens"
                                        nameKey="plan"
                                    >
                                        {tokensByPlan?.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ background: '#111928', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}
                                        formatter={(value: number) => value.toLocaleString()}
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
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Recent Interview Sessions</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--muted-foreground)' }}>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 500 }}>User</th>
                                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: 500 }}>Model</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 500 }}>Input Msg</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 500 }}>Output Msg</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 500 }}>Total Tokens</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 500 }}>Cost (USD)</th>
                                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 500 }}>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentSessions?.map((session: any) => (
                                <tr key={session._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(108, 99, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c63ff', fontWeight: 600, fontSize: 12 }}>
                                            {(session.user?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{session.user?.name || 'Anonymous User'}</div>
                                            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{session.user?.email || 'No email provided'}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{session.model}</span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--muted-foreground)' }}>{session.inputTokens.toLocaleString()}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--muted-foreground)' }}>{session.outputTokens.toLocaleString()}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 500 }}>{session.totalTokens.toLocaleString()}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: '#ef5350' }}>${session.costUsd.toFixed(4)}</td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--muted-foreground)', fontSize: 13 }}>
                                        {new Date(session.timestamp).toLocaleDateString()} {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                </tr>
                            ))}
                            {(!recentSessions || recentSessions.length === 0) && (
                                <tr>
                                    <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                                        No recent AI usage data found.
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
