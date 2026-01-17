import * as PDFJS from 'pdfjs-dist';
import {
    ResumeData,
    PersonalInfo,
    WorkExperience,
    Education,
    LeadershipExperience,
    Award,
    Publication,
    Author,
    Grant,
    TeachingExperience,
    Conference,
    DateRange,
    emptyDateRange,
    MONTHS,
    MIN_YEAR,
    MAX_YEAR
} from './storage';

// Configure PDFJS worker
PDFJS.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('pdf.worker.min.mjs');

// ============================================================
// TEXT CLEANUP - Fix OCR/PDF extraction artifacts
// ============================================================

// Common words that get split incorrectly in PDFs
const COMMON_WORDS = [
    'professional', 'experience', 'education', 'university', 'bachelor', 'master',
    'development', 'management', 'engineering', 'technology', 'computer', 'science',
    'business', 'administration', 'associate', 'certificate', 'leadership', 'volunteer',
    'organization', 'achievement', 'accomplishment', 'publication', 'presentation',
    'conference', 'responsible', 'communication', 'collaboration', 'implementation',
    'international', 'department', 'foundation', 'scholarship', 'fellowship', 'research',
    'analysis', 'analytical', 'strategic', 'operations', 'performance', 'excellent',
    'expertise', 'proficiency', 'environment', 'application', 'architecture', 'software'
];

function normalizeText(text: string): string {
    let result = text;

    // Fix common OCR issues: single letters followed by space then rest of word
    // e.g., "Prof essional" -> "Professional", "Exp erience" -> "Experience"
    result = result.replace(/\b([A-Za-z])\s+([a-z]{2,})\b/g, (match, first, rest) => {
        const combined = (first + rest).toLowerCase();
        // Check if combined word is common
        for (const word of COMMON_WORDS) {
            if (word === combined || word.startsWith(combined)) {
                return first + rest;
            }
        }
        return match;
    });

    // Fix split words like "pro fessional" or "ex perience"
    result = result.replace(/\b([A-Za-z]{2,3})\s+([a-z]{3,})\b/g, (match, first, rest) => {
        const combined = (first + rest).toLowerCase();
        for (const word of COMMON_WORDS) {
            if (word === combined) {
                return first + rest;
            }
        }
        return match;
    });

    // Fix multiple spaces
    result = result.replace(/\s{2,}/g, ' ');

    // Fix spaces before punctuation
    result = result.replace(/\s+([.,;:!?])/g, '$1');

    // Fix isolated single letters that should be part of adjacent words
    result = result.replace(/\b([A-Z])\s(?=[a-z]{4,})/g, '$1');

    return result;
}

