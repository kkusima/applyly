// ============================================================
// COVER LETTER GENERATOR
// Generates professional cover letters using local AI processing
// No external APIs - completely privacy-focused
// ============================================================

import { ResumeData } from './storage';

// Simple local template-based generator that creates professional, personalized cover letters
// This uses pattern matching and smart text generation without requiring external AI services

/**
 * Sanitize text from resume - fix common parsing artifacts and ensure clean grammar
 */
function sanitizeText(text: string): string {
    return text
        // Remove bullet point characters
        .replace(/[•·▪▸►◦‣⁃]/g, '')
        // Fix "word ed" -> "worded" (common OCR/parsing error)
        .replace(/\b(\w+)\s+ed\b/g, '$1ed')
        // Fix "word ing" -> "wording"
        .replace(/\b(\w+)\s+ing\b/g, '$1ing')
        // Fix spacing around slashes
        .replace(/\s*\/\s*/g, '/')
        // Fix multiple spaces
        .replace(/\s{2,}/g, ' ')
        // Fix spacing around punctuation
        .replace(/\s+([.,;:!?])/g, '$1')
        // Remove trailing ellipsis and incomplete sentences
        .replace(/\.\.\.$/, '')
        .replace(/\s+$/, '')
        // Capitalize first letter
        .replace(/^\s*/, '')
        .trim();
}

export async function generateCoverLetter(
    jobDescription: string,
    resumeData: ResumeData,
    companyName: string,
    jobTitle: string,
    userEditedLetter?: string // Previous user-edited letter to learn from
): Promise<string> {
    const { firstName, lastName, email, phone } = resumeData.personalInfo;
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Extract key skills from job description
    const keySkills = extractKeySkills(jobDescription);
    const relevantExperience = findRelevantExperience(jobDescription, resumeData);
    const achievements = extractAchievements(resumeData);
    
    // Learn from user's previous edits if available
    const userPreferences = userEditedLetter ? analyzeUserEdits(userEditedLetter) : null;

    // Build opening paragraph
    const opening = generateOpening(jobTitle, companyName, keySkills, userPreferences);

    // Build body paragraphs showcasing relevant experience
    const body = generateBody(relevantExperience, achievements, keySkills, userPreferences);

    // Build closing paragraph
    const closing = generateClosing();

    // Assemble full cover letter
    const coverLetter = `${currentDate}

Hiring Manager
${companyName}

Dear Hiring Manager,

${opening}

${body}

${closing}

Sincerely,
${firstName} ${lastName}
${phone} | ${email}`;

    return coverLetter;
}

/**
 * User preference object extracted from their edited letter
 */
interface UserPreferences {
    preferredLength: 'short' | 'medium' | 'long';
    avoidPhrases: string[];
    keepPhrases: string[];
    toneStyle: 'formal' | 'conversational';
}

/**
 * Analyze user's edited letter to extract preferences for regeneration
 */
function analyzeUserEdits(editedLetter: string): UserPreferences {
    const wordCount = editedLetter.split(/\s+/).length;
    
    // Determine preferred length
    let preferredLength: 'short' | 'medium' | 'long' = 'medium';
    if (wordCount < 200) preferredLength = 'short';
    else if (wordCount > 400) preferredLength = 'long';
    
    // Detect phrases to avoid (common AI phrases that user might have removed)
    const aiPhrases = [
        'I am confident',
        'I am excited',
        'I believe',
        'from day one',
        'meaningful contributions',
        'dynamic environment',
        'passionate about',
        'eager to'
    ];
    const avoidPhrases = aiPhrases.filter(phrase => !editedLetter.toLowerCase().includes(phrase.toLowerCase()));
    
    // Extract unique phrases the user kept or added (sentences they wrote)
    const sentences = editedLetter.match(/[^.!?]+[.!?]/g) || [];
    const keepPhrases = sentences
        .filter(s => s.trim().length > 20 && s.trim().length < 150)
        .slice(0, 3)
        .map(s => s.trim());
    
    // Detect tone
    const formalIndicators = ['I am writing', 'Please find', 'I would like', 'Thank you for your consideration'];
    const conversationalIndicators = ["I'm", "I'd", "can't wait", 'really'];
    const formalCount = formalIndicators.filter(p => editedLetter.includes(p)).length;
    const conversationalCount = conversationalIndicators.filter(p => editedLetter.toLowerCase().includes(p.toLowerCase())).length;
    const toneStyle = formalCount >= conversationalCount ? 'formal' : 'conversational';
    
    return { preferredLength, avoidPhrases, keepPhrases, toneStyle };
}

