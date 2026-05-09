// Consider the UI: if a user clicks "Topic Strength", the default sub-tab is 'WEAK'.
// If they have no weak topics, it's empty!
// The user says "nahi aarahe hai topic week avrage strong page me" (topics are not appearing in weak average strong page).
// Wait! Is the data in `donutChartData` correct but the list underneath is empty?
// Let's check how the list is rendered in RevisionHub.tsx
