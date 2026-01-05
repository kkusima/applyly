import { ResumeData } from '../utils/storage';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'FILL_FORM') {
        const count = fillForm(message.data);
        sendResponse({ count });
    }
    return true;
});

/**
 * Robust Form Filling Strategy:
 * 1. Identify input purpose using multiple signals: label, placeholder, name, id, aria-labels.
 * 2. Use fuzzy keyword matching.
 * 3. Handle complex fields like radio/select.
 * 4. Priority-based matching to avoid false positives.
 */
function fillForm(resume: ResumeData): number {
    let filledCount = 0;

    // Get all inputs from main document, iframes, and shadow DOMs
    const inputs = getAllInputs();

    inputs.forEach((input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
        if (!isElementVisible(input)) return;

        const info = getFieldLabelInfo(input);
        const value = findMatchingValue(info, resume);

        if (value) {
            if (input.tagName === 'SELECT') {
                selectOption(input as HTMLSelectElement, value);
            } else {
                input.value = value;
            }

            // Trigger events to notify page logic (critical for React/Vue sites)
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));

            // Visual feedback
            highlightField(input);
            filledCount++;
        }
    });

    if (filledCount > 0) {
        showOverlay(filledCount);
    }

    return filledCount;
}

function isElementVisible(el: HTMLElement): boolean {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        el.offsetWidth > 0 &&
        el.offsetHeight > 0;
}

function getFieldLabelInfo(input: HTMLElement): string {
    const texts: string[] = [];

    // 1. Direct label
    if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) texts.push(label.textContent || '');
    }

    // 2. Parent label
    const parentLabel = input.closest('label');
    if (parentLabel) texts.push(parentLabel.textContent || '');

    // 3. Aria attributes
    const aria = [
        input.getAttribute('aria-label'),
        input.getAttribute('aria-labelledby'),
        input.getAttribute('placeholder'),
        input.getAttribute('name'),
        input.id
    ];
    aria.forEach(a => { if (a) texts.push(a); });

    // 4. Nearby text (preceding)
    const container = input.parentElement;
    if (container) {
        const fullText = container.textContent || '';
        // If the container has very little text, it's likely just the label
        if (fullText.length < 100) texts.push(fullText);
    }

    return texts.join(' ').toLowerCase();
}

/**
 * Smart matching logic using keyword priorities
 */
function findMatchingValue(fieldInfo: string, resume: ResumeData): string | null {
    const p = resume.personalInfo;

    // Personal Info Mapping
    const personalMap: [string[], string][] = [
        [['first name', 'given name', 'fname'], p.firstName],
        [['last name', 'family name', 'surname', 'lname'], p.lastName],
        [['email', 'e-mail'], p.email],
        [['phone', 'mobile', 'cell', 'tel'], p.phone],
        [['linkedin'], p.linkedin],
        [['website', 'portfolio', 'portfolio site', 'site'], p.website],
        [['github'], p.github],
        [['address', 'street', 'location'], p.address],
        [['city'], p.address.split(',')[0] || ''],
    ];

    for (const [keywords, value] of personalMap) {
        if (keywords.some(k => fieldInfo.includes(k))) return value;
    }

    // Work Experience (Most Recent)
    if (resume.workExperience.length > 0) {
        const recentWork = resume.workExperience[0];
        const workMap: [string[], string][] = [
            [['employer', 'company', 'organization'], recentWork.company],
            [['job title', 'position', 'role'], recentWork.title],
            [['responsibilities', 'work description'], recentWork.description],
        ];
        for (const [keywords, value] of workMap) {
            if (keywords.some(k => fieldInfo.includes(k))) return value;
        }
    }

    // Education (Most Recent)
    if (resume.education.length > 0) {
        const recentEdu = resume.education[0];
        const eduMap: [string[], string][] = [
            [['school', 'university', 'college', 'institution'], recentEdu.school],
            [['degree', 'qualification'], recentEdu.degree],
            [['field of study', 'major', 'program'], recentEdu.field],
            [['gpa', 'grade', 'average'], recentEdu.gpa || ''],
        ];
        for (const [keywords, value] of eduMap) {
            if (keywords.some(k => fieldInfo.includes(k))) return value;
        }
    }

    // Skills
    if (fieldInfo.includes('skill') || fieldInfo.includes('competencies')) {
        return resume.skills.join(', ');
    }

    return null;
}

function selectOption(select: HTMLSelectElement, value: string) {
    const val = value.toLowerCase();
    const options = Array.from(select.options);

    // 1. Exact match
    let match = options.find(o => o.text.toLowerCase() === val || o.value.toLowerCase() === val);

    // 2. Partial match
    if (!match) {
        match = options.find(o => o.text.toLowerCase().includes(val) || val.includes(o.text.toLowerCase()));
    }

    if (match) {
        select.value = match.value;
    }
}

function highlightField(input: HTMLElement) {
    const originalBorder = input.style.border;
    const originalShadow = input.style.boxShadow;

    input.style.border = '2px solid #FF8C42';
    input.style.boxShadow = '0 0 8px rgba(255, 140, 66, 0.4)';

    // Flash effect
    setTimeout(() => {
        input.style.border = originalBorder;
        input.style.boxShadow = originalShadow;
    }, 2000);
}

function showOverlay(count: number) {
    const existing = document.getElementById('applyly-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'applyly-overlay';
    overlay.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #1a1d21;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 1000000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, system-ui, sans-serif;
        border: 1px solid rgba(255, 140, 66, 0.3);
        animation: applyly-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    const styleTag = document.createElement('style');
    styleTag.textContent = `
        @keyframes applyly-slide-in {
            from { transform: translateX(100%) opacity: 0; }
            to { transform: translateX(0) opacity: 1; }
        }
    `;
    document.head.appendChild(styleTag);

    overlay.innerHTML = `
        <div style="width: 24px; height: 24px; background: #FF8C42; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div>
            <div style="font-weight: 600; font-size: 14px;">Applyly™</div>
            <div style="font-size: 12px; opacity: 0.8;">Filled ${count} fields correctly</div>
        </div>
        <button id="applyly-close" style="background: none; border: none; color: white; opacity: 0.5; padding: 4px; cursor: pointer; font-size: 20px; margin-left: 8px;">&times;</button>
    `;

    document.body.appendChild(overlay);

    document.getElementById('applyly-close')?.addEventListener('click', () => overlay.remove());

    setTimeout(() => {
        overlay.style.transform = 'translateX(120%)';
        overlay.style.opacity = '0';
        overlay.style.transition = 'all 0.5s ease';
        setTimeout(() => overlay.remove(), 500);
    }, 4000);
}

/**
 * Roadblock handling: Crawls main DOM, Shadow DOMs, and Iframes
 */
function getAllInputs(): (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] {
    const allItems: (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[] = [];

    const crawl = (root: Document | ShadowRoot | HTMLIFrameElement) => {
        let doc: Document | ShadowRoot | undefined;

        if (root instanceof HTMLIFrameElement) {
            try {
                doc = root.contentDocument || undefined;
            } catch (e) { /* Cross-origin iframe, ignore */ }
        } else {
            doc = root as Document | ShadowRoot;
        }

        if (!doc) return;

        // Find inputs in current context
        const contextInputs = Array.from(doc.querySelectorAll('input, textarea, select')) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)[];
        allItems.push(...contextInputs);

        // Recursive crawl into Shadow DOM
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.shadowRoot) {
                crawl(el.shadowRoot);
            }
            if (el.tagName === 'IFRAME') {
                crawl(el as HTMLIFrameElement);
            }
        });
    };

    crawl(document);
    return allItems;
}
