'use client';
import React, { useEffect, useState } from 'react';
import {
    Users,
    RefreshCw,
    Search,
    Crown,
    CreditCard,
    Mail,
    Calendar,
    Clock,
    Shield,
    User,
    FileText,
    Briefcase,
    CheckCircle2,
    XCircle,
    Filter,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from 'lucide-react';
import { usersApi, API_BASE } from '../lib/api';

interface UserData {
    _id: string;
    name: string;
    email: string;
    role: string;
    company?: string;
    industry?: string;
    isEmailVerified: boolean;
    profileImageUrl?: string;
    bio?: string;
    location?: string;
    experienceLevel?: string;
    skills?: string[];
    subscriptionPlan?: {
        _id: string;
        name: string;
        displayName: string;
        price: number;
        currency: string;
        type: string;
        features?: { name: string; enabled: boolean; limit?: number; unit?: string }[];
    };
    subscriptionStatus?: string;
    subscriptionExpiry?: string;
    razorpaySubscriptionId?: string;
    resumeCount: number;
    interviewCount: number;
    googleId?: string;
    createdAt?: string;
    updatedAt?: string;
}

function timeAgo(date: string) {
    const now = new Date();
    const past = new Date(date);
    const diff = (now.getTime() - past.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
}

function getStatusColor(status?: string) {
    switch (status) {
        case 'active':
            return { bg: 'rgba(74,222,128,0.1)', color: '#4ade80', border: 'rgba(74,222,128,0.2)' };
        case 'expired':
            return { bg: 'rgba(248,113,113,0.1)', color: '#f87171', border: 'rgba(248,113,113,0.2)' };
        case 'trial':
            return { bg: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: 'rgba(96,165,250,0.2)' };
        case 'free':
        default:
            return { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.2)' };
    }
}

function formatPrice(priceInPaisa: number, currency: string) {
    const amount = priceInPaisa / 100;
    return currency === 'INR' ? `₹${amount.toLocaleString()}` : `$${amount.toLocaleString()}`;
}

export default function UsersPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [sortField, setSortField] = useState<'createdAt' | 'name' | 'subscriptionStatus'>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await usersApi.getAll();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter and sort
    const filtered = users
        .filter((u) => {
            const matchSearch =
                u.name?.toLowerCase().includes(search.toLowerCase()) ||
                u.email?.toLowerCase().includes(search.toLowerCase()) ||
                u.company?.toLowerCase().includes(search.toLowerCase()) ||
                u.location?.toLowerCase().includes(search.toLowerCase());
            const matchStatus = statusFilter === 'all' || u.subscriptionStatus === statusFilter;
            return matchSearch && matchStatus;
        })
        .sort((a, b) => {
            let cmp = 0;
            if (sortField === 'createdAt') {
                cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            } else if (sortField === 'name') {
                cmp = (a.name || '').localeCompare(b.name || '');
            } else if (sortField === 'subscriptionStatus') {
                const order = { active: 0, trial: 1, free: 2, expired: 3 };
                cmp =
                    (order[a.subscriptionStatus as keyof typeof order] ?? 4) -
                    (order[b.subscriptionStatus as keyof typeof order] ?? 4);
            }
            return sortDir === 'desc' ? -cmp : cmp;
        });

    // Stats
    const stats = {
        total: users.length,
        subscribed: users.filter((u) => u.subscriptionStatus === 'active').length,
        free: users.filter((u) => u.subscriptionStatus === 'free' || !u.subscriptionStatus).length,
        expired: users.filter((u) => u.subscriptionStatus === 'expired').length,
        trial: users.filter((u) => u.subscriptionStatus === 'trial').length,
        verified: users.filter((u) => u.isEmailVerified).length,
        admins: users.filter((u) => u.role === 'admin').length,
    };

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    return (
        <div style={{ padding: '24px 32px' }}>
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 28,
                }}
                className="animate-fadeIn"
            >
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800 }}>
                        <Users
                            size={28}
                            style={{
                                display: 'inline',
                                marginRight: 10,
                                verticalAlign: 'middle',
                                color: '#6c63ff',
                            }}
                        />
                        Users
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 14, marginTop: 4 }}>
                        Manage platform users and their subscriptions
                    </p>
                </div>
                <button className="btn-secondary" onClick={fetchData}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Stats Row */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 12,
                    marginBottom: 24,
                }}
            >
                {[
                    { label: 'Total Users', value: stats.total, icon: <Users size={18} color="#6c63ff" />, color: 'purple' },
                    {
                        label: 'Subscribed',
                        value: stats.subscribed,
                        icon: <Crown size={18} color="#4ade80" />,
                        color: 'green',
                    },
                    { label: 'Free Tier', value: stats.free, icon: <User size={18} color="#94a3b8" />, color: 'gray' },
                    {
                        label: 'Expired',
                        value: stats.expired,
                        icon: <Clock size={18} color="#f87171" />,
                        color: 'red',
                    },
                    { label: 'Trial', value: stats.trial, icon: <CreditCard size={18} color="#60a5fa" />, color: 'blue' },
                    {
                        label: 'Verified',
                        value: stats.verified,
                        icon: <CheckCircle2 size={18} color="#00d4aa" />,
                        color: 'teal',
                    },
                    { label: 'Admins', value: stats.admins, icon: <Shield size={18} color="#ffa726" />, color: 'amber' },
                ].map((stat, i) => (
                    <div
                        key={stat.label}
                        className="glass-card animate-fadeIn"
                        style={{
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            animationDelay: `${i * 40}ms`,
                        }}
                    >
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'rgba(108,99,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {stat.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>{stat.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div
                style={{
                    display: 'flex',
                    gap: 12,
                    marginBottom: 20,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--muted-foreground)',
                        }}
                    />
                    <input
                        className="form-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, company..."
                        style={{ paddingLeft: 36, width: '100%' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Subscribed' },
                        { value: 'free', label: 'Free' },
                        { value: 'expired', label: 'Expired' },
                        { value: 'trial', label: 'Trial' },
                    ].map((f) => (
                        <button
                            key={f.value}
                            className={`tab-btn ${statusFilter === f.value ? 'active' : ''}`}
                            onClick={() => setStatusFilter(f.value)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results count */}
            <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 12 }}>
                Showing {filtered.length} of {users.length} users
            </div>

            {/* Users Table */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 64 }} />
                    ))}
                </div>
            ) : (
                <div className="glass-card animate-fadeIn" style={{ overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => toggleSort('subscriptionStatus')}
                                >
                                    Subscription{' '}
                                    {sortField === 'subscriptionStatus' &&
                                        (sortDir === 'asc' ? <ChevronUp size={12} style={{ display: 'inline' }} /> : <ChevronDown size={12} style={{ display: 'inline' }} />)}
                                </th>
                                <th>Plan</th>
                                <th>Expiry</th>
                                <th>Usage</th>
                                <th
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => toggleSort('createdAt')}
                                >
                                    Joined{' '}
                                    {sortField === 'createdAt' &&
                                        (sortDir === 'asc' ? <ChevronUp size={12} style={{ display: 'inline' }} /> : <ChevronDown size={12} style={{ display: 'inline' }} />)}
                                </th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((u) => {
                                const sc = getStatusColor(u.subscriptionStatus);
                                const isExpanded = expandedUser === u._id;
                                return (
                                    <React.Fragment key={u._id}>
                                        <tr
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setExpandedUser(isExpanded ? null : u._id)}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            borderRadius: 10,
                                                            background: u.profileImageUrl
                                                                ? `url(${u.profileImageUrl.startsWith('/') ? API_BASE : ''}${u.profileImageUrl}) center/cover`
                                                                : 'linear-gradient(135deg, #6c63ff, #00d4aa)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            flexShrink: 0,
                                                            fontSize: 14,
                                                            fontWeight: 700,
                                                            color: 'white',
                                                        }}
                                                    >
                                                        {!u.profileImageUrl && (u.name?.charAt(0)?.toUpperCase() || '?')}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            {u.name}
                                                            {u.role === 'admin' && (
                                                                <Shield
                                                                    size={12}
                                                                    style={{
                                                                        color: '#ffa726',
                                                                    }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: 12,
                                                                color: 'var(--muted-foreground)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 4,
                                                            }}
                                                        >
                                                            <Mail size={10} /> {u.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        padding: '4px 10px',
                                                        borderRadius: 20,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        background: sc.bg,
                                                        color: sc.color,
                                                        border: `1px solid ${sc.border}`,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            background: sc.color,
                                                        }}
                                                    />
                                                    {u.subscriptionStatus || 'free'}
                                                </span>
                                            </td>
                                            <td>
                                                {u.subscriptionPlan ? (
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                            {u.subscriptionPlan.displayName || u.subscriptionPlan.name}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                                                            {formatPrice(u.subscriptionPlan.price, u.subscriptionPlan.currency)} /{' '}
                                                            {u.subscriptionPlan.type === 'monthly' ? 'mo' : u.subscriptionPlan.type}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                {u.subscriptionExpiry ? (
                                                    <div>
                                                        <div style={{ fontSize: 13 }}>
                                                            {new Date(u.subscriptionExpiry).toLocaleDateString()}
                                                        </div>
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color:
                                                                    new Date(u.subscriptionExpiry) < new Date()
                                                                        ? '#f87171'
                                                                        : 'var(--muted-foreground)',
                                                            }}
                                                        >
                                                            {new Date(u.subscriptionExpiry) < new Date()
                                                                ? 'Expired'
                                                                : `${Math.ceil(
                                                                    (new Date(u.subscriptionExpiry).getTime() - Date.now()) /
                                                                    86400000
                                                                )} days left`}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <Briefcase size={12} color="var(--muted-foreground)" />
                                                        <span style={{ fontWeight: 600 }}>{u.interviewCount}</span>
                                                    </span>
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <FileText size={12} color="var(--muted-foreground)" />
                                                        <span style={{ fontWeight: 600 }}>{u.resumeCount}</span>
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <div style={{ fontSize: 13 }}>
                                                        {u.createdAt
                                                            ? new Date(u.createdAt).toLocaleDateString()
                                                            : '—'}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                                                        {u.createdAt ? timeAgo(u.createdAt) : ''}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {u.isEmailVerified ? (
                                                        <CheckCircle2 size={16} color="#4ade80" />
                                                    ) : (
                                                        <XCircle size={16} color="#f87171" />
                                                    )}
                                                    {u.googleId && (
                                                        <span
                                                            style={{
                                                                fontSize: 10,
                                                                padding: '2px 6px',
                                                                borderRadius: 6,
                                                                background: 'rgba(66,133,244,0.1)',
                                                                color: '#60a5fa',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            G
                                                        </span>
                                                    )}
                                                    {isExpanded ? (
                                                        <ChevronUp size={14} color="var(--muted-foreground)" />
                                                    ) : (
                                                        <ChevronDown size={14} color="var(--muted-foreground)" />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} style={{ padding: 0 }}>
                                                    <div
                                                        style={{
                                                            padding: '16px 24px',
                                                            background: 'rgba(30,41,59,0.4)',
                                                            borderTop: '1px solid var(--card-border)',
                                                            display: 'grid',
                                                            gridTemplateColumns: '1fr 1fr 1fr',
                                                            gap: 20,
                                                        }}
                                                    >
                                                        {/* Personal Info */}
                                                        <div>
                                                            <div
                                                                style={{
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    color: 'var(--muted-foreground)',
                                                                    marginBottom: 10,
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.05em',
                                                                }}
                                                            >
                                                                Personal Info
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Company: </span>
                                                                    <span style={{ fontWeight: 600 }}>{u.company || '—'}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Industry: </span>
                                                                    <span style={{ fontWeight: 600 }}>{u.industry || '—'}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Location: </span>
                                                                    <span style={{ fontWeight: 600 }}>{u.location || '—'}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Experience: </span>
                                                                    <span style={{ fontWeight: 600 }}>{u.experienceLevel || '—'}</span>
                                                                </div>
                                                                {u.bio && (
                                                                    <div>
                                                                        <span style={{ color: 'var(--muted-foreground)' }}>Bio: </span>
                                                                        <span>{u.bio}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Subscription Details */}
                                                        <div>
                                                            <div
                                                                style={{
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    color: 'var(--muted-foreground)',
                                                                    marginBottom: 10,
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.05em',
                                                                }}
                                                            >
                                                                Subscription Details
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Plan: </span>
                                                                    <span style={{ fontWeight: 600 }}>
                                                                        {u.subscriptionPlan?.displayName || u.subscriptionPlan?.name || 'None'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Status: </span>
                                                                    <span
                                                                        style={{
                                                                            fontWeight: 600,
                                                                            color: getStatusColor(u.subscriptionStatus).color,
                                                                        }}
                                                                    >
                                                                        {u.subscriptionStatus || 'free'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Price: </span>
                                                                    <span style={{ fontWeight: 600 }}>
                                                                        {u.subscriptionPlan
                                                                            ? `${formatPrice(u.subscriptionPlan.price, u.subscriptionPlan.currency)}/${u.subscriptionPlan.type}`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Expires: </span>
                                                                    <span style={{ fontWeight: 600 }}>
                                                                        {u.subscriptionExpiry
                                                                            ? new Date(u.subscriptionExpiry).toLocaleDateString('en', {
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: 'numeric',
                                                                            })
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                {u.razorpaySubscriptionId && (
                                                                    <div>
                                                                        <span style={{ color: 'var(--muted-foreground)' }}>Razorpay: </span>
                                                                        <span
                                                                            style={{
                                                                                fontFamily: 'var(--font-mono)',
                                                                                fontSize: 11,
                                                                                background: 'rgba(108,99,255,0.08)',
                                                                                padding: '2px 6px',
                                                                                borderRadius: 4,
                                                                            }}
                                                                        >
                                                                            {u.razorpaySubscriptionId}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {u.subscriptionPlan?.features && u.subscriptionPlan.features.length > 0 && (
                                                                    <div style={{ marginTop: 4 }}>
                                                                        <span style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>Features:</span>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                                                                            {u.subscriptionPlan.features.filter(f => f.enabled).map((f, i) => (
                                                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                                                                    <div
                                                                                        style={{
                                                                                            width: 5,
                                                                                            height: 5,
                                                                                            borderRadius: '50%',
                                                                                            background: '#4ade80',
                                                                                        }}
                                                                                    />
                                                                                    <span>{f.name}</span>
                                                                                    {f.limit && <span style={{ color: 'var(--muted-foreground)' }}>({f.limit} {f.unit || ''})</span>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Activity & Links */}
                                                        <div>
                                                            <div
                                                                style={{
                                                                    fontSize: 12,
                                                                    fontWeight: 700,
                                                                    color: 'var(--muted-foreground)',
                                                                    marginBottom: 10,
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: '0.05em',
                                                                }}
                                                            >
                                                                Activity & Links
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Interviews: </span>
                                                                    <span style={{ fontWeight: 600 }}>{u.interviewCount}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Resumes: </span>
                                                                    <span style={{ fontWeight: 600 }}>{u.resumeCount}</span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Role: </span>
                                                                    <span
                                                                        style={{
                                                                            fontWeight: 600,
                                                                            color: u.role === 'admin' ? '#ffa726' : 'var(--foreground)',
                                                                        }}
                                                                    >
                                                                        {u.role}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Login: </span>
                                                                    <span style={{ fontWeight: 600 }}>
                                                                        {u.googleId ? 'Google' : 'Email/Password'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Email verified: </span>
                                                                    <span style={{ fontWeight: 600, color: u.isEmailVerified ? '#4ade80' : '#f87171' }}>
                                                                        {u.isEmailVerified ? 'Yes' : 'No'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ color: 'var(--muted-foreground)' }}>Joined: </span>
                                                                    <span style={{ fontWeight: 600 }}>
                                                                        {u.createdAt
                                                                            ? new Date(u.createdAt).toLocaleDateString('en', {
                                                                                year: 'numeric',
                                                                                month: 'long',
                                                                                day: 'numeric',
                                                                            })
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                {(u.skills || []).length > 0 && (
                                                                    <div>
                                                                        <span style={{ color: 'var(--muted-foreground)', display: 'block', marginBottom: 4 }}>Skills:</span>
                                                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                                            {u.skills!.slice(0, 8).map((s, i) => (
                                                                                <span
                                                                                    key={i}
                                                                                    className="badge badge-purple"
                                                                                    style={{ fontSize: 10, padding: '2px 8px' }}
                                                                                >
                                                                                    {s}
                                                                                </span>
                                                                            ))}
                                                                            {u.skills!.length > 8 && (
                                                                                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                                                                                    +{u.skills!.length - 8} more
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: 40 }}
                                    >
                                        {search || statusFilter !== 'all'
                                            ? 'No users match your filters'
                                            : 'No users found'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
