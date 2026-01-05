import React, { useEffect, useState } from 'react';
import { storage, Profile } from '../utils/storage';
import { Sparkles, Settings, User, Check, Copy, ChevronLeft, ChevronDown, Briefcase, GraduationCap, Award, BookOpen } from 'lucide-react';

export const Popup: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
    const [status, setStatus] = useState<string>('');
    const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
    const [isLoading, setIsLoading] = useState(true);
    const [isFilling, setIsFilling] = useState(false);
    const [view, setView] = useState<'main' | 'manual'>('main');
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const list = await storage.getProfiles();
        const active = await storage.getActiveProfile();
        setProfiles(list);
        setActiveProfile(active);
        setIsLoading(false);
    };

    const handleProfileChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        await storage.setActiveProfileId(id);
        const active = await storage.getActiveProfile();
        setActiveProfile(active);
    };

    const handleFill = async () => {
        if (!activeProfile || !activeProfile.resume) {
            setStatus('No resume data in this profile');
            setStatusType('error');
            return;
        }

        try {
            setIsFilling(true);
            setStatus('Scanning page...');
            setStatusType('info');

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) {
                setStatus('No active tab found');
                setStatusType('error');
                setIsFilling(false);
                return;
            }

            chrome.tabs.sendMessage(tab.id, {
                type: 'FILL_FORM',
                data: activeProfile.resume
            }, (response) => {
                setIsFilling(false);
                if (chrome.runtime.lastError) {
                    setStatus('Could not connect to page');
                    setStatusType('error');
                } else if (response && response.count > 0) {
                    setStatus(`${response.count} field${response.count > 1 ? 's' : ''} filled!`);
                    setStatusType('success');
                    setTimeout(() => setStatus(''), 3000);
                } else {
                    setStatus('No matching fields found');
                    setStatusType('info');
                    setTimeout(() => setStatus(''), 3000);
                }
            });
        } catch (err) {
            console.error(err);
            setStatus('Failed to fill form');
            setStatusType('error');
            setIsFilling(false);
        }
    };

    const copyToClipboard = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const openDashboard = () => {
        chrome.runtime.openOptionsPage();
    };

    if (isLoading) {
        return (
            <div style={{ width: 320, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="flex flex-col items-center gap-2">
                    <Sparkles className="animate-pulse" color="var(--accent)" size={32} />
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Warming up...</p>
                </div>
            </div>
        );
    }

    if (view === 'manual' && activeProfile?.resume) {
        const r = activeProfile.resume;

        const toggleExpand = (id: string) => {
            setExpandedItems(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        };

        const renderCategoryContent = () => {
            switch (activeCategory) {
                case 'personal':
                    return (
                        <div className="flex flex-col gap-3">
                            <CopyItem label="First Name" value={r.personalInfo.firstName} onCopy={copyToClipboard} copiedField={copiedField} />
                            <CopyItem label="Last Name" value={r.personalInfo.lastName} onCopy={copyToClipboard} copiedField={copiedField} />
                            <CopyItem label="Email" value={r.personalInfo.email} onCopy={copyToClipboard} copiedField={copiedField} />
                            <CopyItem label="Phone" value={r.personalInfo.phone} onCopy={copyToClipboard} copiedField={copiedField} />
                            <CopyItem label="LinkedIn" value={r.personalInfo.linkedin} onCopy={copyToClipboard} copiedField={copiedField} />
                            <CopyItem label="GitHub" value={r.personalInfo.github} onCopy={copyToClipboard} copiedField={copiedField} />
                            <CopyItem label="Website" value={r.personalInfo.website} onCopy={copyToClipboard} copiedField={copiedField} />
                            <CopyItem label="Address" value={r.personalInfo.address} onCopy={copyToClipboard} copiedField={copiedField} />
                        </div>
                    );
                case 'work':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.workExperience.map((w, i) => (
                                <CollapsibleItem
                                    key={w.id}
                                    title={w.company || "Untitled"}
                                    sub={w.title}
                                    isExpanded={expandedItems.includes(w.id)}
                                    onToggle={() => toggleExpand(w.id)}
                                >
                                    <CopyItem label="Company" value={w.company} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-co`} />
                                    <CopyItem label="Job Title" value={w.title} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-ti`} />
                                    <CopyItem label="Location" value={w.location} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-lo`} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="Start Month" value={w.dates.startMonth} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-sm`} />
                                        <CopyItem label="Start Year" value={w.dates.startYear} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-sy`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="End Month" value={w.dates.endMonth} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-em`} />
                                        <CopyItem label="End Year" value={w.dates.endYear || 'Present'} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-ey`} />
                                    </div>
                                    <CopyItem label="Description" value={w.description} onCopy={copyToClipboard} copiedField={copiedField} id={`w-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                case 'education':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.education.map((e, i) => (
                                <CollapsibleItem
                                    key={e.id}
                                    title={e.school || "Untitled"}
                                    sub={e.degree}
                                    isExpanded={expandedItems.includes(e.id)}
                                    onToggle={() => toggleExpand(e.id)}
                                >
                                    <CopyItem label="School" value={e.school} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-sc`} />
                                    <CopyItem label="Degree" value={e.degree} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-de`} />
                                    <CopyItem label="Major" value={e.field} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-fi`} />
                                    <CopyItem label="GPA" value={e.gpa || "N/A"} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-gp`} />
                                    <CopyItem label="Location" value={e.location} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-lo`} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="Start Month" value={e.dates.startMonth} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-sm`} />
                                        <CopyItem label="Start Year" value={e.dates.startYear} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-sy`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="End Month" value={e.dates.endMonth} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-em`} />
                                        <CopyItem label="End Year" value={e.dates.endYear || 'Present'} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-ey`} />
                                    </div>
                                    <CopyItem label="Description" value={e.description} onCopy={copyToClipboard} copiedField={copiedField} id={`e-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                case 'leadership':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.leadershipExperience.map((l, i) => (
                                <CollapsibleItem
                                    key={l.id}
                                    title={l.organization || "Untitled"}
                                    sub={l.role}
                                    isExpanded={expandedItems.includes(l.id)}
                                    onToggle={() => toggleExpand(l.id)}
                                >
                                    <CopyItem label="Organization" value={l.organization} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-or`} />
                                    <CopyItem label="Role" value={l.role} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-ro`} />
                                    <CopyItem label="Location" value={l.location} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-lo`} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="Start Month" value={l.dates.startMonth} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-sm`} />
                                        <CopyItem label="Start Year" value={l.dates.startYear} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-sy`} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="End Month" value={l.dates.endMonth} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-em`} />
                                        <CopyItem label="End Year" value={l.dates.endYear || 'Present'} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-ey`} />
                                    </div>
                                    <CopyItem label="Description" value={l.description} onCopy={copyToClipboard} copiedField={copiedField} id={`l-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                case 'grants':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.grants.map((g, i) => (
                                <CollapsibleItem
                                    key={g.id}
                                    title={g.title || "Untitled"}
                                    sub={g.funder}
                                    isExpanded={expandedItems.includes(g.id)}
                                    onToggle={() => toggleExpand(g.id)}
                                >
                                    <CopyItem label="Title" value={g.title} onCopy={copyToClipboard} copiedField={copiedField} id={`g-${i}-ti`} />
                                    <CopyItem label="Funder" value={g.funder} onCopy={copyToClipboard} copiedField={copiedField} id={`g-${i}-fu`} />
                                    <CopyItem label="Amount" value={g.amount} onCopy={copyToClipboard} copiedField={copiedField} id={`g-${i}-am`} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="Start Year" value={g.dates.startYear} onCopy={copyToClipboard} copiedField={copiedField} id={`g-${i}-sy`} />
                                        <CopyItem label="End Year" value={g.dates.endYear} onCopy={copyToClipboard} copiedField={copiedField} id={`g-${i}-ey`} />
                                    </div>
                                    <CopyItem label="Description" value={g.description} onCopy={copyToClipboard} copiedField={copiedField} id={`g-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                case 'teaching':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.teachingExperience.map((t, i) => (
                                <CollapsibleItem
                                    key={t.id}
                                    title={t.institution || "Untitled"}
                                    sub={t.course}
                                    isExpanded={expandedItems.includes(t.id)}
                                    onToggle={() => toggleExpand(t.id)}
                                >
                                    <CopyItem label="Institution" value={t.institution} onCopy={copyToClipboard} copiedField={copiedField} id={`t-${i}-in`} />
                                    <CopyItem label="Course" value={t.course} onCopy={copyToClipboard} copiedField={copiedField} id={`t-${i}-co`} />
                                    <CopyItem label="Role" value={t.role} onCopy={copyToClipboard} copiedField={copiedField} id={`t-${i}-ro`} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <CopyItem label="Start Year" value={t.dates.startYear} onCopy={copyToClipboard} copiedField={copiedField} id={`t-${i}-sy`} />
                                        <CopyItem label="End Year" value={t.dates.endYear} onCopy={copyToClipboard} copiedField={copiedField} id={`t-${i}-ey`} />
                                    </div>
                                    <CopyItem label="Description" value={t.description} onCopy={copyToClipboard} copiedField={copiedField} id={`t-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                case 'conferences':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.conferences.map((c, i) => (
                                <CollapsibleItem
                                    key={c.id}
                                    title={c.conference || "Untitled"}
                                    sub={c.title}
                                    isExpanded={expandedItems.includes(c.id)}
                                    onToggle={() => toggleExpand(c.id)}
                                >
                                    <CopyItem label="Conference" value={c.conference} onCopy={copyToClipboard} copiedField={copiedField} id={`c-${i}-cn`} />
                                    <CopyItem label="Paper/Talk Title" value={c.title} onCopy={copyToClipboard} copiedField={copiedField} id={`c-${i}-ti`} />
                                    <CopyItem label="Location" value={c.location} onCopy={copyToClipboard} copiedField={copiedField} id={`c-${i}-lo`} />
                                    <CopyItem label="Date" value={c.date} onCopy={copyToClipboard} copiedField={copiedField} id={`c-${i}-da`} />
                                    <CopyItem label="Description" value={c.description} onCopy={copyToClipboard} copiedField={copiedField} id={`c-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                case 'skills':
                    return (
                        <div className="flex flex-col gap-3">
                            <CopyItem label="All Skills" value={r.skills.join(', ')} onCopy={copyToClipboard} copiedField={copiedField} isLong />
                            <div className="flex flex-wrap gap-2">
                                {r.skills.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => copyToClipboard(s, s)}
                                        className="text-[11px] px-2 py-1 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                case 'publications':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.publications.map((p, i) => (
                                <CollapsibleItem
                                    key={p.id}
                                    title={p.title || "Untitled"}
                                    sub={p.journal}
                                    isExpanded={expandedItems.includes(p.id)}
                                    onToggle={() => toggleExpand(p.id)}
                                >
                                    <CopyItem label="Title" value={p.title} onCopy={copyToClipboard} copiedField={copiedField} id={`p-${i}-ti`} />
                                    <CopyItem label="Journal" value={p.journal} onCopy={copyToClipboard} copiedField={copiedField} id={`p-${i}-jo`} />
                                    <CopyItem label="Authors" value={p.authors} onCopy={copyToClipboard} copiedField={copiedField} id={`p-${i}-au`} />
                                    <CopyItem label="Description" value={p.description} onCopy={copyToClipboard} copiedField={copiedField} id={`p-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                case 'awards':
                    return (
                        <div className="flex flex-col gap-2">
                            {r.awards.map((a, i) => (
                                <CollapsibleItem
                                    key={a.id}
                                    title={a.title || "Untitled"}
                                    sub={a.issuer}
                                    isExpanded={expandedItems.includes(a.id)}
                                    onToggle={() => toggleExpand(a.id)}
                                >
                                    <CopyItem label="Award Title" value={a.title} onCopy={copyToClipboard} copiedField={copiedField} id={`a-${i}-ti`} />
                                    <CopyItem label="Issuer" value={a.issuer} onCopy={copyToClipboard} copiedField={copiedField} id={`a-${i}-is`} />
                                    <CopyItem label="Date" value={a.date} onCopy={copyToClipboard} copiedField={copiedField} id={`a-${i}-da`} />
                                    <CopyItem label="Description" value={a.description} onCopy={copyToClipboard} copiedField={copiedField} id={`a-${i}-de`} isLong />
                                </CollapsibleItem>
                            ))}
                        </div>
                    );
                default:
                    return null;
            }
        };

        const categories = [
            { id: 'personal', label: 'Personal Details', icon: <User size={14} /> },
            { id: 'work', label: 'Work Experience', icon: <Briefcase size={14} /> },
            { id: 'education', label: 'Education', icon: <GraduationCap size={14} /> },
            { id: 'skills', label: 'Skills & Tools', icon: <BookOpen size={14} /> },
            { id: 'publications', label: 'Publications', icon: <BookOpen size={14} /> },
            { id: 'awards', label: 'Awards & Honors', icon: <Award size={14} /> },
            { id: 'leadership', label: 'Leadership', icon: <User size={14} /> },
            { id: 'grants', label: 'Grants & Funding', icon: <Award size={14} /> },
            { id: 'teaching', label: 'Teaching', icon: <BookOpen size={14} /> },
            { id: 'conferences', label: 'Conferences', icon: <GraduationCap size={14} /> },
        ];
        return (
            <div style={{ width: 320, padding: 16, height: 500, display: 'flex', flexDirection: 'column', background: 'white' }}>
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => setView('main')} className="btn-ghost" style={{ padding: 4, marginLeft: -4 }}>
                        <ChevronLeft size={20} />
                    </button>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Manual Entry</h2>
                </div>

                {/* Category Dropdown */}
                <div className="mb-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">SELECT INFORMATION TYPE</label>
                    <div className="relative">
                        <select
                            value={activeCategory}
                            onChange={(e) => setActiveCategory(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: 12,
                                border: '1.5px solid var(--border)',
                                background: 'white',
                                fontSize: 14,
                                fontWeight: 500,
                                appearance: 'none',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                color: activeCategory ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                        >
                            <option value="" disabled>Select a section...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>

                {/* Scrolled Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, margin: '0 -4px' }}>
                    {activeCategory ? (
                        <div className="pb-4 fade-in">
                            <div className="flex items-center gap-2 mb-4 px-1">
                                <div style={{
                                    width: 28, height: 28, background: 'var(--accent-light)',
                                    color: 'var(--accent)', borderRadius: 8,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {categories.find(c => c.id === activeCategory)?.icon}
                                </div>
                                <span className="text-sm font-bold text-slate-700">{categories.find(c => c.id === activeCategory)?.label}</span>
                            </div>
                            {renderCategoryContent()}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                            <div style={{ padding: 16, background: '#f8fafc', borderRadius: '50%', marginBottom: 12 }}>
                                <Copy size={24} color="#94a3b8" />
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                Choose a category above <br /> to access your details.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ width: 320, padding: 20, fontFamily: 'var(--font-sans)' }}>
            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                <div className="flex items-center gap-2">
                    <div style={{
                        width: 32,
                        height: 32,
                        background: 'linear-gradient(135deg, #FF8C42 0%, #FFB284 100%)',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(255, 140, 66, 0.3)'
                    }}>
                        <Sparkles size={16} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>Applyly™</h1>
                    </div>
                </div>
                <button onClick={openDashboard} className="btn-ghost" title="Open Dashboard" style={{ padding: 8 }}>
                    <Settings size={20} color="var(--text-secondary)" />
                </button>
            </div>

            {profiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        background: 'var(--bg-app)',
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        border: '1px solid var(--border)'
                    }}>
                        <User size={28} color="var(--text-muted)" />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No Profiles Yet</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
                        Start by uploading your resume in the dashboard.
                    </p>
                    <button onClick={openDashboard} className="btn-primary" style={{ width: '100%', height: 44 }}>
                        Get Started
                    </button>
                </div>
            ) : (
                <>
                    {/* Profile Selector */}
                    <div style={{ marginBottom: 20, background: 'var(--bg-app)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                        <label style={{
                            display: 'block',
                            fontSize: 10,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--text-muted)',
                            fontWeight: 700,
                            marginBottom: 8
                        }}>
                            CURRENT PROFILE
                        </label>
                        <select
                            value={activeProfile?.id}
                            onChange={handleProfileChange}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: 8,
                                border: '1px solid var(--border)',
                                background: 'white',
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fill Button */}
                    <button
                        onClick={handleFill}
                        disabled={isFilling}
                        className="btn-primary"
                        style={{
                            width: '100%',
                            height: 52,
                            fontSize: 16,
                            fontWeight: 700,
                            borderRadius: 12,
                            boxShadow: '0 4px 12px rgba(255, 140, 66, 0.25)',
                            display: 'flex',
                            gap: 10
                        }}
                    >
                        {isFilling ? (
                            <>Scanning Portal...</>
                        ) : (
                            <>
                                <Sparkles size={20} />
                                Fill Form
                            </>
                        )}
                    </button>

                    {/* Status */}
                    {status && (
                        <div
                            className="fade-in"
                            style={{
                                marginTop: 16,
                                padding: '10px 14px',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 500,
                                textAlign: 'center',
                                border: `1px solid ${statusType === 'success' ? '#bbf7d0' : statusType === 'error' ? '#fecaca' : '#e5e7eb'
                                    }`,
                                background: statusType === 'success'
                                    ? '#f0fdf4'
                                    : statusType === 'error'
                                        ? '#fef2f2'
                                        : '#f9fafb',
                                color: statusType === 'success'
                                    ? '#15803d'
                                    : statusType === 'error'
                                        ? '#b91c1c'
                                        : '#4b5563'
                            }}
                        >
                            {status}
                        </div>
                    )}

                    {/* Manual Helper Link */}
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button
                            onClick={() => setView('manual')}
                            style={{
                                width: '100%',
                                height: 40,
                                background: 'white',
                                border: '1px solid var(--border)',
                                borderRadius: 10,
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8
                            }}
                        >
                            <Copy size={14} />
                            Manual Entry
                        </button>

                        <button
                            onClick={openDashboard}
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Open Settings
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// Internal components for Manual View
const CollapsibleItem: React.FC<{
    title: string;
    sub?: string;
    children: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
}> = ({ title, sub, children, isExpanded, onToggle }) => (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: isExpanded ? 'white' : 'var(--bg-app)' }}>
        <button
            onClick={onToggle}
            style={{
                width: '100%',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left'
            }}
        >
            <div className="min-w-0" style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
            </div>
            <div style={{ marginLeft: 8, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none', opacity: 0.5 }}>
                <ChevronDown size={16} />
            </div>
        </button>
        {isExpanded && (
            <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8, background: 'white' }}>
                <div style={{ height: 1, background: 'var(--border)', margin: '0 -12px 4px' }} />
                {children}
            </div>
        )}
    </div>
);

const CopyItem: React.FC<{
    label: string;
    value: string;
    onCopy: (text: string, id: string) => void;
    copiedField: string | null;
    id?: string;
    isLong?: boolean;
}> = ({ label, value, onCopy, copiedField, id, isLong }) => {
    if (!value) return null;
    const fieldId = id || label;
    const isCopied = copiedField === fieldId;

    return (
        <div
            onClick={() => onCopy(value, fieldId)}
            style={{
                background: isCopied ? 'rgba(255, 140, 66, 0.05)' : 'white',
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${isCopied ? 'var(--accent)' : 'var(--border)'}`,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isCopied ? 'scale(0.98)' : 'none'
            }}
        >
            <div className="min-w-0" style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
                <div style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    lineHeight: 1.4,
                    ...(isLong ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
                }}>
                    {value}
                </div>
            </div>
            <div style={{
                width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCopied ? 'var(--accent)' : 'var(--bg-app)',
                color: isCopied ? 'white' : 'var(--text-muted)',
                flexShrink: 0,
                marginLeft: 12
            }}>
                {isCopied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
            </div>
        </div>
    );
};

