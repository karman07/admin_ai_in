'use client';
import React, { useEffect, useState } from 'react';
import {
    Cpu,
    Zap,
    DollarSign,
    TrendingUp,
    BarChart3,
    ArrowUpRight,
    Info,
    RefreshCw,
    Activity,
    Target,
    Gauge,
    Sparkles
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
    ComposedChart
} from 'recharts';
import { analyticsApi, API_BASE } from '../lib/api';

const COLORS = ['#6c63ff', '#00d4aa', '#ffb800', '#ff4d4d'];

function CustomTooltip({ active, payload, label, prefix = '' }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card" style={{ padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.9)', borderRadius: 12 }}>
            <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: 4 }}>{label}</div>
            {payload.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>{p.name}:</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{prefix}{p.value.toLocaleString()}</span>
                </div>
            ))}
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

        // Real-time synchronization for token usage and costs
        import('socket.io-client').then(({ io }) => {
            const socket = io(`${API_BASE}/analytics`, {
                transports: ['websocket'],
                reconnection: true,
                query: { isAdmin: 'true' }
            });

            socket.on('aiUsageUpdated', (newStats) => {
                console.log('🔄 Real-time AI Usage Update Received');
                setStats(newStats);
            });

            return () => {
                socket.disconnect();
            };
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
    const EXCHANGE_RATE = 83; // 1 USD = 83 INR (Approximate)
    const totalRevenue = totalRevenueInr / EXCHANGE_RATE;
    const profit = totalRevenue - totalAICost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    // Calculate additional metrics
    const totalTokens = tokensByPlan.reduce((acc: number, curr: any) => acc + curr.totalTokens, 0);
    const totalSessions = tokensByPlan.reduce((acc: number, curr: any) => acc + curr.sessionCount, 0);
    const avgTokensPerSession = totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0;
    const avgCostPerSession = totalSessions > 0 ? totalAICost / totalSessions : 0;
    const tokensPerDollar = totalAICost > 0 ? Math.round(totalTokens / totalAICost) : 0;

    return (
        <div style={{ padding: '24px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Cpu size={32} color="#6c63ff" />
                        AI Token Intelligence
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: 4 }}>Monitor AI consumption, costs, and profit margins</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0, 212, 170, 0.1)', padding: '6px 12px', borderRadius: 20, border: '1px solid rgba(0, 212, 170, 0.2)' }}>
                        <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4aa' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#00d4aa' }}>LIVE SYNC</span>
                    </div>
                    <button className="btn-secondary" onClick={fetchData} style={{ borderRadius: 12 }}>
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            </div>

            {/* Metrics Grid - Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
                <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(108, 99, 255, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div className="icon-box" style={{ background: 'rgba(108, 99, 255, 0.1)', padding: 10, borderRadius: 12 }}>
                            <Zap size={24} color="#6c63ff" />
                        </div>
                        <div style={{ color: '#00d4aa', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={14} /> Active
                        </div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Total Tokens Consumed</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        {totalTokens.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: '#6c63ff', marginTop: 8, fontWeight: 600 }}>
                        Across {totalSessions} sessions
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <div className="icon-box" style={{ background: 'rgba(255, 184, 0, 0.1)', padding: 10, borderRadius: 12, width: 'fit-content', marginBottom: 16 }}>
                        <DollarSign size={24} color="#ffb800" />
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Total AI Cost</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: '#ff4d4d' }}>
                        ${totalAICost.toFixed(4)}
                    </div>
                    <div style={{ fontSize: 11, color: '#ff4d4d', marginTop: 8, fontWeight: 600 }}>
                        ${avgCostPerSession.toFixed(4)} per session
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <div className="icon-box" style={{ background: 'rgba(0, 212, 170, 0.1)', padding: 10, borderRadius: 12, width: 'fit-content', marginBottom: 16 }}>
                        <ArrowUpRight size={24} color="#00d4aa" />
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Recovered Revenue</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>
                        ${totalRevenue.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: '#00d4aa', marginTop: 8, fontWeight: 600 }}>
                        Net Profit: ${profit.toFixed(2)}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 24, background: margin > 0 ? 'rgba(0, 212, 170, 0.05)' : 'rgba(255, 77, 77, 0.05)' }}>
                    <div className="icon-box" style={{ background: margin > 0 ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 77, 77, 0.1)', padding: 10, borderRadius: 12, width: 'fit-content', marginBottom: 16 }}>
                        <BarChart3 size={24} color={margin > 0 ? '#00d4aa' : '#ff4d4d'} />
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 14, fontWeight: 500 }}>Profit Margin</div>
                    <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: margin > 0 ? '#00d4aa' : '#ff4d4d' }}>
                        {margin.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: margin > 0 ? '#00d4aa' : '#ff4d4d', marginTop: 8, fontWeight: 600 }}>
                        {margin > 0 ? 'Profitable' : 'Loss Making'}
                    </div>
                </div>
            </div>

            {/* Metrics Grid - Row 2 (Efficiency Metrics) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(0, 212, 170, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="icon-box" style={{ background: 'rgba(0, 212, 170, 0.1)', padding: 8, borderRadius: 10 }}>
                            <Activity size={20} color="#00d4aa" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>Avg Tokens/Session</div>
                            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{avgTokensPerSession.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="icon-box" style={{ background: 'rgba(108, 99, 255, 0.1)', padding: 8, borderRadius: 10 }}>
                            <Target size={20} color="#6c63ff" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>Tokens per Dollar</div>
                            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{tokensPerDollar.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="icon-box" style={{ background: 'rgba(255, 184, 0, 0.1)', padding: 8, borderRadius: 10 }}>
                            <Gauge size={20} color="#ffb800" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>Total Sessions</div>
                            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{totalSessions}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                        📊 Token & Cost Tracking Over Time
                        <Info size={16} color="#94a3b8" />
                    </h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <ComposedChart data={usageOverTime}>
                            <defs>
                                <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                dy={10}
                            />
                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 11 }}
                            />
                            <Tooltip content={<CustomTooltip prefix="$" />} />
                            <Area
                                yAxisId="left"
                                type="monotone"
                                dataKey="tokens"
                                fill="url(#tokenGradient)"
                                stroke="#6c63ff"
                                strokeWidth={3}
                                name="Tokens"
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="cost"
                                stroke="#ff4d4d"
                                strokeWidth={3}
                                dot={{ r: 4, fill: '#ff4d4d', strokeWidth: 2, stroke: '#fff' }}
                                name="Cost ($)"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>🎯 Usage by User Tier</h3>
                    <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                            <Pie
                                data={tokensByPlan}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="totalTokens"
                                nameKey="plan"
                                label={({
                                    cx,
                                    cy,
                                    midAngle = 0,
                                    innerRadius,
                                    outerRadius,
                                    percent = 0
                                }) => {
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                    return (
                                        <text
                                            x={x}
                                            y={y}
                                            fill="white"
                                            textAnchor={x > cx ? 'start' : 'end'}
                                            dominantBaseline="central"
                                            style={{ fontSize: 13, fontWeight: 700 }}
                                        >
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                            >
                                {tokensByPlan.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                formatter={(value) => <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cost Breakdown Chart */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    💰 Cost Breakdown by Subscription Plan
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={tokensByPlan} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis 
                            type="category" 
                            dataKey="plan" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }}
                            width={100}
                        />
                        <Tooltip content={<CustomTooltip prefix="$" />} />
                        <Bar dataKey="totalCost" fill="#ff4d4d" radius={[0, 8, 8, 0]} barSize={32} name="Total Cost">
                            {tokensByPlan.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>📈 Detailed Plan-wise Breakdown</h3>
                    <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={14} />
                        Comprehensive usage analytics by subscription tier
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Subscription Plan</th>
                            <th>Total Tokens</th>
                            <th>Avg Tokens/Session</th>
                            <th>Total Cost</th>
                            <th>Cost/Session</th>
                            <th>Efficiency</th>
                            <th style={{ textAlign: 'right' }}>Sessions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tokensByPlan.map((p: any, i: number) => {
                            const avgTokens = Math.round(p.totalTokens / p.sessionCount);
                            const costPerSession = p.totalCost / p.sessionCount;
                            const planTokensPerDollar = p.totalCost > 0 ? Math.round(p.totalTokens / p.totalCost) : 0;
                            const planShare = (p.totalTokens / totalTokens) * 100;
                            
                            return (
                                <tr key={i} style={{ borderLeft: `3px solid ${COLORS[i % COLORS.length]}` }}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ 
                                                width: 32, 
                                                height: 32, 
                                                borderRadius: 8, 
                                                background: `${COLORS[i % COLORS.length]}20`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `2px solid ${COLORS[i % COLORS.length]}`
                                            }}>
                                                <span style={{ fontSize: 12, fontWeight: 700 }}>
                                                    {p.plan.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: 14 }}>{p.plan}</div>
                                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{planShare.toFixed(1)}% of total</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 15 }}>{p.totalTokens.toLocaleString()}</div>
                                        <div style={{ fontSize: 10, color: '#6c63ff', marginTop: 2 }}>tokens</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{avgTokens.toLocaleString()}</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>per session</div>
                                    </td>
                                    <td>
                                        <span style={{ color: '#ff4d4d', fontWeight: 700, fontSize: 15 }}>
                                            ${p.totalCost.toFixed(4)}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ color: '#ffb800', fontWeight: 600 }}>
                                            ${costPerSession.toFixed(5)}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ 
                                            display: 'inline-block',
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            background: 'rgba(0, 212, 170, 0.1)',
                                            color: '#00d4aa',
                                            fontWeight: 700,
                                            fontSize: 12
                                        }}>
                                            {planTokensPerDollar.toLocaleString()} T/$
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span className="badge badge-purple" style={{ fontSize: 13, padding: '6px 14px' }}>
                                            {p.sessionCount}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: 'rgba(108, 99, 255, 0.05)', fontWeight: 700, borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                            <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap size={16} color="#6c63ff" />
                                    TOTAL
                                </div>
                            </td>
                            <td>
                                <div style={{ fontWeight: 700, fontSize: 15, color: '#6c63ff' }}>
                                    {totalTokens.toLocaleString()}
                                </div>
                            </td>
                            <td>
                                <div style={{ fontWeight: 700 }}>
                                    {avgTokensPerSession.toLocaleString()}
                                </div>
                            </td>
                            <td>
                                <span style={{ color: '#ff4d4d', fontWeight: 700, fontSize: 15 }}>
                                    ${totalAICost.toFixed(4)}
                                </span>
                            </td>
                            <td>
                                <span style={{ color: '#ffb800', fontWeight: 700 }}>
                                    ${avgCostPerSession.toFixed(5)}
                                </span>
                            </td>
                            <td>
                                <div style={{ 
                                    display: 'inline-block',
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    background: 'rgba(0, 212, 170, 0.15)',
                                    color: '#00d4aa',
                                    fontWeight: 700,
                                    fontSize: 12
                                }}>
                                    {tokensPerDollar.toLocaleString()} T/$
                                </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 15, color: '#6c63ff' }}>
                                    {totalSessions}
                                </span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
