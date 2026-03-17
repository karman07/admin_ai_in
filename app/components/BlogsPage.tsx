'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Check, AlertCircle, Calendar, User } from 'lucide-react';
import { getAccessToken } from '../lib/api';

interface Blog {
  title: string;
  slug: string;
  category: string;
  author: string;
  date: string;
  excerpt: string;
  coverImage: string;
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Create Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/blogs?search=${search}`, {
         headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [search]);

  // Auto-slug generator
  useEffect(() => {
    if (title) {
      setSlug(title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-'));
    }
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ title, slug, category, excerpt, content, coverImage: coverImage || undefined })
      });

      if (!res.ok) {
        throw new Error('Failed to create blog. Ensure fields are adequate.');
      }

      setSuccess('Blog article created successfully!');
      setTitle('');
      setCategory('');
      setExcerpt('');
      setContent('');
      setCoverImage('');
      setIsModalOpen(false);
      fetchBlogs();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'white', marginBottom: 4 }}>Blogs</h1>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Manage published markdown content on files disk.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#6c63ff',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(108, 99, 255, 0.2)',
          }}
        >
          <Plus size={16} />
          Write Blog
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)' }} />
          <input
            type="text"
            placeholder="Search blogs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              padding: '10px 12px 10px 36px',
              borderRadius: 10,
              color: 'white',
              fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Dashboard Lists */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading content...</div>
        ) : blogs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 500 }}>
              <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--card-border)' }}>
                <tr>
                  <th style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 600 }}>Title</th>
                  <th style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 600 }}>Author</th>
                  <th style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 600 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {blogs.map((b, i) => (
                  <tr key={i} style={{ borderBottom: i === blogs.length - 1 ? 'none' : '1px solid var(--card-border)' }}>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'white', fontWeight: 500 }}>{b.title}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>{b.category}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--muted-foreground)' }}>{b.author}</td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted-foreground)' }}>{b.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>No articles found. Write your first blog!</div>
        )}
      </div>

      {/* Write Blog Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 16, width: '90%', maxWidth: 700, padding: 24, maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 16 }}>Write New Blog</h2>

            {error && (
              <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#f87171', fontSize: 13, marginBottom: 16, display: 'flex', gap: 8 }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 14, flexDirection: 'column' }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4, display: 'block' }}>Title</label>
                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="How to Ace DSA Rounds" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '10px 12px', borderRadius: 8, color: 'white', fontSize: 13 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4, display: 'block' }}>Slug (Auto-generated)</label>
                <input required type="text" value={slug} readOnly style={{ width: '100%', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '10px 12px', borderRadius: 8, color: '#9ca3af', fontSize: 12 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4, display: 'block' }}>Category</label>
                <input required type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Interview Prep" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '10px 12px', borderRadius: 8, color: 'white', fontSize: 13 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4, display: 'block' }}>Cover Image URL (Optional)</label>
                <input type="text" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '10px 12px', borderRadius: 8, color: 'white', fontSize: 13 }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4, display: 'block' }}>Excerpt / Summary</label>
                <textarea required rows={2} value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Short summary..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '10px 12px', borderRadius: 8, color: 'white', fontSize: 13, resize: 'none' }} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4, display: 'block' }}>Content (# Markdown supported)</label>
                <textarea required rows={10} value={content} onChange={e => setContent(e.target.value)} placeholder="# Introduction\n\nStart writing..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)', padding: '12px', borderRadius: 8, color: 'white', fontSize: 13, fontFamily: 'monospace' }} />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'white', padding: '10px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ background: '#6c63ff', border: 'none', color: 'white', padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Creating...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
