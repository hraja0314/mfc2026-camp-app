# MFC 2026 — Muslim Family Camp Registration & Check-In System

**Camp Seely, April 3–5, 2026**

A complete camp management system: offline PWA for check-in & meal tracking, printable QR cards, pre-camp age collection form, and Google Sheets integration.

---

## Live Links

| What | URL |
|------|-----|
| **Check-In App (PWA)** | https://hraja0314.github.io/mfc2026-camp-app/ |
| **Age Collection Form** | https://hraja0314.github.io/mfc2026-camp-app/ages/ |
| **Google Sheet** | https://docs.google.com/spreadsheets/d/1lc1jG5yrudOZfHEBqFyjkj1RRkKZRqqt2gLQkMsp-s4 |

---

## How It Works

- **44 registrations** across 4 packages → **169 QR cards** (one per person, same QR per cabin group)
- **PWA app** on iPhone scans QR codes for check-in and meal tracking — works **fully offline**
- **6 meals**: Fri dinner, Sat breakfast/lunch/dinner, Sun breakfast/lunch
- **Day campers** (Package 4): Saturday lunch + dinner only
- Each scan = 1 meal token; Cabin of 4 = 4 tokens per meal
- **62 cabins**: 1–19 (4-person), 20–42 (5-person), 43–62 (4-person)
- Each volunteer's phone has independent data (no sync between phones needed)

---

## Project Structure

```
MFC 2026/
├── app/                        PWA app (deployed to GitHub Pages)
│   ├── index.html              Main app shell (5 screens)
│   ├── css/style.css           Mobile-first styles
│   ├── js/
│   │   ├── app.js              App logic (check-in, meals, cabins, dashboard)
│   │   ├── db.js               IndexedDB layer (offline storage)
│   │   ├── scanner.js          QR scanner wrapper (html5-qrcode)
│   │   └── participants.js     Generated participant data from Excel
│   ├── ages/                   Pre-camp age collection form
│   │   ├── index.html          Public form page
│   │   └── data.js             Minimal lookup data (name + group size only)
│   ├── lib/html5-qrcode.min.js QR scanner library (bundled)
│   ├── manifest.json           PWA manifest
│   └── sw.js                   Service worker (offline caching)
├── Data/                       Excel registration files (input)
├── cards/
│   ├── generate_cards.py       PDF card generator
│   └── mfc_cards_v2.pdf        Generated 169 QR cards (22 pages)
├── sheets/
│   ├── generate_sheets_data.py CSV exporter for Google Sheets
│   └── *.csv                   Generated CSV files
├── apps_script_ages.js         Google Apps Script for age form backend
├── setup_google_sheet.py       Automated Google Sheets setup
├── update_app_data.py          One-command data refresh script
├── service_account.json        Google service account key (DO NOT commit)
└── README.md
```

---

## App Features

### 📱 Check-In (QR Scan)
- Scan a camper's QR card → records check-in with timestamp
- Shows duplicate warning if already checked in

### 🔍 Participant Lookup
- Search by name → view full detail card:
  - Contact info (email, phone)
  - Registration ref & date
  - Package type & group size
  - **Payment info** (fee, amount paid, remaining balance)
  - Cabin assignment
  - Meal status per meal
  - Check-in button

### 🍽️ Meal Tracking
- Select a meal → scan QR → deducts a meal token
- Cabin of 4 = 4 tokens per meal
- Day campers restricted to Saturday lunch + dinner only

### 🏠 Cabin Allocation
- Assign registrations to cabins (filtered by cabin capacity)
- Visual cabin map (green = occupied, gray = free)

### 📊 Dashboard
- Stats: checked-in count, total meal scans
- Full table with meal breakdown per participant
- Search & CSV export
- **Reset button** (double-confirm) to clear all data after testing

### 📋 Age Collection Form (Pre-Camp)
- Public webpage — campers visit before camp
- Enter registration ref → submit ages + Brother/Sister for each person
- Data saved to "Ages" tab in Google Sheet

---

## Quick Start

### Prerequisites
```bash
pip install openpyxl qrcode reportlab Pillow gspread google-auth
```

### 1. Generate QR Cards
```bash
cd cards
python generate_cards.py
```
Output: `mfc_cards_v2.pdf` — 169 cards across 22 pages. Print and cut.

### 2. Update App Data (When Registration Data Changes)
Drop updated Excel files into `Data/`, then run:
```bash
python update_app_data.py
```
This single command:
- ✅ Regenerates `app/js/participants.js` (with payment info)
- ✅ Regenerates `app/ages/data.js` (age form lookup)
- ✅ Regenerates QR cards PDF
- ✅ Bumps service worker cache version
- ✅ Commits & pushes to GitHub Pages

Volunteers must refresh the app (or clear Safari cache) to get new data.

---

## Google Cloud Setup (Free — No Credit Card Needed)

### 1. Create a Google Cloud Project
1. Go to **https://console.cloud.google.com/** and sign in
2. Click **"Select a project"** → **"NEW PROJECT"**
3. Name it: `MFC Camp` → **"Create"**

### 2. Enable APIs
1. Search `Google Sheets API` → click **"Enable"**
2. Search `Google Drive API` → click **"Enable"**

### 3. Create a Service Account
1. Search `Service Accounts` → click **"Service Accounts (IAM & Admin)"**
2. Click **"+ CREATE SERVICE ACCOUNT"**
3. Name: `mfc-camp-app` → **"Create and Continue"** → **"Done"**

### 4. Download the Key File
1. Click on `mfc-camp-app` in the list
2. Go to **"Keys"** tab → **"Add Key" → "Create new key"**
3. Select **JSON** → **"Create"**
4. Rename the downloaded file to `service_account.json` and place in project root

### 5. Create Google Sheet
1. Create a blank Google Sheet named `MFC 2026 Camp Data`
2. Share it with the service account email (found in `service_account.json` → `client_email`) as **Editor**
3. Run: `python setup_google_sheet.py`

---

## Age Form Backend (Google Apps Script)

The age collection form at `/ages/` saves data to Google Sheets via Apps Script.

### Setup
1. Open the Google Sheet → **Extensions → Apps Script**
2. Delete all code, paste contents of `apps_script_ages.js`
3. Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (not "Anyone with Google account")
4. Click **Deploy** → Authorize when prompted (click Advanced → Go to project)
5. Copy the Web App URL
6. Update `app/ages/index.html` → paste URL into `APPS_SCRIPT_URL`
7. Push to GitHub

### Updating the Script
When you change the Apps Script code:
1. Replace code in Apps Script editor
2. **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**

---

## Using the App on Volunteer Phones

1. Open **https://hraja0314.github.io/mfc2026-camp-app/** in Safari
2. Tap **Share** → **Add to Home Screen** → name it "MFC Camp"
3. The app works offline after first load
4. After data updates, clear Safari cache: **Settings → Safari → Clear History and Website Data**

---

## Key Technical Details

- **QR format**: `MFC-{RegistrationRef}` (e.g., `MFC-SR-004975`)
- **IndexedDB stores**: `checkins`, `mealScans`, `cabinAssignments`
- **Service worker**: Bump `CACHE_NAME` version in `sw.js` on every deploy (done automatically by `update_app_data.py`)
- **GitHub repo**: https://github.com/hraja0314/mfc2026-camp-app
- **Service account**: `mfc-camp-app@mfc-camp.iam.gserviceaccount.com`
