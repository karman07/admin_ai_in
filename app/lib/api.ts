export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.aiforjob.ai';

/** Authenticated fetch — use this for new admin API calls */
export const fetchApiAuth = (endpoint: string, options: RequestInit = {}) =>
    fetchApi(endpoint, options);

// Auth token management
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
    if (token) {
        localStorage.setItem('admin_token', token);
    } else {
        localStorage.removeItem('admin_token');
    }
}

export function getAccessToken(): string | null {
    if (accessToken) return accessToken;
    if (typeof window !== 'undefined') {
        accessToken = localStorage.getItem('admin_token');
    }
    return accessToken;
}

export function clearAuth() {
    accessToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
    }
}

async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}/${endpoint.replace(/^\//, '')}`;
    const token = getAccessToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, {
        ...options,
        headers,
    });
    if (res.status === 401 && !(options as any)._retry) {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;
        if (userStr && endpoint !== 'auth/login' && endpoint !== 'auth/refresh') {
            try {
                const user = JSON.parse(userStr);
                const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user._id, email: user.email }),
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    setAccessToken(data.accessToken);
                    const newHeaders = { ...headers, Authorization: `Bearer ${data.accessToken}` };
                    const retryRes = await fetch(url, { ...options, headers: newHeaders, _retry: true } as any);
                    if (!retryRes.ok) {
                        const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
                        throw new Error(err.message || `API Error ${retryRes.status}`);
                    }
                    return retryRes.json();
                }
            } catch (err) {
                // Refresh failed
            }
        }
        clearAuth();
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `API Error ${res.status}`);
    }
    return res.json();
}

async function fetchApiFormData(endpoint: string, formData: FormData, method = 'POST', _retry = false) {
    const url = `${API_BASE}/${endpoint.replace(/^\//, '')}`;
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, {
        method,
        body: formData,
        headers,
    });
    if (res.status === 401 && !_retry) {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;
        if (userStr && endpoint !== 'auth/login' && endpoint !== 'auth/refresh') {
            try {
                const user = JSON.parse(userStr);
                const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user._id, email: user.email }),
                });
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    setAccessToken(data.accessToken);
                    const newHeaders = { ...headers, Authorization: `Bearer ${data.accessToken}` };
                    const retryRes = await fetch(url, { method, body: formData, headers: newHeaders, _retry: true } as any);
                    if (!retryRes.ok) {
                        const err = await retryRes.json().catch(() => ({ message: retryRes.statusText }));
                        throw new Error(err.message || `API Error ${retryRes.status}`);
                    }
                    return retryRes.json();
                }
            } catch (err) {
                // Refresh failed
            }
        }
        clearAuth();
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `API Error ${res.status}`);
    }
    return res.json();
}