function cleanFieldValue(value: string, fieldType: 'name' | 'email' | 'phone' | 'url' | 'text' | 'date'): string {
    let cleaned = normalizeText(value).trim();

    switch (fieldType) {
        case 'name':
            // Remove any numbers, special chars except hyphen/apostrophe
            cleaned = cleaned.replace(/[^A-Za-z\s\-']/g, '').trim();
            // Capitalize properly
            cleaned = cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
            break;
        case 'email':
            // Keep only valid email chars
            cleaned = cleaned.replace(/\s/g, '').toLowerCase();
            break;
        case 'phone':
            // Normalize phone format
            const digits = cleaned.replace(/\D/g, '');
            if (digits.length === 10) {
                cleaned = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
            } else if (digits.length === 11 && digits.startsWith('1')) {
                cleaned = `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
            }
            break;
        case 'url':
            // Ensure URL starts with https://
            if (cleaned && !cleaned.startsWith('http')) {
                cleaned = 'https://' + cleaned;
            }
            break;
        case 'date':
            // Capitalize month names
            cleaned = cleaned.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/gi,
                m => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
            break;
        default:
            // General text cleanup
            cleaned = normalizeText(cleaned);
    }

    return cleaned;
}

// ============================================================
// MAIN PARSER
// ============================================================

export const parseResume = async (file: File): Promise<ResumeData> => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    let text = '';

    if (extension === 'pdf') {
        text = await parsePDF(file);
    } else {
        throw new Error('Only PDF files are supported. Please convert your document to PDF format.');
    }

    // Apply global text normalization
    text = normalizeText(text);

    console.log('Cleaned text:', text);
    return structureResumeText(text);
};

// ============================================================
// TEXT EXTRACTION
// ============================================================

async function parsePDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFJS.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        const items = content.items as any[];
        const lineMap = new Map<number, string[]>();

        items.forEach((item) => {
            const y = Math.round(item.transform[5]);
            if (!lineMap.has(y)) lineMap.set(y, []);
            lineMap.get(y)!.push(item.str);
        });

        const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
        const lines = sortedYs.map(y => lineMap.get(y)!.join(' ').trim()).filter(l => l);

        fullText += lines.join('\n') + '\n';
    }

    return fullText;
}

// ============================================================
// SECTION KEYWORDS
// ============================================================

const SECTION_KEYWORDS: Record<string, string[]> = {
    experience: ['experience', 'employment', 'work history', 'professional experience', 'career', 'job history'],
    education: ['education', 'academic', 'degrees', 'qualifications', 'schooling'],
    skills: ['skills', 'competencies', 'expertise', 'technologies', 'proficiencies', 'technical skills', 'core competencies'],
    leadership: ['leadership', 'volunteer', 'extracurricular', 'activities', 'organizations', 'community'],
    awards: ['awards', 'honors', 'achievements', 'recognition', 'accomplishments', 'scholarships', 'fellowships'],
    publications: ['publications', 'papers', 'articles', 'research publications', 'journal', 'published works'],
    grants: ['grants', 'funding', 'sponsored', 'fellowship'],
    teaching: ['teaching', 'instruction', 'courses taught', 'academic experience'],
    conferences: ['conferences', 'presentations', 'talks', 'posters', 'invited'],
    projects: ['projects', 'portfolio', 'personal projects'],
    certifications: ['certifications', 'licenses', 'credentials', 'training'],
    summary: ['summary', 'objective', 'profile', 'about', 'overview', 'introduction'],
};

function isSectionHeader(line: string): string | null {
    const clean = line.toLowerCase().replace(/[:\-–—•·_|]/g, ' ').trim();
    if (clean.length > 50) return null;
    if (clean.length < 3) return null;

    const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
    const words = clean.split(/\s+/);

    // Short line with 1-3 words is likely a header
    const isShortLine = words.length <= 4;

    for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
        for (const keyword of keywords) {
            // Exact match
            if (clean === keyword) {
                console.log('Section header found (exact):', line, '->', section);
                return section;
            }
            // Starts with or ends with keyword
            if (clean.startsWith(keyword + ' ') || clean.endsWith(' ' + keyword)) {
                console.log('Section header found (partial):', line, '->', section);
                return section;
            }
            // All caps and contains keyword
            if (isAllCaps && clean.includes(keyword)) {
                console.log('Section header found (caps):', line, '->', section);
                return section;
            }
            // Short line containing keyword
            if (isShortLine && clean.includes(keyword)) {
                console.log('Section header found (short):', line, '->', section);
                return section;
            }
        }
    }
    return null;
}

function splitIntoSections(text: string): Record<string, string[]> {
    const lines = text.split('\n').map(l => l.trim());
    const sections: Record<string, string[]> = {
        header: [], experience: [], education: [], skills: [], leadership: [],
        awards: [], publications: [], grants: [], teaching: [], conferences: [],
        projects: [], other: []
    };

    console.log('=== SECTION SPLITTING DEBUG ===');
    console.log('Total lines:', lines.length);
    console.log('First 20 lines:', lines.slice(0, 20));

    let currentSection = 'header';
    let foundFirstSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        const sectionType = isSectionHeader(line);
        if (sectionType) {
            foundFirstSection = true;
            currentSection = sectionType;
            console.log(`Line ${i}: Section header "${line}" -> ${sectionType}`);
            continue;
        }

        if (!foundFirstSection && sections.header.length < 10) {
            sections.header.push(line);
        } else if (sections[currentSection]) {
            sections[currentSection].push(line);
        } else {
            sections.other.push(line);
        }
    }

    console.log('Section counts:', Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.length])));
    console.log('=== END SECTION SPLITTING ===');
    return sections;
}

// ============================================================
// URL EXTRACTION
// ============================================================

function extractLinkedIn(text: string): string {
    const patterns = [
        /https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/i,
        /linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return cleanFieldValue(`https://linkedin.com/in/${match[1]}`, 'url');
    }
    return '';
}

function extractGitHub(text: string): string {
    const patterns = [
        /https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/?/i,
        /github\.com\/([a-zA-Z0-9_-]+)\/?/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return cleanFieldValue(`https://github.com/${match[1]}`, 'url');
    }
    return '';
}

function extractWebsite(text: string): string {
    const urlPattern = /https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[^\s,)\]]+/gi;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
        return cleanFieldValue(matches[0], 'url');
    }
    return '';
}

// ============================================================
// PERSONAL INFO
// ============================================================

function extractPersonalInfo(headerLines: string[], fullText: string): PersonalInfo {
    const headerText = headerLines.join(' ');

    const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? cleanFieldValue(emailMatch[0], 'email') : '';

    const phonePatterns = [
        /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
        /\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    ];
    let phone = '';
    for (const pattern of phonePatterns) {
        const match = headerText.match(pattern) || fullText.match(pattern);
        if (match) { phone = cleanFieldValue(match[0], 'phone'); break; }
    }

    const linkedin = extractLinkedIn(fullText);
    const github = extractGitHub(fullText);
    const website = extractWebsite(fullText);

    const addressMatch = headerText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z]{2})(?:\s+\d{5})?/);
    const address = addressMatch ? addressMatch[0] : '';

    let firstName = '', lastName = '';
    if (headerLines[0]) {
        const nameLine = headerLines[0]
            .replace(email, '').replace(phone, '')
            .replace(/[|•·,]/g, ' ').trim();
        const parts = nameLine.split(/\s+/).filter(p => p.length > 1 && /^[A-Za-z]/.test(p));
        firstName = cleanFieldValue(parts[0] || '', 'name');
        lastName = cleanFieldValue(parts.slice(1).join(' ') || '', 'name');
    }

    return { firstName, lastName, email, phone, linkedin, website, github, address };
}

// ============================================================
// DATE PARSING
// ============================================================

