'use client';
import React, { useEffect, useState } from 'react';
import {
    Users,
    Briefcase,
    FileText,
    DollarSign,
    Activity,
    UserPlus,
    TrendingUp,
    Zap,
    Eye,
    Clock,
    Globe,
    Monitor,
    Smartphone,
    ArrowUpRight,
    ArrowDownRight,
    CreditCard,
    IndianRupee,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { analyticsApi, paymentsApi } from '../lib/api';

const PIE_COLORS = ['#6c63ff', '#00d4aa', '#ffa726', '#ef5350', '#3b82f6', '#f472b6'];

interface DashboardData {
    overview: {
        totalUsers: number;
        totalInterviews: number;
        totalResumes: number;
        totalRevenue: number;
        activeSessions: number;
        growth: { newUsersLast7Days: number; conversionRate: string | number };
    };
    activityChart: { date: string; sessions: number; userCount: number }[];
    userMetrics: { roles: Record<string, number> };
    contentMetrics: { popularTopics: { topic: string; count: number }[]; totalResumes: number };
    trafficMetrics: {
        sources: { source: string; count: number }[];
        devices: Record<string, number>;
    };
}

function StatCard({
    icon,
    label,
    value,
    change,
    positive,
    color,
    delay,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    change?: string;
    positive?: boolean;
    color: string;
    delay: number;
}) {
    return (
        <div
            className={`glass-card stat-card ${color} animate-fadeIn`}
            style={{ padding: '20px 24px', animationDelay: `${delay}ms` }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div
                        style={{
                            fontSize: 13,
                            color: 'var(--muted-foreground)',
                            fontWeight: 500,
                            marginBottom: 8,
                        }}
                    >
                        {label}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
                    {change && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                marginTop: 6,
                                color: positive ? '#4ade80' : '#f87171',
                            }}
                        >
                            {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                            {change}
                        </div>
                    )}
                </div>
                <div
                    style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `rgba(108, 99, 255, 0.1)`,
                    }}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: 'rgba(17, 25, 40, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '12px 16px',
                fontSize: 13,
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
            {payload.map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                    <span style={{ color: 'var(--muted-foreground)' }}>{p.name}:</span>
                    <span style={{ fontWeight: 600 }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            analyticsApi.getDashboardStats(),
            paymentsApi.getAnalytics().catch(() => null),
        ])
            .then(([dashData, pmtData]) => {
                setData(dashData);
                setPaymentData(pmtData);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ padding: 32 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 120 }} />
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 24 }}>
                    <div className="skeleton" style={{ height: 340 }} />
                    <div className="skeleton" style={{ height: 340 }} />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                <p>Failed to load dashboard data. Make sure the backend is running on port 3000.</p>
            </div>
        );
    }

    const { overview, activityChart, userMetrics, contentMetrics, trafficMetrics } = data;

    const deviceData = Object.entries(trafficMetrics?.devices || {}).map(([name, value]) => ({
        name: name || 'Desktop',
        value,
    }));

    const sourceData = (trafficMetrics?.sources || []).map((s) => ({
        name: s.source || 'Direct',
        count: s.count,
    }));

    return (
        <div style={{ padding: '24px 32px' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }} className="animate-fadeIn">
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>
                    Welcome back, <span className="gradient-text">Admin</span>
                </h1>
                <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4 }}>
                    Here&apos;s what&apos;s happening with your platform today
                </p>
            </div>

            {/* Stat Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                }}
            >
                <StatCard
                    icon={<Users size={22} color="#6c63ff" />}
                    label="Total Users"
                    value={overview.totalUsers?.toLocaleString() || '0'}
                    change={`+${overview.growth?.newUsersLast7Days || 0} this week`}
                    positive
                    color="purple"
                    delay={0}
                />
                <StatCard
                    icon={<Briefcase size={22} color="#00d4aa" />}
                    label="Total Interviews"
                    value={overview.totalInterviews?.toLocaleString() || '0'}
                    color="teal"
                    delay={50}
                />
                <StatCard
                    icon={<FileText size={22} color="#ffa726" />}
                    label="Resumes Uploaded"
                    value={overview.totalResumes?.toLocaleString() || '0'}
                    color="amber"
                    delay={100}
                />
                <StatCard
                    icon={<IndianRupee size={22} color="#4ade80" />}
                    label="Total Revenue"
                    value={`₹${(paymentData?.totalRevenue || overview.totalRevenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    color="green"
                    delay={150}
                />
                <StatCard
                    icon={<Activity size={22} color="#3b82f6" />}
                    label="Active Sessions"
                    value={overview.activeSessions || 0}
                    color="blue"
                    delay={200}
                />
                <StatCard
                    icon={<TrendingUp size={22} color="#f472b6" />}
                    label="Conversion Rate"
                    value={`${overview.growth?.conversionRate || 0}%`}
                    color="rose"
                    delay={250}
                />
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
                {/* Activity Chart */}
                <div className="glass-card animate-fadeIn" style={{ padding: 24, animationDelay: '300ms' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                        <Zap size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                        Activity (Last 7 Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={activityChart || []}>
                            <defs>
                                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                                tickLine={false}
                                tickFormatter={(v) => {
                                    const d = new Date(v);
                                    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
                                }}
                            />
                            <YAxis
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="sessions"
                                stroke="#6c63ff"
                                fill="url(#colorSessions)"
                                strokeWidth={2}
                                name="Sessions"
                            />
                            <Area
                                type="monotone"
                                dataKey="userCount"
                                stroke="#00d4aa"
                                fill="url(#colorUsers)"
                                strokeWidth={2}
                                name="Users"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Device Breakdown Pie */}
                <div className="glass-card animate-fadeIn" style={{ padding: 24, animationDelay: '350ms' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                        <Monitor size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                        Devices
                    </h3>
                    {deviceData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={deviceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {deviceData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: 16,
                                    flexWrap: 'wrap',
                                    marginTop: 8,
                                }}
                            >
                                {deviceData.map((d, i) => (
                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                        <div
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                background: PIE_COLORS[i % PIE_COLORS.length],
                                            }}
                                        />
                                        <span style={{ color: 'var(--muted-foreground)' }}>{d.name}</span>
                                        <span style={{ fontWeight: 600 }}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: 200,
                                color: 'var(--muted-foreground)',
                                fontSize: 14,
                            }}
                        >
                            No device data yet
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                {/* Popular Topics */}
                <div className="glass-card animate-fadeIn" style={{ padding: 24, animationDelay: '400ms' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                        <Briefcase size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                        Popular Interview Topics
                    </h3>
                    {(contentMetrics?.popularTopics || []).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {contentMetrics.popularTopics.slice(0, 5).map((topic, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span style={{ fontSize: 13, color: 'var(--foreground)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {topic.topic || 'General'}
                                    </span>
                                    <span className="badge badge-purple">{topic.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>No interview data yet</p>
                    )}
                </div>

                {/* Traffic Sources */}
                <div className="glass-card animate-fadeIn" style={{ padding: 24, animationDelay: '450ms' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                        <Globe size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                        Traffic Sources
                    </h3>
                    {sourceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={sourceData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={80}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" fill="#6c63ff" radius={[0, 6, 6, 0]} barSize={20} name="Visits" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>No traffic data yet</p>
                    )}
                </div>
            </div>

            {/* Recent Payments */}
            <div className="glass-card animate-fadeIn" style={{ padding: 24, animationDelay: '500ms' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                        <CreditCard size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                        Recent Payments
                    </h3>
                    {paymentData?.statusBreakdown && (
                        <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                            <span style={{ color: '#4ade80', fontWeight: 600 }}>
                                <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                {paymentData.statusBreakdown.paid || 0} Paid
                            </span>
                            <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>
                                {paymentData.statusBreakdown.created || 0} Pending
                            </span>
                            {(paymentData.statusBreakdown.failed || 0) > 0 && (
                                <span style={{ color: '#f87171', fontWeight: 600 }}>
                                    <XCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                    {paymentData.statusBreakdown.failed} Failed
                                </span>
                            )}
                        </div>
                    )}
                </div>
                {paymentData?.recentPayments && paymentData.recentPayments.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paymentData.recentPayments.map((p: any) => (
                                    <tr key={p._id}>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.userId?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{p.userId?.email || '—'}</div>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{p.description || '—'}</td>
                                        <td style={{ fontWeight: 700, fontSize: 14, color: '#4ade80' }}>
                                            {p.currency === 'USD' ? '$' : '₹'}{(p.amount / 100).toLocaleString('en-IN')}
                                        </td>
                                        <td>
                                            <span className="badge" style={{
                                                background: 'rgba(108,99,255,0.1)',
                                                color: '#a5b4fc',
                                                textTransform: 'capitalize',
                                            }}>
                                                {p.method || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${p.status === 'paid' ? 'badge-green' : p.status === 'failed' ? 'badge-red' : 'badge-amber'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                                            {new Date(p.createdAt).toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                            <br />
                                            <span style={{ fontSize: 11 }}>
                                                {new Date(p.createdAt).toLocaleTimeString('en-IN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
                        No payment data yet
                    </p>
                )}
            </div>
        </div>
    );
}