// Auth
export const authApi = {
    login: (email: string, password: string) =>
        fetchApi('auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    logout: () => fetchApi('auth/logout', { method: 'POST' }),
};

// Users (Admin)
export const usersApi = {
    getAll: () => fetchApi('users/admin/all'),
    getById: (id: string) => fetchApi(`users/${id}`),
    updatePlan: (id: string, data: { planId?: string; status: string; expiryDays?: number }) =>
        fetchApi(`users/admin/${id}/plan`, { method: 'PATCH', body: JSON.stringify(data) }),
    verify: (id: string, data: { isEmailVerified?: boolean; isPhoneVerified?: boolean }) =>
        fetchApi(`users/admin/${id}/verify`, { method: 'PATCH', body: JSON.stringify(data) }),
    setRole: (id: string, role: string) =>
        fetchApi(`users/admin/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    deleteUser: (id: string) =>
        fetchApi(`users/admin/${id}`, { method: 'DELETE' }),
};

// Analytics
export const analyticsApi = {
    getDashboardStats: () => fetchApi('analytics/admin/dashboard'),
    getSummary: () => fetchApi('analytics/summary'),
    getVisitors: () => fetchApi('analytics/visitors'),
    getSessions: (limit = 50) => fetchApi(`analytics/sessions?limit=${limit}`),
    getRecentSessions: (limit = 20) => fetchApi(`analytics/admin/recent-sessions?limit=${limit}`),
    getPageViews: (limit = 50) => fetchApi(`analytics/pageviews?limit=${limit}`),
    getPopularPages: (limit = 10) => fetchApi(`analytics/admin/popular-pages?limit=${limit}`),
    getAIUsageStats: () => fetchApi('analytics/admin/ai-usage'),
};

// Subscriptions
export const subscriptionsApi = {
    getAll: (country?: string) => fetchApi(`subscriptions${country ? `?country=${country}` : ''}`),
    getById: (id: string) => fetchApi(`subscriptions/${id}`),
    create: (data: any) => fetchApi('subscriptions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi(`subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    activate: (id: string) => fetchApi(`subscriptions/${id}/activate`, { method: 'PATCH' }),
    deactivate: (id: string) => fetchApi(`subscriptions/${id}/deactivate`, { method: 'PATCH' }),
    delete: (id: string) => fetchApi(`subscriptions/${id}`, { method: 'DELETE' }),
    generateRazorpayPlan: (id: string) => fetchApi(`subscriptions/${id}/generate-razorpay-plan`, { method: 'POST' }),
};

// Payments (Admin)
export const paymentsApi = {
    getAnalytics: () => fetchApi('payments/admin/analytics'),
    getAll: (limit = 20, offset = 0) => fetchApi(`payments/admin/all?limit=${limit}&offset=${offset}`),
};

// AI Config (API Keys)
export const aiConfigApi = {
    getKeys: () => fetchApi('ai-config/keys'),
    addKey: (data: { provider: 'gemini' | 'groq'; label: string; value: string }) =>
        fetchApi('ai-config/keys', { method: 'POST', body: JSON.stringify(data) }),
    setActive: (id: string) => fetchApi(`ai-config/keys/${id}/activate`, { method: 'PATCH' }),
    deleteKey: (id: string) => fetchApi(`ai-config/keys/${id}`, { method: 'DELETE' }),
    getModels: () => fetchApi('ai-config/models'),
    setActiveModel: (provider: 'gemini' | 'groq', modelId: string) =>
        fetchApi('ai-config/models/activate', { method: 'PATCH', body: JSON.stringify({ provider, modelId }) }),
};

// Subjects
export const subjectsApi = {
    getAll: () => fetchApi('subjects'),
    getById: (id: string) => fetchApi(`subjects/${id}`),
    create: (formData: FormData) => fetchApiFormData('subjects', formData),
    update: (id: string, formData: FormData) => fetchApiFormData(`subjects/${id}`, formData, 'PATCH'),
    delete: (id: string) => fetchApi(`subjects/${id}`, { method: 'DELETE' }),
};

// Resources
export const resourcesApi = {
    getAll: () => fetchApi('resources/admin/all'),
    getById: (id: string) => fetchApi(`resources/${id}`),
    create: (formData: FormData) => fetchApiFormData('resources', formData),
    update: (id: string, formData: FormData) => fetchApiFormData(`resources/${id}`, formData, 'PATCH'),
    delete: (id: string) => fetchApi(`resources/${id}`, { method: 'DELETE' }),
};

// Lessons
export const lessonsApi = {
    getBySubject: (subjectId: string) => fetchApi(`lessons/subject/${subjectId}`),
    getById: (id: string) => fetchApi(`lessons/${id}`),
    create: (data: any) => fetchApi('lessons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi(`lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`lessons/${id}`, { method: 'DELETE' }),
};

// Quizzes
export const quizzesApi = {
    getByLesson: (lessonId: string) => fetchApi(`quizzes/lesson/${lessonId}`),
    getById: (id: string) => fetchApi(`quizzes/${id}`),
    create: (data: any) => fetchApi('quizzes', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`quizzes/${id}`, { method: 'DELETE' }),
};

// Discounts & Coupons (Admin)
export const discountsApi = {
    getAll: (type?: string, isActive?: boolean) => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (isActive !== undefined) params.append('isActive', String(isActive));
        const q = params.toString();
        return fetchApi(`discounts/admin/coupons${q ? `?${q}` : ''}`);
    },
    getAnalytics: () => fetchApi('discounts/admin/analytics'),
    getStats: (id: string) => fetchApi(`discounts/admin/coupons/${id}/stats`),
    create: (data: any) => fetchApi('discounts/admin/coupons', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi(`discounts/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    toggle: (id: string) => fetchApi(`discounts/admin/coupons/${id}/toggle`, { method: 'PATCH' }),
    delete: (id: string) => fetchApi(`discounts/admin/coupons/${id}`, { method: 'DELETE' }),
    generateReferral: (data: any) => fetchApi('discounts/admin/coupons/generate-referral', { method: 'POST', body: JSON.stringify(data) }),
};

// Reviews (Admin)
export const reviewsApi = {
    getStats: () => fetchApi('reviews/admin/stats'),
    getAll: (params?: { page?: number; limit?: number; rating?: number; flag?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (params?.page)   q.append('page',   String(params.page));
        if (params?.limit)  q.append('limit',  String(params.limit));
        if (params?.rating) q.append('rating', String(params.rating));
        if (params?.flag)   q.append('flag',   params.flag);
        if (params?.search) q.append('search', params.search);
        const qs = q.toString();
        return fetchApi(`reviews/admin/all${qs ? `?${qs}` : ''}`);
    },
    flag: (id: string, flag: string) => fetchApi(`reviews/admin/${id}/flag`, { method: 'PATCH', body: JSON.stringify({ flag }) }),
    pin: (id: string, isPinned: boolean) => fetchApi(`reviews/admin/${id}/pin`, { method: 'PATCH', body: JSON.stringify({ isPinned }) }),
    delete: (id: string) => fetchApi(`reviews/admin/${id}`, { method: 'DELETE' }),
};

// Universities (Admin)
export const universitiesApi = {
    getAll: () => fetchApi('universities'),
    create: (data: any) => fetchApi('universities', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchApi(`universities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi(`universities/${id}`, { method: 'DELETE' }),
};

// Interview Results (Admin)
export const resultsApi = {
    getAllAdmin: (params?: { page?: number; limit?: number; roundType?: string; search?: string }) => {
        const q = new URLSearchParams();
        if (params?.page)      q.append('page',      String(params.page));
        if (params?.limit)     q.append('limit',     String(params.limit));
        if (params?.roundType) q.append('roundType', params.roundType);
        if (params?.search)    q.append('search',    params.search);
        const qs = q.toString();
        return fetchApi(`results/admin/all${qs ? `?${qs}` : ''}`);
    },
};

// Jobs (Admin)
export const jobsApi = {
    getStats:       () => fetchApi('jobs/admin/stats'),
    getConfig:      () => fetchApi('jobs/admin/config'),
    updateConfig:   (data: any) => fetchApi('jobs/admin/config', { method: 'POST', body: JSON.stringify(data) }),
    syncNow:        () => fetchApi('jobs/sync-now'),
};

// Notifications (Admin)
export const notificationsApi = {
    sendToAll: (title: string, body: string, data?: any) =>
        fetchApi('admin/notifications/send-all', { method: 'POST', body: JSON.stringify({ title, body, data }) }),
    sendToUser: (userId: string, title: string, body: string, data?: any) =>
        fetchApi(`admin/notifications/send-user/${userId}`, { method: 'POST', body: JSON.stringify({ title, body, data }) }),
};
