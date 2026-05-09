import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Optional branding info passed to `downloadAsMHTML`. When omitted the
 * download still works (backwards-compatible), but the file won't have
 * the branded top bar / footer — just the content card.
 *
 * Why this exists: students complained that downloaded notes/MCQ pages
 * looked like a wall of unformatted text — none of the app's colours,
 * top bar, or branding survived. We now inject a sticky header with the
 * app name + page title, replicate the app's slate background, and
 * include a footer with timestamp + attribution. End result: the saved
 * `.html` opens in any browser and looks like a screenshot of the app.
 */
export interface DownloadBrandingOptions {
  /** App name shown in the top bar — e.g. "IIC". */
  appName?: string;
  /** Subtitle under the app name — e.g. chapter name, "Notes", "MCQs". */
  pageTitle?: string;
  /** Subject / topic / contextual line for the header — small text. */
  subtitle?: string;
  /** Hex/CSS colour used for the top bar gradient start. Defaults to the
   *  app's indigo-blue brand. */
  brandColor?: string;
  /** Hex/CSS colour used for the top bar gradient end. */
  brandColorAccent?: string;
}

const DEFAULT_BRANDING: Required<DownloadBrandingOptions> = {
  appName: 'IIC',
  pageTitle: 'Saved Page',
  subtitle: 'Educational Learning Platform',
  brandColor: '#4f46e5',       // indigo-600 — matches app's primary
  brandColorAccent: '#7c3aed', // violet-600 — matches app's accent
};

export const downloadAsPDF = async (
  elementId: string,
  filename: string,
  branding?: DownloadBrandingOptions,
) => {
  await downloadAsMHTML(elementId, filename, branding);
};

