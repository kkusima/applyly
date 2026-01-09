import React, { useState, useRef } from 'react';
import { Profile } from '../utils/storage';
import { generateCoverLetter } from '../utils/coverLetterGenerator';
import { Copy, Check, X, Loader, Download, FileText } from 'lucide-react';

interface CoverLetterGeneratorProps {
    profile: Profile | null;
    onClose: () => void;
}

export const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({ profile, onClose }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [generatedLetter, setGeneratedLetter] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleGenerate = async () => {
        if (!jobDescription.trim() || !companyName.trim() || !jobTitle.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        if (!profile?.resume) {
            alert('No resume data found');
            return;
        }

        setIsGenerating(true);
        try {
            const letter = await generateCoverLetter(
                jobDescription,
                profile.resume,
                companyName,
                jobTitle
            );
            setGeneratedLetter(letter);
        } catch (error) {
            alert('Error generating cover letter: ' + (error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedLetter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const element = document.createElement('a');
        const file = new Blob([generatedLetter], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `cover-letter-${companyName}-${Date.now()}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: 20,
                width: '90%',
                maxWidth: 1200,
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40,
                            height: 40,
                            background: 'linear-gradient(135deg, #FF7A45 0%, #FF8A50 100%)',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FileText size={20} color="white" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cover Letter Generator</h2>
                            <p style={{ fontSize: 12, color: '#999', margin: 0, marginTop: 2 }}>AI-powered, locally generated</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#999',
                            padding: 8
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                    {/* Left Panel - Input Form */}
                    <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 20 }}>Job Information</h3>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#555',
                                marginBottom: 8
                            }}>Company Name *</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="e.g., Acme Corp"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#555',
                                marginBottom: 8
                            }}>Job Title *</label>
                            <input
                                type="text"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                placeholder="e.g., Senior Software Engineer"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{
                                display: 'block',
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#555',
                                marginBottom: 8
                            }}>Job Description *</label>
                            <textarea
                                ref={textareaRef}
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste the job description here. Include requirements, responsibilities, and desired skills."
                                style={{
                                    width: '100%',
                                    height: 280,
                                    padding: '12px',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    fontFamily: 'inherit',
                                    resize: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || !jobDescription.trim()}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: isGenerating || !jobDescription.trim()
                                    ? '#ddd'
                                    : 'linear-gradient(135deg, #FF7A45 0%, #FF8A50 100%)',
                                color: isGenerating || !jobDescription.trim() ? '#999' : 'white',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: isGenerating || !jobDescription.trim() ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    Generating...
                                </>
                            ) : (
                                'Generate Cover Letter'
                            )}
                        </button>
                    </div>

                    {/* Right Panel - Output */}
                    <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 20 }}>Generated Letter</h3>

                        {generatedLetter ? (
                            <div>
                                <div style={{
                                    background: '#f9f9f9',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 8,
                                    padding: '16px',
                                    height: 350,
                                    overflowY: 'auto',
                                    marginBottom: 12,
                                    fontSize: 13,
                                    lineHeight: 1.6,
                                    color: '#333',
                                    whiteSpace: 'pre-wrap',
                                    wordWrap: 'break-word'
                                }}>
                                    {generatedLetter}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <button
                                        onClick={handleCopy}
                                        style={{
                                            padding: '10px 16px',
                                            background: copied ? '#e8f5e9' : '#f5f5f5',
                                            color: copied ? '#4caf50' : '#333',
                                            border: '1px solid' + (copied ? '#c8e6c9' : '#e0e0e0'),
                                            borderRadius: 6,
                                            fontWeight: 500,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={14} /> Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} /> Copy Text
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleDownload}
                                        style={{
                                            padding: '10px 16px',
                                            background: '#f5f5f5',
                                            color: '#333',
                                            border: '1px solid #e0e0e0',
                                            borderRadius: 6,
                                            fontWeight: 500,
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 6,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Download size={14} /> Download
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                height: 350,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                background: '#f9f9f9',
                                borderRadius: 8,
                                border: '2px dashed #e0e0e0'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                    <p style={{ fontSize: 13, margin: 0 }}>Fill in the job details and click<br />"Generate Cover Letter"</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};
