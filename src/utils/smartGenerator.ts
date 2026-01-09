// ============================================================
// SMART COVER LETTER GENERATOR - No API Required
// Uses advanced pattern matching and dynamic text generation
// ============================================================

import { ResumeData } from './storage';

export type LetterLength = 'short' | 'medium' | 'long';

// ============================================================
// SMART JOB PARSING - Extract company, title, and requirements
// ============================================================

export interface ParsedJob {
    companyName: string;
    jobTitle: string;
    department?: string;
    location?: string;
    requirements: string[];
    responsibilities: string[];
    skills: string[];
    isInternship: boolean;
    isRemote: boolean;
    seniority: 'intern' | 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
}

/**
 * Smart job description parser - extracts structured info without AI
 */
export function parseJobDescription(text: string): ParsedJob {
    const normalizedText = text.replace(/\s+/g, ' ').trim();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // ========== COMPANY NAME DETECTION ==========
    let companyName = '';
    
    // Known companies database (extensive list)
    const knownCompanies: [RegExp, string][] = [
        // Tech Giants
        [/\bGoogle\b/i, 'Google'],
        [/\bMeta\b(?:\s+Platforms)?/i, 'Meta'],
        [/\bAmazon\b/i, 'Amazon'],
        [/\bMicrosoft\b/i, 'Microsoft'],
        [/\bApple\b(?:\s+Inc)?/i, 'Apple'],
        [/\bNetflix\b/i, 'Netflix'],
        [/\bSalesforce\b/i, 'Salesforce'],
        [/\bOracle\b/i, 'Oracle'],
        [/\bIBM\b/i, 'IBM'],
        [/\bCisco\b/i, 'Cisco'],
        [/\bIntel\b/i, 'Intel'],
        [/\bNVIDIA\b/i, 'NVIDIA'],
        [/\bAMD\b/i, 'AMD'],
        [/\bQualcomm\b/i, 'Qualcomm'],
        [/\bAdobe\b/i, 'Adobe'],
        [/\bVMware\b/i, 'VMware'],
        [/\bSnowflake\b/i, 'Snowflake'],
        [/\bDatadog\b/i, 'Datadog'],
        [/\bStripe\b/i, 'Stripe'],
        [/\bSquare\b|Block,?\s*Inc/i, 'Block'],
        [/\bShopify\b/i, 'Shopify'],
        [/\bUber\b/i, 'Uber'],
        [/\bLyft\b/i, 'Lyft'],
        [/\bAirbnb\b/i, 'Airbnb'],
        [/\bDoorDash\b/i, 'DoorDash'],
        [/\bInstacart\b/i, 'Instacart'],
        [/\bTwitter\b|\bX\s+Corp/i, 'X'],
        [/\bLinkedIn\b/i, 'LinkedIn'],
        [/\bSpotify\b/i, 'Spotify'],
        [/\bZoom\b/i, 'Zoom'],
        [/\bSlack\b/i, 'Slack'],
        [/\bAsana\b/i, 'Asana'],
        [/\bNotion\b/i, 'Notion'],
        [/\bFigma\b/i, 'Figma'],
        [/\bCanva\b/i, 'Canva'],
        [/\bPalantir\b/i, 'Palantir'],
        [/\bOpenAI\b/i, 'OpenAI'],
        [/\bAnthropic\b/i, 'Anthropic'],
        
        // Finance
        [/Goldman\s*Sachs/i, 'Goldman Sachs'],
        [/JP\s*Morgan|JPMorgan/i, 'JPMorgan'],
        [/Morgan\s*Stanley/i, 'Morgan Stanley'],
        [/Bank\s*of\s*America/i, 'Bank of America'],
        [/\bCiti\b(?:bank|group)?/i, 'Citi'],
        [/Wells\s*Fargo/i, 'Wells Fargo'],
        [/\bBlackRock\b/i, 'BlackRock'],
        [/\bFidelity\b/i, 'Fidelity'],
        [/\bVanguard\b/i, 'Vanguard'],
        [/\bCapital\s*One\b/i, 'Capital One'],
        [/\bAmerican\s*Express\b|\bAmex\b/i, 'American Express'],
        [/\bVisa\b/i, 'Visa'],
        [/\bMastercard\b/i, 'Mastercard'],
        [/\bPayPal\b/i, 'PayPal'],
        [/\bRobinhood\b/i, 'Robinhood'],
        [/\bCoinbase\b/i, 'Coinbase'],
        
        // Consulting
        [/\bMcKinsey\b/i, 'McKinsey'],
        [/\bBCG\b|Boston\s*Consulting/i, 'BCG'],
        [/\bBain\b(?:\s*&\s*Company)?/i, 'Bain & Company'],
        [/\bDeloitte\b/i, 'Deloitte'],
        [/\bPwC\b|PricewaterhouseCoopers/i, 'PwC'],
        [/\bEY\b|Ernst\s*&?\s*Young/i, 'EY'],
        [/\bKPMG\b/i, 'KPMG'],
        [/\bAccenture\b/i, 'Accenture'],
        [/\bBooz\s*Allen/i, 'Booz Allen Hamilton'],
        
        // Semiconductor & Hardware
        [/Tokyo\s*Electron/i, 'Tokyo Electron'],
        [/\bTEL\b(?:\s+(?:America|US|USA))?/i, 'Tokyo Electron'],
        [/\bASML\b/i, 'ASML'],
        [/\bLam\s*Research/i, 'Lam Research'],
        [/Applied\s*Materials/i, 'Applied Materials'],
        [/\bMicron\b/i, 'Micron'],
        [/\bSamsung\b/i, 'Samsung'],
        [/\bTSMC\b|Taiwan\s*Semiconductor/i, 'TSMC'],
        [/\bBroadcom\b/i, 'Broadcom'],
        [/\bTexas\s*Instruments\b|\bTI\b/i, 'Texas Instruments'],
        [/\bAnalog\s*Devices\b/i, 'Analog Devices'],
        
        // Healthcare & Pharma
        [/\bPfizer\b/i, 'Pfizer'],
        [/\bJohnson\s*&\s*Johnson\b|\bJ&J\b/i, 'Johnson & Johnson'],
        [/\bMerck\b/i, 'Merck'],
        [/\bAbbVie\b/i, 'AbbVie'],
        [/\bBristol.?Myers/i, 'Bristol-Myers Squibb'],
        [/\bNovartis\b/i, 'Novartis'],
        [/\bRoche\b/i, 'Roche'],
        [/\bGenentech\b/i, 'Genentech'],
        [/\bGilead\b/i, 'Gilead'],
        [/\bModerna\b/i, 'Moderna'],
        [/\bAmgen\b/i, 'Amgen'],
        [/United\s*Health/i, 'UnitedHealth'],
        [/\bCVS\b/i, 'CVS Health'],
        [/\bKaiser\b/i, 'Kaiser Permanente'],
        
        // Retail & Consumer
        [/\bWalmart\b/i, 'Walmart'],
        [/\bTarget\b/i, 'Target'],
        [/\bCostco\b/i, 'Costco'],
        [/\bHome\s*Depot\b/i, 'Home Depot'],
        [/\bLowe'?s\b/i, "Lowe's"],
        [/\bNike\b/i, 'Nike'],
        [/\bStarbucks\b/i, 'Starbucks'],
        [/\bMcDonald'?s\b/i, "McDonald's"],
        [/\bCoca.?Cola\b/i, 'Coca-Cola'],
        [/\bPepsi\b(?:Co)?/i, 'PepsiCo'],
        [/Procter\s*&?\s*Gamble|\bP&G\b/i, 'Procter & Gamble'],
        [/\bUnilever\b/i, 'Unilever'],
        [/\bNestl[eé]\b/i, 'Nestlé'],
        
        // Data & Analytics
        [/S\s*&\s*P\s*Global/i, 'S&P Global'],
        [/\bBloomberg\b/i, 'Bloomberg'],
        [/\bReuters\b/i, 'Reuters'],
        [/\bMoody'?s\b/i, "Moody's"],
        [/\bFitch\b/i, 'Fitch Ratings'],
        
        // Aerospace & Defense
        [/\bBoeing\b/i, 'Boeing'],
        [/\bLockheed\s*Martin\b/i, 'Lockheed Martin'],
        [/\bNorthrop\s*Grumman\b/i, 'Northrop Grumman'],
        [/\bRaytheon\b/i, 'Raytheon'],
        [/\bGeneral\s*Dynamics\b/i, 'General Dynamics'],
        [/\bSpaceX\b/i, 'SpaceX'],
        [/\bBlue\s*Origin\b/i, 'Blue Origin'],
        
        // Automotive
        [/\bTesla\b/i, 'Tesla'],
        [/\bFord\b/i, 'Ford'],
        [/General\s*Motors|\bGM\b/i, 'General Motors'],
        [/\bToyota\b/i, 'Toyota'],
        [/\bHonda\b/i, 'Honda'],
        [/\bBMW\b/i, 'BMW'],
        [/\bMercedes/i, 'Mercedes-Benz'],
        [/\bVolkswagen\b|\bVW\b/i, 'Volkswagen'],
        [/\bRivian\b/i, 'Rivian'],
        [/\bLucid\b/i, 'Lucid Motors'],
        [/\bWaymo\b/i, 'Waymo'],
        
        // Energy
        [/\bExxon\b/i, 'ExxonMobil'],
        [/\bChevron\b/i, 'Chevron'],
        [/\bShell\b/i, 'Shell'],
        [/\bBP\b/i, 'BP'],
        [/\bConocoPhillips\b/i, 'ConocoPhillips'],
        [/\bNextEra\b/i, 'NextEra Energy'],
    ];
    
    // Check known companies first
    for (const [pattern, name] of knownCompanies) {
        if (pattern.test(text)) {
            companyName = name;
            break;
        }
    }
    
    // If not found, try pattern matching
    if (!companyName) {
        const corpPatterns = [
            // "Company Name, Inc." patterns
            /([A-Z][A-Za-z0-9\s&\-]+),?\s*(?:Inc|LLC|Ltd|Corp|Corporation|Limited|Company|Co|LP|LLP|PLC|GmbH|AG|SA|NV|BV)\.?/i,
            // "X is seeking/hiring" patterns
            /([A-Z][A-Za-z0-9&\s\-]{2,30})\s+(?:is\s+)?(?:seeking|hiring|looking\s+for|recruiting)/i,
            // "Join X" or "About X" patterns
            /(?:join|about)\s+([A-Z][A-Za-z0-9&\s\-]{2,30})(?:\s*[,.\n!]|\s+(?:is|are|we|and|as|in|to|,))/i,
        ];
        
        for (const pattern of corpPatterns) {
            const match = normalizedText.match(pattern);
            if (match && match[1]) {
                const candidate = match[1].trim();
                const badWords = ['the', 'this', 'that', 'with', 'from', 'your', 'about', 'join', 'apply', 'position', 'role', 'job', 'we', 'our'];
                if (candidate.length >= 3 && candidate.length <= 50 && !badWords.includes(candidate.toLowerCase())) {
                    companyName = candidate;
                    break;
                }
            }
        }
    }
    
    // ========== JOB TITLE DETECTION ==========
    let jobTitle = '';
    
    const titleKeywords = /\b(intern|engineer|developer|analyst|scientist|manager|director|specialist|coordinator|associate|consultant|designer|architect|lead|administrator|technician|representative|assistant|officer|executive|head|vp|vice\s*president|principal|staff)\b/i;
    
    // First line is often the job title
    if (lines[0] && titleKeywords.test(lines[0]) && lines[0].length < 100) {
        jobTitle = lines[0].replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').trim();
    }
    
    // Try explicit patterns
    if (!jobTitle) {
        const titlePatterns = [
            /(?:job\s*title|position|role)\s*[:\-]\s*([^\n]{5,70})/i,
            /(?:^|\n)\s*([A-Za-z\s\-\/]+(?:Intern|Engineer|Developer|Analyst|Scientist|Manager|Director|Specialist)[^\n]{0,30})/i,
            /(?:seeking|hiring)\s+(?:a|an)\s+([A-Za-z\s\-\/]+(?:Intern|Engineer|Developer|Analyst|Scientist))/i,
        ];
        
        for (const pattern of titlePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const candidate = match[1].trim();
                if (candidate.length >= 5 && candidate.length <= 80 && titleKeywords.test(candidate)) {
                    jobTitle = candidate.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').trim();
                    break;
                }
            }
        }
    }
    
    // ========== EXTRACT REQUIREMENTS & SKILLS ==========
    const requirements: string[] = [];
    const responsibilities: string[] = [];
    const skills: string[] = [];
    
    // Technical skills to detect
    const technicalSkills = [
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust', 'swift', 'kotlin',
        'react', 'angular', 'vue', 'node.js', 'django', 'flask', 'spring', 'express',
        'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
        'machine learning', 'deep learning', 'data science', 'data analysis',
        'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
        'git', 'ci/cd', 'agile', 'scrum', 'jira',
        'excel', 'powerpoint', 'tableau', 'power bi', 'matlab', 'r',
        'communication', 'leadership', 'teamwork', 'problem-solving', 'analytical'
    ];
    
    const lowerText = text.toLowerCase();
    for (const skill of technicalSkills) {
        if (lowerText.includes(skill)) {
            skills.push(skill);
        }
    }
    
    // Extract bulleted requirements
    const bulletLines = text.match(/(?:^|\n)\s*[•\-\*]\s*([^\n]+)/g) || [];
    for (const line of bulletLines.slice(0, 10)) {
        const clean = line.replace(/^[\s•\-\*]+/, '').trim();
        if (clean.length > 10 && clean.length < 200) {
            if (/(?:experience|knowledge|ability|skill|proficien|familiar)/i.test(clean)) {
                requirements.push(clean);
            } else if (/(?:will|responsible|develop|design|create|manage|support|work)/i.test(clean)) {
                responsibilities.push(clean);
            }
        }
    }
    
    // ========== DETECT JOB TYPE ==========
    const isInternship = /\b(intern|internship|co-op|summer\s+\d{4})\b/i.test(text);
    const isRemote = /\b(remote|work\s+from\s+home|wfh|hybrid)\b/i.test(text);
    
    // Detect seniority
    let seniority: 'intern' | 'entry' | 'mid' | 'senior' | 'lead' | 'executive' = 'mid';
    if (isInternship) seniority = 'intern';
    else if (/\b(entry.?level|junior|new\s+grad|0-2\s+years?)\b/i.test(text)) seniority = 'entry';
    else if (/\b(senior|sr\.?|5\+\s+years?|7\+\s+years?)\b/i.test(text)) seniority = 'senior';
    else if (/\b(lead|principal|staff|architect)\b/i.test(text)) seniority = 'lead';
    else if (/\b(director|vp|vice\s*president|head\s+of|c-level|chief)\b/i.test(text)) seniority = 'executive';
    
    return {
        companyName: companyName || 'the company',
        jobTitle: jobTitle || 'this position',
        requirements,
        responsibilities,
        skills: skills.slice(0, 15),
        isInternship,
        isRemote,
        seniority
    };
}

// ============================================================
// SMART COVER LETTER GENERATOR
// ============================================================

interface GeneratorContext {
    job: ParsedJob;
    resume: ResumeData;
    matchedSkills: string[];
    matchedExperiences: { title: string; company: string; bullets: string[] }[];
    achievements: string[];
}

/**
 * Build context by matching resume to job
 */
function buildContext(job: ParsedJob, resume: ResumeData): GeneratorContext {
    const resumeSkills = resume.skills.map(s => s.toLowerCase());
    const jobSkills = job.skills.map(s => s.toLowerCase());
    
    // Find matching skills
    const matchedSkills = resumeSkills.filter(s => 
        jobSkills.some(js => s.includes(js) || js.includes(s))
    );
    
    // Find relevant experiences
    const matchedExperiences: { title: string; company: string; bullets: string[] }[] = [];
    for (const exp of resume.workExperience.slice(0, 3)) {
        const bullets = exp.description.split('\n').filter(b => b.trim().length > 10);
        matchedExperiences.push({
            title: exp.title,
            company: exp.company,
            bullets
        });
    }
    
    // Extract achievements with metrics
    const achievements: string[] = [];
    for (const exp of resume.workExperience) {
        const lines = exp.description.split('\n');
        for (const line of lines) {
            if (/\d+%|\$[\d,]+|\d+x|\d+\s*(percent|million|thousand|users|customers)/i.test(line)) {
                const clean = line.replace(/^[\s•\-\*]+/, '').trim();
                if (clean.length > 15 && clean.length < 200) {
                    achievements.push(clean);
                }
            }
        }
    }
    
    return {
        job,
        resume,
        matchedSkills: matchedSkills.slice(0, 8),
        matchedExperiences,
        achievements: achievements.slice(0, 5)
    };
}

// ============================================================
// DYNAMIC SENTENCE BUILDERS - Not static templates!
// ============================================================

const OPENERS = {
    interest: [
        'I am applying for',
        'I am writing regarding',
        'I am interested in',
        'I would like to apply for',
        'I am submitting my application for',
    ],
    internship: [
        'As a student pursuing',
        'Currently completing my studies in',
        'As an aspiring professional in',
    ]
};

const SKILL_PHRASES = [
    'My experience includes',
    'I have worked extensively with',
    'My background includes',
    'I have developed proficiency in',
    'I bring experience in',
];

const ACHIEVEMENT_INTROS = [
    'In my previous role,',
    'At my current position,',
    'During my time at',
    'A notable accomplishment:',
    'One achievement I am proud of:',
];

const CLOSERS = [
    'Thank you for considering my application. I look forward to discussing this opportunity.',
    'I appreciate your time and would welcome the chance to discuss how I can contribute.',
    'Thank you for your consideration. I am available for an interview at your convenience.',
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function formatList(items: string[], maxItems = 4): string {
    const selected = items.slice(0, maxItems);
    if (selected.length === 0) return '';
    if (selected.length === 1) return selected[0];
    if (selected.length === 2) return `${selected[0]} and ${selected[1]}`;
    return selected.slice(0, -1).join(', ') + ', and ' + selected[selected.length - 1];
}

function sanitize(text: string): string {
    return text
        .replace(/[•·▪▸►◦‣⁃]/g, '')
        .replace(/\b(\w+)\s+ed\b/g, '$1ed')
        .replace(/\b(\w+)\s+ing\b/g, '$1ing')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([.,;:!?])/g, '$1')
        .trim();
}

/**
 * Generate opening paragraph
 */
function generateOpening(ctx: GeneratorContext, length: LetterLength): string {
    const { job, matchedSkills, resume } = ctx;
    const opener = pickRandom(OPENERS.interest);
    
    let opening = `${opener} the ${job.jobTitle} position at ${job.companyName}.`;
    
    // Add skills mention
    if (matchedSkills.length > 0) {
        const skillCount = length === 'short' ? 2 : length === 'long' ? 5 : 3;
        const skillsText = formatList(matchedSkills, skillCount);
        opening += ` My background in ${skillsText} aligns with what you are looking for.`;
    }
    
    // Add seniority-specific line (skip for short)
    if (length !== 'short') {
        if (job.seniority === 'intern') {
            opening += ' I am eager to apply my academic knowledge in a professional setting.';
        } else if (job.seniority === 'senior' || job.seniority === 'lead') {
            opening += ' With several years of industry experience, I am ready to contribute at a high level.';
        }
    }
    
    // Long: add education or current role context
    if (length === 'long' && resume.education.length > 0) {
        const edu = resume.education[0];
        if (edu.degree && edu.school) {
            opening += ` I hold a ${sanitize(edu.degree)} from ${sanitize(edu.school)}, which has prepared me well for this opportunity.`;
        }
    }
    
    return opening;
}

/**
 * Generate body paragraphs - adjusted by length
 */
function generateBody(ctx: GeneratorContext, length: LetterLength): string {
    const paragraphs: string[] = [];
    const { matchedExperiences, achievements, matchedSkills, job, resume } = ctx;
    
    // Determine how many experiences/achievements to include based on length
    const maxExperiences = length === 'short' ? 1 : length === 'long' ? 3 : 2;
    const maxAchievements = length === 'short' ? 1 : length === 'long' ? 4 : 2;
    const maxBulletsPerExp = length === 'short' ? 1 : length === 'long' ? 3 : 2;
    
    // Paragraph 1: Current/recent experience
    const experiencesToInclude = matchedExperiences.slice(0, maxExperiences);
    
    for (let i = 0; i < experiencesToInclude.length; i++) {
        const exp = experiencesToInclude[i];
        let para = '';
        
        if (i === 0) {
            para = `In my role as ${sanitize(exp.title)} at ${sanitize(exp.company)}, I developed skills directly relevant to this position.`;
        } else {
            para = `Previously, as ${sanitize(exp.title)} at ${sanitize(exp.company)}, I further honed my abilities.`;
        }
        
        // Add relevant bullets based on length
        const bulletsToAdd = exp.bullets.slice(0, maxBulletsPerExp);
        for (const bullet of bulletsToAdd) {
            const cleanBullet = sanitize(bullet);
            if (cleanBullet.length > 20 && cleanBullet.length < 150) {
                let sentence = cleanBullet;
                if (!sentence.match(/^[A-Z]/)) {
                    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
                }
                if (!sentence.endsWith('.')) sentence += '.';
                para += ` ${sentence}`;
            }
        }
        
        paragraphs.push(para);
    }
    
    // Achievements paragraph (unless short and already have experience)
    if (achievements.length > 0 && (length !== 'short' || paragraphs.length === 0)) {
        const achievementsToInclude = achievements.slice(0, maxAchievements);
        const intro = pickRandom(ACHIEVEMENT_INTROS);
        
        let para = intro;
        for (let i = 0; i < achievementsToInclude.length; i++) {
            let achievement = sanitize(achievementsToInclude[i]);
            if (!achievement.match(/^[A-Z]/)) {
                achievement = achievement.charAt(0).toUpperCase() + achievement.slice(1);
            }
            if (!achievement.endsWith('.')) achievement += '.';
            
            if (i === 0) {
                para += ` ${achievement}`;
            } else if (i === 1) {
                para += ` Additionally, I ${achievement.charAt(0).toLowerCase() + achievement.slice(1)}`;
            } else {
                para += ` ${achievement}`;
            }
        }
        
        paragraphs.push(para);
    }
    
    // Skills alignment paragraph (skip for short if we have enough content)
    if (matchedSkills.length > 0 && (length !== 'short' || paragraphs.length < 2)) {
        const skillIntro = pickRandom(SKILL_PHRASES);
        const skillCount = length === 'short' ? 3 : length === 'long' ? 6 : 5;
        const skillsList = formatList(matchedSkills, skillCount);
        let para = `${skillIntro} ${skillsList}.`;
        
        // Add commitment statement (not for short)
        if (length !== 'short') {
            if (job.seniority === 'intern' || job.seniority === 'entry') {
                para += ' I am committed to learning and growing in this role.';
            } else {
                para += ' I am committed to delivering quality results for your team.';
            }
        }
        
        paragraphs.push(para);
    }
    
    // Why this company paragraph (medium and long only)
    if (length !== 'short' && job.companyName !== 'the company') {
        let companyPara = `I am drawn to ${job.companyName} because of the opportunity to work on impactful projects and contribute to a team focused on excellence.`;
        
        // Long: add more about company fit
        if (length === 'long') {
            companyPara += ` The mission and culture at ${job.companyName} resonate with my professional values, and I am excited about the possibility of making meaningful contributions.`;
        }
        
        paragraphs.push(companyPara);
    }
    
    // Long only: Add leadership or additional context
    if (length === 'long') {
        // Add leadership experience if available
        if (resume.leadershipExperience && resume.leadershipExperience.length > 0) {
            const lead = resume.leadershipExperience[0];
            if (lead.role && lead.organization) {
                paragraphs.push(`Beyond my professional experience, I have demonstrated leadership as ${sanitize(lead.role)} at ${sanitize(lead.organization)}, where I developed collaboration and communication skills that translate directly to the workplace.`);
            }
        }
        
        // Or add education details if no leadership
        else if (resume.education.length > 0 && resume.education[0].description) {
            const edu = resume.education[0];
            const eduDesc = sanitize(edu.description);
            if (eduDesc.length > 20) {
                paragraphs.push(`My academic background includes ${eduDesc}, which has given me a strong foundation for this role.`);
            }
        }
    }
    
    return paragraphs.join('\n\n');
}

/**
 * Generate closing paragraph
 */
function generateClosing(length: LetterLength): string {
    if (length === 'short') {
        return 'Thank you for your consideration.';
    } else if (length === 'long') {
        return `${pickRandom(CLOSERS)} I am confident that my background and enthusiasm make me a strong candidate, and I am excited about the possibility of joining your team.`;
    }
    return pickRandom(CLOSERS);
}

// ============================================================
// MAIN EXPORT - Generate Complete Cover Letter
// ============================================================

export async function generateSmartCoverLetter(
    jobDescription: string,
    resume: ResumeData,
    length: LetterLength = 'medium'
): Promise<{ letter: string; parsedJob: ParsedJob }> {
    // Parse the job description
    const job = parseJobDescription(jobDescription);
    
    // Build matching context
    const ctx = buildContext(job, resume);
    
    // Generate each section based on length
    const opening = generateOpening(ctx, length);
    const body = generateBody(ctx, length);
    const closing = generateClosing(length);
    
    // Get personal info
    const { firstName, lastName, email, phone } = resume.personalInfo;
    const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Assemble letter
    const letter = `${currentDate}

Hiring Manager
${job.companyName}

Dear Hiring Manager,

${opening}

${body}

${closing}

Sincerely,
${firstName} ${lastName}
${phone} | ${email}`;

    return { letter, parsedJob: job };
}

/**
 * Fetch job description from URL (using existing logic)
 */
export { fetchJobDescriptionFromUrl } from './coverLetterGenerator';
