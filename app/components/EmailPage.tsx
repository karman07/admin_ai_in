'use client';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  RefreshCw,
  Settings,
  Send,
  Eye,
  EyeOff,
  Save,
  FlaskConical,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { fetchApiAuth, API_BASE } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Analytics {
  totalSubscribers: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  totalSent: number;
  totalFailed: number;
  deliveryRate: number;
  recentLogs: EmailLogEntry[];
  dailyStats: { date: string; sent: number; failed: number }[];
}

interface EmailLogEntry {
  _id: string;
  email: string;
  type: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: string;
}

interface Subscriber {
  _id: string;
  email: string;
  isSubscribed: boolean;
  subscriptionTypes: string[];
  lastEmailSentAt?: string;
  createdAt: string;
}

interface MailConfigData {
  mailgunApiKey: string;
  mailgunApiUrl: string;
  mailgunFrom: string;
  isActive: boolean;
  source: string;
}

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { date: string; sent: number; failed: number }[] }) {
  if (!data.length) return (
    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
      No data yet — emails will appear here once sent.
    </div>
  );

  const maxVal = Math.max(...data.map(d => d.sent + d.failed), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80, width: '100%' }}>
      {data.map((d) => {
        const total = d.sent + d.failed;
        const sentH = Math.round((d.sent / maxVal) * 72);
        const failH = Math.round((d.failed / maxVal) * 72);
        const label = d.date.slice(5); // MM-DD
        return (
          <div
            key={d.date}
            title={`${label}: ${d.sent} sent, ${d.failed} failed`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', height: 72, width: '100%', gap: 1 }}>
              {d.sent > 0 && (
                <div style={{ width: '100%', height: sentH, background: 'rgba(74,222,128,0.7)', borderRadius: '2px 2px 0 0', minHeight: 2 }} />
              )}
              {d.failed > 0 && (
                <div style={{ width: '100%', height: failH, background: 'rgba(248,113,113,0.7)', borderRadius: '2px 2px 0 0', minHeight: 2 }} />
              )}
              {total === 0 && (
                <div style={{ width: '100%', height: 2, background: 'rgba(148,163,184,0.2)' }} />
              )}
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: 12,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: accent + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EmailPage() {
  const [tab, setTab] = useState<'overview' | 'subscribers' | 'logs' | 'config'>('overview');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subFilter, setSubFilter] = useState('');
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logStatusFilter, setLogStatusFilter] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState('');
  const [config, setConfig] = useState<MailConfigData>({
    mailgunApiKey: '',
    mailgunApiUrl: '',
    mailgunFrom: '',
    isActive: true,
    source: 'env',
  });
  const [showKey, setShowKey] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [triggerMsg, setTriggerMsg] = useState('');
  const [triggerLoading, setTriggerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, cfg] = await Promise.all([
        fetchApiAuth('email/admin/analytics'),
        fetchApiAuth('email/admin/config'),
      ]);
      setAnalytics(a);
      setConfig(cfg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubscribers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(subPage), limit: '20' });
    if (subFilter) params.set('status', subFilter);
    const res = await fetchApiAuth(`email/admin/subscribers?${params}`);
    setSubscribers(res.subscribers);
    setSubTotal(res.total);
  }, [subPage, subFilter]);

  const loadLogs = useCallback(async () => {
    const params = new URLSearchParams({ page: String(logPage), limit: '30' });
    if (logStatusFilter) params.set('status', logStatusFilter);
    if (logTypeFilter) params.set('type', logTypeFilter);
    const res = await fetchApiAuth(`email/admin/logs?${params}`);
    setLogs(res.logs);
    setLogTotal(res.total);
  }, [logPage, logStatusFilter, logTypeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'subscribers') loadSubscribers(); }, [tab, loadSubscribers]);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMsg('');
    try {
      await fetchApiAuth('email/admin/config', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      setConfigMsg('✓ Configuration saved successfully');
      setConfigDirty(false);
      await load();
    } catch (e: any) {
      setConfigMsg('✗ ' + (e.message || 'Save failed'));
    } finally {
      setConfigSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) return;
    setTestLoading(true);
    setTestMsg('');
    try {
      const res = await fetchApiAuth('email/admin/send-test', {
        method: 'POST',
        body: JSON.stringify({ to: testEmail }),
      });
      setTestMsg(res.success ? '✓ ' + res.message : '✗ ' + res.message);
    } catch (e: any) {
      setTestMsg('✗ ' + (e.message || 'Failed'));
    } finally {
      setTestLoading(false);
    }
  };

  const triggerBulk = async () => {
    setTriggerLoading(true);
    setTriggerMsg('');
    try {
      const res = await fetchApiAuth('email/trigger-daily-update', { method: 'POST' });
      setTriggerMsg('✓ ' + res.message);
      await load();
    } catch (e: any) {
      setTriggerMsg('✗ ' + (e.message || 'Failed'));
    } finally {
      setTriggerLoading(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 12,
    padding: '20px 22px',
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: active ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--card-border)',
    background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
    color: active ? '#a78bfa' : 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--input-bg, rgba(255,255,255,0.05))',
    border: '1px solid var(--card-border)',
    borderRadius: 8,
    padding: '9px 12px',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 20px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  };

  const btnSecondary: React.CSSProperties = {
    background: 'var(--card-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--card-border)',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Email System
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Manage newsletters, delivery analytics, and Mailgun configuration
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {triggerMsg && (
            <span style={{ fontSize: 12, color: triggerMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
              {triggerMsg}
            </span>
          )}
          <button style={btnSecondary} onClick={triggerBulk} disabled={triggerLoading}>
            {triggerLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
            Trigger Bulk Send
          </button>
          <button style={btnSecondary} onClick={load} disabled={loading}>
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status banner: mail active/inactive */}
      {analytics && (
        <div style={{
          marginBottom: 20,
          padding: '10px 16px',
          borderRadius: 8,
          border: `1px solid ${config.isActive ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          background: config.isActive ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: config.isActive ? '#4ade80' : '#f87171',
        }}>
          {config.isActive ? <Bell size={14} /> : <BellOff size={14} />}
          <span>
            Mail sending is <b>{config.isActive ? 'enabled' : 'disabled'}</b>
            {config.source === 'db' ? ' (configured via admin)' : ' (using env variables — update in Config tab)'}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['overview', 'subscribers', 'logs', 'config'] as const).map(t => (
          <button key={t} style={tabBtn(tab === t)} onClick={() => setTab(t)}>
            {t === 'overview' && <BarChart3 size={13} style={{ display: 'inline', marginRight: 5 }} />}
            {t === 'subscribers' && <Users size={13} style={{ display: 'inline', marginRight: 5 }} />}
            {t === 'logs' && <Clock size={13} style={{ display: 'inline', marginRight: 5 }} />}
            {t === 'config' && <Settings size={13} style={{ display: 'inline', marginRight: 5 }} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && analytics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            <StatCard
              icon={<Users size={16} />}
              label="Total Subscribers"
              value={analytics.totalSubscribers}
              sub={`${analytics.activeSubscribers} active · ${analytics.inactiveSubscribers} inactive`}
              accent="#60a5fa"
            />
            <StatCard
              icon={<CheckCircle2 size={16} />}
              label="Total Delivered"
              value={analytics.totalSent.toLocaleString()}
              sub="All time successful sends"
              accent="#4ade80"
            />
            <StatCard
              icon={<XCircle size={16} />}
              label="Total Failed"
              value={analytics.totalFailed.toLocaleString()}
              sub="All time failures"
              accent="#f87171"
            />
            <StatCard
              icon={<Mail size={16} />}
              label="Delivery Rate"
              value={`${analytics.deliveryRate}%`}
              sub={analytics.totalSent + analytics.totalFailed > 0 ? `${analytics.totalSent + analytics.totalFailed} total attempts` : 'No sends yet'}
              accent="#a78bfa"
            />
          </div>

          {/* Delivery chart */}
          <div style={{ ...card }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                Delivery Activity — Last 14 Days
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 14 }}>
                <span style={{ color: 'rgba(74,222,128,0.9)' }}>■ Sent</span>
                <span style={{ color: 'rgba(248,113,113,0.9)' }}>■ Failed</span>
              </div>
            </div>
            <MiniBarChart data={analytics.dailyStats} />
          </div>

          {/* Recent logs */}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 14 }}>
              Recent Activity
            </div>
            {analytics.recentLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No emails sent yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {analytics.recentLogs.map((log) => (
                  <div key={log._id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '9px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: log.status === 'sent' ? '#4ade80' : '#f87171',
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {log.email}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(139,92,246,0.15)', color: '#a78bfa',
                    }}>
                      {log.type}
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: log.status === 'sent' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                      color: log.status === 'sent' ? '#4ade80' : '#f87171',
                    }}>
                      {log.status}
                    </span>
                    {log.error && (
                      <span title={log.error} style={{ color: '#f87171', fontSize: 11 }}>
                        <AlertCircle size={12} />
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 140, textAlign: 'right' }}>
                      {new Date(log.sentAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBSCRIBERS TAB ── */}
      {tab === 'subscribers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={subFilter}
              onChange={e => { setSubFilter(e.target.value); setSubPage(1); }}
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="">All subscribers</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {subTotal} total
            </span>
          </div>

          <div style={card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Email', 'Status', 'Types', 'Last Email', 'Subscribed On'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No subscribers</td></tr>
                )}
                {subscribers.map((s) => (
                  <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{s.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 9px', borderRadius: 20,
                        background: s.isSubscribed ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                        color: s.isSubscribed ? '#4ade80' : '#f87171',
                      }}>
                        {s.isSubscribed ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {s.subscriptionTypes?.join(', ') || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {s.lastEmailSentAt ? new Date(s.lastEmailSentAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button
                style={btnSecondary}
                disabled={subPage <= 1}
                onClick={() => setSubPage(p => p - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Page {subPage} · {subTotal} records
              </span>
              <button
                style={btnSecondary}
                disabled={subPage * 20 >= subTotal}
                onClick={() => setSubPage(p => p + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {tab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={logStatusFilter}
              onChange={e => { setLogStatusFilter(e.target.value); setLogPage(1); }}
              style={{ ...inputStyle, width: 140 }}
            >
              <option value="">All statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={logTypeFilter}
              onChange={e => { setLogTypeFilter(e.target.value); setLogPage(1); }}
              style={{ ...inputStyle, width: 160 }}
            >
              <option value="">All types</option>
              <option value="welcome">Welcome</option>
              <option value="daily_update">Daily Update</option>
              <option value="payment_success">Payment Success</option>
              <option value="subscription_cancelled">Subscription Cancelled</option>
            </select>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{logTotal} total</span>
          </div>

          <div style={card}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                  {['Email', 'Type', 'Status', 'Error', 'Sent At'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No logs found</td></tr>
                )}
                {logs.map((log) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 12 }}>{log.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 20,
                        background: 'rgba(139,92,246,0.12)', color: '#a78bfa',
                      }}>
                        {log.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 9px', borderRadius: 20,
                        background: log.status === 'sent' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                        color: log.status === 'sent' ? '#4ade80' : '#f87171',
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#f87171', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.error || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                      {new Date(log.sentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button style={btnSecondary} disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Page {logPage} · {logTotal} logs
              </span>
              <button style={btnSecondary} disabled={logPage * 30 >= logTotal} onClick={() => setLogPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIG TAB ── */}
      {tab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
          {/* Mailgun Config */}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={16} style={{ color: '#a78bfa' }} />
              Mailgun Configuration
              {config.source === 'db' && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: '#4ade80', marginLeft: 'auto' }}>
                  Saved in DB
                </span>
              )}
              {config.source === 'env' && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(248,163,34,0.12)', color: '#fbbf24', marginLeft: 'auto' }}>
                  From .env
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* API Key */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Mailgun API Key
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={config.mailgunApiKey}
                    placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    onChange={e => { setConfig(c => ({ ...c, mailgunApiKey: e.target.value })); setConfigDirty(true); }}
                    style={{ ...inputStyle, paddingRight: 40 }}
                  />
                  <button
                    onClick={() => setShowKey(s => !s)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Found in your Mailgun dashboard → API Keys. Format: <code>key-abc...</code>
                </p>
              </div>

              {/* API URL */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  Mailgun API URL
                </label>
                <input
                  type="text"
                  value={config.mailgunApiUrl}
                  placeholder="https://api.mailgun.net/v3/YOUR_DOMAIN/messages"
                  onChange={e => { setConfig(c => ({ ...c, mailgunApiUrl: e.target.value })); setConfigDirty(true); }}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Replace <code>YOUR_DOMAIN</code> with your verified Mailgun domain (e.g. <code>mg.aiforjob.ai</code>)
                </p>
              </div>

              {/* From */}
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  From Address
                </label>
                <input
                  type="text"
                  value={config.mailgunFrom}
                  placeholder='AIForJob.ai <postmaster@aiforjob.ai>'
                  onChange={e => { setConfig(c => ({ ...c, mailgunFrom: e.target.value })); setConfigDirty(true); }}
                  style={inputStyle}
                />
              </div>

              {/* Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={config.isActive}
                    onChange={e => { setConfig(c => ({ ...c, isActive: e.target.checked })); setConfigDirty(true); }}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  Email sending enabled
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                <button
                  style={{ ...btnPrimary, opacity: (!configDirty || configSaving) ? 0.5 : 1 }}
                  onClick={saveConfig}
                  disabled={!configDirty || configSaving}
                >
                  {configSaving
                    ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Save size={14} />}
                  Save Configuration
                </button>
                {configMsg && (
                  <span style={{ fontSize: 13, color: configMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
                    {configMsg}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Test Email */}
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlaskConical size={16} style={{ color: '#60a5fa' }} />
              Send Test Email
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Sends a welcome email to the address below to verify your Mailgun config is working.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                style={{ ...inputStyle, flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && sendTest()}
              />
              <button
                style={{ ...btnPrimary, opacity: (!testEmail || testLoading) ? 0.5 : 1 }}
                onClick={sendTest}
                disabled={!testEmail || testLoading}
              >
                {testLoading
                  ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={14} />}
                Send
              </button>
            </div>
            {testMsg && (
              <p style={{ fontSize: 13, marginTop: 10, color: testMsg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
                {testMsg}
              </p>
            )}
          </div>

        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