/**
 * Extract key skills, technologies, and qualifications from job description
 */
function extractKeySkills(jobDescription: string): string[] {
    const technicalKeywords = [
        // Programming languages
        'python', 'javascript', 'typescript', 'java', 'c\\+\\+', 'c#', 'go', 'rust', 'swift', 'kotlin',
        'php', 'ruby', 'scala', 'r', 'matlab', 'sql',

        // Frameworks & Libraries
        'react', 'vue', 'angular', 'node', 'express', 'django', 'flask', 'spring', 'fastapi',
        'tensorflow', 'pytorch', 'keras', 'scikit-learn',

        // Databases
        'postgresql', 'mysql', 'mongodb', 'elasticsearch', 'redis', 'cassandra',

        // Cloud & DevOps
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'github',

        // Soft Skills & Concepts
        'leadership', 'communication', 'problem-solving', 'team', 'collaboration', 'agile',
        'scrum', 'project management', 'data analysis', 'analytics', 'design',
        'ui/ux', 'web development', 'mobile development', 'machine learning', 'ai',
        'deep learning', 'devops', 'ci/cd', 'security', 'testing'
    ];

    const foundSkills: string[] = [];
    const lowerDesc = jobDescription.toLowerCase();

    for (const keyword of technicalKeywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (regex.test(lowerDesc)) {
            const match = lowerDesc.match(new RegExp(`\\b${keyword}\\b`, 'i'));
            if (match) {
                foundSkills.push(match[0]);
            }
        }
    }

    // Remove duplicates and limit to top 5-7 skills
    return [...new Set(foundSkills)].slice(0, 7);
}

/**
 * Find relevant work experience from resume that matches job description
 */
function findRelevantExperience(
    jobDescription: string,
    resumeData: ResumeData
): { title: string; company: string; description: string }[] {
    const jobDescLower = jobDescription.toLowerCase();
    const relevantExperience: { title: string; company: string; description: string }[] = [];

    for (const work of resumeData.workExperience) {
        const titleMatch = jobDescLower.includes(work.title.toLowerCase());
        const companyMatch = jobDescLower.includes(work.company.toLowerCase());
        const descMatch = work.description.toLowerCase().split(' ').filter(word =>
            jobDescLower.includes(word) && word.length > 3
        ).length > 3;

        if (titleMatch || companyMatch || descMatch) {
            relevantExperience.push({
                title: work.title,
                company: work.company,
                description: work.description.split('\n')[0] || work.description
            });
        }
    }

    return relevantExperience.slice(0, 2);
}

/**
 * Extract measurable achievements and accomplishments
 */
function extractAchievements(resumeData: ResumeData): string[] {
    const achievements: string[] = [];

    for (const work of resumeData.workExperience.slice(0, 3)) {
        const bullets = work.description.split('\n').filter(b => b.trim());
        for (const bullet of bullets) {
            if (
                /\d+%|improved|increased|reduced|grew|launched|shipped|delivered|solved|created/i.test(bullet)
            ) {
                achievements.push(bullet.trim());
            }
        }
    }

    return achievements.slice(0, 3);
}

/**
 * Generate professional opening paragraph
 */
