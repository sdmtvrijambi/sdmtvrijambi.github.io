# Monitoring SKP TVRI Dashboard

A highly modern, futuristic, professional, and responsive SKP Monitoring Dashboard for TVRI Stasiun Jambi. 
Built with HTML, CSS, Vanilla JavaScript, Chart.js, and DataTables. Features a dark mode glassmorphism UI and fetches data automatically from Google Sheets.

## Features
- **Dark Mode & Glassmorphism:** Enterprise-grade premium UI with blur effects and smooth animations.
- **Auto Refresh:** Automatically polls Google Sheets for new data every 60 seconds without reloading the page.
- **Interactive Charts:** Uses Chart.js for Pie, Bar, and Line charts.
- **Advanced Data Table:** Search, sort, pagination, and export (Excel, PDF, Print) via DataTables.
- **No Backend Required:** Completely static and ready to be hosted on GitHub Pages.

## Project Structure
```text
/
├── index.html        # Main dashboard layout
├── css/
│   └── style.css     # Design system, glassmorphism, responsive rules
├── js/
│   ├── app.js        # Core UI logic, clock, sidebar, toast notifications
│   ├── sheet.js      # Google Sheets data fetching and polling logic
│   ├── chart.js      # Chart.js initialization and seamless updates
│   └── table.js      # DataTables initialization and updates
└── README.md         # Documentation
```

## How to Connect to Google Sheets

1. **Prepare your Google Sheet:**
   Make sure your Google Sheet has headers similar to the columns in the dashboard (Nama, NIP, Bidang, Jabatan, Status, Tanggal_Upload, Keterangan).
2. **Publish the Sheet:**
   - Go to `File > Share > Publish to web`.
   - Choose `Entire Document` and format `Comma-separated values (.csv)` or use a Google Apps Script to output JSON.
3. **Update the code:**
   - Open `js/sheet.js`.
   - Locate the variable `const SHEET_URL = "";`.
   - Paste your published Google Sheet or Apps Script URL inside the quotes.
   - Adjust the `parseGoogleSheetData()` function in `js/sheet.js` if necessary to map your specific columns to the JSON structure expected by the app.

*(Note: Currently, if `SHEET_URL` is empty, the app will generate mock data automatically so you can preview the design right away).*

## Hosting on GitHub Pages
1. Initialize a Git repository in this folder.
2. Commit all files.
3. Push to a new GitHub repository.
4. Go to repository Settings > Pages.
5. Select the `main` branch and `/ (root)` folder, then save.
6. Your dashboard will be live!
