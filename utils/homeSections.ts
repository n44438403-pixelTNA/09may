// Single source of truth for the toggleable buttons / cards on the
// student Home tab. Admin uses this registry to render the
// "Home Page Buttons" toggle list in General Settings; the student
// dashboard uses `isHomeSectionVisible(id, settings)` to decide
// whether each piece renders.
//
// Visibility persists in `settings.dashboardLayout[id].visible`
// (true by default — anything not present is treated as visible
// so existing installs keep working unchanged).

export type HomeSectionMeta = {
  id: string;
  label: string;
  description: string;
  emoji: string;
  // Tailwind color family for the admin tile chrome
  color:
    | 'slate'
    | 'blue'
    | 'indigo'
    | 'emerald'
    | 'amber'
    | 'rose'
    | 'violet'
    | 'cyan';
};

export const HOME_SECTION_REGISTRY: HomeSectionMeta[] = [
  {
    id: 'home_notice_bar',
    label: 'Announcement / Notice Bar',
    description: 'Black bar at top of Home with the admin announcement text.',
    emoji: '📣',
    color: 'slate',
  },
  {
    id: 'home_promo_banners',
    label: 'Daily Challenge Banners',
    description: 'Daily Challenge / Global Challenge / Challenge 2.0 cards.',
    emoji: '🏆',
    color: 'amber',
  },
  {
    id: 'home_continue_reading',
    label: 'Continue Reading Card',
    description: '"Where you left off" card with recent chapters and notes.',
    emoji: '📚',
    color: 'indigo',
  },
  {
    id: 'home_subject_progress',
    label: 'Subject Progress Card',
    description: 'Per-subject reading progress bars.',
    emoji: '📊',
    color: 'blue',
  },
  {
    id: 'section_main_actions',
    label: 'Main Actions Card (whole)',
    description: 'Hides the entire "Select Class" white card in one go.',
    emoji: '🎯',
    color: 'emerald',
  },
  {
    id: 'home_board_toggle',
    label: 'CBSE / BSEB Board Toggle',
    description: 'Board switch in the Select Class card header.',
    emoji: '🌐',
    color: 'cyan',
  },
  {
    id: 'home_search_button',
    label: 'Search Button',
    description: 'Magnifying-glass icon next to the board toggle.',
    emoji: '🔍',
    color: 'blue',
  },
  {
    id: 'home_content_type_pref',
    label: '"Open Lesson As" Picker',
    description: 'All / Notes / Audio / Video preference row.',
    emoji: '🎚️',
    color: 'violet',
  },
  {
    id: 'home_class_picker',
    label: 'Class Selection Grid',
    description: 'Junior / Secondary / Senior class buttons (6-12).',
    emoji: '🎓',
    color: 'rose',
  },
  {
    id: 'home_govt_exams',
    label: 'Govt. Exams CTA',
    description: 'Orange "Competitive • Govt. Exams" card under the class grid.',
    emoji: '🏛️',
    color: 'amber',
  },
];

export function isHomeSectionVisible(
  id: string,
  settings: any | undefined,
): boolean {
  // Default: visible. Only return false when the admin has explicitly
  // saved `{ visible: false }` for this id.
  return settings?.dashboardLayout?.[id]?.visible !== false;
}
