'use client';
import React, { useEffect, useState } from 'react';
import {
    Cpu,
    Zap,
    DollarSign,
    TrendingUp,
    BarChart3,
    ArrowUpRight,
    RefreshCw,
    Activity,
    Target,
    Gauge,
    ArrowDownLeft,
    ArrowUpRight as ArrowOut,
    Layers,
    TrendingDown,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    PieChart,
    Pie,
    Legend,
    Area,
    AreaChart,
    ComposedChart,
} from 'recharts';
import { analyticsApi, API_BASE } from '../lib/api';

const COLORS = ['#6c63ff', '#00d4aa', '#ffb800', '#ff4d4d'];
const INPUT_COLOR  = '#6c63ff';
const OUTPUT_COLOR = '#00d4aa';
const COST_COLOR   = '#ff4d4d';

function fmt(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toLocaleString();
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(10,15,30,0.95)', borderRadius: 12, backdropFilter: 'blur(12px)' }}>
            <div style={{ fontWeight: 700, color: '#f8fafc', marginBottom: 8, fontSize: 13 }}>{label}</div>
            {payload.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.stroke || p.fill }} />
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>{p.name}:</span>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: 12 }}>
                        {p.name?.includes('Cost') || p.name?.includes('$') ? `$${Number(p.value).toFixed(5)}` : fmt(Number(p.value))}
                    </span>
                </div>
            ))}
        </div>
    );
}

function StatCard({ icon, label, value, sub, subColor = '#94a3b8', borderColor }: { icon: React.ReactNode; label: string; value: string; sub?: string; subColor?: string; borderColor?: string }) {
    return (
        <div className="glass-card" style={{ padding: 22, border: borderColor ? `1px solid ${borderColor}` : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {icon}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, fontWeight: 600, color: subColor, marginTop: 8 }}>{sub}</div>}
        </div>
    );
}