function parseMonthYear(str: string): { month: string; year: string } {
    const s = str.toLowerCase().trim();

    // Handle present/current indicators
    if (['present', 'current', 'now', 'ongoing', 'today'].includes(s) || /^(p|c|now)\.?$/.test(s)) {
        return { month: '', year: 'Present' };
    }

    let month = '', year = '';

    // Try matching month names first (full and abbreviated)
    for (let i = 0; i < 12; i++) {
        const full = MONTHS[i].toLowerCase();
        const abbr = full.slice(0, 3);
        const abbr2 = full.slice(0, 2);
        if (s.includes(full) || s.includes(abbr) || (abbr2.length >= 2 && s.includes(abbr2))) {
            month = MONTHS[i];
            break;
        }
    }

    // Try to find 4-digit year
    let yearMatch = str.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
        const y = parseInt(yearMatch[0]);
        if (y >= MIN_YEAR && y <= MAX_YEAR) {
            year = yearMatch[0];
        }
    }

    // Try MM/YYYY format
    const mmyyyyMatch = str.match(/(\d{1,2})\/(\d{4})/);
    if (mmyyyyMatch) {
        const monthNum = parseInt(mmyyyyMatch[1]) - 1;
        if (monthNum >= 0 && monthNum < 12) {
            month = MONTHS[monthNum];
        }
        const y = parseInt(mmyyyyMatch[2]);
        if (y >= MIN_YEAR && y <= MAX_YEAR) {
            year = mmyyyyMatch[2];
        }
    }

    // Try YYYY-MM format
    const yyyymmMatch = str.match(/(\d{4})-(\d{1,2})/);
    if (yyyymmMatch && !year) {
        const y = parseInt(yyyymmMatch[1]);
        if (y >= MIN_YEAR && y <= MAX_YEAR) {
            year = yyyymmMatch[1];
        }
        const monthNum = parseInt(yyyymmMatch[2]) - 1;
        if (monthNum >= 0 && monthNum < 12) {
            month = MONTHS[monthNum];
        }
    }

    // Infer month from season if present
    if (!month && s.includes('spring')) month = MONTHS[2]; // March
    if (!month && s.includes('summer')) month = MONTHS[5]; // June
    if (!month && s.includes('fall')) month = MONTHS[8]; // September
    if (!month && s.includes('autumn')) month = MONTHS[8]; // September
    if (!month && s.includes('winter')) month = MONTHS[11]; // December

    return { month, year };
}

function extractDateRange(text: string): DateRange {
    // Enhanced range patterns with more flexibility
    const rangePatterns = [
        // Month Year - Month Year (e.g., "Jan 2020 - Dec 2021")
        /(\w+\.?\s*\d{4})\s*[-–—to]+\s*(\w+\.?\s*\d{4}|present|current|ongoing|today)/gi,
        // MM/YYYY - MM/YYYY format
        /(\d{1,2}\/\d{4})\s*[-–—to]+\s*(\d{1,2}\/\d{4}|present|current|today)/gi,
        // YYYY - YYYY format (year ranges)
        /\b(\d{4})\s*[-–—to]+\s*(\d{4}|present|current|today)\b/gi,
        // YYYY-MM - YYYY-MM format
        /(\d{4})-(\d{1,2})\s*[-–—to]+\s*(\d{4})-(\d{1,2}|present|current)/gi,
    ];

    for (const pattern of rangePatterns) {
        const match = text.match(pattern);
        if (match) {
            const rangeParts = match[0].split(/[-–—]|to/i).map(p => p.trim());
            if (rangeParts.length >= 2) {
                const start = parseMonthYear(rangeParts[0]);
                const end = parseMonthYear(rangeParts[1]);
                return { startMonth: start.month, startYear: start.year, endMonth: end.month, endYear: end.year };
            }
        }
    }

    // Fallback: look for any 4-digit year as a single date
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
        return { startMonth: '', startYear: '', endMonth: '', endYear: yearMatch[0] };
    }

    return emptyDateRange();
}

// ============================================================
// ENTRY GROUPING
// ============================================================

function groupIntoEntries(lines: string[]): string[][] {
    const entries: string[][] = [];
    let currentEntry: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = i > 0 ? lines[i - 1] : '';

        if (!line) continue;

        const hasDate = /\d{4}\s*[-–—to]/.test(line);
        const isNewParagraph = prevLine === '' && line.length > 0;
        const isTitle = /^(senior|junior|lead|principal|staff|associate|intern|manager|director|engineer|developer|analyst|professor|instructor|president|chair)\b/i.test(line);

        if ((hasDate || isNewParagraph || isTitle) && currentEntry.length > 0) {
            entries.push(currentEntry);
            currentEntry = [line];
        } else {
            currentEntry.push(line);
        }
    }

    if (currentEntry.length > 0) entries.push(currentEntry);
    return entries;
}

// ============================================================
// WORK EXPERIENCE (Improved)
// ============================================================

// Common company/institution keywords
const COMPANY_KEYWORDS = [
    'inc', 'inc.', 'incorporated', 'corp', 'corp.', 'corporation', 'llc', 'l.l.c.',
    'ltd', 'ltd.', 'limited', 'company', 'co', 'co.', 'technologies', 'tech',
    'solutions', 'services', 'consulting', 'associates', 'partners', 'group',
    'labs', 'laboratory', 'laboratories', 'systems', 'software', 'industries',
    'enterprises', 'global', 'international', 'foundation', 'institute', 'center',
    'agency', 'network', 'networks', 'studio', 'studios', 'media', 'digital'
];

// Common job title keywords
const TITLE_KEYWORDS = [
    'engineer', 'developer', 'manager', 'director', 'analyst', 'designer',
    'scientist', 'consultant', 'specialist', 'coordinator', 'administrator',
    'associate', 'assistant', 'executive', 'lead', 'senior', 'junior', 'staff',
    'principal', 'architect', 'intern', 'fellow', 'researcher', 'professor',
    'instructor', 'teacher', 'officer', 'president', 'vice president', 'vp',
    'head', 'chief', 'ceo', 'cto', 'cfo', 'coo'
];

function detectCompany(text: string): string {
    const lower = text.toLowerCase();

    // Check for company keywords
    for (const kw of COMPANY_KEYWORDS) {
        if (lower.includes(kw)) {
            // Try to extract the full company name
            const patterns = [
                new RegExp(`[A-Z][a-zA-Z\\s&]*\\b${kw}\\b`, 'i'),
                new RegExp(`\\b${kw}\\b[^,\\n]{0,20}`, 'i'),
            ];
            for (const p of patterns) {
                const m = text.match(p);
                if (m) return cleanFieldValue(m[0], 'text');
            }
        }
    }

    // Check for university/college as employer
    const schoolPatterns = [
        /University\s+of\s+[A-Z][^,\n]+/i,
        /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+University/i,
        /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+College/i,
        /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Institute/i,
    ];
    for (const p of schoolPatterns) {
        const m = text.match(p);
        if (m) return cleanFieldValue(m[0], 'text');
    }

    return '';
}

