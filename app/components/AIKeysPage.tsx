'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
    Key, Plus, Trash2, CheckCircle2, Shield, Eye, EyeOff,
    RefreshCw, Cpu, Zap, AlertCircle, X, Bot, DollarSign,
} from 'lucide-react';
import { aiConfigApi } from '../lib/api';

interface ApiKey {
    id: string;
    provider: 'gemini' | 'groq';
    label: string;
    maskedValue: string;
    isActive: boolean;
    isDefault: boolean;
    createdAt?: string;
}

const PROVIDER_META = {
    gemini: { label: 'Gemini (Google)', color: '#4285F4', icon: <Cpu size={16} />, bg: 'rgba(66,133,244,0.12)' },
    groq:   { label: 'Groq',           color: '#F5A623', icon: <Zap size={16} />,  bg: 'rgba(245,166,35,0.12)' },
};

function KeyCard({
    k,
    onActivate,
    onDelete,
}: {
    k: ApiKey;
    onActivate: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const meta = PROVIDER_META[k.provider];
    return (
        <div style={{
            background: 'var(--card-bg)',
            border: `1px solid ${k.isActive ? meta.color : 'var(--border)'}`,
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            transition: 'border-color 0.2s',
        }}>
            {/* provider icon */}
            <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: meta.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: meta.color, flexShrink: 0,
            }}>
                {meta.icon}
            </div>

            {/* info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--foreground)' }}>{k.label}</span>
                    {k.isDefault && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(108,99,255,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
                            DEFAULT
                        </span>
                    )}
                    {k.isActive && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={9} /> ACTIVE
                        </span>
                    )}
                </div>
                <code style={{ fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'monospace', display: 'block', marginTop: 3 }}>
                    {k.maskedValue}
                </code>
            </div>

            {/* actions */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {!k.isActive && (
                    <button
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => onActivate(k.id)}
                    >
                        Use This
                    </button>
                )}
                {!k.isDefault && (
                    <button
                        className="btn-danger"
                        style={{ padding: '6px 10px' }}
                        onClick={() => onDelete(k.id)}
                        title="Delete key"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    );
}

function AddKeyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
    const [provider, setProvider] = useState<'gemini' | 'groq'>('gemini');
    const [label, setLabel] = useState('');
    const [value, setValue] = useState('');
    const [showValue, setShowValue] = useState(false);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');

    const handleSave = async () => {
        if (!label.trim() || !value.trim()) { setErr('Label and key value are required.'); return; }
        setSaving(true);
        try {
            await aiConfigApi.addKey({ provider, label: label.trim(), value: value.trim() });
            onSaved();
            onClose();
        } catch (e: any) {
            setErr(e.message || 'Failed to save key');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div className="glass-card" style={{ width: 460, padding: 28, borderRadius: 16, position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                    <X size={18} />
                </button>
                <h3 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>Add New API Key</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Provider */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Provider</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {(['gemini', 'groq'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setProvider(p)}
                                    style={{
                                        flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                        border: `1px solid ${provider === p ? PROVIDER_META[p].color : 'var(--border)'}`,
                                        background: provider === p ? PROVIDER_META[p].bg : 'transparent',
                                        color: provider === p ? PROVIDER_META[p].color : 'var(--muted-foreground)',
                                        fontWeight: 700, fontSize: 13,
                                    }}
                                >
                                    {PROVIDER_META[p].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Label */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Label</label>
                        <input className="form-input" placeholder="e.g. Production Key, Backup Key" value={label} onChange={e => setLabel(e.target.value)} />
                    </div>

                    {/* Key value */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>API Key</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showValue ? 'text' : 'password'}
                                placeholder={provider === 'gemini' ? 'AIzaSy...' : 'gsk_...'}
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                style={{ paddingRight: 40, fontFamily: 'monospace', fontSize: 13 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowValue(v => !v)}
                                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
                            >
                                {showValue ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {err && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171', fontSize: 12 }}>
                            <AlertCircle size={13} /> {err}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
                        <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>
                            {saving ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                            {saving ? 'Saving...' : 'Add Key'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AIKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [models, setModels] = useState<any>(null);
    const [modelLoading, setModelLoading] = useState(true);
    const [switchingModel, setSwitchingModel] = useState<string | null>(null);

    const fetchKeys = useCallback(async () => {
        setLoading(true);
        try {
            const data = await aiConfigApi.getKeys();
            setKeys(data);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchModels = useCallback(async () => {
        setModelLoading(true);
        try {
            const data = await aiConfigApi.getModels();
            setModels(data);
        } catch (e: any) {
            console.error(e);
        } finally {
            setModelLoading(false);
        }
    }, []);

    useEffect(() => { fetchKeys(); fetchModels(); }, [fetchKeys, fetchModels]);

    const handleActivate = async (id: string) => {
        try { await aiConfigApi.setActive(id); fetchKeys(); }
        catch (e: any) { alert(e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this key? The default env key will become active.')) return;
        try { await aiConfigApi.deleteKey(id); fetchKeys(); }
        catch (e: any) { alert(e.message); }
    };

    const handleSetModel = async (provider: 'gemini' | 'groq', modelId: string) => {
        setSwitchingModel(`${provider}:${modelId}`);
        try {
            await aiConfigApi.setActiveModel(provider, modelId);
            await fetchModels();
        } catch (e: any) {
            alert(e.message || 'Failed to switch model');
        } finally {
            setSwitchingModel(null);
        }
    };

    const geminiKeys = keys.filter(k => k.provider === 'gemini');
    const groqKeys   = keys.filter(k => k.provider === 'groq');

    return (
        <div style={{ padding: '32px 28px', maxWidth: 720 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                            <Key size={18} />
                        </div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>AI API Keys</h1>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-foreground)' }}>
                        Manage Gemini and Groq keys. Default keys come from environment variables and cannot be deleted.
                        Only the <strong>ACTIVE</strong> key is used by the platform.
                    </p>
                </div>
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }} onClick={() => setShowAddModal(true)}>
                    <Plus size={14} /> Add Key
                </button>
            </div>

            {/* Security note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)', marginBottom: 24, fontSize: 12, color: '#86efac' }}>
                <Shield size={14} />
                Keys are stored securely in the database. Only masked values are shown here — full values are never sent to the browser.
            </div>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', padding: 32 }}>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading keys…
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                    {(['gemini', 'groq'] as const).map(provider => {
                        const meta = PROVIDER_META[provider];
                        const providerKeys = provider === 'gemini' ? geminiKeys : groqKeys;
                        return (
                            <section key={provider}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <div style={{ color: meta.color }}>{meta.icon}</div>
                                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: meta.color }}>{meta.label}</h2>
                                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>({providerKeys.length} key{providerKeys.length !== 1 ? 's' : ''})</span>
                                </div>
                                {providerKeys.length === 0 ? (
                                    <div style={{ padding: '16px', borderRadius: 8, border: '1px dashed var(--border)', color: 'var(--muted-foreground)', fontSize: 13, textAlign: 'center' }}>
                                        No keys configured. Add one or set <code>GEMINI_API_KEY</code> / <code>GROQ_API_KEY</code> in your environment.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {providerKeys.map(k => (
                                            <KeyCard key={k.id} k={k} onActivate={handleActivate} onDelete={handleDelete} />
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}

            {showAddModal && (
                <AddKeyModal onClose={() => setShowAddModal(false)} onSaved={fetchKeys} />
            )}

            {/* ── Model Selector ─────────────────────────────────────── */}
            <div style={{ marginTop: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
                        <Bot size={18} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>AI Model Settings</h2>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>
                            Choose the model for each provider. Changes take effect within 60 seconds — no restart needed.
                        </p>
                    </div>
                </div>

                {modelLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)', padding: 20 }}>
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading models…
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                        {(['gemini', 'groq'] as const).map(provider => {
                            const providerModels: any[] = models?.[provider] ?? [];
                            const meta = PROVIDER_META[provider];
                            return (
                                <section key={provider}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <div style={{ color: meta.color }}>{meta.icon}</div>
                                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: meta.color }}>{meta.label} Models</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                                        {providerModels.map((m: any) => {
                                            const isActive = m.isActive;
                                            const isSwitching = switchingModel === `${provider}:${m.id}`;
                                            const tierColors: Record<string, string> = {
                                                recommended: '#4ade80',
                                                premium:     '#f59e0b',
                                                balanced:    '#60a5fa',
                                                budget:      '#a78bfa',
                                            };
                                            const tierColor = tierColors[m.tier] ?? '#94a3b8';
                                            return (
                                                <div key={m.id} style={{
                                                    background: isActive ? `${meta.bg}` : 'var(--card-bg)',
                                                    border: `1px solid ${isActive ? meta.color : 'var(--border)'}`,
                                                    borderRadius: 10,
                                                    padding: '14px 16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                    transition: 'border-color 0.2s',
                                                    position: 'relative',
                                                }}>
                                                    {/* Header row */}
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</span>
                                                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}44`, textTransform: 'uppercase' }}>
                                                                    {m.tier}
                                                                </span>
                                                                {isActive && (
                                                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                                        <CheckCircle2 size={8} /> ACTIVE
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <code style={{ fontSize: 10, color: 'var(--muted-foreground)', display: 'block', marginTop: 2 }}>{m.id}</code>
                                                        </div>
                                                    </div>

                                                    {/* Cost estimates */}
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <div style={{ flex: 1, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 6, padding: '6px 8px' }}>
                                                            <div style={{ fontSize: 9, fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <DollarSign size={8} /> Input
                                                            </div>
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>${m.inputPer1M.toFixed(4)}</div>
                                                            <div style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>per 1M tokens</div>
                                                        </div>
                                                        <div style={{ flex: 1, background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.15)', borderRadius: 6, padding: '6px 8px' }}>
                                                            <div style={{ fontSize: 9, fontWeight: 700, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <DollarSign size={8} /> Output
                                                            </div>
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>${m.outputPer1M.toFixed(4)}</div>
                                                            <div style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>per 1M tokens</div>
                                                        </div>
                                                    </div>

                                                    {/* Est. cost per 1000 requests */}
                                                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '4px 8px' }}>
                                                        Est. <strong style={{ color: 'var(--foreground)' }}>${((m.inputPer1M * 0.5 + m.outputPer1M * 0.5) / 1000).toFixed(5)}</strong>
                                                        {' '}per request <span style={{ fontSize: 10 }}>(~500 in/out tokens avg)</span>
                                                    </div>

                                                    {/* Note */}
                                                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>{m.note}</p>

                                                    {/* Action */}
                                                    {!isActive && (
                                                        <button
                                                            className="btn-primary"
                                                            style={{ padding: '6px 12px', fontSize: 12, marginTop: 4 }}
                                                            disabled={!!switchingModel}
                                                            onClick={() => handleSetModel(provider, m.id)}
                                                        >
                                                            {isSwitching
                                                                ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Switching…</>
                                                                : 'Use This Model'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