export default function TokenUsagePage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await analyticsApi.getAIUsageStats();
            setStats(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        import('socket.io-client').then(({ io }) => {
            const socket = io(`${API_BASE}/analytics`, {
                transports: ['websocket'],
                reconnection: true,
                query: { isAdmin: 'true' }
            });
            socket.on('aiUsageUpdated', (newStats) => setStats(newStats));
            return () => { socket.disconnect(); };
        });
    }, []);

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                    <div className="skeleton" style={{ height: 360, borderRadius: 24 }} />
                    <div className="skeleton" style={{ height: 360, borderRadius: 24 }} />
                </div>
            </div>
        );
    }

    const { totalRevenue: totalRevenueInr = 0, totalAICost = 0, tokensByPlan = [], usageOverTime = [] } = stats || {};
    const EXCHANGE_RATE = 83;
    const totalRevenue = totalRevenueInr / EXCHANGE_RATE;
    const profit       = totalRevenue - totalAICost;
    const margin       = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const totalTokens       = tokensByPlan.reduce((a: number, c: any) => a + (c.totalTokens || 0), 0);
    const totalInputTokens  = tokensByPlan.reduce((a: number, c: any) => a + (c.totalInputTokens || 0), 0);
    const totalOutputTokens = tokensByPlan.reduce((a: number, c: any) => a + (c.totalOutputTokens || 0), 0);
    const totalInputCost    = tokensByPlan.reduce((a: number, c: any) => a + (c.totalInputCost || 0), 0);
    const totalOutputCost   = tokensByPlan.reduce((a: number, c: any) => a + (c.totalOutputCost || 0), 0);
    const totalSessions     = tokensByPlan.reduce((a: number, c: any) => a + (c.sessionCount || 0), 0);
    const avgTokensPerSession = totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0;
    const avgCostPerSession   = totalSessions > 0 ? totalAICost / totalSessions : 0;
    const tokensPerDollar     = totalAICost > 0 ? Math.round(totalTokens / totalAICost) : 0;
    const inputRatio  = totalTokens > 0 ? ((totalInputTokens / totalTokens) * 100).toFixed(1) : '0';
    const outputRatio = totalTokens > 0 ? ((totalOutputTokens / totalTokens) * 100).toFixed(1) : '0';

    return (
        <div style={{ padding: '24px 32px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Cpu size={30} color="#6c63ff" />
                        AI Token Intelligence
                    </h1>
                    <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Input & output token breakdown, cost correlation, and profit analysis</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,170,0.1)', padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(0,212,170,0.2)' }}>
                        <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4aa' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#00d4aa' }}>LIVE SYNC</span>
                    </div>
                    <button className="btn-secondary" onClick={fetchData} style={{ borderRadius: 12 }}>
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            </div>

            {/* Row 1 - 4 primary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <StatCard icon={<Zap size={20} color="#6c63ff" />} label="Total Tokens" value={fmt(totalTokens)} sub={`Across ${totalSessions} sessions`} subColor="#6c63ff" borderColor="rgba(108,99,255,0.25)" />
                <StatCard icon={<DollarSign size={20} color="#ff4d4d" />} label="Total AI Cost" value={`$${totalAICost.toFixed(4)}`} sub={`$${avgCostPerSession.toFixed(4)} per session`} subColor="#ff4d4d" />
                <StatCard icon={<ArrowUpRight size={20} color="#00d4aa" />} label="Recovered Revenue" value={`$${totalRevenue.toFixed(2)}`} sub={`Net Profit: $${profit.toFixed(2)}`} subColor="#00d4aa" />
                <StatCard icon={<BarChart3 size={20} color={margin > 0 ? '#00d4aa' : '#ff4d4d'} />} label="Profit Margin" value={`${margin.toFixed(1)}%`} sub={margin > 0 ? 'Profitable' : 'Loss Making'} subColor={margin > 0 ? '#00d4aa' : '#ff4d4d'} />
            </div>

            {/* Row 1b - Input/Output cost split */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(108,99,255,0.25)', display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ArrowDownLeft size={20} color={INPUT_COLOR} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Input Token Cost (Prompt)</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: INPUT_COLOR }}>${totalInputCost.toFixed(5)}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{totalAICost > 0 ? ((totalInputCost / totalAICost) * 100).toFixed(1) : 0}% of total spend · price charged per prompt token</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Per session avg</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: INPUT_COLOR }}>${totalSessions > 0 ? (totalInputCost / totalSessions).toFixed(5) : '0.00000'}</div>
                    </div>
                </div>
                <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(0,212,170,0.25)', display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,212,170,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <ArrowOut size={20} color={OUTPUT_COLOR} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Output Token Cost (Completion)</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: OUTPUT_COLOR }}>${totalOutputCost.toFixed(5)}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{totalAICost > 0 ? ((totalOutputCost / totalAICost) * 100).toFixed(1) : 0}% of total spend · price charged per generated token</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Per session avg</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: OUTPUT_COLOR }}>${totalSessions > 0 ? (totalOutputCost / totalSessions).toFixed(5) : '0.00000'}</div>
                    </div>
                </div>
            </div>

            {/* Row 2 - token breakdown + efficiency */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
                <div className="glass-card" style={{ padding: 18, border: '1px solid rgba(108,99,255,0.25)', gridColumn: 'span 1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ArrowDownLeft size={16} color={INPUT_COLOR} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Input Tokens</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: INPUT_COLOR, background: 'rgba(108,99,255,0.1)', padding: '2px 6px', borderRadius: 6 }}>{inputRatio}%</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: INPUT_COLOR }}>{fmt(totalInputTokens)}</div>
                    <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: INPUT_COLOR, width: `${inputRatio}%`, transition: 'width 0.6s ease' }} />
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 18, border: '1px solid rgba(0,212,170,0.25)', gridColumn: 'span 1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ArrowOut size={16} color={OUTPUT_COLOR} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Output Tokens</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: OUTPUT_COLOR, background: 'rgba(0,212,170,0.1)', padding: '2px 6px', borderRadius: 6 }}>{outputRatio}%</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: OUTPUT_COLOR }}>{fmt(totalOutputTokens)}</div>
                    <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: OUTPUT_COLOR, width: `${outputRatio}%`, transition: 'width 0.6s ease' }} />
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Activity size={16} color="#00d4aa" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg / Session</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(avgTokensPerSession)}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>tokens per session</div>
                </div>

                <div className="glass-card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Target size={16} color="#6c63ff" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tokens / $</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(tokensPerDollar)}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>tokens per dollar spent</div>
                </div>

                <div className="glass-card" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Gauge size={16} color="#ffb800" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sessions</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{totalSessions}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>total tracked</div>
                </div>
            </div>

            {/* Chart Row 1: Input vs Output tokens over time (full width) */}
            <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📥 Input vs Output Tokens Over Time</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Daily breakdown of prompt (input) and completion (output) token usage</p>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: INPUT_COLOR }} /><span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Input (Prompt)</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: OUTPUT_COLOR }} /><span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Output (Completion)</span></div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={usageOverTime} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={INPUT_COLOR} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={INPUT_COLOR} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={OUTPUT_COLOR} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={OUTPUT_COLOR} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmt} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="inputTokens" name="Input Tokens" stroke={INPUT_COLOR} strokeWidth={2.5} fill="url(#inputGrad)" dot={false} />
                        <Area type="monotone" dataKey="outputTokens" name="Output Tokens" stroke={OUTPUT_COLOR} strokeWidth={2.5} fill="url(#outputGrad)" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Chart Row 2: Cost over time + Tier breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, marginBottom: 24 }}>
                {/* Cost Correlation Chart */}
                <div className="glass-card" style={{ padding: 28 }}>
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>💰 Cost Correlation Over Time</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Total token volume vs actual USD cost — tracks model efficiency day-by-day</p>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={usageOverTime} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="tokenGrad2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmt} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(3)}`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area yAxisId="left" type="monotone" dataKey="tokens" name="Total Tokens" stroke="#6c63ff" strokeWidth={2} fill="url(#tokenGrad2)" dot={false} />
                            <Line yAxisId="right" type="monotone" dataKey="cost" name="Cost ($)" stroke={COST_COLOR} strokeWidth={2.5} dot={{ r: 3, fill: COST_COLOR, stroke: '#fff', strokeWidth: 1.5 }} />                        <Line yAxisId="right" type="monotone" dataKey="inputCost" name="Input Cost ($)" stroke={INPUT_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="outputCost" name="Output Cost ($)" stroke={OUTPUT_COLOR} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Tier donut */}
                <div className="glass-card" style={{ padding: 28 }}>
                    <div style={{ marginBottom: 20 }}>
                        <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>🎯 Tokens by User Tier</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Total token share across subscription plans</p>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie data={tokensByPlan} cx="50%" cy="46%" innerRadius={64} outerRadius={105} paddingAngle={4} dataKey="totalTokens" nameKey="plan"
                                label={({ cx, cy, midAngle = 0, innerRadius, outerRadius, percent = 0 }) => {
                                    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + r * Math.cos(-midAngle * Math.PI / 180);
                                    const y = cy + r * Math.sin(-midAngle * Math.PI / 180);
                                    if (percent < 0.05) return null;
                                    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 12, fontWeight: 700 }}>{`${(percent * 100).toFixed(0)}%`}</text>;
                                }}
                            >
                                {tokensByPlan.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} formatter={(v) => <span style={{ textTransform: 'capitalize', fontWeight: 600, fontSize: 12 }}>{v}</span>} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cost breakdown horizontal bars */}
            <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
                <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📊 Cost Breakdown by Plan</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>Aggregated spend per subscription tier</p>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(tokensByPlan.length * 60, 160)}>
                    <BarChart data={tokensByPlan} layout="vertical" margin={{ left: 8, right: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(4)}`} />
                        <YAxis type="category" dataKey="plan" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} width={90} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="totalCost" name="Total Cost ($)" radius={[0, 8, 8, 0]} barSize={28}>
                            {tokensByPlan.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📈 Plan-wise Breakdown</h3>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={13} /> Input · Output · Cost per tier
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Plan</th>
                            <th style={{ textAlign: 'right' }}>Input Tokens</th>
                            <th style={{ textAlign: 'right' }}>Input Cost</th>
                            <th style={{ textAlign: 'right' }}>Output Tokens</th>
                            <th style={{ textAlign: 'right' }}>Output Cost</th>
                            <th style={{ textAlign: 'right' }}>Total Cost</th>
                            <th style={{ textAlign: 'right' }}>Cost/Session</th>
                            <th style={{ textAlign: 'right' }}>Sessions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tokensByPlan.map((p: any, i: number) => {
                            const costPerSession   = p.sessionCount > 0 ? p.totalCost / p.sessionCount : 0;
                            const tPerDollar       = p.totalCost > 0 ? Math.round(p.totalTokens / p.totalCost) : 0;
                            const planShare        = totalTokens > 0 ? ((p.totalTokens / totalTokens) * 100).toFixed(1) : '0';
                            const inPct            = p.totalTokens > 0 ? ((p.totalInputTokens || 0) / p.totalTokens * 100).toFixed(0) : '0';
                            const outPct           = p.totalTokens > 0 ? ((p.totalOutputTokens || 0) / p.totalTokens * 100).toFixed(0) : '0';
                            return (
                                <tr key={i} style={{ borderLeft: `3px solid ${COLORS[i % COLORS.length]}` }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${COLORS[i % COLORS.length]}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${COLORS[i % COLORS.length]}` }}>
                                                <span style={{ fontSize: 12, fontWeight: 700 }}>{p.plan?.charAt(0)?.toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: 13 }}>{p.plan}</div>
                                                <div style={{ fontSize: 10, color: '#64748b' }}>{planShare}% of total</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: INPUT_COLOR }}>{fmt(p.totalInputTokens || 0)}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>{inPct}%</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: INPUT_COLOR }}>${(p.totalInputCost || 0).toFixed(5)}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>{p.totalCost > 0 ? ((p.totalInputCost || 0) / p.totalCost * 100).toFixed(0) : 0}%</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: OUTPUT_COLOR }}>{fmt(p.totalOutputTokens || 0)}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>{outPct}%</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700, color: OUTPUT_COLOR }}>${(p.totalOutputCost || 0).toFixed(5)}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>{p.totalCost > 0 ? ((p.totalOutputCost || 0) / p.totalCost * 100).toFixed(0) : 0}%</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ color: COST_COLOR, fontWeight: 700 }}>${p.totalCost.toFixed(4)}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ color: '#ffb800', fontWeight: 600 }}>${costPerSession.toFixed(5)}</span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className="badge badge-purple" style={{ fontSize: 12, padding: '4px 10px' }}>{p.sessionCount}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: 'rgba(108,99,255,0.06)', fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                            <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={14} color="#6c63ff" />TOTAL</div></td>
                            <td style={{ textAlign: 'right', color: INPUT_COLOR }}>{fmt(totalInputTokens)}</td>
                            <td style={{ textAlign: 'right', color: INPUT_COLOR, fontWeight: 800 }}>${totalInputCost.toFixed(5)}</td>
                            <td style={{ textAlign: 'right', color: OUTPUT_COLOR }}>{fmt(totalOutputTokens)}</td>
                            <td style={{ textAlign: 'right', color: OUTPUT_COLOR, fontWeight: 800 }}>${totalOutputCost.toFixed(5)}</td>
                            <td style={{ textAlign: 'right', color: COST_COLOR, fontWeight: 700 }}>${totalAICost.toFixed(4)}</td>
                            <td style={{ textAlign: 'right', color: '#ffb800' }}>${avgCostPerSession.toFixed(5)}</td>
                            <td style={{ textAlign: 'right', color: '#6c63ff' }}>{totalSessions}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