function detectTitle(text: string): string {
    const lower = text.toLowerCase();

    for (const kw of TITLE_KEYWORDS) {
        if (lower.includes(kw)) {
            // Try to get full title including modifiers
            const patterns = [
                new RegExp(`(?:senior|junior|lead|principal|staff|chief|head|associate)?\\s*[A-Za-z\\s]*${kw}[A-Za-z\\s]*`, 'i'),
            ];
            for (const p of patterns) {
                const m = text.match(p);
                if (m) {
                    const title = m[0].trim();
                    if (title.length > 3 && title.length < 60) {
                        return cleanFieldValue(title, 'text');
                    }
                }
            }
        }
    }

    return '';
}

function extractWorkExperience(lines: string[]): WorkExperience[] {
    if (lines.length === 0) return [];

    const entries = groupIntoEntries(lines);
    const experiences: WorkExperience[] = [];

    for (const entryLines of entries) {
        if (entryLines.length === 0) continue;

        const fullText = entryLines.join(' ');
        const dates = extractDateRange(fullText);

        let title = '', company = '', location = '';

        // First line often has title and company
        const firstLine = entryLines[0].replace(/\d{4}\s*[-–—]\s*\d{4}|present|current/gi, '').trim();

        // Try to detect company from full text
        company = detectCompany(fullText);

        // Try to detect title from full text
        title = detectTitle(fullText);

        // If title/company not found, try splitting first line
        if (!title || !company) {
            const splitPatterns = [
                /\s+at\s+/i,      // "Engineer at Company"
                /\s+@\s+/,        // "Engineer @ Company"
                /\s*[|–—]\s*/,    // "Engineer | Company"
                /,\s+(?=[A-Z])/,  // "Engineer, Company"
            ];

            for (const p of splitPatterns) {
                const parts = firstLine.split(p);
                if (parts.length >= 2) {
                    if (!title) title = cleanFieldValue(parts[0].trim(), 'text');
                    if (!company) company = cleanFieldValue(parts[1].split(',')[0].trim(), 'text');
                    break;
                }
            }
        }

        // Check second line for company if still not found
        if (!company && entryLines[1]) {
            const line2 = entryLines[1].replace(/\d{4}.*$/, '').trim();
            company = detectCompany(line2);
            if (!company && line2.length > 3 && line2.length < 80) {
                company = cleanFieldValue(line2.split(',')[0], 'text');
            }
        }

        // Use first line as title if nothing detected
        if (!title && firstLine.length > 3) {
            title = cleanFieldValue(firstLine.split(/[,|–—]/)[0].trim(), 'text');
        }

        // Location extraction
        const locMatch = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
        if (locMatch) location = locMatch[0];

        // Description - bullet points or remaining lines
        const descLines = entryLines.slice(1).filter(l => {
            return l.length > 15 &&
                !l.includes(company.substring(0, 10)) &&
                !/^\d{4}/.test(l) &&
                !detectTitle(l); // Skip lines that are just titles
        });
        const description = descLines.map(l => normalizeText(l.replace(/^[•\-–]\s*/, ''))).join('\n• ');

        if (title || company) {
            experiences.push({
                id: crypto.randomUUID(),
                title: title || 'Position',
                company: company || 'Company',
                location,
                dates,
                description: description ? '• ' + description : '',
                present: dates.endYear === 'Present'
            });
        }
    }

    return experiences;
}

// ============================================================
// EDUCATION
// ============================================================

