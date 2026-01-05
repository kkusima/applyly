import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    storage,
    Profile,
    ResumeData,
    WorkExperience,
    Education,
    LeadershipExperience,
    Award,
    Publication,
    Grant,
    TeachingExperience,
    Conference,
    DateRange,
    emptyDateRange,
    MONTHS,
    MIN_YEAR,
    MAX_YEAR
} from '../utils/storage';
import { parseResume } from '../utils/parser';
import {
    Trash2, Copy, Check, Upload, Briefcase, User, FileText, MapPin,
    GraduationCap, Sparkles, Mail, Phone, Linkedin, Globe, Save,
    ChevronDown, ChevronRight, Award as AwardIcon, BookOpen, DollarSign,
    Presentation, Users, Edit3, X, Plus, Github, Lightbulb
} from 'lucide-react';

// ============================================================
// MAIN OPTIONS COMPONENT
// ============================================================

export const Options: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingMeta, setEditingMeta] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const list = await storage.getProfiles();
        const activeId = await storage.getActiveProfileId();
        setProfiles(list);
        setActiveProfile(activeId ? list.find(p => p.id === activeId) || list[0] || null : list[0] || null);
    };

    const handleProcessFile = async (file: File) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const resumeData = await parseResume(file);
            const newProfile: Profile = {
                id: crypto.randomUUID(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                description: '',
                resume: resumeData,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            const updated = [...profiles, newProfile];
            await storage.saveProfiles(updated);
            await storage.setActiveProfileId(newProfile.id);
            setProfiles(updated);
            setActiveProfile(newProfile);
        } catch (err) {
            alert('Failed to parse: ' + (err as Error).message);
        } finally {
            setIsUploading(false);
            setIsDragging(false);
        }
    };

    const createBlankProfile = async () => {
        const newProfile: Profile = {
            id: crypto.randomUUID(),
            name: `New Profile ${profiles.length + 1}`,
            description: '',
            resume: {
                personalInfo: { firstName: '', lastName: '', email: '', phone: '', linkedin: '', website: '', github: '', address: '' },
                workExperience: [],
                education: [],
                leadershipExperience: [],
                awards: [],
                publications: [],
                grants: [],
                teachingExperience: [],
                conferences: [],
                skills: []
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        const updated = [...profiles, newProfile];
        await storage.saveProfiles(updated);
        await storage.setActiveProfileId(newProfile.id);
        setProfiles(updated);
        setActiveProfile(newProfile);
        setEditingMeta(true); // Open edit mode so user can set name
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleProcessFile(file);
    }, [profiles]);

    const onZoneClick = () => fileInputRef.current?.click();

    const deleteProfile = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this profile?')) return;
        const updated = profiles.filter(p => p.id !== id);
        await storage.saveProfiles(updated);
        setProfiles(updated);
        if (activeProfile?.id === id) setActiveProfile(updated[0] || null);
    };

    // Multi-select functions
    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === profiles.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(profiles.map(p => p.id)));
        }
    };

    const deleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} profile(s)?`)) return;
        const updated = profiles.filter(p => !selectedIds.has(p.id));
        await storage.saveProfiles(updated);
        setProfiles(updated);
        setSelectedIds(new Set());
        setSelectMode(false);
        if (activeProfile && selectedIds.has(activeProfile.id)) {
            setActiveProfile(updated[0] || null);
        }
    };

    const duplicateSelected = async () => {
        if (selectedIds.size === 0) return;
        const toDuplicate = profiles.filter(p => selectedIds.has(p.id));
        const copies = toDuplicate.map(p => ({
            ...p,
            id: crypto.randomUUID(),
            name: `${p.name} (Copy)`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }));
        const updated = [...profiles, ...copies];
        await storage.saveProfiles(updated);
        setProfiles(updated);
        setSelectedIds(new Set());
        setSelectMode(false);
    };

    const selectProfile = async (p: Profile) => {
        if (hasChanges && !confirm('Discard unsaved changes?')) return;
        setActiveProfile(p);
        setHasChanges(false);
        await storage.setActiveProfileId(p.id);
    };

    const copyToClipboard = (text: string, id: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopyStatus({ ...copyStatus, [id]: true });
        setTimeout(() => setCopyStatus(prev => ({ ...prev, [id]: false })), 1500);
    };

    const updateProfile = (updates: Partial<Profile>) => {
        if (!activeProfile) return;
        setActiveProfile({ ...activeProfile, ...updates });
        setHasChanges(true);
    };

    const updateResume = (updates: Partial<ResumeData>) => {
        if (!activeProfile?.resume) return;
        updateProfile({ resume: { ...activeProfile.resume, ...updates } });
    };

    const saveChanges = async () => {
        if (!activeProfile) return;
        setIsSaving(true);
        await storage.updateProfile(activeProfile);
        setProfiles(profiles.map(p => p.id === activeProfile.id ? activeProfile : p));
        setHasChanges(false);
        setIsSaving(false);
    };

    return (
        <div className="flex" style={{ minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="flex items-center gap-md">
                        <div style={{ width: 40, height: 40, background: 'var(--accent)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>Applyly™</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Resume Manager</div>
                        </div>
                    </div>
                </div>

                <div className="sidebar-content">
                    <div className="sidebar-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontSize: 11, letterSpacing: '0.05em', fontWeight: 600, color: 'var(--text-muted)' }}>YOUR PROFILES</span>
                        {profiles.length > 0 && (
                            <button
                                onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                                style={{
                                    padding: '5px 12px',
                                    fontSize: 12,
                                    background: selectMode ? 'var(--accent)' : 'var(--bg-app)',
                                    color: selectMode ? 'white' : 'var(--text-main)',
                                    border: selectMode ? 'none' : '1px solid var(--border)',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: selectMode ? '0 2px 8px rgba(255, 122, 69, 0.3)' : 'none'
                                }}
                            >
                                {selectMode ? 'Done' : 'Select'}
                            </button>
                        )}
                    </div>

                    {/* Bulk action bar - Sleeker floating style */}
                    {selectMode && profiles.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: 8,
                            padding: '12px',
                            marginBottom: 20,
                            background: 'var(--bg-app)',
                            borderRadius: 12,
                            border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                        }}>
                            <button
                                onClick={selectAll}
                                style={{
                                    flex: '1.2',
                                    padding: '8px 4px',
                                    fontSize: 11,
                                    background: 'white',
                                    border: '1px solid var(--border)',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    color: 'var(--text-main)',
                                    fontWeight: 500
                                }}
                            >
                                {selectedIds.size === profiles.length ? 'Deselect' : 'Select All'}
                            </button>
                            <button
                                onClick={duplicateSelected}
                                disabled={selectedIds.size === 0}
                                style={{
                                    flex: 1,
                                    padding: '8px 4px',
                                    fontSize: 11,
                                    background: 'white',
                                    border: '1px solid var(--border)',
                                    borderRadius: 6,
                                    cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                                    color: selectedIds.size > 0 ? 'var(--accent)' : 'var(--text-muted)',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    opacity: selectedIds.size > 0 ? 1 : 0.6
                                }}
                            >
                                <Copy size={13} />
                                Copy {selectedIds.size > 0 && `(${selectedIds.size})`}
                            </button>
                            <button
                                onClick={deleteSelected}
                                disabled={selectedIds.size === 0}
                                style={{
                                    flex: 1,
                                    padding: '8px 4px',
                                    fontSize: 11,
                                    background: selectedIds.size > 0 ? '#fff5f5' : 'white',
                                    border: `1px solid ${selectedIds.size > 0 ? '#febcbc' : 'var(--border)'}`,
                                    borderRadius: 6,
                                    cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                                    color: selectedIds.size > 0 ? '#e03131' : 'var(--text-muted)',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    opacity: selectedIds.size > 0 ? 1 : 0.6
                                }}
                            >
                                <Trash2 size={13} />
                                Delete
                            </button>
                        </div>
                    )}

                    {profiles.length === 0 ? (
                        <div className="sidebar-empty" style={{ padding: '40px 20px' }}>
                            <div style={{ opacity: 0.5, marginBottom: 12 }}><FileText size={32} /></div>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Get started by uploading a PDF</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {profiles.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => selectMode ? null : selectProfile(p)}
                                    className={`sidebar-item ${activeProfile?.id === p.id && !selectMode ? 'active' : ''}`}
                                    style={{
                                        background: selectedIds.has(p.id) ? 'var(--accent-secondary)' : undefined,
                                        cursor: selectMode ? 'default' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        borderRadius: 10,
                                        padding: '10px 12px',
                                        border: selectedIds.has(p.id) ? '1px solid var(--accent-light)' : '1px solid transparent'
                                    }}
                                >
                                    {selectMode ? (
                                        <div
                                            onClick={(e) => toggleSelect(p.id, e)}
                                            style={{
                                                width: 18,
                                                height: 18,
                                                borderRadius: 4,
                                                border: selectedIds.has(p.id) ? 'none' : '2px solid var(--border)',
                                                background: selectedIds.has(p.id) ? 'var(--accent)' : 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                flexShrink: 0,
                                                marginRight: 12
                                            }}
                                        >
                                            {selectedIds.has(p.id) && <Check size={12} color="white" strokeWidth={3} />}
                                        </div>
                                    ) : (
                                        <div className="sidebar-item-icon" style={{
                                            background: activeProfile?.id === p.id ? 'var(--accent)' : 'var(--bg-app)',
                                            color: activeProfile?.id === p.id ? 'white' : 'var(--text-muted)'
                                        }}>
                                            <User size={14} />
                                        </div>
                                    )}
                                    <div className="sidebar-item-content" onClick={selectMode ? (e) => toggleSelect(p.id, e) : undefined}>
                                        <div className="sidebar-item-name" style={{
                                            fontWeight: activeProfile?.id === p.id || selectedIds.has(p.id) ? 600 : 500,
                                            color: selectedIds.has(p.id) ? 'var(--accent)' : 'var(--text-main)'
                                        }}>{p.name}</div>
                                        {p.description && <div className="sidebar-item-desc" style={{ fontSize: 11 }}>{p.description}</div>}
                                    </div>
                                    {!selectMode && (
                                        <button onClick={(e) => deleteProfile(p.id, e)} className="btn-ghost item-delete" style={{ padding: 4, opacity: 0 }}>
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '12px 16px',
                        background: 'var(--accent)',
                        color: 'white',
                        borderRadius: 10,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-accent)',
                        transition: 'all 0.15s ease',
                        border: 'none'
                    }}>
                        <Upload size={16} />
                        {isUploading ? 'Parsing...' : 'Upload PDF'}
                        <input type="file" hidden accept=".pdf" onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])} disabled={isUploading} />
                    </label>
                    <button
                        onClick={createBlankProfile}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border)',
                            borderRadius: 10,
                            fontWeight: 500,
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            color: 'var(--text-secondary)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Plus size={16} />
                        New Blank Profile
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex: 1, padding: 32, maxWidth: 900, overflow: 'auto' }}>
                {activeProfile ? (
                    <div className="fade-in">
                        {/* Header */}
                        <div className="flex justify-between items-start" style={{ marginBottom: 24 }}>
                            <div style={{ flex: 1 }}>
                                {editingMeta ? (
                                    <div className="flex flex-col gap-sm" style={{ maxWidth: 350 }}>
                                        <input value={activeProfile.name} onChange={(e) => updateProfile({ name: e.target.value })} style={{ fontSize: 20, fontWeight: 700 }} placeholder="Profile Name" />
                                        <input value={activeProfile.description} onChange={(e) => updateProfile({ description: e.target.value })} placeholder="Brief description..." />
                                        <button onClick={() => setEditingMeta(false)} className="btn-small" style={{ alignSelf: 'flex-start' }}><Check size={14} /> Done</button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-md" style={{ marginBottom: 4 }}>
                                            <h1 style={{ fontSize: 24 }}>{activeProfile.name}</h1>
                                            <span className="badge badge-accent">Active</span>
                                            <button onClick={() => setEditingMeta(true)} className="btn-ghost"><Edit3 size={14} /></button>
                                        </div>
                                        {activeProfile.description && <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{activeProfile.description}</p>}
                                        <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                                            Updated {new Date(activeProfile.updatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {hasChanges && (
                                <button onClick={saveChanges} className="btn-primary" disabled={isSaving}>
                                    <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            )}
                        </div>

                        {activeProfile.resume && (
                            <ResumeContent resume={activeProfile.resume} onUpdate={updateResume} onCopy={copyToClipboard} copyStatus={copyStatus} />
                        )}
                    </div>
                ) : (
                    <div
                        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={onDrop}
                        onClick={onZoneClick}
                        style={{ maxWidth: 500, margin: '60px auto' }}
                    >
                        <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx" onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])} />
                        <div style={{ width: 64, height: 64, background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Upload size={28} color="var(--accent)" />
                        </div>
                        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Upload Your Resume</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: 280, margin: '0 auto 20px' }}>
                            Drag & drop a PDF or DOCX, or click anywhere to browse
                        </p>
                        <span className="badge">PDF or DOCX</span>
                    </div>
                )}
            </main>
        </div>
    );
};

// ============================================================
// RESUME CONTENT
// ============================================================

interface ResumeContentProps {
    resume: ResumeData;
    onUpdate: (u: Partial<ResumeData>) => void;
    onCopy: (t: string, id: string) => void;
    copyStatus: Record<string, boolean>;
}

const ResumeContent: React.FC<ResumeContentProps> = ({ resume, onUpdate, onCopy, copyStatus }) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ personal: true });
    const toggle = (k: string) => setExpanded(p => ({ ...p, [k]: !p[k] }));

    const sections = [
        { key: 'personal', title: 'Personal Information', icon: User, count: Object.values(resume.personalInfo).filter(v => v).length },
        { key: 'work', title: 'Work Experience', icon: Briefcase, count: resume.workExperience.length },
        { key: 'education', title: 'Education', icon: GraduationCap, count: resume.education.length },
        { key: 'leadership', title: 'Leadership & Activities', icon: Users, count: resume.leadershipExperience.length },
        { key: 'awards', title: 'Awards & Honors', icon: AwardIcon, count: resume.awards.length },
        { key: 'publications', title: 'Publications', icon: BookOpen, count: resume.publications.length },
        { key: 'grants', title: 'Grants & Funding', icon: DollarSign, count: resume.grants.length },
        { key: 'teaching', title: 'Teaching Experience', icon: BookOpen, count: resume.teachingExperience.length },
        { key: 'conferences', title: 'Conferences & Presentations', icon: Presentation, count: resume.conferences.length },
        { key: 'skills', title: 'Skills', icon: Sparkles, count: resume.skills.length },
    ];

    return (
        <div className="flex flex-col gap-md">
            {sections.map(s => (
                <div key={s.key} className="section-accordion">
                    <div className="section-header" onClick={() => toggle(s.key)}>
                        <div className="section-icon"><s.icon size={18} /></div>
                        <span className="section-title">{s.title}</span>
                        <span className="section-count">{s.count}</span>
                        {expanded[s.key] ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />}
                    </div>
                    {expanded[s.key] && (
                        <div className="section-content">
                            {s.key === 'personal' && <PersonalSection info={resume.personalInfo} onChange={i => onUpdate({ personalInfo: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'work' && <WorkSection items={resume.workExperience} onChange={i => onUpdate({ workExperience: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'education' && <EducationSection items={resume.education} onChange={i => onUpdate({ education: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'leadership' && <LeadershipSection items={resume.leadershipExperience} onChange={i => onUpdate({ leadershipExperience: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'awards' && <AwardsSection items={resume.awards} onChange={i => onUpdate({ awards: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'publications' && <PublicationsSection items={resume.publications} onChange={i => onUpdate({ publications: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'grants' && <GrantsSection items={resume.grants} onChange={i => onUpdate({ grants: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'teaching' && <TeachingSection items={resume.teachingExperience} onChange={i => onUpdate({ teachingExperience: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'conferences' && <ConferencesSection items={resume.conferences} onChange={i => onUpdate({ conferences: i })} onCopy={onCopy} cs={copyStatus} />}
                            {s.key === 'skills' && <SkillsSection skills={resume.skills} onChange={s => onUpdate({ skills: s })} onCopy={onCopy} cs={copyStatus} />}
                        </div>
                    )}
                </div>
            ))}

            <div className="tip-card">
                <div className="tip-icon"><Lightbulb size={20} color="white" /></div>
                <div>
                    <strong>Pro Tip</strong>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>Click the Applyly™ icon on any job page to autofill fields.</p>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// FIELD COMPONENTS
// ============================================================

const CopyBtn: React.FC<{ text: string; id: string; onCopy: (t: string, id: string) => void; cs: Record<string, boolean> }> = ({ text, id, onCopy, cs }) => (
    <button onClick={() => onCopy(text, id)} className="btn-ghost" style={{ padding: 4 }}>
        {cs[id] ? <Check size={12} color="var(--accent)" /> : <Copy size={12} />}
    </button>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; id: string; onCopy: (t: string, id: string) => void; cs: Record<string, boolean>; multi?: boolean }> =
    ({ label, value, onChange, id, onCopy, cs, multi }) => (
        <div className="field-group">
            <div className="field-label">
                <span className="field-label-text">{label}</span>
                <CopyBtn text={value} id={id} onCopy={onCopy} cs={cs} />
            </div>
            {multi ? <textarea value={value} onChange={e => onChange(e.target.value)} /> : <input value={value} onChange={e => onChange(e.target.value)} />}
        </div>
    );

const MonthYearField: React.FC<{ label: string; value: string; onChange: (v: string) => void; id: string; onCopy: (t: string, id: string) => void; cs: Record<string, boolean> }> =
    ({ label, value, onChange, id, onCopy, cs }) => {
        // Simple parser for single date string
        const parts = value.split(' ');
        let month = '';
        let year = '';

        if (parts.length >= 2) {
            month = parts[0];
            year = parts[1];
        } else if (parts.length === 1) {
            if (MONTHS.includes(parts[0])) month = parts[0];
            else if (/\d{4}/.test(parts[0])) year = parts[0];
        }

        const handleUpdate = (m: string, y: string) => {
            const newVal = [m, y].filter(v => v).join(' ');
            onChange(newVal);
        };

        return (
            <div className="field-group">
                <div className="field-label">
                    <span className="field-label-text">{label}</span>
                    <CopyBtn text={value} id={id} onCopy={onCopy} cs={cs} />
                </div>
                <div className="grid-2">
                    <select
                        value={month}
                        onChange={e => handleUpdate(e.target.value, year)}
                        style={{ appearance: 'auto', padding: '8px 10px' }}
                    >
                        <option value="">Month</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input
                        type="number"
                        value={year}
                        onChange={e => handleUpdate(month, e.target.value)}
                        placeholder="YYYY"
                        min={MIN_YEAR}
                        max={MAX_YEAR}
                    />
                </div>
            </div>
        );
    };

const DateFields: React.FC<{ dates: DateRange; onChange: (d: DateRange) => void; prefix: string; onCopy: (t: string, id: string) => void; cs: Record<string, boolean> }> =
    ({ dates, onChange, prefix, onCopy, cs }) => (
        <div className="grid-4">
            {(['startMonth', 'startYear', 'endMonth', 'endYear'] as const).map(k => {
                const isMonth = k.includes('Month');
                return (
                    <div key={k} className="field-group">
                        <div className="field-label">
                            <span className="field-label-text">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <CopyBtn text={dates[k]} id={`${prefix}-${k}`} onCopy={onCopy} cs={cs} />
                        </div>
                        {isMonth ? (
                            <select
                                value={dates[k]}
                                onChange={e => onChange({ ...dates, [k]: e.target.value })}
                                style={{
                                    appearance: 'auto',
                                    padding: '8px 10px'
                                }}
                            >
                                <option value="">Select Month</option>
                                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input
                                type="number"
                                value={dates[k]}
                                onChange={e => onChange({ ...dates, [k]: e.target.value })}
                                placeholder="YYYY"
                                min={MIN_YEAR}
                                max={MAX_YEAR}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );

// ============================================================
// ENTRY WRAPPER (Collapsible)
// ============================================================

const EntryCard: React.FC<{ title: string; subtitle?: string; onDelete: () => void; children: React.ReactNode }> = ({ title, subtitle, onDelete, children }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="entry-card">
            <div className="entry-header" onClick={() => setOpen(!open)}>
                {open ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                <div className="entry-summary">
                    <div className="entry-title">{title || 'New Entry'}</div>
                    {subtitle && <div className="entry-subtitle">{subtitle}</div>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-ghost"><Trash2 size={14} /></button>
            </div>
            {open && <div className="entry-content">{children}</div>}
        </div>
    );
};

// ============================================================
// SECTIONS
// ============================================================

type SectionProps<T> = { items: T[]; onChange: (items: T[]) => void; onCopy: (t: string, id: string) => void; cs: Record<string, boolean> };

const PersonalSection: React.FC<{ info: ResumeData['personalInfo']; onChange: (i: ResumeData['personalInfo']) => void; onCopy: (t: string, id: string) => void; cs: Record<string, boolean> }> =
    ({ info, onChange, onCopy, cs }) => {
        const fields = [
            { k: 'firstName', l: 'First Name', i: User },
            { k: 'lastName', l: 'Last Name', i: User },
            { k: 'email', l: 'Email', i: Mail },
            { k: 'phone', l: 'Phone', i: Phone },
            { k: 'linkedin', l: 'LinkedIn', i: Linkedin },
            { k: 'website', l: 'Website', i: Globe },
            { k: 'github', l: 'GitHub', i: Github },
            { k: 'address', l: 'Address', i: MapPin },
        ];
        return (
            <div className="grid-2">
                {fields.map(f => (
                    <Field key={f.k} label={f.l} value={(info as any)[f.k] || ''} onChange={v => onChange({ ...info, [f.k]: v })} id={`p-${f.k}`} onCopy={onCopy} cs={cs} />
                ))}
            </div>
        );
    };

const WorkSection: React.FC<SectionProps<WorkExperience>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<WorkExperience>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), title: '', company: '', location: '', dates: emptyDateRange(), description: '' }]);

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.title} subtitle={item.company} onDelete={() => remove(i)}>
                    <div className="grid-2">
                        <Field label="Title" value={item.title} onChange={v => update(i, { title: v })} id={`w${i}-t`} onCopy={onCopy} cs={cs} />
                        <Field label="Company" value={item.company} onChange={v => update(i, { company: v })} id={`w${i}-c`} onCopy={onCopy} cs={cs} />
                        <Field label="Location" value={item.location} onChange={v => update(i, { location: v })} id={`w${i}-l`} onCopy={onCopy} cs={cs} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div className="field-label-text" style={{ marginBottom: 8 }}>Date Range</div>
                        <DateFields dates={item.dates} onChange={d => update(i, { dates: d })} prefix={`w${i}`} onCopy={onCopy} cs={cs} />
                    </div>
                    <Field label="Description" value={item.description} onChange={v => update(i, { description: v })} id={`w${i}-d`} onCopy={onCopy} cs={cs} multi />
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Experience</button>
        </div>
    );
};

const EducationSection: React.FC<SectionProps<Education>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<Education>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), school: '', degree: '', field: '', location: '', dates: emptyDateRange(), gpa: '', description: '' }]);

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.school} subtitle={item.degree} onDelete={() => remove(i)}>
                    <div className="grid-2">
                        <Field label="School" value={item.school} onChange={v => update(i, { school: v })} id={`e${i}-s`} onCopy={onCopy} cs={cs} />
                        <Field label="Degree" value={item.degree} onChange={v => update(i, { degree: v })} id={`e${i}-d`} onCopy={onCopy} cs={cs} />
                        <Field label="Field" value={item.field} onChange={v => update(i, { field: v })} id={`e${i}-f`} onCopy={onCopy} cs={cs} />
                        <Field label="Location" value={item.location} onChange={v => update(i, { location: v })} id={`e${i}-l`} onCopy={onCopy} cs={cs} />
                        <Field label="GPA" value={item.gpa || ''} onChange={v => update(i, { gpa: v })} id={`e${i}-g`} onCopy={onCopy} cs={cs} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div className="field-label-text" style={{ marginBottom: 8 }}>Date Range</div>
                        <DateFields dates={item.dates} onChange={d => update(i, { dates: d })} prefix={`e${i}`} onCopy={onCopy} cs={cs} />
                    </div>
                    <Field label="Description" value={item.description} onChange={v => update(i, { description: v })} id={`e${i}-desc`} onCopy={onCopy} cs={cs} multi />
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Education</button>
        </div>
    );
};

const LeadershipSection: React.FC<SectionProps<LeadershipExperience>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<LeadershipExperience>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), role: '', organization: '', location: '', dates: emptyDateRange(), description: '' }]);

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.role} subtitle={item.organization} onDelete={() => remove(i)}>
                    <div className="grid-2">
                        <Field label="Role" value={item.role} onChange={v => update(i, { role: v })} id={`l${i}-r`} onCopy={onCopy} cs={cs} />
                        <Field label="Organization" value={item.organization} onChange={v => update(i, { organization: v })} id={`l${i}-o`} onCopy={onCopy} cs={cs} />
                        <Field label="Location" value={item.location} onChange={v => update(i, { location: v })} id={`l${i}-l`} onCopy={onCopy} cs={cs} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div className="field-label-text" style={{ marginBottom: 8 }}>Date Range</div>
                        <DateFields dates={item.dates} onChange={d => update(i, { dates: d })} prefix={`l${i}`} onCopy={onCopy} cs={cs} />
                    </div>
                    <Field label="Description" value={item.description} onChange={v => update(i, { description: v })} id={`l${i}-d`} onCopy={onCopy} cs={cs} multi />
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Leadership</button>
        </div>
    );
};

const AwardsSection: React.FC<SectionProps<Award>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<Award>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), title: '', issuer: '', date: '', description: '' }]);

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.title} subtitle={item.issuer || item.date} onDelete={() => remove(i)}>
                    <div className="grid-2">
                        <Field label="Title" value={item.title} onChange={v => update(i, { title: v })} id={`a${i}-t`} onCopy={onCopy} cs={cs} />
                        <Field label="Issuer" value={item.issuer} onChange={v => update(i, { issuer: v })} id={`a${i}-i`} onCopy={onCopy} cs={cs} />
                    </div>
                    <MonthYearField label="Award Date" value={item.date} onChange={v => update(i, { date: v })} id={`a${i}-d`} onCopy={onCopy} cs={cs} />
                    <Field label="Description" value={item.description} onChange={v => update(i, { description: v })} id={`a${i}-desc`} onCopy={onCopy} cs={cs} multi />
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Award</button>
        </div>
    );
};

const PublicationsSection: React.FC<SectionProps<Publication>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<Publication>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), title: '', authors: '', authorsList: [], journal: '', date: '', url: '', description: '' }]);
    const [expandedAuthors, setExpandedAuthors] = useState<Record<string, boolean>>({});

    const toggleAuthors = (id: string) => setExpandedAuthors(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.title} subtitle={item.journal || item.date} onDelete={() => remove(i)}>
                    <div className="grid-2">
                        <Field label="Title" value={item.title} onChange={v => update(i, { title: v })} id={`pub${i}-t`} onCopy={onCopy} cs={cs} />
                        <Field label="Journal" value={item.journal} onChange={v => update(i, { journal: v })} id={`pub${i}-j`} onCopy={onCopy} cs={cs} />
                        <MonthYearField label="Publication Date" value={item.date} onChange={v => update(i, { date: v })} id={`pub${i}-d`} onCopy={onCopy} cs={cs} />
                        <Field label="URL" value={item.url} onChange={v => update(i, { url: v })} id={`pub${i}-u`} onCopy={onCopy} cs={cs} />
                    </div>
                    {/* Authors List - Collapsible */}
                    <div style={{ marginTop: 12 }}>
                        <div
                            className="field-label"
                            style={{ cursor: 'pointer', marginBottom: 8 }}
                            onClick={() => toggleAuthors(item.id)}
                        >
                            <span className="field-label-text">
                                Authors ({item.authorsList?.length || 0})
                            </span>
                            {expandedAuthors[item.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <CopyBtn text={item.authors} id={`pub${i}-a`} onCopy={onCopy} cs={cs} />
                        </div>
                        {expandedAuthors[item.id] && (
                            <div style={{ marginTop: 8, padding: '12px', background: 'var(--bg-app)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {(item.authorsList || []).map((author, ai) => (
                                        <div key={ai} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <input
                                                value={author.firstName}
                                                onChange={e => {
                                                    const newList = [...(item.authorsList || [])];
                                                    newList[ai] = { ...author, firstName: e.target.value };
                                                    update(i, { authorsList: newList, authors: newList.map(a => `${a.lastName}, ${a.firstName}`).join('; ') });
                                                }}
                                                placeholder="First Name"
                                                style={{ flex: 1 }}
                                            />
                                            <input
                                                value={author.lastName}
                                                onChange={e => {
                                                    const newList = [...(item.authorsList || [])];
                                                    newList[ai] = { ...author, lastName: e.target.value };
                                                    update(i, { authorsList: newList, authors: newList.map(a => `${a.lastName}, ${a.firstName}`).join('; ') });
                                                }}
                                                placeholder="Last Name"
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newList = (item.authorsList || []).filter((_, idx) => idx !== ai);
                                                    update(i, { authorsList: newList, authors: newList.map(a => `${a.lastName}, ${a.firstName}`).join('; ') });
                                                }}
                                                className="btn-ghost"
                                                style={{ padding: 4, color: '#ef4444' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const newList = [...(item.authorsList || []), { firstName: '', lastName: '' }];
                                            update(i, { authorsList: newList });
                                        }}
                                        className="btn-small"
                                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                                    >
                                        <Plus size={12} /> Add Author
                                    </button>
                                </div>
                                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                    <Field label="Raw String (Fallback)" value={item.authors} onChange={v => update(i, { authors: v })} id={`pub${i}-ar`} onCopy={onCopy} cs={cs} multi />
                                </div>
                            </div>
                        )}
                        {!expandedAuthors[item.id] && item.authors && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                {item.authors.substring(0, 60)}{item.authors.length > 60 ? '...' : ''}
                            </div>
                        )}
                    </div>
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Publication</button>
        </div>
    );
};

const GrantsSection: React.FC<SectionProps<Grant>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<Grant>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), title: '', funder: '', amount: '', dates: emptyDateRange(), description: '' }]);

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.title} subtitle={item.amount || item.funder} onDelete={() => remove(i)}>
                    <div className="grid-3">
                        <Field label="Title" value={item.title} onChange={v => update(i, { title: v })} id={`g${i}-t`} onCopy={onCopy} cs={cs} />
                        <Field label="Funder" value={item.funder} onChange={v => update(i, { funder: v })} id={`g${i}-f`} onCopy={onCopy} cs={cs} />
                        <Field label="Amount" value={item.amount} onChange={v => update(i, { amount: v })} id={`g${i}-a`} onCopy={onCopy} cs={cs} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div className="field-label-text" style={{ marginBottom: 8 }}>Date Range</div>
                        <DateFields dates={item.dates} onChange={d => update(i, { dates: d })} prefix={`g${i}`} onCopy={onCopy} cs={cs} />
                    </div>
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Grant</button>
        </div>
    );
};

const TeachingSection: React.FC<SectionProps<TeachingExperience>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<TeachingExperience>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), course: '', institution: '', role: '', dates: emptyDateRange(), description: '' }]);

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.course} subtitle={item.institution} onDelete={() => remove(i)}>
                    <div className="grid-3">
                        <Field label="Course" value={item.course} onChange={v => update(i, { course: v })} id={`t${i}-c`} onCopy={onCopy} cs={cs} />
                        <Field label="Institution" value={item.institution} onChange={v => update(i, { institution: v })} id={`t${i}-i`} onCopy={onCopy} cs={cs} />
                        <Field label="Role" value={item.role} onChange={v => update(i, { role: v })} id={`t${i}-r`} onCopy={onCopy} cs={cs} />
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div className="field-label-text" style={{ marginBottom: 8 }}>Date Range</div>
                        <DateFields dates={item.dates} onChange={d => update(i, { dates: d })} prefix={`t${i}`} onCopy={onCopy} cs={cs} />
                    </div>
                    <Field label="Description" value={item.description} onChange={v => update(i, { description: v })} id={`t${i}-d`} onCopy={onCopy} cs={cs} multi />
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Teaching</button>
        </div>
    );
};

const ConferencesSection: React.FC<SectionProps<Conference>> = ({ items, onChange, onCopy, cs }) => {
    const update = (i: number, u: Partial<Conference>) => { const n = [...items]; n[i] = { ...n[i], ...u }; onChange(n); };
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const add = () => onChange([...items, { id: crypto.randomUUID(), title: '', conference: '', location: '', date: '', description: '' }]);

    return (
        <div>
            {items.map((item, i) => (
                <EntryCard key={item.id} title={item.title} subtitle={item.conference || item.date} onDelete={() => remove(i)}>
                    <div className="grid-2">
                        <Field label="Title" value={item.title} onChange={v => update(i, { title: v })} id={`c${i}-t`} onCopy={onCopy} cs={cs} />
                        <Field label="Conference" value={item.conference} onChange={v => update(i, { conference: v })} id={`c${i}-c`} onCopy={onCopy} cs={cs} />
                        <Field label="Location" value={item.location} onChange={v => update(i, { location: v })} id={`c${i}-l`} onCopy={onCopy} cs={cs} />
                    </div>
                    <MonthYearField label="Date" value={item.date} onChange={v => update(i, { date: v })} id={`c${i}-d`} onCopy={onCopy} cs={cs} />
                </EntryCard>
            ))}
            <button onClick={add} className="btn-small"><Plus size={14} /> Add Conference</button>
        </div>
    );
};

const SkillsSection: React.FC<{ skills: string[]; onChange: (s: string[]) => void; onCopy: (t: string, id: string) => void; cs: Record<string, boolean> }> = ({ skills, onChange, onCopy, cs }) => {
    const [newSkill, setNewSkill] = useState('');
    const add = () => { if (newSkill.trim()) { onChange([...skills, newSkill.trim()]); setNewSkill(''); } };
    const remove = (i: number) => onChange(skills.filter((_, idx) => idx !== i));

    return (
        <div>
            <div className="skills-grid" style={{ marginBottom: 16 }}>
                {skills.map((s, i) => (
                    <div key={i} className="skill-tag" onClick={() => onCopy(s, `sk${i}`)}>
                        {cs[`sk${i}`] && <Check size={12} />}
                        {s}
                        <button onClick={(e) => { e.stopPropagation(); remove(i); }} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginLeft: 4 }}><X size={12} /></button>
                    </div>
                ))}
            </div>
            <div className="flex gap-sm">
                <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Add skill..." style={{ flex: 1 }} />
                <button onClick={add} className="btn-small"><Plus size={14} /></button>
            </div>
        </div>
    );
};
