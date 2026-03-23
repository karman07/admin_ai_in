'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Briefcase, Settings, RefreshCw, Database, Activity, Save, CheckCircle2 } from 'lucide-react';
import { jobsApi } from '../lib/api';

export default function JobListingPage() {
    const [stats, setStats] = useState<any>(null);
    const [config, setConfig] = useState<any>({ appId: '', appKey: '', country: 'us', resultsPerPage: 50 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsData, configData] = await Promise.all([
                jobsApi.getStats(),
                jobsApi.getConfig()
            ]);
            setStats(statsData);
            if (configData) setConfig(configData);
        } catch (e: any) {
            console.error(e);
            setMessage({ text: 'Failed to load job data', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            await jobsApi.updateConfig(config);
            setMessage({ text: 'Adzuna keys saved successfully!', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        } catch (e: any) {
            setMessage({ text: e.message || 'Failed to save config', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            await jobsApi.syncNow();
            setMessage({ text: 'Sync started successfully in the background.', type: 'success' });
            setTimeout(() => setMessage({ text: '', type: '' }), 5000);
        } catch (e: any) {
            setMessage({ text: e.message || 'Failed to start sync', type: 'error' });
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted-foreground)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginRight: 10 }} /> Loading Jobs Data...
            </div>
        );
    }

    return (
        <div style={{ padding: '32px 28px', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
                <div>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <Briefcase size={20} />
                        </div>
                        Job Listings & Sync
                    </h1>
                    <p style={{ margin: 0, color: 'var(--muted-foreground)', fontSize: 14 }}>
                        Monitor job database statistics and manage Adzuna API credentials.
                    </p>
                </div>
            </div>

            {message.text && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: message.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: message.type === 'success' ? '#22c55e' : '#ef4444',
                    fontSize: 14,
                    fontWeight: 500
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={18} /> : <span>⚠️</span>}
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
                {/* Stats Card */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, color: 'var(--muted-foreground)' }}>
                        <Database size={18} />
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Database Overview</h2>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Active Jobs Fetch</span>
                            <span style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>{stats?.totalActive?.toLocaleString() || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Expired Jobs</span>
                            <span style={{ fontSize: 20, fontWeight: 600, color: '#ef4444' }}>{stats?.totalExpired?.toLocaleString() || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>Last Job Sync</span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
                                {stats?.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Adzuna API Keys Config Card */}
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted-foreground)' }}>
                            <Settings size={18} />
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Adzuna Configuration</h2>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase' }}>App ID</label>
                            <input
                                type="text"
                                className="form-input"
                                value={config.appId}
                                onChange={e => setConfig({ ...config, appId: e.target.value })}
                                placeholder="Adzuna App ID"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase' }}>App Key</label>
                            <input
                                type="password"
                                className="form-input"
                                value={config.appKey}
                                onChange={e => setConfig({ ...config, appKey: e.target.value })}
                                placeholder="Adzuna App Key"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase' }}>Default Country</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={config.country}
                                    onChange={e => setConfig({ ...config, country: e.target.value })}
                                    placeholder="e.g. us, gb"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase' }}>Results/Page</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={config.resultsPerPage}
                                    onChange={e => setConfig({ ...config, resultsPerPage: parseInt(e.target.value) || 50 })}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <button 
                            className="btn-primary" 
                            style={{ width: '100%', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            onClick={handleSaveConfig}
                            disabled={saving}
                        >
                            {saving ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                            {saving ? 'Saving Config...' : 'Save Keys & Settings'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sync Controls */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Activity size={20} color="#3b82f6" />
                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Manual Synchronization</h2>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted-foreground)', maxWidth: 600 }}>
                            Force a manual background sync to fetch the latest jobs from Adzuna across all targeted countries based on the current configuration.
                        </p>
                    </div>
                    <button 
                        className="btn-secondary" 
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        <RefreshCw size={16} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                        {syncing ? 'Syncing...' : 'Force Sync Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