function extractEducation(lines: string[]): Education[] {
    if (lines.length === 0) return [];

    const educations: Education[] = [];

    // School and degree keyword lists
    const schoolKeywords = ['university', 'college', 'institute', 'school', 'academy', 'polytechnic'];
    const famousSchools = ['MIT', 'UCLA', 'USC', 'NYU', 'Stanford', 'Harvard', 'Yale', 'Princeton',
        'Berkeley', 'Columbia', 'Cornell', 'Duke', 'Northwestern', 'Caltech',
        'Georgia Tech', 'Purdue', 'Michigan', 'Virginia Tech', 'Texas A&M',
        'Oxford', 'Cambridge', 'Carnegie Mellon', 'Brown', 'Penn', 'Dartmouth'];

    // Expanded degree patterns
    const degreePatterns = [
        /Doctor(?:ate)?(?:\s+of\s+[A-Za-z\s]+)?/i,
        /Ph\.?D\.?(?:\s+(?:in|of)\s+[A-Za-z\s&]+)?/i,
        /Master(?:'?s)?(?:\s+(?:of|in)\s+[A-Za-z\s&]+)?/i,
        /M\.?B\.?A\.?/i,
        /M\.?S\.?(?:\s+(?:in|of)\s+[A-Za-z\s&]+)?/i,
        /M\.?A\.?(?:\s+(?:in|of)\s+[A-Za-z\s&]+)?/i,
        /Bachelor(?:'?s)?(?:\s+(?:of|in)\s+[A-Za-z\s&]+)?/i,
        /B\.?S\.?(?:\s+(?:in|of)\s+[A-Za-z\s&]+)?/i,
        /B\.?A\.?(?:\s+(?:in|of)\s+[A-Za-z\s&]+)?/i,
        /Associate(?:'?s)?(?:\s+(?:of|in)\s+[A-Za-z\s&]+)?/i,
        /A\.?S\.?/i,
        /A\.?A\.?/i,
    ];

    // Process each line looking for school/degree combos
    let currentEntry: string[] = [];

    for (const line of lines) {
        if (!line || line.length < 3) continue;

        const lower = line.toLowerCase();
        const hasSchool = schoolKeywords.some(k => lower.includes(k)) ||
            famousSchools.some(s => lower.includes(s.toLowerCase()));
        const hasDegree = degreePatterns.some(p => p.test(line));
        const hasYear = /\b(19|20)\d{2}\b/.test(line);

        // Start new entry if we find school/degree and already have content
        if ((hasSchool || hasDegree) && currentEntry.length > 0 && (hasYear || currentEntry.length > 2)) {
            educations.push(parseEducationEntry(currentEntry, schoolKeywords, famousSchools, degreePatterns));
            currentEntry = [line];
        } else {
            currentEntry.push(line);
        }
    }

    if (currentEntry.length > 0) {
        educations.push(parseEducationEntry(currentEntry, schoolKeywords, famousSchools, degreePatterns));
    }

    return educations;
}

function parseEducationEntry(lines: string[], schoolKeywords: string[], famousSchools: string[], degreePatterns: RegExp[]): Education {
    const fullText = lines.join(' ');
    const dates = extractDateRange(fullText);

    // Find school
    let school = '';
    const lower = fullText.toLowerCase();

    // Check famous schools first
    for (const s of famousSchools) {
        if (lower.includes(s.toLowerCase())) {
            // Get extended name
            const patterns = [
                new RegExp(`University\\s+of\\s+[A-Z][^,\\n]{0,30}`, 'i'),
                new RegExp(`[A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,2}\\s+University`, 'i'),
                new RegExp(`[A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,2}\\s+College`, 'i'),
                new RegExp(`${s}[^,\\n]{0,20}`, 'i'),
            ];
            for (const p of patterns) {
                const m = fullText.match(p);
                if (m) { school = cleanFieldValue(m[0], 'text'); break; }
            }
            if (school) break;
            school = s;
            break;
        }
    }

    if (!school) {
        for (const kw of schoolKeywords) {
            if (lower.includes(kw)) {
                const patterns = [
                    new RegExp(`University\\s+of\\s+[A-Z][^,\\n]{0,30}`, 'i'),
                    new RegExp(`[A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,2}\\s+${kw}`, 'i'),
                ];
                for (const p of patterns) {
                    const m = fullText.match(p);
                    if (m) { school = cleanFieldValue(m[0], 'text'); break; }
                }
                if (school) break;
            }
        }
    }

    // Find degree
    let degree = '';
    let field = '';
    for (const p of degreePatterns) {
        const m = fullText.match(p);
        if (m) {
            degree = cleanFieldValue(m[0], 'text');
            // Look for field after degree
            const afterDegree = fullText.substring(fullText.indexOf(m[0]) + m[0].length);
            const fieldMatch = afterDegree.match(/^[,\s]*(in\s+)?([A-Z][a-z]+(?:\s+[A-Za-z&]+){0,4})/);
            if (fieldMatch && fieldMatch[2]) {
                field = cleanFieldValue(fieldMatch[2], 'text');
            }
            break;
        }
    }

    // If no degree found but "in [Field]" pattern exists
    if (!field) {
        const fieldOnly = fullText.match(/(?:major(?:ing)?|concentration|in)\s+([A-Z][a-z]+(?:\s+[A-Za-z&]+){0,4})/i);
        if (fieldOnly) field = cleanFieldValue(fieldOnly[1], 'text');
    }

    // GPA
    const gpaMatch = fullText.match(/GPA[:\s]*([0-9]\.[0-9]{1,2})/i) || fullText.match(/([0-9]\.[0-9]{1,2})\s*\/\s*4\.0/);
    const gpa = gpaMatch ? gpaMatch[1] : '';

    // Location
    const locMatch = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
    const location = locMatch ? locMatch[0] : '';

    // Description
    const desc = lines.filter(l => l.length > 15 && !school.includes(l.substring(0, 10))).map(l => normalizeText(l)).join('\n');

    return {
        id: crypto.randomUUID(),
        school: school || cleanFieldValue(lines[0], 'text'),
        degree,
        field,
        location,
        dates,
        gpa,
        description: desc,
        present: dates.endYear === 'Present'
    };
}

// ============================================================
// PUBLICATIONS - Enhanced for citation styles
// ============================================================

function parseAuthorsToList(authorsString: string): Author[] {
    if (!authorsString || authorsString.length < 2) return [];

    console.log('=== AUTHOR PARSING DEBUG ===');
    console.log('Input:', authorsString);

    const authorsList: Author[] = [];

    // Clean up the string
    let cleaned = authorsString
        .replace(/\s*\(\d{4}\)\s*/g, '')  // Remove years
        .replace(/^[•\-–]\s*/, '')         // Remove bullets
        .replace(/\s*;\s*$/, '')           // Remove trailing semicolon
        .replace(/\s+/g, ' ')              // Normalize whitespace
        .trim();

    // Normalize hyphens with spaces (like "Jimenez - Vergara" -> "Jimenez-Vergara")
    cleaned = cleaned.replace(/\s*-\s*/g, '-');

    console.log('Cleaned:', cleaned);

    // Strategy: Find patterns of "Name, Initials" and split on those boundaries
    // Initials pattern: one or more single uppercase letters, each optionally followed by a period
    // Example: "A. C." or "A C" or "K. L." or "K L"

    // Split by semicolons first (if present)
    let rawAuthors: string[] = [];

    if (cleaned.includes(';')) {
        rawAuthors = cleaned.split(/\s*;\s*/).filter(s => s.length > 1);
        console.log('Split by semicolon:', rawAuthors);
    }
    // Split by "and" or "&"
    else if (/\band\b|\s&\s/.test(cleaned)) {
        rawAuthors = cleaned.split(/\s+and\s+|\s*&\s*/).filter(s => s.length > 1);
        console.log('Split by and/&:', rawAuthors);
    }
    else {
        // Citation style: LastName, Initials patterns separated by commas
        // The key insight: after initials (caps with optional periods), the next word that's 
        // capitalized and followed by comma + more caps is a new author

        // Match: LastName, Initial(s) OR LastName, FirstName
        // More flexible pattern for last name: can include spaces and hyphens
        const authorPattern = /([^,;]+)\s*,\s*([A-Z]\.?\s*(?:[A-Z]\.?\s*)*|[A-Z][a-z]+)/g;

        let match;
        const matches: string[] = [];
        while ((match = authorPattern.exec(cleaned)) !== null) {
            matches.push(`${match[1].trim()}, ${match[2].trim()}`);
            console.log('Found via pattern:', match[1], match[2]);
        }

        if (matches.length > 0) {
            rawAuthors = matches;
        } else {
            // Heuristic fallback: if many commas, maybe every 2nd comma is a separator
            const commaParts = cleaned.split(/\s*,\s*/).filter(s => s.length > 1);
            if (commaParts.length >= 2 && commaParts.length % 2 === 0) {
                console.log('Using even-count comma splitting heuristic');
                for (let j = 0; j < commaParts.length; j += 2) {
                    rawAuthors.push(`${commaParts[j]}, ${commaParts[j + 1]}`);
                }
            } else {
                console.log('No patterns found, using simple comma split');
                rawAuthors = commaParts;
            }
        }
    }

    console.log('Raw authors:', rawAuthors);

    // Parse each author into firstName/lastName
    for (let raw of rawAuthors) {
        raw = raw.trim().replace(/[.,]+$/, '').trim();
        if (raw.length < 2) continue;

        let firstName = '', lastName = '';

        // Check for "LastName, FirstName/Initials" format
        const commaMatch = raw.match(/^([A-Za-z]+(?:-[A-Za-z]+)?)\s*,\s*(.+)$/);
        if (commaMatch) {
            lastName = commaMatch[1];
            firstName = commaMatch[2].replace(/[.,]+$/, '').trim();
        }
        // Check for "FirstName LastName" format
        else {
            const parts = raw.split(/\s+/);
            if (parts.length >= 2) {
                lastName = parts[parts.length - 1];
                firstName = parts.slice(0, -1).join(' ');
            } else {
                lastName = raw;
            }
        }

        // Capitalize properly
        lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1);

        if (lastName || firstName) {
            console.log('Parsed:', { firstName, lastName });
            authorsList.push({ firstName, lastName });
        }
    }

    console.log('Final list:', authorsList);
    console.log('=== END AUTHOR PARSING ===');

    return authorsList;
}

function parsePublication(text: string): Publication {
    const cleaned = normalizeText(text);

    // Extract date - standardized
    const my = parseMonthYear(cleaned);
    const date = my.month ? `${my.month} ${my.year}` : my.year;

    // Extract URL/DOI
    const urlMatch = cleaned.match(/https?:\/\/[^\s\]]+|doi[:\s]+10\.[^\s]+/i);
    const url = urlMatch ? urlMatch[0].replace(/[.,;]+$/, '') : '';

    // Extract authors - look for patterns at the start
    let authors = '';

    // Split by common author-title separators
    const separators = [
        /\.\s*["']/,           // Author. "Title
        /\.\s*(?=[A-Z][a-z])/,  // Author. Title (capital letter)
        /\(\d{4}\)/,            // Before year in parentheses
    ];

    let authorEnd = 0;
    for (const sep of separators) {
        const m = cleaned.match(sep);
        if (m && m.index && m.index > 5 && m.index < cleaned.length / 2) {
            authorEnd = m.index;
            break;
        }
    }

    if (authorEnd > 5) {
        authors = cleaned.substring(0, authorEnd).trim();
        authors = authors.replace(/\.$/, '').replace(/\s+/g, ' ');
    } else {
        // Try to detect author pattern at start
        const authorMatch = cleaned.match(/^([A-Z][a-z]+(?:,?\s+[A-Z]\.?\s*)+(?:,?\s*(?:and|&)\s+[A-Z][a-z]+(?:,?\s+[A-Z]\.?\s*)+)*(?:\s*et\s+al\.?)?)/);
        if (authorMatch) authors = authorMatch[1];
    }

    // Format authors - split by separators and normalize
    if (authors) {
        // Split by semicolons, "and", "&", or multiple commas
        let authorList = authors
            .split(/\s*;\s*|\s+and\s+|\s*&\s*/)
            .flatMap(a => {
                // Further split by comma if followed by a first name (not initials)
                if (/,[^,]*[A-Z][a-z]+\s+[A-Z][a-z]+/.test(a)) {
                    return a.split(/,\s*(?=[A-Z][a-z]+\s+[A-Z])/);
                }
                return [a];
            })
            .map(a => a.trim())
            .filter(a => a.length > 2);

        // Clean up each author name
        authorList = authorList.map(a => {
            // Remove trailing periods
            a = a.replace(/\.$/, '').trim();
            // Standardize "Last, First M." format
            if (/^[A-Z][a-z]+,\s*[A-Z]/.test(a)) {
                return a; // Already in good format
            }
            return cleanFieldValue(a, 'text');
        });

        // Join with semicolons for clear separation
        authors = authorList.join('; ');
    }

    // Extract title - various patterns
    let title = '';
    const titlePatterns = [
        /"([^"]{10,200})"/,                  // Quoted title
        /'([^']{10,200})'/,                  // Single quoted
        /\.\s+([A-Z][^.]{10,150})\./,        // After period, before next period
        /\(\d{4}\)\.\s*([^.]{10,150})\./,    // After year, before period
    ];

    for (const p of titlePatterns) {
        const m = cleaned.match(p);
        if (m && m[1]) {
            title = cleanFieldValue(m[1], 'text');
            break;
        }
    }

    // If still no title, extract from middle section
    if (!title) {
        // Remove authors and year, take the first significant chunk
        let remaining = cleaned
            .replace(authors, '')
            .replace(/\(\d{4}\)/, '')
            .replace(/^\s*[.,]\s*/, '')
            .trim();

        // Take text up to journal indicators
        const journalIndicators = /\s+(?:in|In|Journal|Proceedings|Conference|Trans\.|IEEE|ACM)\s+/;
        const journalMatch = remaining.match(journalIndicators);
        if (journalMatch && journalMatch.index) {
            title = remaining.substring(0, journalMatch.index);
        } else {
            // Take first sentence-like chunk
            const firstChunk = remaining.match(/^[^.!?]{10,200}/);
            if (firstChunk) title = firstChunk[0];
        }
        title = cleanFieldValue(title || remaining.substring(0, 100), 'text');
    }

    // Extract journal/venue
    let journal = '';
    const journalPatterns = [
        /(?:In|in)\s+([A-Z][^,.\d]{5,80})/,                    // "In Conference/Journal"
        /(?:IEEE|ACM)\s+([A-Z][a-zA-Z\s]{5,60})/,              // IEEE/ACM followed by name
        /\.\s+([A-Z][a-zA-Z\s&]+?)(?:\s*,\s*\d|\s*\d{4}|\.\s*$)/,  // After title, before volume/year
        /Journal\s+of\s+([A-Za-z\s&]+)/i,                      // "Journal of X"
        /Proceedings\s+of\s+(?:the\s+)?([A-Za-z\s&]+)/i,       // "Proceedings of X"
    ];

    for (const p of journalPatterns) {
        const m = cleaned.match(p);
        if (m && m[1] && m[1].length > 3 && m[1].length < 100) {
            journal = cleanFieldValue(m[1], 'text');
            break;
        }
    }

    return {
        id: crypto.randomUUID(),
        title: title || cleaned.substring(0, 100),
        authors,
        authorsList: parseAuthorsToList(authors),
        journal,
        date,
        url,
        description: ''
    };
}

