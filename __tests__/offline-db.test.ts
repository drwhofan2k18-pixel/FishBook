jest.mock('expo-sqlite', () => {
  const db = {
    execSync: jest.fn(),
    runSync: jest.fn(),
    getAllSync: jest.fn(),
    prepareSync: jest.fn(() => ({
      executeSync: jest.fn(),
    })),
  };
  return { openDatabaseSync: jest.fn(() => db) };
});

import {
  insertCatchOffline,
  updateCatchOffline,
  deleteCatchOffline,
  getCatchesOffline,
  getCatchOffline,
  cacheSpecies,
  searchSpeciesCache,
  getPendingSyncCount,
  enqueueSync,
  getSyncQueue,
  removeSyncQueueItem,
  incrementSyncRetry,
  removeFailedSyncItems,
} from '../lib/offline-db';

// expo-sqlite mock factory always returns the same shared db instance, which is
// the one cached inside offline-db during its import-time init.
const getMockDb = () => require('expo-sqlite').openDatabaseSync();

describe('offline-db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('insertCatchOffline', () => {
    it('calls runSync with INSERT SQL and mapped params', () => {
      const db = getMockDb();
      insertCatchOffline({
        id: 'c1',
        user_id: 'u1',
        species_id: 3,
        weight_kg: 2.5,
        length_cm: 40,
        photo_uri_local: 'local.jpg',
        photo_url: 'remote.jpg',
        latitude: 12.3,
        longitude: 45.6,
        location_name: 'Lake',
        water_body: 'Lake X',
        caught_at: '2024-01-01T00:00:00Z',
        notes: 'nice',
        is_released: true,
      });

      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO catches_offline'),
        [
          'c1', 'u1', 3, 2.5, 40, 'local.jpg', 'remote.jpg',
          12.3, 45.6, 'Lake', 'Lake X', '2024-01-01T00:00:00Z', 'nice', 1,
        ],
      );
    });

    it('converts is_released false to 0', () => {
      const db = getMockDb();
      insertCatchOffline({
        id: 'c2',
        user_id: 'u1',
        species_id: null,
        weight_kg: null,
        length_cm: null,
        photo_uri_local: null,
        photo_url: null,
        latitude: null,
        longitude: null,
        location_name: null,
        water_body: null,
        caught_at: '2024-01-02T00:00:00Z',
        notes: null,
        is_released: false,
      });

      const params = db.runSync.mock.calls[0][1];
      expect(params[13]).toBe(0);
    });
  });

  describe('updateCatchOffline', () => {
    it('builds SET clauses for weight and notes', () => {
      const db = getMockDb();
      updateCatchOffline('c1', { weight_kg: 7.5, notes: 'updated' });

      expect(db.runSync).toHaveBeenCalledWith(
        expect.stringContaining('weight_kg = ?'),
        7.5,
        'updated',
        'c1',
      );
      expect(db.runSync.mock.calls[0][0]).toContain('notes = ?');
      expect(db.runSync.mock.calls[0][0]).toContain("local_updated_at = datetime('now')");
    });

    it('converts is_released boolean to 1/0', () => {
      const db = getMockDb();
      updateCatchOffline('c1', { is_released: true });

      const [sql, value, id] = db.runSync.mock.calls[0];
      expect(sql).toContain('is_released = ?');
      expect(value).toBe(1);
      expect(id).toBe('c1');
    });

    it('updates sync_status and synced fields', () => {
      const db = getMockDb();
      updateCatchOffline('c1', { sync_status: 'synced', synced: 1 });

      const sql = db.runSync.mock.calls[0][0];
      expect(sql).toContain('sync_status = ?');
      expect(sql).toContain('synced = ?');
    });

    it('does nothing when no updatable fields are provided', () => {
      const db = getMockDb();
      updateCatchOffline('c1', {});
      expect(db.runSync).not.toHaveBeenCalled();
    });
  });

  describe('deleteCatchOffline', () => {
    it('calls runSync with DELETE', () => {
      const db = getMockDb();
      deleteCatchOffline('c1');

      expect(db.runSync).toHaveBeenCalledWith(
        'DELETE FROM catches_offline WHERE id = ?',
        ['c1'],
      );
    });
  });

  describe('getCatchesOffline', () => {
    it('maps rows to OfflineCatch objects', () => {
      const db = getMockDb();
      const row = {
        id: 'c1',
        user_id: 'u1',
        species_id: 3,
        weight_kg: 2.5,
        length_cm: 40,
        photo_uri_local: 'l.jpg',
        photo_url: 'r.jpg',
        latitude: 1.1,
        longitude: 2.2,
        location_name: 'Lake',
        water_body: 'Lake X',
        caught_at: '2024-01-01',
        notes: 'n',
        is_released: 1,
        synced: 0,
        sync_status: 'pending',
        local_updated_at: '2024-01-01',
      };
      db.getAllSync.mockReturnValue([row]);

      const result = getCatchesOffline('u1');

      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('FROM catches_offline WHERE user_id = ?'),
        ['u1'],
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'c1',
        user_id: 'u1',
        species_id: 3,
        weight_kg: 2.5,
        length_cm: 40,
        photo_uri_local: 'l.jpg',
        photo_url: 'r.jpg',
        latitude: 1.1,
        longitude: 2.2,
        location_name: 'Lake',
        water_body: 'Lake X',
        caught_at: '2024-01-01',
        notes: 'n',
        is_released: 1,
        synced: 0,
        sync_status: 'pending',
        local_updated_at: '2024-01-01',
      });
    });

    it('returns empty array when no rows', () => {
      const db = getMockDb();
      db.getAllSync.mockReturnValue([]);
      expect(getCatchesOffline('u1')).toEqual([]);
    });
  });

  describe('getCatchOffline', () => {
    it('returns null for a missing catch', () => {
      const db = getMockDb();
      db.getAllSync.mockReturnValue([]);
      expect(getCatchOffline('missing')).toBeNull();
    });

    it('returns the mapped catch when found', () => {
      const db = getMockDb();
      db.getAllSync.mockReturnValue([
        {
          id: 'c1',
          user_id: 'u1',
          species_id: null,
          weight_kg: null,
          length_cm: null,
          photo_uri_local: null,
          photo_url: null,
          latitude: null,
          longitude: null,
          location_name: null,
          water_body: null,
          caught_at: '2024-01-01',
          notes: null,
          is_released: null,
          synced: 0,
          sync_status: 'pending',
          local_updated_at: '2024-01-01',
        },
      ]);

      const result = getCatchOffline('c1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('c1');
      expect(result?.caught_at).toBe('2024-01-01');
    });
  });

  describe('cacheSpecies', () => {
    it('uses a prepared statement and executes per species', () => {
      const db = getMockDb();
      cacheSpecies([
        {
          id: 1,
          common_name: 'Bass',
          scientific_name: 'M. salmoides',
          family: 'Centrarchidae',
          lw_a: 0.01,
          lw_b: 3.0,
          habitat: ['freshwater'],
          is_game_fish: true,
          conservation_status: 'LC',
        },
        {
          id: 2,
          common_name: 'Snook',
          scientific_name: 'C. undecimalis',
          family: null,
          lw_a: null,
          lw_b: null,
          habitat: null,
          is_game_fish: false,
          conservation_status: null,
        },
      ]);

      expect(db.prepareSync).toHaveBeenCalledTimes(1);
      expect(db.prepareSync.mock.calls[0][0]).toContain(
        'INSERT OR REPLACE INTO species_cache',
      );

      const stmt = db.prepareSync.mock.results[0].value;
      expect(stmt.executeSync).toHaveBeenCalledTimes(2);
      // habitat JSON-serialized, is_game_fish as 1/0
      expect(stmt.executeSync).toHaveBeenNthCalledWith(1, [
        1, 'Bass', 'M. salmoides', 'Centrarchidae', 0.01, 3.0,
        JSON.stringify(['freshwater']), 1, 'LC',
      ]);
      expect(stmt.executeSync).toHaveBeenNthCalledWith(2, [
        2, 'Snook', 'C. undecimalis', null, null, null, null, 0, null,
      ]);
    });
  });

  describe('searchSpeciesCache', () => {
    it('wraps the query in LIKE wildcards', () => {
      const db = getMockDb();
      db.getAllSync.mockReturnValue([]);
      searchSpeciesCache('bass');

      expect(db.getAllSync).toHaveBeenCalledWith(
        expect.stringContaining('common_name LIKE'),
        ['%bass%', '%bass%'],
      );
    });

    it('returns matched rows', () => {
      const db = getMockDb();
      const rows = [{ id: 1, common_name: 'Largemouth Bass', scientific_name: 'M.', family: 'C' }];
      db.getAllSync.mockReturnValue(rows);
      expect(searchSpeciesCache('bass')).toEqual(rows);
    });
  });

  describe('getPendingSyncCount', () => {
    it('returns the count from the COUNT query', () => {
      const db = getMockDb();
      db.getAllSync.mockReturnValue([{ count: 7 }]);
      expect(getPendingSyncCount()).toBe(7);
      expect(db.getAllSync).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM sync_queue',
      );
    });

    it('returns 0 when queue is empty', () => {
      const db = getMockDb();
      db.getAllSync.mockReturnValue([]);
      expect(getPendingSyncCount()).toBe(0);
    });
  });

  describe('enqueueSync', () => {
    it('inserts into sync_queue with JSON-stringified payload', () => {
      const db = getMockDb();
      enqueueSync('create', 'catches', 'c1', { foo: 'bar' });

      expect(db.runSync).toHaveBeenCalledWith(
        'INSERT INTO sync_queue (operation, table_name, record_id, payload) VALUES (?, ?, ?, ?)',
        ['create', 'catches', 'c1', JSON.stringify({ foo: 'bar' })],
      );
    });
  });

  describe('getSyncQueue', () => {
    it('queries ordered by created_at with limit 50', () => {
      const db = getMockDb();
      db.getAllSync.mockReturnValue([{ id: 1 }]);
      const result = getSyncQueue();

      expect(db.getAllSync).toHaveBeenCalledWith(
        'SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 50',
      );
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('removeSyncQueueItem', () => {
    it('deletes by id', () => {
      const db = getMockDb();
      removeSyncQueueItem(42);
      expect(db.runSync).toHaveBeenCalledWith(
        'DELETE FROM sync_queue WHERE id = ?',
        [42],
      );
    });
  });

  describe('incrementSyncRetry', () => {
    it('only increments when retry_count < 5 (guard in SQL)', () => {
      const db = getMockDb();
      incrementSyncRetry(9);

      expect(db.runSync).toHaveBeenCalledWith(
        'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ? AND retry_count < 5',
        [9],
      );
    });
  });

  describe('removeFailedSyncItems', () => {
    it('deletes items with retry_count >= 5', () => {
      const db = getMockDb();
      removeFailedSyncItems();
      expect(db.runSync).toHaveBeenCalledWith(
        'DELETE FROM sync_queue WHERE retry_count >= 5',
      );
    });
  });
});