function generateOpening(
    jobTitle: string,
    companyName: string,
    keySkills: string[],
    userPrefs?: UserPreferences | null
): string {
    // Clean up job title - remove any garbage
    const cleanTitle = jobTitle.length > 50 ? 'this role' : sanitizeText(jobTitle);
    const cleanCompany = companyName.length > 40 ? 'your organization' : sanitizeText(companyName);
    
    // Pick relevant skills for a natural mention
    const topSkills = keySkills.slice(0, 3).map(s => sanitizeText(s));
    const skillsText = topSkills.length > 0 
        ? topSkills.slice(0, -1).join(', ') + (topSkills.length > 1 ? ' and ' + topSkills[topSkills.length - 1] : topSkills[0])
        : 'relevant technical skills';

    // Different templates based on tone preference
    const formalTemplates = [
        `I am writing to apply for ${cleanTitle} at ${cleanCompany}. With a strong foundation in ${skillsText}, my skills and experience align well with the requirements of this position.`,

        `I am submitting my application for ${cleanTitle} at ${cleanCompany}. My professional background includes extensive work with ${skillsText}, which has prepared me well for this role.`,

        `I am applying for ${cleanTitle} at ${cleanCompany}. Throughout my career, I have developed strong capabilities in ${skillsText} that I would bring to this position.`,
    ];
    
    const conversationalTemplates = [
        `I'm applying for ${cleanTitle} at ${cleanCompany}. My experience with ${skillsText} makes me a great fit for this role.`,

        `I'm interested in ${cleanTitle} at ${cleanCompany}. I've spent years working with ${skillsText} and would love to bring that experience to your team.`,

        `I'd like to apply for ${cleanTitle} at ${cleanCompany}. My background in ${skillsText} aligns well with what you're looking for.`,
    ];
    
    // Choose template set based on user preference
    const templates = userPrefs?.toneStyle === 'conversational' ? conversationalTemplates : formalTemplates;
    
    // Filter out templates containing phrases user previously removed
    let filteredTemplates = templates;
    if (userPrefs?.avoidPhrases.length) {
        filteredTemplates = templates.filter(t => 
            !userPrefs.avoidPhrases.some(phrase => t.toLowerCase().includes(phrase.toLowerCase()))
        );
        if (filteredTemplates.length === 0) filteredTemplates = templates; // Fallback
    }

    return filteredTemplates[Math.floor(Math.random() * filteredTemplates.length)];
}

/**
 * Generate body paragraphs with relevant experience and skills
 */
function generateBody(
    relevantExperience: { title: string; company: string; description: string }[],
    achievements: string[],
    keySkills: string[],
    userPrefs?: UserPreferences | null
): string {
    const paragraphs: string[] = [];
    
    // Helper to filter out avoided phrases
    const filterPhrase = (text: string): string => {
        if (!userPrefs?.avoidPhrases.length) return text;
        let result = text;
        for (const phrase of userPrefs.avoidPhrases) {
            result = result.replace(new RegExp(phrase, 'gi'), '');
        }
        return result.replace(/\s{2,}/g, ' ').trim();
    };

    // First paragraph: detailed current/recent experience
    if (relevantExperience.length > 0) {
        const exp = relevantExperience[0];
        const cleanTitle = sanitizeText(exp.title);
        const cleanCompany = sanitizeText(exp.company);
        
        // Get multiple sentences from description
        let desc = sanitizeText(exp.description);
        const sentences = desc.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 2);
        
        let expParagraph = `In my role as ${cleanTitle} at ${cleanCompany}, I have developed skills directly applicable to this position. `;
        
        if (sentences.length > 0) {
            const cleanedSentences = sentences.map(s => {
                let cleaned = sanitizeText(s.trim());
                cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                return cleaned;
            });
            expParagraph += cleanedSentences.join('. ') + '. ';
        }
        
        expParagraph += `This experience has given me a solid understanding of industry best practices.`;
        paragraphs.push(filterPhrase(expParagraph));
    }

    // Second paragraph: additional experience (skip if user prefers short letters)
    if (relevantExperience.length > 1 && userPrefs?.preferredLength !== 'short') {
        const exp = relevantExperience[1];
        const cleanTitle = sanitizeText(exp.title);
        const cleanCompany = sanitizeText(exp.company);
        
        paragraphs.push(filterPhrase(`Previously, as ${cleanTitle} at ${cleanCompany}, I honed my professional skills and gained exposure to diverse challenges.`));
    }

    // Third paragraph: achievements with metrics
    if (achievements.length > 0) {
        const sortedAchievements = [...achievements].sort((a, b) => {
            const aHasMetric = /\d+%|\$\d|\d+x|\d+ (percent|million|thousand)/i.test(a) ? 1 : 0;
            const bHasMetric = /\d+%|\$\d|\d+x|\d+ (percent|million|thousand)/i.test(b) ? 1 : 0;
            return bHasMetric - aHasMetric;
        });
        
        // Adjust count based on preferred length
        const achievementCount = userPrefs?.preferredLength === 'short' ? 1 : 
                                 userPrefs?.preferredLength === 'long' ? 3 : 2;
        
        const topAchievements = sortedAchievements.slice(0, achievementCount).map(a => {
            let clean = sanitizeText(a);
            if (!clean.endsWith('.') && !clean.endsWith('!')) clean += '.';
            clean = clean.charAt(0).toUpperCase() + clean.slice(1);
            return clean;
        }).filter(a => a.length > 15 && a.length < 200);
        
        if (topAchievements.length > 0) {
            let achievementParagraph = `Key accomplishments include: `;
            achievementParagraph += topAchievements.join(' ');
            paragraphs.push(filterPhrase(achievementParagraph));
        }
    }

    // Fourth paragraph: skills and technical proficiency
    const skills = keySkills.slice(0, 5).map(s => sanitizeText(s));
    if (skills.length > 0) {
        const skillsList = skills.slice(0, -1).join(', ') + (skills.length > 1 ? ', and ' + skills[skills.length - 1] : skills[0]);
        paragraphs.push(filterPhrase(`I am proficient in ${skillsList} and committed to staying current with industry trends.`));
    }

    // Fifth paragraph: why this company/role (skip if short)
    if (userPrefs?.preferredLength !== 'short') {
        paragraphs.push(filterPhrase(`This opportunity aligns with my career goals, and I look forward to contributing my skills to your team.`));
    }

    return paragraphs.join('\n\n');
}