function extractPublications(lines: string[]): Publication[] {
    if (lines.length === 0) return [];

    const publications: Publication[] = [];
    let currentPub: string[] = [];

    // More comprehensive new entry detection
    const isNewEntry = (line: string): boolean => {
        return /^\d+[.\)]\s/.test(line) ||        // 1. or 1)
            /^\[\d+\]\s/.test(line) ||          // [1]
            /^[A-Z][a-z]+,\s+[A-Z]\./.test(line) || // Smith, J.
            /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+and\s+/i.test(line) || // John Smith and
            /^•\s+/.test(line) ||               // Bullet point
            /^\*\s+/.test(line);                // Asterisk
    };

    for (const line of lines) {
        if (!line || line.length < 5) continue;

        if (isNewEntry(line) && currentPub.length > 0) {
            const pubText = currentPub.join(' ');
            if (pubText.length > 20) {
                publications.push(parsePublication(pubText));
            }
            // Clean the line prefix
            currentPub = [line.replace(/^[\d\[\].\)*•\s]+/, '')];
        } else {
            currentPub.push(line);
        }
    }

    if (currentPub.length > 0) {
        const pubText = currentPub.join(' ');
        if (pubText.length > 20) {
            publications.push(parsePublication(pubText));
        }
    }

    return publications;
}

