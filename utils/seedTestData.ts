/**
 * seedTestData.ts — Injects 3 mock chapter note entries into localforage
 * so the Compare feature can be tested without real Firebase data.
 *
 * Keys follow the pattern:  nst_content_BOARD_CLASS_SUBJECT_CHAPTERID
 * All 3 entries contain "photosynthesis" and "chlorophyll" so searching
 * either word returns 3 results → "Compare 3 Books" button appears.
 *
 * Call seedCompareTestData()  to inject.
 * Call clearCompareTestData() to remove.
 */

import { storage } from './storage';

const TEST_KEYS = [
  'nst_content_CBSE_10_science_ch6-life-processes',
  'nst_content_BSEB_10_biology-notes_ch2-nutrition',
  'nst_content_CBSE_9_science_ch13-why-do-we-fall-ill',
];

const MOCK_ENTRIES = [
  {
    bookName: 'NCERT Science Class 10',
    topicNotes: [
      {
        title: 'Photosynthesis — Life Processes',
        content: `Photosynthesis is the process by which green plants prepare their own food using sunlight, water and carbon dioxide. Chlorophyll present in the leaves absorbs sunlight and converts it into chemical energy. The overall reaction is: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. Stomata are tiny pores on the leaves through which CO₂ enters and O₂ is released. Light-dependent reactions occur in the thylakoid membrane while light-independent reactions (Calvin cycle) occur in the stroma of chloroplasts.`,
        pageNo: '1',
      },
      {
        title: 'Nutrition in Plants',
        content: `Autotrophs like plants make their own food through photosynthesis. Heterotrophs depend on other organisms. Chlorophyll is the green pigment found inside chloroplasts. It captures light energy from the sun. Without chlorophyll, photosynthesis cannot occur. Plants also absorb minerals from soil through their roots for proper growth.`,
        pageNo: '2',
      },
    ],
  },
  {
    bookName: 'Bihar Board Biology Notes',
    topicNotes: [
      {
        title: 'Photosynthesis — Poshan (Nutrition)',
        content: `Paudhe apna khana khud banate hain is prakriya se jise photosynthesis kehte hain. Patto mein upasthit chlorophyll suraj ki roshni ko upyog karta hai. Yeh prakriya chloroplasts ke andar hoti hai. Carbon dioxide aur paani milkar glucose banate hain. Oxygen ek upaj ke roop mein bahar nikalti hai. Is prakriya mein suraj ki roshni, paani aur carbon dioxide ki zaroorat hoti hai.`,
        pageNo: '1',
      },
      {
        title: 'Chlorophyll aur Prakash Sentleshan',
        content: `Chlorophyll ek harit varnak hai jo prakash urja ko rasayanik urja mein badalta hai. Photosynthesis ke do charan hain — prakash abhikriya aur andhera abhikriya. Stomata se CO₂ andar aati hai. O₂ bahar nikalti hai. Glucose plants ke liye shakti ka strot hai. Bihar Board ke pariksha mein yeh ek mahatvapoorn topic hai.`,
        pageNo: '2',
      },
    ],
  },
  {
    bookName: 'Speedy Science Quick Notes',
    topicNotes: [
      {
        title: 'Photosynthesis — Quick Revision',
        content: `KEY POINTS: (1) Photosynthesis happens in chloroplasts. (2) Chlorophyll is the main pigment. (3) Raw materials: CO₂ + H₂O + Light. (4) Products: Glucose + O₂. (5) Equation: 6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂. (6) Light reactions: ATP and NADPH produced. (7) Dark reactions: Calvin cycle, CO₂ fixed into glucose. (8) Stomata regulate gas exchange. MCQ tip: Chlorophyll absorbs red and blue light most effectively.`,
        pageNo: '1',
      },
      {
        title: 'Factors Affecting Photosynthesis',
        content: `Four main factors affect rate of photosynthesis: (1) Light intensity — more light = more photosynthesis up to saturation point. (2) CO₂ concentration — limiting factor in most conditions. (3) Temperature — enzymes work best at 25-35°C. (4) Water — shortage reduces photosynthesis. Chlorophyll content also affects the rate. Remember: C3 plants vs C4 plants (sugarcane is C4 — photosynthesis more efficient).`,
        pageNo: '2',
      },
    ],
  },
];

export async function seedCompareTestData(): Promise<void> {
  for (let i = 0; i < TEST_KEYS.length; i++) {
    await storage.setItem(TEST_KEYS[i], MOCK_ENTRIES[i]);
  }
  console.log('[TestCompare] 3 mock chapter entries injected into localforage.');
}

export async function clearCompareTestData(): Promise<void> {
  for (const key of TEST_KEYS) {
    await storage.removeItem(key);
  }
  console.log('[TestCompare] Mock entries cleared.');
}
