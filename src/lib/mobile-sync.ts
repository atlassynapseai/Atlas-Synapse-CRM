// Mobile app synchronization engine
interface SyncEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: Record<string, any>;
  timestamp: string;
  synced: boolean;
}

const syncQueue: SyncEntry[] = [];

// Queue action for later sync
export function queueSyncAction(
  action: SyncEntry['action'],
  table: string,
  data: Record<string, any>
): SyncEntry {
  const entry: SyncEntry = {
    id: `sync_${Date.now()}`,
    action,
    table,
    data,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  syncQueue.push(entry);
  return entry;
}

// Sync offline changes when online
export async function syncOfflineChanges(baseUrl: string): Promise<number> {
  const unsynced = syncQueue.filter((s) => !s.synced);
  let syncedCount = 0;

  for (const entry of unsynced) {
    try {
      const endpoint = `${baseUrl}/api/${entry.table}`;

      const response = await fetch(endpoint, {
        method: entry.action === 'DELETE' ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.data),
      });

      if (response.ok) {
        entry.synced = true;
        syncedCount++;
      }
    } catch (error) {
      console.error(`Sync failed for ${entry.id}:`, error);
    }
  }

  return syncedCount;
}

// Push notification handler
export async function registerPushNotifications(token: string): Promise<void> {
  try {
    await fetch('/api/push-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    console.log('Push token registered');
  } catch (error) {
    console.error('Error registering push token:', error);
  }
}

// Local data store (simulating AsyncStorage)
export const MobileStore = {
  async setItem(key: string, value: any): Promise<void> {
    // In React Native: AsyncStorage.setItem(key, JSON.stringify(value))
    console.log(`Store[${key}] =`, value);
  },

  async getItem(key: string): Promise<any> {
    // In React Native: JSON.parse(await AsyncStorage.getItem(key))
    return null;
  },

  async removeItem(key: string): Promise<void> {
    // In React Native: AsyncStorage.removeItem(key)
    console.log(`Delete Store[${key}]`);
  },
};

// Get sync queue status
export function getSyncStatus() {
  const total = syncQueue.length;
  const synced = syncQueue.filter((s) => s.synced).length;
  return {
    total,
    synced,
    pending: total - synced,
  };
}
