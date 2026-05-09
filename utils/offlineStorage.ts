import { storage } from './storage';

const OFFLINE_KEY = 'nst_offline_downloads';

export type OfflineItemType = 'NOTE' | 'MCQ' | 'ANALYSIS';

export interface OfflineItem {
  id: string; // Unique ID (e.g., chapter.id + timestamp)
  type: OfflineItemType;
  title: string;
  subtitle?: string;
  timestamp: number;
  data: any; // Raw JSON Data (Note HTML, MCQ Array, or Analysis Result)
}

export const saveOfflineItem = async (item: Omit<OfflineItem, 'timestamp'>): Promise<void> => {
    try {
        const existingItems = await getOfflineItems();

        // Remove existing item with same ID if it exists to overwrite
        const filteredItems = existingItems.filter(i => i.id !== item.id);

        const newItem: OfflineItem = {
            ...item,
            timestamp: Date.now()
        };

        filteredItems.push(newItem);

        // Sort descending by timestamp
        filteredItems.sort((a, b) => b.timestamp - a.timestamp);

        await storage.setItem(OFFLINE_KEY, filteredItems);
        console.log(`Successfully saved offline item: ${item.title}`);
    } catch (error) {
        console.error("Error saving offline item:", error);
    }
};

export const getOfflineItems = async (): Promise<OfflineItem[]> => {
    try {
        const items = await storage.getItem<OfflineItem[]>(OFFLINE_KEY);
        return items || [];
    } catch (error) {
        console.error("Error fetching offline items:", error);
        return [];
    }
};

export const removeOfflineItem = async (id: string): Promise<void> => {
    try {
        const existingItems = await getOfflineItems();
        const filteredItems = existingItems.filter(item => item.id !== id);
        await storage.setItem(OFFLINE_KEY, filteredItems);
        console.log(`Removed offline item: ${id}`);
    } catch (error) {
        console.error("Error removing offline item:", error);
    }
};

export const clearAllOfflineItems = async (): Promise<void> => {
    try {
        await storage.removeItem(OFFLINE_KEY);
        console.log("All offline items cleared");
    } catch (error) {
        console.error("Error clearing offline items:", error);
    }
};
