<p align="center">
  <img src="public/icon128.png" alt="Applyly Logo" width="128" height="128" />
</p>

# Applyly™

**Free Open-Source Chrome Extension. Put your best foot forward in every application.**

Applyly securely stores your resume data locally and helps you ensure every application is filled with your highest quality, curated information. Eliminates repetitive errors and inconsistencies across portals (LinkedIn, Greenhouse, Lever).

## Features

- **Resume Parsing**: Extracts structured data (Education, Work, Skills) from **PDF** resumes.
- **Precision Autofill**: Fills forms with your verified data, preventing typos and fatigue-induced errors.
- **Manual Entry**: Sidebar helper for specific data points.
- **Privacy**: No external servers. All data stays in your browser.

## Installation

### Option A: Download ZIP (Recommended)
1.  **[Download Source ZIP](https://github.com/kkusima/applyly/archive/refs/heads/main.zip)** and extract it.
2.  Open Chrome to `chrome://extensions/`.
3.  Enable **Developer mode** (toggle in top right).
4.  Click **Load unpacked**.
5.  Select the `dist` folder inside the extracted directory.

### Option B: Clone via Git
1.  Clone the repo:
    ```bash
    git clone https://github.com/kkusima/applyly.git
    ```
2.  Follow steps 2-5 above, selecting the `dist` folder in the project root.

## Permissions

- `storage`: For saving profiles locally.
- `tabs` & `activeTab`: To detect and fill forms on current pages.
- `scripting`: To execute autofill logic.

## License

MIT License. Applyly™ is a trademark of the project creator.