export const downloadAsMHTML = async (
  elementId: string,
  filename: string,
  branding?: DownloadBrandingOptions,
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  const brand: Required<DownloadBrandingOptions> = {
    ...DEFAULT_BRANDING,
    ...(branding || {}),
    // If a pageTitle wasn't supplied, fall back to the requested filename
    // so the header at least matches what the file is called.
    pageTitle: branding?.pageTitle || filename || DEFAULT_BRANDING.pageTitle,
  };

  try {
    // Collect all styles from the current document so the export renders
    // visually identical to what the student is seeing right now.
    let styleSheetsStr = '';
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        if (sheet.cssRules) {
          for (let j = 0; j < sheet.cssRules.length; j++) {
            styleSheetsStr += sheet.cssRules[j].cssText + '\n';
          }
        }
      } catch (e) {
        // CORS-blocked external stylesheet — fall back to @import so the
        // file still pulls it in when opened online.
        if (sheet.href) {
          styleSheetsStr += `@import url("${sheet.href}");\n`;
        }
      }
    }

    // Also grab inline <style> tags and <link rel="stylesheet"> nodes.
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    // Detect dark mode so the export inherits the same colour scheme as
    // the app currently looks. Otherwise a student in dark-mode would
    // download a white page and feel jarred.
    const html = document.documentElement;
    const isDark = html.classList.contains('dark-mode');
    const isBlue = isDark && html.classList.contains('dark-mode-blue');
    const pageBg = isDark
      ? (isBlue ? '#0f172a' : '#09090b')
      : '#f1f5f9';
    const cardBg = isDark
      ? (isBlue ? '#1e293b' : '#18181b')
      : '#ffffff';
    const textStrong = isDark ? '#f8fafc' : '#0f172a';
    const textMuted  = isDark ? '#cbd5e1' : '#475569';
    const cardBorder = isDark
      ? (isBlue ? '#1e3a8a' : '#27272a')
      : '#e2e8f0';

    // Clone the element so we can mutate it without touching the live DOM.
    const clonedElement = element.cloneNode(true) as HTMLElement;
    // Strip elements explicitly marked to be hidden on export (e.g.
    // floating toolbars, sticky CTAs that don't make sense offline).
    clonedElement.querySelectorAll('[data-export-hide="true"]').forEach(el => el.remove());
    // Strip <script> tags — the saved HTML should be fully static.
    clonedElement.querySelectorAll('script').forEach(el => el.remove());

    const safeAppName  = brand.appName.replace(/[<>"]/g, '');
    const safePageTitle = brand.pageTitle.replace(/[<>"]/g, '');
    const safeSubtitle = brand.subtitle.replace(/[<>"]/g, '');
    const savedOn = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en"${isDark ? ` class="dark-mode${isBlue ? ' dark-mode-blue' : ' dark-mode-black'}"` : ''}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeAppName} · ${safePageTitle}</title>

  <!-- Original app stylesheets -->
  ${styles}

  <!-- All computed CSS rules from the live document, embedded so the file
       renders identically even when offline. -->
  <style>
    ${styleSheetsStr}
  </style>

  <!-- Tailwind CDN as the absolute fallback in case the browser drops
       any of the cssRules above (rare, but defensive). -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Branded layout shell — keeps the saved page looking like the app. -->
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background-color: ${pageBg};
      color: ${textStrong};
      font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .iic-export-shell {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .iic-export-topbar {
      position: sticky;
      top: 0;
      z-index: 50;
      background: linear-gradient(135deg, ${brand.brandColor}, ${brand.brandColorAccent});
      color: #ffffff;
      padding: 14px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .iic-export-logo {
      width: 40px; height: 40px;
      border-radius: 12px;
      background: rgba(255,255,255,0.18);
      display: flex; align-items: center; justify-content: center;
      font-weight: 900;
      font-size: 18px;
      letter-spacing: 0.5px;
      backdrop-filter: blur(6px);
      flex-shrink: 0;
    }
    .iic-export-title-block { min-width: 0; flex: 1; }
    .iic-export-app {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      opacity: 0.85;
      margin: 0;
    }
    .iic-export-page {
      font-size: 16px;
      font-weight: 800;
      margin: 2px 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .iic-export-badge {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: rgba(0,0,0,0.18);
      padding: 4px 10px;
      border-radius: 999px;
    }

    .iic-export-subhead {
      background: ${cardBg};
      border-bottom: 1px solid ${cardBorder};
      padding: 10px 20px;
      font-size: 12px;
      color: ${textMuted};
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .iic-export-main {
      flex: 1;
      padding: 20px;
      display: flex;
      justify-content: center;
    }
    .iic-export-card {
      background: ${cardBg};
      color: ${textStrong};
      width: 100%;
      max-width: 900px;
      border: 1px solid ${cardBorder};
      border-radius: 18px;
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.18);
      padding: 24px;
      overflow: hidden;
    }
    .iic-export-card #${elementId} {
      display: block !important;
      opacity: 1 !important;
      position: static !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
    }
    /* Force-show anything the live app keeps hidden behind .hidden — but
       respect intentional hides via [data-export-hide]. */
    .iic-export-card .hidden { display: revert !important; }

    .iic-export-footer {
      padding: 18px 20px 26px;
      text-align: center;
      font-size: 11px;
      color: ${textMuted};
      border-top: 1px solid ${cardBorder};
      background: ${cardBg};
    }
    .iic-export-footer strong { color: ${textStrong}; }

    /* Print niceties — when the student hits Cmd/Ctrl-P on the saved
       file, hide the sticky bar's shadow + collapse padding so it
       prints clean. */
    @media print {
      .iic-export-topbar { position: static; box-shadow: none; }
      .iic-export-main { padding: 0; }
      .iic-export-card { box-shadow: none; border: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="iic-export-shell">
    <header class="iic-export-topbar">
      <div class="iic-export-logo">${safeAppName.slice(0, 3).toUpperCase()}</div>
      <div class="iic-export-title-block">
        <p class="iic-export-app">${safeAppName}</p>
        <h1 class="iic-export-page">${safePageTitle}</h1>
      </div>
      <span class="iic-export-badge">Saved · Offline</span>
    </header>

    <div class="iic-export-subhead">
      <span>${safeSubtitle}</span>
      <span>Saved on ${savedOn}</span>
    </div>

    <main class="iic-export-main">
      <div class="iic-export-card">
        <div id="${elementId}">
          ${clonedElement.innerHTML}
        </div>
      </div>
    </main>

    <footer class="iic-export-footer">
      Saved from <strong>${safeAppName}</strong> — ${safeSubtitle}.<br/>
      This page is a static snapshot for offline reading.
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

  } catch (error) {
    console.error('Error generating HTML download:', error);
    alert('Failed to generate HTML file. Please try again.');
  }
};
