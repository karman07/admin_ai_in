'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    CreditCard, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
    X, RefreshCw, Save, ChevronRight,
} from 'lucide-react';
import { subscriptionsApi } from '../lib/api';

interface Feature {
    name: string;
    description: string;
    type: string;
    value: any;
    enabled: boolean;
    limit?: number;
    unit?: string;
}

interface Subscription {
    id: string;   // API response field
    _id?: string; // legacy / fallback
    name: string;
    displayName: string;
    description: string;
    price: number;
    currency: string;
    type: string;
    duration: number;
    status: string;
    order: number;
    popularBadge: boolean;
    discountPercentage: number;
    originalPrice: number;
    colorScheme: string;
    country: string;
    features: Feature[];
    tags: string[];
    razorpayPlanId?: string;
}

// Known numeric limits rendered with dedicated slider UI
const KNOWN_LIMITS = [
    { name: 'Interview Limit', unit: 'interviews', icon: '🎤', defaultVal: 3, max: 50 },
    { name: 'Resume Limit',    unit: 'resumes',    icon: '📄', defaultVal: 5, max: 100 },
];

const TABS = ['Details', 'Pricing', 'Limits', 'Features'] as const;
type Tab = typeof TABS[number];

const emptyForm: Partial<Subscription> = {
    name: '', displayName: '', description: '',
    price: 0, currency: 'INR', type: 'monthly', duration: 30,
    status: 'draft', order: 0, popularBadge: false,
    discountPercentage: 0, originalPrice: 0,
    colorScheme: '#6c63ff', country: 'IN',
    features: [], tags: [],
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </label>
            {children}
        </div>
    );
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubs] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Subscription>>(emptyForm);
    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState<Tab>('Details');
    const [featureForm, setFeatureForm] = useState({ name: '', description: '', type: 'boolean', value: '' as any, enabled: true, unit: '' });
    const [tagInput, setTagInput] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await subscriptionsApi.getAll();
            setSubs(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const openCreate = () => {
        setEditId(null);
        setForm({ ...emptyForm, features: [], tags: [] });
        setActiveTab('Details');
        setShowModal(true);
    };

    const openEdit = (sub: Subscription) => {
        const resolvedId = sub.id || sub._id || null;
        setEditId(resolvedId);
        setForm({
            name: sub.name,
            displayName: sub.displayName,
            description: sub.description,
            // API returns prices in paisa; backend create/update expects rupees — divide to convert
            price: sub.price / 100,
            originalPrice: sub.originalPrice ? sub.originalPrice / 100 : 0,
            currency: sub.currency,
            type: sub.type,
            duration: sub.duration,
            status: sub.status,
            order: sub.order,
            popularBadge: sub.popularBadge,
            discountPercentage: sub.discountPercentage,
            colorScheme: sub.colorScheme,
            country: sub.country,
            features: [...(sub.features || [])],
            tags: [...(sub.tags || [])],
        });
        setActiveTab('Details');
        setShowModal(true);
    };

    const handleSave = async () => {
        setSaving(true);
        // Strip API-only fields before sending to backend
        const { ...payload } = form as any;
        delete payload.id;
        delete payload._id;
        delete payload.formattedPrice;
        delete payload.formattedOriginalPrice;
        delete payload.formattedDuration;
        delete payload.formattedSavings;
        delete payload.savings;
        delete payload.createdAt;
        delete payload.updatedAt;
        delete payload.metadata;
        delete payload.icon;
        try {
            if (editId) await subscriptionsApi.update(editId, payload);
            else await subscriptionsApi.create(payload);
            setShowModal(false);
            fetchData();
        } catch (e: any) { alert(e.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handleToggle = async (sub: Subscription) => {
        const id = sub.id || sub._id!;
        try {
            if (sub.status === 'active') await subscriptionsApi.deactivate(id);
            else await subscriptionsApi.activate(id);
            fetchData();
        } catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This cannot be undone.')) return;
        try { await subscriptionsApi.delete(id); fetchData(); }
        catch (e: any) { alert(e.message); }
    };

    // --- Limit helpers ---
    const getLimitValue = (featureName: string): number => {
        const f = (form.features || []).find(f => f.name === featureName);
        return f ? Number(f.value ?? f.limit ?? 0) : 0;
    };

    const setLimitValue = (featureName: string, val: number, unit: string) => {
        setForm(p => {
            const features = [...(p.features || [])];
            const idx = features.findIndex(f => f.name === featureName);
            const feature: Feature = {
                name: featureName,
                description: `${val} ${unit} per month`,
                type: 'numeric',
                value: val,
                enabled: true,
                limit: val,
                unit,
            };
            if (idx >= 0) features[idx] = feature;
            else features.push(feature);
            return { ...p, features };
        });
    };

    // Custom features = everything that isn't a known limit
    const customFeatures = (form.features || []).filter(
        f => !KNOWN_LIMITS.find(kl => kl.name === f.name)
    );

    const addFeature = () => {
        if (!featureForm.name.trim()) return;
        setForm(p => ({
            ...p,
            features: [...(p.features || []), {
                ...featureForm,
                value: featureForm.type === 'boolean' ? true : featureForm.value,
                limit: featureForm.type === 'numeric' ? Number(featureForm.value) : undefined,
            }],
        }));
        setFeatureForm({ name: '', description: '', type: 'boolean', value: '', enabled: true, unit: '' });
    };

    const removeFeature = (name: string) => {
        setForm(p => ({ ...p, features: (p.features || []).filter(f => f.name !== name) }));
    };

    const addTag = () => {
        if (!tagInput.trim()) return;
        setForm(p => ({ ...p, tags: [...(p.tags || []), tagInput.trim()] }));
        setTagInput('');
    };

    const removeTag = (i: number) => {
        setForm(p => ({ ...p, tags: (p.tags || []).filter((_, idx) => idx !== i) }));
    };

    const formatPrice = (priceInPaisa: number, currency: string) => {
        const amount = priceInPaisa / 100;
        return currency === 'INR' ? `₹${amount.toLocaleString('en-IN')}` : `$${amount.toLocaleString()}`;
    };

    const getPlanLimit = (sub: Subscription, featureName: string): string | number => {
        const f = (sub.features || []).find(f => f.name === featureName);
        return f ? Number(f.value ?? f.limit) : '—';
    };

    return (
        <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(108,99,255,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={20} style={{ color: '#6c63ff' }} />
                        </span>
                        Subscription Plans
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 4 }}>
                        Manage pricing plans, feature limits and billing options
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" onClick={fetchData}><RefreshCw size={14} /> Refresh</button>
                    <button className="btn-primary" onClick={openCreate}><Plus size={14} /> New Plan</button>
                </div>
            </div>

            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                {[
                    { label: 'Total Plans',  value: subscriptions.length,                                    color: '#6c63ff' },
                    { label: 'Active Plans', value: subscriptions.filter(s => s.status === 'active').length, color: '#00c853' },
                    { label: 'Draft / Inactive', value: subscriptions.filter(s => s.status !== 'active').length, color: '#ffa726' },
                ].map(stat => (
                    <div key={stat.label} className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 4, height: 36, borderRadius: 4, background: stat.color, flexShrink: 0 }} />
                        <div>
                            <div style={{ fontSize: 26, fontWeight: 900 }}>{stat.value}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 1 }}>{stat.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Plan cards */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 320, borderRadius: 16 }} />)}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {subscriptions.map((sub, idx) => (
                        <div
                            key={sub.id || sub._id}
                            className="glass-card animate-fadeIn"
                            style={{ padding: 0, overflow: 'hidden', animationDelay: `${idx * 70}ms`, display: 'flex', flexDirection: 'column' }}
                        >
                            {/* Accent bar */}
                            <div style={{ height: 3, background: sub.colorScheme || '#6c63ff' }} />

                            <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                                {/* Name + status */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 16, fontWeight: 700 }}>{sub.displayName}</span>
                                            {sub.popularBadge && <span className="badge badge-purple" style={{ fontSize: 10 }}>⭐ Popular</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 2 }}>
                                            {sub.name} · {sub.country} · {sub.type}
                                        </div>
                                    </div>
                                    <span className={`badge ${sub.status === 'active' ? 'badge-active' : 'badge-draft'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                                        {sub.status}
                                    </span>
                                </div>

                                {/* Price */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    <span style={{ fontSize: 30, fontWeight: 900 }}>{formatPrice(sub.price, sub.currency)}</span>
                                    <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                                        /{sub.type === 'monthly' ? 'mo' : sub.type === 'yearly' ? 'yr' : sub.type}
                                    </span>
                                    {sub.discountPercentage > 0 && (
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(0,200,83,0.12)', color: '#4ade80' }}>
                                            -{sub.discountPercentage}%
                                        </span>
                                    )}
                                </div>

                                {/* Limits badges */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {KNOWN_LIMITS.map(kl => (
                                        <div
                                            key={kl.name}
                                            style={{ borderRadius: 10, padding: '10px 12px', background: 'rgba(108,99,255,0.07)', border: '1px solid rgba(108,99,255,0.18)', textAlign: 'center' }}
                                        >
                                            <div style={{ fontSize: 20, fontWeight: 900 }}>{getPlanLimit(sub, kl.name)}</div>
                                            <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 1 }}>{kl.icon} {kl.unit}/mo</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Other features preview */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                                    {(sub.features || [])
                                        .filter(f => !KNOWN_LIMITS.find(kl => kl.name === f.name))
                                        .slice(0, 3)
                                        .map((f, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted-foreground)' }}>
                                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: f.enabled ? '#4ade80' : '#475569', flexShrink: 0 }} />
                                                <span style={{ flex: 1 }}>{f.name}</span>
                                                {f.value !== undefined && f.type !== 'boolean' && (
                                                    <span style={{ fontWeight: 700, color: 'var(--foreground)', fontSize: 11 }}>{f.value}</span>
                                                )}
                                            </div>
                                        ))}
                                    {(sub.features || []).filter(f => !KNOWN_LIMITS.find(kl => kl.name === f.name)).length > 3 && (
                                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
                                            +{(sub.features || []).filter(f => !KNOWN_LIMITS.find(kl => kl.name === f.name)).length - 3} more features
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--glass-border)', paddingTop: 14, marginTop: 'auto' }}>
                                    <button className="btn-secondary" style={{ flex: 1, padding: '8px' }} onClick={() => openEdit(sub)}>
                                        <Edit3 size={13} /> Edit
                                    </button>
                                    <button
                                        className={sub.status === 'active' ? 'btn-danger' : 'btn-success'}
                                        style={{ padding: '8px 12px' }}
                                        title={sub.status === 'active' ? 'Deactivate' : 'Activate'}
                                        onClick={() => handleToggle(sub)}
                                    >
                                        {sub.status === 'active' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                    </button>
                                    <button className="btn-danger" style={{ padding: '8px 12px' }} onClick={() => handleDelete(sub.id || sub._id!)}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {subscriptions.length === 0 && (
                        <div className="glass-card" style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                            <CreditCard size={44} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <p>No subscription plans yet. Create your first plan!</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── EDIT / CREATE MODAL ── */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div
                        className="modal-content"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 620, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
                    >
                        {/* Modal header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 800 }}>
                                {editId ? 'Edit Subscription Plan' : 'Create New Plan'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4, borderRadius: 8 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tab selector */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 12 }}>
                            {TABS.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', borderRadius: 9,
                                        fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                                        background: activeTab === tab ? '#6c63ff' : 'transparent',
                                        color: activeTab === tab ? '#fff' : 'var(--muted-foreground)',
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Scrollable body */}
                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>

                            {/* ── DETAILS TAB ── */}
                            {activeTab === 'Details' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <Field label="Internal Name">
                                            <input className="form-input" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. career_starter_in" />
                                        </Field>
                                        <Field label="Display Name">
                                            <input className="form-input" value={form.displayName || ''} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} placeholder="e.g. Career Starter" />
                                        </Field>
                                    </div>
                                    <Field label="Description">
                                        <textarea className="form-input" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Plan description..." style={{ minHeight: 68, resize: 'vertical' }} />
                                    </Field>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                        <Field label="Country">
                                            <select
                                                className="form-input form-select"
                                                value={form.country || 'IN'}
                                                onChange={e => {
                                                    const c = e.target.value;
                                                    setForm(p => ({
                                                        ...p,
                                                        country: c,
                                                        currency: c === 'IN' ? 'INR' : 'USD',
                                                    }));
                                                }}
                                            >
                                                <option value="IN">🇮🇳 India (IN)</option>
                                                <option value="US">🇺🇸 United States (US)</option>
                                                <option value="GB">🇬🇧 United Kingdom (GB)</option>
                                                <option value="CA">🇨🇦 Canada (CA)</option>
                                                <option value="AU">🇦🇺 Australia (AU)</option>
                                                <option value="SG">🇸🇬 Singapore (SG)</option>
                                                <option value="AE">🇦🇪 UAE (AE)</option>
                                            </select>
                                        </Field>
                                        <Field label="Display Order">
                                            <input className="form-input" type="number" value={form.order || 0} onChange={e => setForm(p => ({ ...p, order: +e.target.value }))} />
                                        </Field>
                                        <Field label="Status">
                                            <select className="form-input form-select" value={form.status || 'draft'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                                <option value="draft">Draft</option>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </Field>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                                            <input type="checkbox" checked={form.popularBadge || false} onChange={e => setForm(p => ({ ...p, popularBadge: e.target.checked }))} style={{ accentColor: '#6c63ff', width: 16, height: 16 }} />
                                            ⭐ Mark as Popular
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                            <span style={{ color: 'var(--muted-foreground)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accent</span>
                                            <input type="color" value={form.colorScheme || '#6c63ff'} onChange={e => setForm(p => ({ ...p, colorScheme: e.target.value }))} style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 6 }} />
                                        </label>
                                    </div>
                                    {/* Tags */}
                                    <Field label="Tags">
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                            {(form.tags || []).map((t, i) => (
                                                <span key={i} className="badge badge-purple" style={{ cursor: 'pointer' }} onClick={() => removeTag(i)}>
                                                    {t} <X size={10} />
                                                </span>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input className="form-input" style={{ flex: 1 }} value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add a tag" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                                            <button className="btn-secondary" style={{ padding: '8px 12px' }} onClick={addTag}><Plus size={14} /></button>
                                        </div>
                                    </Field>
                                </div>
                            )}

                            {/* ── PRICING TAB ── */}
                            {activeTab === 'Pricing' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                        <Field label={`Price (${form.currency === 'USD' ? '$' : '₹'})`}>
                                            <input className="form-input" type="number" value={form.price || 0} onChange={e => setForm(p => ({ ...p, price: +e.target.value }))} />
                                            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4, display: 'block' }}>
                                                = {form.currency === 'USD' ? `$${(form.price || 0).toLocaleString()}` : `₹${(form.price || 0).toLocaleString('en-IN')}`}
                                            </span>
                                        </Field>
                                        <Field label={`Original Price (${form.currency === 'USD' ? '$' : '₹'})`}>
                                            <input className="form-input" type="number" value={form.originalPrice || 0} onChange={e => setForm(p => ({ ...p, originalPrice: +e.target.value }))} />
                                        </Field>
                                        <Field label="Discount %">
                                            <input className="form-input" type="number" value={form.discountPercentage || 0} onChange={e => setForm(p => ({ ...p, discountPercentage: +e.target.value }))} />
                                        </Field>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                        <Field label="Currency">
                                            <select className="form-input form-select" value={form.currency || 'INR'} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                                                <option value="INR">INR (₹) — India</option>
                                                <option value="USD">USD ($) — International</option>
                                                <option value="GBP">GBP (£) — UK</option>
                                                <option value="AUD">AUD (A$) — Australia</option>
                                                <option value="SGD">SGD (S$) — Singapore</option>
                                                <option value="AED">AED (د.إ) — UAE</option>
                                            </select>
                                        </Field>
                                        <Field label="Billing Type">
                                            <select className="form-input form-select" value={form.type || 'monthly'} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                                                <option value="free">Free</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="half-yearly">Half-Yearly</option>
                                                <option value="yearly">Yearly</option>
                                                <option value="onetime">One-time</option>
                                            </select>
                                        </Field>
                                        <Field label="Duration (days)">
                                            <input className="form-input" type="number" value={form.duration || 0} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))} />
                                        </Field>
                                    </div>

                                </div>
                            )}

                            {/* ── LIMITS TAB ── */}
                            {activeTab === 'Limits' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                                        Set the monthly usage limits enforced by the backend for this plan.
                                    </p>
                                    {KNOWN_LIMITS.map(kl => {
                                        const val = getLimitValue(kl.name) || kl.defaultVal;
                                        const pct = Math.round((val / kl.max) * 100);
                                        return (
                                            <div
                                                key={kl.name}
                                                style={{ borderRadius: 14, padding: '18px 20px', background: 'rgba(108,99,255,0.06)', border: '1px solid rgba(108,99,255,0.18)' }}
                                            >
                                                {/* Top row */}
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <span style={{ fontSize: 24 }}>{kl.icon}</span>
                                                        <div>
                                                            <div style={{ fontSize: 14, fontWeight: 700 }}>{kl.name}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Max {kl.unit} per month</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: 32, fontWeight: 900, color: '#6c63ff', lineHeight: 1 }}>{val}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{kl.unit}</div>
                                                    </div>
                                                </div>
                                                {/* Slider */}
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={kl.max}
                                                    value={val}
                                                    onChange={e => setLimitValue(kl.name, +e.target.value, kl.unit)}
                                                    style={{ width: '100%', accentColor: '#6c63ff', marginBottom: 10 }}
                                                />
                                                {/* Min/max labels + manual input */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>1</span>
                                                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: '#6c63ff', borderRadius: 2, transition: 'width 0.2s' }} />
                                                    </div>
                                                    <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>{kl.max}</span>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        style={{ width: 72, textAlign: 'center', fontWeight: 800 }}
                                                        min={1}
                                                        max={kl.max}
                                                        value={val}
                                                        onChange={e => setLimitValue(kl.name, +e.target.value, kl.unit)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── FEATURES TAB ── */}
                            {activeTab === 'Features' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                                        Custom feature flags shown on the plan card (separate from limits).
                                    </p>

                                    {/* Existing custom features */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {customFeatures.map((f, i) => (
                                            <div
                                                key={i}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: f.enabled ? '#4ade80' : '#475569' }} />
                                                    <span style={{ fontWeight: 600 }}>{f.name}</span>
                                                    {f.value !== undefined && f.type !== 'boolean' && (
                                                        <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>= {f.value}{f.unit ? ` ${f.unit}` : ''}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => removeFeature(f.name)}
                                                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {customFeatures.length === 0 && (
                                            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted-foreground)', padding: '24px 0' }}>No custom features yet</div>
                                        )}
                                    </div>

                                    {/* Add feature form */}
                                    <div style={{ borderRadius: 12, padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add Feature</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <input className="form-input" value={featureForm.name} onChange={e => setFeatureForm(p => ({ ...p, name: e.target.value }))} placeholder="Feature name" />
                                            <select className="form-input form-select" value={featureForm.type} onChange={e => setFeatureForm(p => ({ ...p, type: e.target.value }))}>
                                                <option value="boolean">Boolean (on/off)</option>
                                                <option value="numeric">Numeric</option>
                                                <option value="text">Text</option>
                                            </select>
                                        </div>
                                        {featureForm.type !== 'boolean' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                <input className="form-input" type={featureForm.type === 'numeric' ? 'number' : 'text'} value={featureForm.value} onChange={e => setFeatureForm(p => ({ ...p, value: e.target.value }))} placeholder="Value" />
                                                <input className="form-input" value={featureForm.unit} onChange={e => setFeatureForm(p => ({ ...p, unit: e.target.value }))} placeholder="Unit (e.g. hours)" />
                                            </div>
                                        )}
                                        <input className="form-input" value={featureForm.description} onChange={e => setFeatureForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" />
                                        <button className="btn-primary" style={{ width: '100%' }} onClick={addFeature}>
                                            <Plus size={14} /> Add Feature
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: 16, marginTop: 16 }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {TABS.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: activeTab === tab ? '#6c63ff' : 'rgba(255,255,255,0.15)' }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                                    <Save size={14} /> {saving ? 'Saving...' : editId ? 'Update Plan' : 'Create Plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