// ============================================================
// AWARDS
// ============================================================

function extractAwards(lines: string[]): Award[] {
    if (lines.length === 0) return [];

    const awards: Award[] = [];
    let currentAward: string[] = [];

    for (const line of lines) {
        if (/^[•\-–]/.test(line) || /^\d{4}/.test(line) || /\d{4}$/.test(line)) {
            if (currentAward.length > 0) {
                awards.push(parseAward(currentAward));
            }
            currentAward = [line.replace(/^[•\-–]\s*/, '')];
        } else if (currentAward.length > 0) {
            currentAward.push(line);
        } else {
            currentAward.push(line);
        }
    }

    if (currentAward.length > 0) awards.push(parseAward(currentAward));
    return awards;
}

function parseAward(lines: string[]): Award {
    const fullText = lines.join(' ');
    const my = parseMonthYear(fullText);
    const date = my.month ? `${my.month} ${my.year}` : my.year;

    let title = cleanFieldValue(lines[0].replace(/\b\d{4}\b/g, '').replace(/[,\-–]$/, ''), 'text');

    const issuerMatch = fullText.match(/(?:from|by|,)\s+(.+?)(?:\d{4}|$)/i);
    const issuer = issuerMatch ? cleanFieldValue(issuerMatch[1], 'text') : '';

    const description = lines.slice(1).map(l => normalizeText(l)).join(' ');

    return { id: crypto.randomUUID(), title: title || 'Award', issuer, date, description };
}

// ============================================================
// LEADERSHIP
// ============================================================