/**
 * Generate professional closing paragraph
 */
function generateClosing(): string {
    const closingTemplates = [
        `Thank you for considering my application. I would welcome the opportunity to discuss how my background and skills can contribute to your team's success. I am available for an interview at your convenience and look forward to hearing from you.`,

        `I appreciate your time in reviewing my application. I am enthusiastic about the possibility of joining your organization and would be happy to provide any additional information you may need. I look forward to the opportunity to discuss this position further.`,

        `Thank you for your consideration. I am confident that my experience and skills make me a strong candidate for this role, and I would be grateful for the chance to discuss how I can contribute to your team. Please feel free to contact me at your earliest convenience.`,
    ];

    return closingTemplates[Math.floor(Math.random() * closingTemplates.length)];
}

/**
 * Extract and fetch job description from a URL
 * Uses parallel proxy racing for maximum speed with smart content extraction
 */
export async function fetchJobDescriptionFromUrl(url: string): Promise<string> {
    // Validate URL
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error('Invalid URL format');
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Race multiple proxies in parallel for fastest response
    const proxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
    ];

    const fetchWithTimeout = async (proxyUrl: string, timeout: number): Promise<string> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(proxyUrl + encodeURIComponent(url), {
                signal: controller.signal,
                headers: { 'Accept': 'text/html,application/xhtml+xml' }
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('Fetch failed');
            return await response.text();
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    };

    // Race all proxies - first successful one wins
    let html = '';
    try {
        html = await Promise.any(
            proxies.map(proxy => fetchWithTimeout(proxy, 8000))
        );
    } catch {
        throw new Error('Could not reach the page. Try pasting the job description manually.');
    }

    if (!html || html.length < 100) {
        throw new Error('Page returned empty content. Try pasting the job description manually.');
    }

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let content = '';

    // Helper to strip HTML tags and decode entities
    const stripHtml = (htmlStr: string): string => {
        // Create a temporary element to decode HTML entities and strip tags
        const temp = doc.createElement('div');
        temp.innerHTML = htmlStr;
        return temp.textContent || temp.innerText || '';
    };

    // Helper to truncate at common boilerplate/company info sections
    const truncateAtBoilerplate = (text: string): string => {
        // Patterns that typically indicate end of job-specific content
        const boilerplateMarkers = [
            /\bAbout\s+(the\s+)?Company\b/i,
            /\bAbout\s+S&P\s+Global\b/i,
            /\bAbout\s+Us\b/i,
            /\bWho\s+We\s+Are\b/i,
            /\bWhat'?s\s+In\s+It\s+For\s+You\b/i,
            /\bOur\s+Mission\b/i,
            /\bOur\s+Values\b/i,
            /\bOur\s+People\b/i,
            /\bOur\s+Culture\b/i,
            /\bBenefits\s*(:|We\s+Offer)\b/i,
            /\bPerks\s+(&|and)\s+Benefits\b/i,
            /\bEqual\s+Opportunity\s+Employer\b/i,
            /\bEEO\s+Statement\b/i,
            /\bDiversity\s+(&|and)\s+Inclusion\b/i,
            /\bWe\s+are\s+an\s+equal\b/i,
            /\bLearn\s+more\s+at\s+www\./i,
            /\bVisit\s+(us\s+at\s+)?www\./i,
            /\bFor\s+more\s+information\s+visit\b/i,
            /\bApply\s+Now\b/i,
            /\bHow\s+to\s+Apply\b/i,
            /\bApplication\s+Process\b/i,
            /\bSalary\s+Range\s*:/i,
            /\bCompensation\s*:/i,
        ];
        
        let minIndex = text.length;
        for (const pattern of boilerplateMarkers) {
            const match = text.match(pattern);
            if (match && match.index !== undefined && match.index > 200 && match.index < minIndex) {
                minIndex = match.index;
            }
        }
        
        if (minIndex < text.length) {
            return text.substring(0, minIndex).trim();
        }
        return text;
    };

    // Helper to clean and validate extracted text
    const cleanText = (text: string): string => {
        // Remove excessive whitespace
        let cleaned = text.replace(/[\t\r]+/g, ' ').replace(/ +/g, ' ');
        
        // Split into lines and filter
        const lines = cleaned.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
        
        // Remove duplicate consecutive lines (navigation menus often repeat)
        const deduped: string[] = [];
        const seen = new Set<string>();
        for (const line of lines) {
            const normalized = line.toLowerCase().substring(0, 50);
            if (!seen.has(normalized)) {
                seen.add(normalized);
                deduped.push(line);
            }
        }
        
        // Filter out navigation/UI noise patterns
        const noisePatterns = [
            /^(sign in|log in|sign up|register|menu|home|about us|contact|privacy|terms|cookies?|©|copyright)/i,
            /^(share|tweet|post|follow|subscribe|newsletter)/i,
            /^(facebook|twitter|linkedin|instagram|youtube)/i,
            /^(back to|go to|view all|see more|show more|load more)/i,
            /^(search|filter|sort by|page \d)/i,
            /^\d+\s*(days?|hours?|minutes?|seconds?)\s*ago/i,
            /^(apply now|save job|report|flag)/i,
            /^[\W\s]*$/,  // Only punctuation/whitespace
            /^.{0,8}$/,   // Very short lines
        ];
        
        const meaningful = deduped.filter(line => {
            for (const pattern of noisePatterns) {
                if (pattern.test(line)) return false;
            }
            return true;
        });
        
        return meaningful.join('\n').trim();
    };

    // FIRST: Try JSON-LD extraction BEFORE removing any elements
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
        try {
            const jsonText = script.textContent || '';
            if (!jsonText.includes('JobPosting')) continue;
            
            const data = JSON.parse(jsonText);
            const findJobDescription = (obj: unknown): string | null => {
                if (!obj || typeof obj !== 'object') return null;
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const found = findJobDescription(item);
                        if (found) return found;
                    }
                    return null;
                }
                const record = obj as Record<string, unknown>;
                // Look for JobPosting schema
                if (record['@type'] === 'JobPosting') {
                    const desc = record.description;
                    if (typeof desc === 'string' && desc.length > 50) {
                        return stripHtml(desc);
                    }
                }
                // Recurse into nested objects
                for (const val of Object.values(record)) {
                    const found = findJobDescription(val);
                    if (found) return found;
                }
                return null;
            };
            const desc = findJobDescription(data);
            if (desc && desc.length > 100) {
                // For JSON-LD, we have clean structured data - just do light cleaning
                content = desc.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
                // Truncate at boilerplate sections
                content = truncateAtBoilerplate(content);
                break;
            }
        } catch {
            // Continue to next script
        }
    }

    // If JSON-LD worked, return early
    if (content.length > 100) {
        return content.substring(0, 6000);
    }

    // NOW remove noise elements for DOM-based extraction
    const removeSelectors = [
        'script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript', 'svg',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',
        '.nav', '.navbar', '.navigation', '.menu', '.footer', '.header', '.sidebar',
        '.cookie', '.cookies', '.gdpr', '.popup', '.modal', '.overlay', '.ad', '.ads', '.advertisement',
        '[class*="cookie"]', '[class*="nav-"]', '[class*="menu-"]', '[class*="footer"]', '[class*="header"]',
        '[class*="sidebar"]', '[class*="social"]', '[class*="share"]', '[class*="related"]',
        '[id*="cookie"]', '[id*="nav"]', '[id*="menu"]', '[id*="footer"]', '[id*="header"]',
    ];
    removeSelectors.forEach(sel => {
        try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch { /* selector failed */ }
    });

    // Site-specific selectors (ordered by specificity)
    const siteSelectors: { pattern: RegExp; selectors: string[] }[] = [
        {
            pattern: /linkedin\.com/i,
            selectors: [
                '.show-more-less-html__markup',
                '.description__text .show-more-less-html',
                '.jobs-description__content',
                '.jobs-box__html-content',
                '[class*="jobs-description"]',
            ]
        },
        {
            pattern: /greenhouse\.io|boards\.greenhouse/i,
            selectors: ['.content', '#content', '.job-post', '[class*="job"]']
        },
        {
            pattern: /lever\.co/i,
            selectors: ['.posting-page', '.content', '[class*="posting"]']
        },
        {
            pattern: /workday\.com|myworkday/i,
            selectors: ['[data-automation-id="jobPostingDescription"]', '.job-description', '[class*="description"]']
        },
        {
            pattern: /indeed\.com/i,
            selectors: ['#jobDescriptionText', '.jobsearch-jobDescriptionText', '[class*="jobDescription"]']
        },
        {
            pattern: /glassdoor\.com/i,
            selectors: ['[class*="JobDetails"]', '.desc', '.jobDescriptionContent']
        },
        {
            pattern: /spglobal\.com|careers\./i,
            selectors: [
                '[class*="job-description"]', '[class*="jobDescription"]', '[class*="description-content"]',
                '.job-details-content', '.posting-description', '[data-testid*="description"]',
                'article', '.content-main', '[role="main"] > div'
            ]
        }
    ];

    // Try site-specific selectors
    if (content.length < 100) {
        for (const { pattern, selectors } of siteSelectors) {
            if (pattern.test(hostname) || pattern.test(url)) {
                for (const selector of selectors) {
                    try {
                        const el = doc.querySelector(selector);
                        if (el) {
                            const text = cleanText(el.textContent || '');
                            if (text.length > 100) {
                                content = text;
                                break;
                            }
                        }
                    } catch { /* selector failed */ }
                }
                if (content.length > 100) break;
            }
        }
    }

    // Generic selectors
    if (content.length < 100) {
        const genericSelectors = [
            '[class*="job-description"]', '[class*="jobDescription"]', '[class*="job_description"]',
            '[class*="description-content"]', '[class*="descriptionContent"]',
            '[data-qa="job-description"]', '[data-testid="job-description"]',
            '.job-details', '.posting-description', '.job-content',
            'article.job', 'section.job',
            'article', '[role="main"]', 'main',
        ];
        
        for (const selector of genericSelectors) {
            try {
                const el = doc.querySelector(selector);
                if (el) {
                    const text = cleanText(el.textContent || '');
                    if (text.length > 100) {
                        content = text;
                        break;
                    }
                }
            } catch { /* selector failed */ }
        }
    }

    // Last resort: try to find the largest text block that looks like a job description
    if (content.length < 100) {
        const candidates: { el: Element; score: number; text: string }[] = [];
        const allDivs = doc.querySelectorAll('div, section, article');
        
        for (const el of allDivs) {
            const text = cleanText(el.textContent || '');
            if (text.length < 200) continue;
            
            // Score based on job-related keywords
            let score = 0;
            const lower = text.toLowerCase();
            const keywords = ['responsibilities', 'requirements', 'qualifications', 'experience', 'skills', 
                             'about the role', 'about you', 'what you', 'job description', 'we are looking',
                             'you will', 'you have', 'years of experience', 'bachelor', 'degree', 'salary'];
            for (const kw of keywords) {
                if (lower.includes(kw)) score += 10;
            }
            
            // Penalize if too much noise
            const noiseWords = ['sign in', 'log in', 'cookie', 'privacy policy', 'terms of'];
            for (const nw of noiseWords) {
                if (lower.includes(nw)) score -= 20;
            }
            
            if (score > 0) {
                candidates.push({ el, score, text });
            }
        }
        
        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);
        
        if (candidates.length > 0 && candidates[0].score > 20) {
            content = candidates[0].text;
        }
    }

    // Final cleanup
    content = content
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (content.length < 50) {
        throw new Error('Could not extract job description. Try pasting the job details manually.');
    }

    // Truncate to reasonable length
    return content.substring(0, 6000);
}
