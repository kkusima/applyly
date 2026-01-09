// ============================================================
// APPLYLY™ - STORAGE TYPES & UTILITIES
// ============================================================

export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const MIN_YEAR = 1930;
export const MAX_YEAR = 2040;

export interface DateRange {
    startMonth: string;
    startYear: string;
    endMonth: string;
    endYear: string;
}

export interface WorkExperience {
    id: string;
    title: string;
    company: string;
    location: string;
    dates: DateRange;
    description: string;
}

export interface Education {
    id: string;
    school: string;
    degree: string;
    field: string;
    location: string;
    dates: DateRange;
    gpa?: string;
    description: string;
}

export interface LeadershipExperience {
    id: string;
    role: string;
    organization: string;
    location: string;
    dates: DateRange;
    description: string;
}

export interface Award {
    id: string;
    title: string;
    issuer: string;
    date: string;
    description: string;
}

export interface Author {
    firstName: string;
    lastName: string;
}

export interface Publication {
    id: string;
    title: string;
    authors: string;
    authorsList: Author[];
    journal: string;
    date: string;
    url: string;
    description: string;
}

export interface Grant {
    id: string;
    title: string;
    funder: string;
    amount: string;
    dates: DateRange;
    description: string;
}

export interface TeachingExperience {
    id: string;
    course: string;
    institution: string;
    role: string;
    dates: DateRange;
    description: string;
}

export interface Conference {
    id: string;
    title: string;
    conference: string;
    location: string;
    date: string;
    description: string;
}

export interface PersonalInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedin: string;
    website: string;
    github: string;
    address: string;
}

export interface ResumeData {
    personalInfo: PersonalInfo;
    workExperience: WorkExperience[];
    education: Education[];
    leadershipExperience: LeadershipExperience[];
    awards: Award[];
    publications: Publication[];
    grants: Grant[];
    teachingExperience: TeachingExperience[];
    conferences: Conference[];
    skills: string[];
}

export interface Profile {
    id: string;
    name: string;
    description: string;
    resume: ResumeData | null;
    createdAt: number;
    updatedAt: number;
}

export interface SavedCoverLetter {
    id: string;
    title: string;
    content: string;
    jobDescription: string;
    jobTitle: string;
    companyName: string;
    profileId: string | null;
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'applyly_profiles';
const ACTIVE_PROFILE_KEY = 'applyly_active_profile_id';
const COVER_LETTERS_KEY = 'applyly_cover_letters';

export const storage = {
    async getProfiles(): Promise<Profile[]> {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || [];
    },

    async saveProfiles(profiles: Profile[]): Promise<void> {
        await chrome.storage.local.set({ [STORAGE_KEY]: profiles });
    },

    async getActiveProfileId(): Promise<string | null> {
        const result = await chrome.storage.local.get(ACTIVE_PROFILE_KEY);
        return result[ACTIVE_PROFILE_KEY] || null;
    },

    async setActiveProfileId(id: string): Promise<void> {
        await chrome.storage.local.set({ [ACTIVE_PROFILE_KEY]: id });
    },

    async getActiveProfile(): Promise<Profile | null> {
        const profiles = await this.getProfiles();
        const activeId = await this.getActiveProfileId();
        return profiles.find(p => p.id === activeId) || profiles[0] || null;
    },

    async updateProfile(updatedProfile: Profile): Promise<void> {
        const profiles = await this.getProfiles();
        const index = profiles.findIndex(p => p.id === updatedProfile.id);
        if (index >= 0) {
            profiles[index] = { ...updatedProfile, updatedAt: Date.now() };
            await this.saveProfiles(profiles);
        }
    },

    async getCoverLetters(): Promise<SavedCoverLetter[]> {
        const result = await chrome.storage.local.get(COVER_LETTERS_KEY);
        return result[COVER_LETTERS_KEY] || [];
    },

    async saveCoverLetters(letters: SavedCoverLetter[]): Promise<void> {
        await chrome.storage.local.set({ [COVER_LETTERS_KEY]: letters });
    }
};

// Helper to create empty DateRange
export const emptyDateRange = (): DateRange => ({
    startMonth: '',
    startYear: '',
    endMonth: '',
    endYear: ''
});

// Helper to format date range for display
export const formatDateRange = (dates: DateRange): string => {
    const start = dates.startMonth && dates.startYear
        ? `${dates.startMonth} ${dates.startYear}`
        : dates.startYear || '';
    const end = dates.endMonth && dates.endYear
        ? `${dates.endMonth} ${dates.endYear}`
        : dates.endYear || 'Present';
    return start && end ? `${start} — ${end}` : start || end || '';
};
