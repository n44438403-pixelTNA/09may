# IIC - Educational Learning Platform
An AI-driven Educational Platform and Learning Management System (LMS) tailored for Indian education (CBSE, BSEB, Competitive Exams).

## Run & Operate
- **Dev**: `npm run dev` (port 5000)
- **Build**: `npm run build` (outputs to `dist/`)
- **Deployment**: Static site deployment via Vite build.
- **Firebase**: `firebase deploy --only database` (for RTDB rules changes).
- **Environment Variables**:
    - `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`
    - `GROQ_API_KEY`, `GEMINI_API_KEY` (for AI services)

## Stack
- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (CDN + PostCSS)
- **Backend/DB**: Firebase Firestore, Firebase Realtime Database, Firebase Auth
- **AI**: Groq API (primary), Google Gemini (fallback)
- **PWA**: `vite-plugin-pwa`

## Where things live
- `App.tsx`: Central entry point, authentication, routing.
- `components/`: UI components (e.g., `StudentDashboard.tsx`, `AdminDashboard.tsx`, `UniversalChat.tsx`).
- `services/`: AI integration (`groq.ts`), Firebase helpers (`firebase.ts`), note starring (`noteStars.ts`).
- `utils/`: Utility functions (e.g., `textToSpeech.ts`, `appLang.ts`, `revisionTrackerV2.ts`, `noteSearcher.ts`, `mcqSearcher.ts`, `splashFonts.ts`, `homeSections.ts`, `downloadUtils.ts`, `offlineStorage.ts`, `mistakeBank.ts`).
- `constants.ts`: Subject definitions, feature configurations.
- `types.ts`: TypeScript interfaces for data structures (e.g., `SystemSettings`, `LucentPageNote`, `FlashcardSession`).
- `public/`: Static assets (`splash-logo.png`).
- `database.rules.json`: Firebase Realtime Database security rules.
- `firestore.rules`: Firebase Firestore security rules.
- `index.css`: Global CSS and Tailwind overrides.

## Architecture decisions
- **Offline-First PWA**: Utilizes Firebase persistence and PWA features for offline access to cached content, avoiding lockout screens during network interruptions.
- **Client-Side AI & Search**: Local-storage based search for notes and MCQs (e.g., `noteSearcher.ts`, `mcqSearcher.ts`) to reduce server load and improve responsiveness. AI content generation (Groq/Gemini) is also client-initiated.
- **Chunked TTS Playback**: Implements client-side text chunking for Text-to-Speech to overcome browser limitations on utterance length, ensuring reliable playback of long notes in Hindi and English.
- **Dynamic UI Configuration**: Admin settings (`SystemSettings`) control visibility of various UI elements (e.g., bottom navigation, top bar buttons, home page sections) to allow for flexible feature rollout and customization without code changes.
- **Cascading Slot System for Navigation**: Bottom navigation uses a flexible slot-based system where tabs shift positions based on feature enablement, ensuring a consistent number of visible navigation items.

## Product
- **AI-Driven Content**: Generates educational content (e.g., chapters, MCQs) using AI.
- **Competition Mode**: Features like Lucent Book, Speedy Science, Sar Sangrah, and MCQ Practice for competitive exams.
- **Class 6-12 Curriculum**: Provides notes, video, and audio content for school-level education.
- **Homework System**: Admin assigns content, students can view and complete assignments.
- **Community Chat**: Global, MCQ-specific, and support chat channels with features like MCQ sharing, voting, and real-time unread indicators.
- **Spaced Repetition (Revision Hub V2)**: Tracks wrong answers, schedules notes and MCQs for review, and automatically identifies relevant study materials based on weak areas.
- **Interactive Readers**: Provides "Lucent-style" edge-to-edge reading experience for notes, tap-to-read TTS on individual lines, and integrated MCQ practice within lesson views.
- **Customizable Experience**: User-selectable themes, global language toggle (Hindi/English), and admin-controlled splash screen fonts and logos.
- **Offline Content**: Users can save notes and MCQs offline for access without internet.
- **My Mistake System**: Automatically tracks wrongly answered MCQs across sessions, allowing students to practice their specific weak points.

## User preferences
- _Populate as you build_

## Gotchas
- **Firebase Rules**: Ensure `database.rules.json` and `firestore.rules` are correctly configured for read/write permissions, especially for new features like `note_stars` and `redeem_codes`. Silent failures can occur if rules are too restrictive or malformed.
- **TTS Reliability**: While chunking improves TTS, browser inconsistencies (especially on mobile) can still lead to occasional interruptions. The retry mechanism helps, but it's not foolproof.
- **Local Storage Limits**: Extensive use of `localStorage` for tracking (e.g., revision tracker, flashcard history) should be monitored to avoid exceeding browser storage limits, especially on older devices.
- **Offline Data Sync**: Ensure Firebase data persistence (`enableMultiTabIndexedDbPersistence`) is correctly enabled and handling conflicts for offline-modified data.
- **Admin Visibility Settings**: Changes in admin panels for visibility of buttons/sections (`hiddenTopBarButtons`, `hiddenBottomNavButtons`, `hiddenHomeButtons`, `hiddenClasses`) apply globally and must be tested across student roles.

## Pointers
- **Firebase Documentation**: [https://firebase.google.com/docs](https://firebase.google.com/docs)
- **React Documentation**: [https://react.dev/](https://react.dev/)
- **Tailwind CSS Documentation**: [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
- **Vite Documentation**: [https://vitejs.dev/guide/](https://vitejs.dev/guide/)
- **Groq API Documentation**: [https://groq.com/docs/api](https://groq.com/docs/api)
- **Google Gemini API Documentation**: [https://ai.google.dev/](https://ai.google.dev/)
- **TypeScript Handbook**: [https://www.typescriptlang.org/docs/handbook/intro.html](https://www.typescriptlang.org/docs/handbook/intro.html)