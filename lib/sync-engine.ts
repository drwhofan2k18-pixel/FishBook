import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import {
  getSyncQueue,
  removeSyncQueueItem,
  incrementSyncRetry,
  removeFailedSyncItems,
  updateCatchOffline,
  getCatchesOffline,
  type OfflineCatch,
} from './offline-db';

type SyncListener = (status: SyncStatus) => void;

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

let syncStatus: SyncStatus = {
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  error: null,
};

const listeners = new Set<SyncListener>();

function notify() {
  for (const listener of listeners) {
    listener(syncStatus);
  }
}

export function onSyncStatusChange(listener: SyncListener) {
  listeners.add(listener);
  listener(syncStatus);
  return () => listeners.delete(listener);
}

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

function setStatus(update: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...update };
  notify();
}

/**
 * Initialize the sync engine: monitor connectivity and auto-sync.
 */
export function initSyncEngine() {
  // Listen for connectivity changes
  NetInfo.addEventListener((state) => {
    const isOnline = !!(state.isConnected && state.isInternetReachable !== false);
    setStatus({ isOnline });

    if (isOnline) {
      processSyncQueue();
    }
  });

  // Periodic sync check every 5 minutes
  setInterval(() => {
    if (syncStatus.isOnline) {
      processSyncQueue();
    }
  }, 5 * 60 * 1000);
}

/**
 * Process the sync queue - upload pending items to Supabase.
 */
export async function processSyncQueue() {
  if (syncStatus.isSyncing) return;

  setStatus({ isSyncing: true, error: null });

  try {
    const queue = getSyncQueue();

    for (const item of queue) {
      const payload = item.payload ? JSON.parse(item.payload as string) : {};

      try {
        if (item.operation === 'create' && item.table_name === 'catches') {
          const { error } = await supabase.from('catches').insert(payload);
          if (error) throw error;

          // Mark local catch as synced
          updateCatchOffline(item.record_id as string, {
            synced: 1,
            sync_status: 'synced',
            photo_url: payload.photo_url || null,
          });
        } else if (item.operation === 'update' && item.table_name === 'catches') {
          const userId = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user?.id : null;
          let q = supabase.from('catches').update(payload).eq('id', item.record_id);
          if (userId) q = q.eq('user_id', userId);
          const { error } = await q;
          if (error) throw error;
        } else if (item.operation === 'delete' && item.table_name === 'catches') {
          const userId = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user?.id : null;
          let q = supabase.from('catches').delete().eq('id', item.record_id);
          if (userId) q = q.eq('user_id', userId);
          const { error } = await q;
          if (error) throw error;
        }

        removeSyncQueueItem(item.id as number);
      } catch (err) {
        incrementSyncRetry(item.id as number);
        console.error('Sync failed for item', item.id, err);
      }
    }

    // Clean up permanently failed items
    removeFailedSyncItems();

    setStatus({
      lastSyncAt: new Date().toISOString(),
      pendingCount: getSyncQueue().length,
    });
  } catch (err) {
    setStatus({ error: err instanceof Error ? err.message : 'Sync failed' });
  } finally {
    setStatus({ isSyncing: false });
  }
}

/**
 * Check if the device is currently online.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}