function extractLeadership(lines: string[]): LeadershipExperience[] {
    if (lines.length === 0) return [];

    const entries = groupIntoEntries(lines);
    const experiences: LeadershipExperience[] = [];

    for (const entryLines of entries) {
        if (entryLines.length === 0) continue;

        const fullText = entryLines.join(' ');
        const dates = extractDateRange(fullText);
        const firstLine = entryLines[0].replace(/\d{4}\s*[-–—]\s*\d{4}|present|current/gi, '').trim();

        const parts = firstLine.split(/\s+[-–—,]\s+|\s+at\s+|\s+@\s+/i);
        const role = cleanFieldValue(parts[0]?.trim() || '', 'text');
        const organization = cleanFieldValue(parts[1]?.trim() || '', 'text');

        const locMatch = fullText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
        const location = locMatch ? locMatch[0] : '';

        const descLines = entryLines.slice(1).filter(l => l.length > 10);
        const description = descLines.map(l => normalizeText(l.replace(/^[•\-–]\s*/, ''))).join('\n• ');

        if (role || organization) {
            experiences.push({
                id: crypto.randomUUID(),
                role: role || 'Role', organization: organization || 'Organization',
                location, dates, description: description ? '• ' + description : '',
                present: dates.endYear === 'Present'
            });
        }
    }

    return experiences;
}

// ============================================================
// GRANTS
// ============================================================

function extractGrants(lines: string[]): Grant[] {
    if (lines.length === 0) return [];

    const entries = groupIntoEntries(lines);
    const grants: Grant[] = [];

    for (const entryLines of entries) {
        const fullText = entryLines.join(' ');
        const dates = extractDateRange(fullText);

        const amountMatch = fullText.match(/\$[\d,]+(?:\.\d{2})?|\d+[kK]/);
        const amount = amountMatch ? amountMatch[0] : '';

        const funderMatch = fullText.match(/(?:from|by|funded by)\s+([^,\n]+)/i);
        const funder = funderMatch ? cleanFieldValue(funderMatch[1], 'text') : '';

        const title = cleanFieldValue(entryLines[0].replace(/\$[\d,]+/, '').replace(/\d{4}.*$/, ''), 'text');

        if (title) {
            grants.push({ id: crypto.randomUUID(), title, funder, amount, dates, description: '' });
        }
    }

    return grants;
}

// ============================================================
// TEACHING
// ============================================================

function extractTeaching(lines: string[]): TeachingExperience[] {
    if (lines.length === 0) return [];

    const entries = groupIntoEntries(lines);
    const teaching: TeachingExperience[] = [];

    for (const entryLines of entries) {
        const fullText = entryLines.join(' ');
        const dates = extractDateRange(fullText);

        const roleMatch = fullText.match(/(instructor|ta|teaching assistant|lecturer|professor|adjunct|graduate assistant)/i);
        const role = roleMatch ? roleMatch[1] : '';

        let course = cleanFieldValue(entryLines[0].replace(/\d{4}.*$/, ''), 'text');
        const quotedMatch = fullText.match(/"([^"]+)"|([A-Z]{2,4}\s*\d{3,4})/);
        if (quotedMatch) course = quotedMatch[1] || quotedMatch[2];

        let institution = '';
        const schoolPatterns = [
            /University\s+of\s+[A-Z][^\n,]+/i,
            /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+University/i,
            /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+College/i,
            /[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+Institute/i,
        ];
        for (const pattern of schoolPatterns) {
            const match = fullText.match(pattern);
            if (match) { institution = match[0]; break; }
        }

        const descLines = entryLines.slice(1).filter(l => l.length > 10);
        const description = descLines.map(l => normalizeText(l)).join('\n');

        if (course) {
            teaching.push({ id: crypto.randomUUID(), course, institution, role, dates, description });
        }
    }

    return teaching;
}

// ============================================================
// CONFERENCES
// ============================================================

function extractConferences(lines: string[]): Conference[] {
    if (lines.length === 0) return [];

    const conferences: Conference[] = [];

    for (const line of lines) {
        if (line.length < 10) continue;

        const my = parseMonthYear(line);
        const date = my.month ? `${my.month} ${my.year}` : my.year;

        const title = cleanFieldValue(line.replace(/\b\d{4}\b/g, '').replace(/^[•\-–]\s*/, ''), 'text');

        const locMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})\b/);
        const location = locMatch ? locMatch[0] : '';

        const confMatch = line.match(/(?:at|,)\s+([A-Z][^\d,]+)/);
        const conference = confMatch ? cleanFieldValue(confMatch[1], 'text') : '';

        if (title) {
            conferences.push({ id: crypto.randomUUID(), title, conference, location, date, description: '' });
        }
    }

    return conferences;
}

// ============================================================
// SKILLS
// ============================================================

function extractSkills(lines: string[]): string[] {
    const skillText = lines.join(' ');
    const skills: string[] = [];

    const rawSkills = skillText.split(/[,•·|;\/]/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);

    for (const skill of rawSkills) {
        const clean = cleanFieldValue(skill.replace(/^[-–:]\s*/, ''), 'text');
        if (clean && !skills.includes(clean) && !/^\d+$/.test(clean)) {
            skills.push(clean);
        }
    }

    return skills;
}

// ============================================================
// MAIN STRUCTURING
// ============================================================

function structureResumeText(text: string): ResumeData {
    const sections = splitIntoSections(text);

    const result: ResumeData = {
        personalInfo: extractPersonalInfo(sections.header, text),
        workExperience: extractWorkExperience(sections.experience),
        education: extractEducation(sections.education),
        leadershipExperience: extractLeadership(sections.leadership),
        awards: extractAwards(sections.awards),
        publications: extractPublications(sections.publications),
        grants: extractGrants(sections.grants),
        teachingExperience: extractTeaching(sections.teaching),
        conferences: extractConferences(sections.conferences),
        skills: extractSkills(sections.skills)
    };

    console.log('Parsed resume:', result);
    return result;
}
