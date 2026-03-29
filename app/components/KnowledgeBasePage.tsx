'use client';
import React, { useEffect, useState, useRef } from 'react';
import { 
    Database, 
    Plus, 
    Trash2, 
    Search, 
    FileText, 
    Loader2, 
    Upload, 
    BookOpen, 
    AlertCircle, 
    CheckCircle2, 
    X, 
    Building2, 
    Edit3,
    ExternalLink,
    Star,
    Tag as TagIcon,
    ChevronRight
} from 'lucide-react';
import { knowledgeApi, API_BASE } from '../lib/api';
import { toast } from 'react-hot-toast';

interface Topic {
    _id: string;
    name: string;
    description: string;
    category: string;
    tags?: string[];
    logoUrl?: string;
    jdFileId?: string;
    jdFileName?: string;
    createdAt: string;
}

interface KnowledgeDoc {
    _id: string;
    topicId: string;
    fileName: string;
    originalName: string;
    status: 'pending' | 'indexing' | 'indexed' | 'error';
    chunkCount?: number;
    errorDetails?: string;
    createdAt: string;
}

export default function KnowledgeBasePage() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [docLoading, setDocLoading] = useState(false);
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [topicForm, setTopicForm] = useState({ name: '', description: '', category: '' });
    const [editForm, setEditForm] = useState({ name: '', description: '', category: '', tags: [] as string[] });
    const [newTag, setNewTag] = useState('');
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [queryResult, setQueryResult] = useState<any[] | null>(null);
    const [queryLoading, setQueryLoading] = useState(false);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const jdInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const fetchTopics = async () => {
        setLoading(true);
        try {
            const data = await knowledgeApi.getTopics();
            setTopics(data);
        } catch (e) {
            toast.error('Failed to fetch topics');
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async (topicId: string, silent = false) => {
        if (!silent) setDocLoading(true);
        try {
            const data = await knowledgeApi.getDocuments(topicId);
            setDocuments(data);
        } catch (e) {
            if (!silent) toast.error('Failed to fetch documents');
        } finally {
            if (!silent) setDocLoading(false);
        }
    };

    useEffect(() => {
        fetchTopics();
    }, []);

    useEffect(() => {
        if (selectedTopic) {
            fetchDocuments(selectedTopic._id);
            setQueryResult(null);
            setSearchQuery('');
            setEditForm({
                name: selectedTopic.name,
                description: selectedTopic.description || '',
                category: selectedTopic.category || '',
                tags: selectedTopic.tags || []
            });
        }
    }, [selectedTopic]);

    // Polling for indexing documents
    useEffect(() => {
        let interval: any;
        if (selectedTopic && documents.some(d => d.status === 'indexing')) {
            interval = setInterval(() => {
                fetchDocuments(selectedTopic._id, true);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [selectedTopic, documents]);

    const handleCreateTopic = async () => {
        try {
            await knowledgeApi.createTopic(topicForm);
            setShowTopicModal(false);
            setTopicForm({ name: '', description: '', category: '' });
            fetchTopics();
            toast.success('Topic created');
        } catch (e) {
            toast.error('Failed to create topic');
        }
    };

    const handleUpdateTopic = async () => {
        if (!selectedTopic) return;
        try {
            await knowledgeApi.updateTopic(selectedTopic._id, editForm);
            setShowEditModal(false);
            fetchTopics();
            setSelectedTopic(prev => prev ? { ...prev, ...editForm } : null);
            toast.success('Topic updated');
        } catch (e) {
            toast.error('Failed to update topic');
        }
    };

    const handleDeleteTopic = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this topic and all its associated vector embeddings? This cannot be undone.')) return;
        try {
            await knowledgeApi.deleteTopic(id);
            if (selectedTopic?._id === id) setSelectedTopic(null);
            fetchTopics();
            toast.success('Topic deleted');
        } catch (e) {
            toast.error('Failed to delete topic');
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedTopic) return;
        const loadingToast = toast.loading('Uploading logo...');
        try {
            const res = await knowledgeApi.uploadLogo(selectedTopic._id, file);
            setSelectedTopic(prev => prev ? { ...prev, logoUrl: res.logoUrl } : null);
            fetchTopics();
            toast.success('Logo uploaded');
        } catch (e) {
            toast.error('Logo upload failed');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleJdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedTopic) return;
        const loadingToast = toast.loading('Uploading official JD...');
        try {
            await knowledgeApi.uploadJd(selectedTopic._id, file);
            fetchDocuments(selectedTopic._id);
            fetchTopics();
            // Refresh selected topic to show new JD
            const data = await knowledgeApi.getTopics();
            const updated = data.find((t: any) => t._id === selectedTopic._id);
            if (updated) setSelectedTopic(updated);
            toast.success('Official JD updated');
        } catch (e) {
            toast.error('JD upload failed');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedTopic || !e.target.files?.length) return;
        setUploading(true);
        const files = Array.from(e.target.files);
        try {
            for (const file of files) {
                await knowledgeApi.uploadDocument(selectedTopic._id, file);
            }
            fetchDocuments(selectedTopic._id);
            toast.success('Documents uploaded and indexing started');
        } catch (e) {
            toast.error('Failed to upload some files');
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleDeleteDoc = async (id: string) => {
        if (!confirm('Remove this document from the knowledge base?')) return;
        try {
            await knowledgeApi.deleteDocument(id);
            if (selectedTopic) fetchDocuments(selectedTopic._id);
            toast.success('Document removed');
        } catch (e) {
            toast.error('Failed to delete document');
        }
    };

    const handleQuery = async () => {
        if (!selectedTopic || !searchQuery.trim()) return;
        setQueryLoading(true);
        try {
            const data = await knowledgeApi.query(selectedTopic._id, searchQuery);
            setQueryResult(data);
        } catch (e) {
            toast.error('Query failed');
        } finally {
            setQueryLoading(false);
        }
    };

    const removeTag = (tag: string) => {
        setEditForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };

    const addTag = () => {
        const tag = newTag.trim();
        if (tag && !editForm.tags.includes(tag)) {
            setEditForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
            setNewTag('');
        }
    };

    return (
        <div style={{ padding: '24px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }} className="animate-fadeIn">
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em' }}>
                        <Database size={32} style={{ display: 'inline', marginRight: 12, verticalAlign: 'middle', color: '#6c63ff' }} />
                        Knowledge <span style={{ color: '#6c63ff' }}>HUB</span>
                    </h1>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: 13, marginTop: 4, fontWeight: 500, opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Manage technical grounding and branded interview rounds
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setShowTopicModal(true)} style={{ padding: '12px 24px', fontWeight: 700 }}>
                    <Plus size={18} /> New Round
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 32 }}>
                {/* Left Side: Topics List */}
                <div className="glass-card" style={{ padding: 20, height: 'calc(100vh - 180px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                            <input 
                                className="form-input" 
                                placeholder="Search rounds..." 
                                style={{ paddingLeft: 36, fontSize: 13, height: 44, borderRadius: 12 }}
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 16 }} />)
                        ) : topics.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', opacity: 0.3 }}>
                                <BookOpen size={48} style={{ marginBottom: 16, display: 'block', margin: '0 auto' }} />
                                <p style={{ fontSize: 13, fontWeight: 700 }}>No interview rounds found</p>
                            </div>
                        ) : topics.map(topic => (
                            <div 
                                key={topic._id} 
                                onClick={() => setSelectedTopic(topic)}
                                style={{ 
                                    padding: '14px 18px', 
                                    cursor: 'pointer', 
                                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                                    borderRadius: 16,
                                    border: selectedTopic?._id === topic._id ? '1px solid rgba(108,99,255,0.4)' : '1px solid transparent',
                                    background: selectedTopic?._id === topic._id ? 'rgba(108,99,255,0.08)' : 'rgba(255,255,255,0.02)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    boxShadow: selectedTopic?._id === topic._id ? '0 8px 20px -8px rgba(108,99,255,0.2)' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: selectedTopic?._id === topic._id ? '#6c63ff' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {topic.logoUrl ? (
                                            <img src={`${API_BASE}${topic.logoUrl}`} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" />
                                        ) : (
                                            <Building2 size={18} color={selectedTopic?._id === topic._id ? 'white' : 'var(--muted-foreground)'} />
                                        )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: selectedTopic?._id === topic._id ? 'white' : 'inherit' }}>{topic.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>{topic.category || 'Specialized'}</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => handleDeleteTopic(topic._id, e)}
                                    style={{ background: 'none', border: 'none', padding: 6, color: 'var(--muted-foreground)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s' }}
                                    className="hover-danger show-on-hover"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side: Topic Details & Documents */}
                <div className="glass-card" style={{ padding: 0, minHeight: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {selectedTopic ? (
                        <div className="animate-fadeIn" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Topic Header with Logo Up */}
                            <div style={{ padding: 32, borderBottom: '1px solid var(--card-border)', background: 'linear-gradient(to right, rgba(108,99,255,0.02), transparent)' }}>
                                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                                    <div 
                                        onClick={() => logoInputRef.current?.click()}
                                        style={{ 
                                            width: 100, 
                                            height: 100, 
                                            borderRadius: 24, 
                                            background: 'rgba(255,255,255,0.03)', 
                                            border: '2px dashed var(--card-border)', 
                                            display: 'flex', 
                                            flexDirection: 'column',
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        className="hover-border-indigo"
                                    >
                                        {selectedTopic.logoUrl ? (
                                            <img src={`${API_BASE}${selectedTopic.logoUrl}`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} alt="" />
                                        ) : (
                                            <>
                                                <Upload size={20} style={{ opacity: 0.4, marginBottom: 4 }} />
                                                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', opacity: 0.6 }}>Logo</span>
                                            </>
                                        )}
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="show-on-hover">
                                            <Upload size={20} color="white" />
                                        </div>
                                    </div>
                                    <input type="file" ref={logoInputRef} hidden accept="image/*" onChange={handleLogoUpload} />

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                            <h2 style={{ fontSize: 32, fontWeight: 900 }}>{selectedTopic.name}</h2>
                                            <button 
                                                onClick={() => setShowEditModal(true)}
                                                style={{ background: 'rgba(108,99,255,0.1)', border: 'none', padding: 8, borderRadius: 10, cursor: 'pointer', color: '#6c63ff' }}
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                            <span style={{ padding: '4px 12px', background: 'rgba(108,99,255,0.1)', color: '#6c63ff', borderRadius: 100, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                                                {selectedTopic.category || 'Specialized'}
                                            </span>
                                            {selectedTopic.tags?.map(tag => (
                                                <span key={tag} style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--muted-foreground)', border: '1px solid var(--card-border)', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                        <p style={{ color: 'var(--muted-foreground)', fontSize: 14, lineHeight: 1.6, maxWidth: 600 }}>
                                            {selectedTopic.description || 'No description provided for this interview round.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: 32, flex: 1, overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                                    
                                    {/* Column 1: JDs and Grounding */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                        {/* Official JD */}
                                        <div className="glass-card" style={{ padding: 24, border: '1px solid rgba(108,99,255,0.2)' }}>
                                            <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Star size={18} color="#6c63ff" fill="#6c63ff" /> Official Job Description
                                            </h3>
                                            {selectedTopic.jdFileId ? (
                                                <div style={{ padding: 16, background: 'rgba(108,99,255,0.05)', borderRadius: 16, border: '1px solid rgba(108,99,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{selectedTopic.jdFileName}</div>
                                                            <a href={`${API_BASE}/knowledge/documents/${selectedTopic.jdFileId}/view`} target="_blank" style={{ fontSize: 11, color: '#6c63ff', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                                PREVIEW PDF <ExternalLink size={10} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => jdInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }} className="hover-indigo">
                                                        <Upload size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => jdInputRef.current?.click()}
                                                    style={{ padding: 32, border: '2px dashed var(--card-border)', borderRadius: 20, textAlign: 'center', cursor: 'pointer' }}
                                                    className="hover-border-indigo"
                                                >
                                                    <Upload size={24} style={{ opacity: 0.3, marginBottom: 12 }} />
                                                    <p style={{ fontSize: 13, fontWeight: 700 }}>Upload Official JD</p>
                                                    <p style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>This PDF will be displayed to candidates.</p>
                                                </div>
                                            )}
                                            <input type="file" ref={jdInputRef} hidden accept=".pdf" onChange={handleJdUpload} />
                                        </div>

                                        {/* Grounding Materials */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <h3 style={{ fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <BookOpen size={18} color="#6c63ff" /> Technical Grounding (RAG)
                                                </h3>
                                                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => docInputRef.current?.click()}>
                                                    <Plus size={14} /> Add Materials
                                                </button>
                                                <input type="file" ref={docInputRef} hidden multiple accept=".pdf" onChange={handleFileUpload} />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {documents.filter(d => d._id !== selectedTopic.jdFileId).length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.3, border: '1px solid var(--card-border)', borderRadius: 20 }}>
                                                        <p style={{ fontSize: 12, fontWeight: 600 }}>No additional training data</p>
                                                    </div>
                                                ) : documents.filter(d => d._id !== selectedTopic.jdFileId).map(doc => (
                                                    <div key={doc._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--card-border)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <div style={{ 
                                                                width: 32, 
                                                                height: 32, 
                                                                borderRadius: 8, 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center',
                                                                background: doc.status === 'indexed' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
                                                                color: doc.status === 'indexed' ? '#4ade80' : 'inherit'
                                                            }}>
                                                                {doc.status === 'indexing' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 700, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.originalName}</div>
                                                                <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: doc.status === 'indexed' ? '#4ade80' : doc.status === 'error' ? '#f87171' : 'var(--muted-foreground)' }}>
                                                                    {doc.status} {doc.chunkCount ? `• ${doc.chunkCount} chunks` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleDeleteDoc(doc._id)}
                                                            style={{ background: 'none', border: 'none', padding: 6, color: '#f87171', cursor: 'pointer', borderRadius: 8 }}
                                                            className="hover-bg-danger"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Test & Preview */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                                        {/* Query Interface */}
                                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 24, border: '1px solid var(--card-border)' }}>
                                            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Search size={16} color="#6c63ff" /> Retrieval Playground
                                            </h3>
                                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                                <input 
                                                    className="form-input" 
                                                    placeholder="Test what AI knows about this round..." 
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                                                    style={{ height: 44, fontSize: 13 }}
                                                />
                                                <button className="btn-primary" onClick={handleQuery} disabled={queryLoading || !searchQuery.trim()} style={{ height: 44, width: 44, padding: 0 }}>
                                                    {queryLoading ? <Loader2 className="animate-spin" size={16} /> : <ChevronRight size={18} />}
                                                </button>
                                            </div>

                                            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }} className="custom-scrollbar">
                                                {queryResult ? (
                                                    queryResult.length === 0 ? (
                                                        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', textAlign: 'center', padding: 20 }}>No knowledge found for this query.</p>
                                                    ) : queryResult.map((res, i) => (
                                                        <div key={i} style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)', fontSize: 13 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                <span style={{ fontWeight: 800, color: '#6c63ff', fontSize: 10, textTransform: 'uppercase' }}>Grounding Chunk {i+1}</span>
                                                            </div>
                                                            <p style={{ lineHeight: 1.6, opacity: 0.9 }}>{res.content}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.3 }}>
                                                        <Database size={32} style={{ marginBottom: 12 }} />
                                                        <p style={{ fontSize: 11, fontWeight: 700 }}>Results will appear here</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                            <Database size={80} style={{ marginBottom: 24, color: '#6c63ff' }} />
                            <h2 style={{ fontSize: 24, fontWeight: 900 }}>Knowledge Base</h2>
                            <p style={{ fontWeight: 600 }}>Select an interview track to manage its vector memory</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Topic Modal */}
            {showTopicModal && (
                <div className="modal-overlay" onClick={() => setShowTopicModal(false)}>
                    <div className="modal-content animate-scaleIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 32, borderRadius: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 24, fontWeight: 900 }}>Create Interview Track</h2>
                            <button onClick={() => setShowTopicModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, display: 'block', opacity: 0.6 }}>Round Name / Company</label>
                                <input className="form-input" value={topicForm.name} onChange={e => setTopicForm({...topicForm, name: e.target.value})} placeholder="e.g. Google Coding Round" style={{ height: 48 }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, display: 'block', opacity: 0.6 }}>Classification</label>
                                <select className="form-input" value={topicForm.category} onChange={e => setTopicForm({...topicForm, category: e.target.value})} style={{ height: 48 }}>
                                    <option value="Technical">Technical</option>
                                    <option value="System Design">System Design</option>
                                    <option value="Behavioral">Behavioral</option>
                                    <option value="HR">HR</option>
                                    <option value="Product Management">Product Management</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, display: 'block', opacity: 0.6 }}>Description</label>
                                <textarea className="form-input" rows={4} value={topicForm.description} onChange={e => setTopicForm({...topicForm, description: e.target.value})} placeholder="Briefly describe what this interview focuses on..." style={{ resize: 'none' }} />
                            </div>
                            <button className="btn-primary" style={{ width: '100%', marginTop: 12, height: 52, fontSize: 15, fontWeight: 800 }} onClick={handleCreateTopic} disabled={!topicForm.name.trim()}>
                                Initialize Track
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Topic Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content animate-scaleIn" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 32, borderRadius: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 24, fontWeight: 900 }}>Edit Interview Track</h2>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, display: 'block', opacity: 0.6 }}>Track Name</label>
                                <input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} style={{ height: 48 }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, display: 'block', opacity: 0.6 }}>Specialization</label>
                                <input className="form-input" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} style={{ height: 48 }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, display: 'block', opacity: 0.6 }}>Metadata Tags</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                    {editForm.tags.map(tag => (
                                        <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: tag === 'Featured' ? 'rgba(234, 179, 8, 0.2)' : tag === 'Premium' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(108,99,255,0.1)', color: tag === 'Featured' ? '#eab308' : tag === 'Premium' ? '#a855f7' : '#6c63ff', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                                            {tag} <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)} />
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    <button 
                                        type="button"
                                        onClick={() => editForm.tags.includes('Featured') ? removeTag('Featured') : setEditForm(prev => ({ ...prev, tags: [...prev.tags, 'Featured'] }))}
                                        style={{ 
                                            padding: '6px 12px', 
                                            borderRadius: 8, 
                                            fontSize: 11, 
                                            fontWeight: 800,
                                            background: editForm.tags.includes('Featured') ? '#eab308' : 'rgba(234, 179, 8, 0.1)',
                                            color: editForm.tags.includes('Featured') ? 'black' : '#eab308',
                                            border: '1px solid #eab308',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ★ Featured
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => editForm.tags.includes('Premium') ? removeTag('Premium') : setEditForm(prev => ({ ...prev, tags: [...prev.tags, 'Premium'] }))}
                                        style={{ 
                                            padding: '6px 12px', 
                                            borderRadius: 8, 
                                            fontSize: 11, 
                                            fontWeight: 800,
                                            background: editForm.tags.includes('Premium') ? '#a855f7' : 'rgba(147, 51, 234, 0.1)',
                                            color: editForm.tags.includes('Premium') ? 'white' : '#a855f7',
                                            border: '1px solid #a855f7',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ◆ Premium
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input 
                                        className="form-input" 
                                        value={newTag} 
                                        onChange={e => setNewTag(e.target.value)} 
                                        placeholder="Add tag..." 
                                        onKeyDown={e => e.key === 'Enter' && addTag()}
                                        style={{ height: 40, fontSize: 12 }} 
                                    />
                                    <button className="btn-secondary" onClick={addTag} style={{ height: 40, padding: '0 12px' }}>Add</button>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 8, display: 'block', opacity: 0.6 }}>Track Description</label>
                                <textarea className="form-input" rows={4} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} style={{ resize: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button className="btn-secondary" style={{ flex: 1, height: 52 }} onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button className="btn-primary" style={{ flex: 2, height: 52, fontSize: 15, fontWeight: 800 }} onClick={handleUpdateTopic}>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--card-border);
                    border-radius: 24px;
                }
                .form-input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--card-border);
                    color: white;
                    width: 100%;
                    padding: 0 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    transition: all 0.2s;
                    outline: none;
                }
                .form-input:focus {
                    border-color: #6c63ff;
                    background: rgba(108,99,255,0.05);
                }
                .btn-primary {
                    background: #6c63ff;
                    color: white;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .btn-primary:hover:not(:disabled) {
                    background: #5b54e0;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(108,99,255,0.3);
                }
                .btn-primary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .btn-secondary {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--card-border);
                    color: white;
                    border-radius: 12px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.08);
                }
                .hover-danger:hover {
                    color: #f87171 !important;
                    opacity: 1 !important;
                }
                .hover-bg-danger:hover {
                    background: rgba(248, 113, 113, 0.1) !important;
                }
                .hover-border-indigo:hover {
                    border-color: #6c63ff !important;
                }
                .hover-indigo:hover {
                    color: #6c63ff !important;
                }
                .show-on-hover {
                    opacity: 0;
                }
                div:hover > .show-on-hover {
                    opacity: 1;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .animate-fadeIn {
                    animation: fadeIn 0.4s ease-out;
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.9) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .skeleton {
                    background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
}
