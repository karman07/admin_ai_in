'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { LogIn, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi, setAccessToken } from '../lib/api';

export default function LoginPage({
    onLogin,
}: {
    onLogin: (user: any) => void;
}) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await authApi.login(email, password);

            // Check if user is admin
            if (data.user?.role !== 'admin') {
                setError('Access denied. Admin privileges required.');
                setLoading(false);
                return;
            }

            setAccessToken(data.accessToken);
            localStorage.setItem('admin_user', JSON.stringify(data.user));
            onLogin(data.user);
        } catch (e: any) {
            setError(e.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Background effects */}
            <div
                style={{
                    position: 'absolute',
                    top: '-20%',
                    left: '-10%',
                    width: '50%',
                    height: '50%',
                    background: 'radial-gradient(circle, rgba(108,99,255,0.15), transparent 60%)',
                    filter: 'blur(80px)',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    bottom: '-20%',
                    right: '-10%',
                    width: '50%',
                    height: '50%',
                    background: 'radial-gradient(circle, rgba(0,212,170,0.12), transparent 60%)',
                    filter: 'blur(80px)',
                }}
            />

            <div
                className="glass-card animate-fadeIn"
                style={{
                    width: 420,
                    padding: '40px 36px',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800 }}>
                        <span style={{ color: '#6c63ff' }}>AI for Job</span>
                    </h1>
                    <p
                        style={{
                            color: 'var(--muted-foreground)',
                            fontSize: 14,
                            marginTop: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <Shield size={14} /> Admin Dashboard
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 10,
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 20,
                            fontSize: 13,
                            color: '#f87171',
                        }}
                    >
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 16 }}>
                        <label
                            style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--muted-foreground)',
                                marginBottom: 6,
                            }}
                        >
                            Email Address
                        </label>
                        <input
                            className="form-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@aiforjob.ai"
                            required
                            autoFocus
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label
                            style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: 'var(--muted-foreground)',
                                marginBottom: 6,
                            }}
                        >
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="form-input"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ width: '100%', paddingRight: 44 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--muted-foreground)',
                                    cursor: 'pointer',
                                }}
                            >
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn-primary"
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: 15,
                            fontWeight: 600,
                            justifyContent: 'center',
                        }}
                    >
                        {loading ? (
                            <span
                                style={{
                                    display: 'inline-block',
                                    animation: 'spin 1s linear infinite',
                                    width: 18,
                                    height: 18,
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: '#fff',
                                    borderRadius: '50%',
                                }}
                            />
                        ) : (
                            <>
                                <LogIn size={18} /> Sign In
                            </>
                        )}
                    </button>
                </form>

                <p
                    style={{
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--muted-foreground)',
                        marginTop: 20,
                        opacity: 0.6,
                    }}
                >
                    Only admin users can access this dashboard
                </p>
            </div>
        </div>
    );
}
