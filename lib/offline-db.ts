import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export interface OfflineCatch {
  id: string;
  user_id: string;
  species_id: number | null;
  weight_kg: number | null;
  length_cm: number | null;
  photo_uri_local: string | null;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  water_body: string | null;
  caught_at: string;
  notes: string | null;
  is_released: boolean | null;
  synced: number;
  sync_status: 'pending' | 'syncing' | 'synced' | 'conflict';
  local_updated_at: string;
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('fishbook.db');
    initSchema();
  }
  return db;
}

function initSchema() {
  if (!db) return;
  db.execSync(`
    CREATE TABLE IF NOT EXISTS catches_offline (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      species_id INTEGER,
      weight_kg REAL,
      length_cm REAL,
      photo_uri_local TEXT,
      photo_url TEXT,
      latitude REAL,
      longitude REAL,
      location_name TEXT,
      water_body TEXT,
      caught_at TEXT NOT NULL,
      notes TEXT,
      is_released INTEGER,
      synced INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending',
      local_updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS species_cache (
      id INTEGER PRIMARY KEY,
      common_name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      family TEXT,
      lw_a REAL,
      lw_b REAL,
      habitat TEXT,
      is_game_fish INTEGER,
      conservation_status TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      retry_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_catches_offline_synced ON catches_offline(synced);
    CREATE INDEX IF NOT EXISTS idx_catches_offline_user ON catches_offline(user_id);
    CREATE INDEX IF NOT EXISTS idx_species_cache_name ON species_cache(common_name);
  `);
}

// Offline catch CRUD
export function insertCatchOffline(catchData: Omit<OfflineCatch, 'synced' | 'sync_status' | 'local_updated_at'>) {
  const d = getDb();
  d.runSync(
    `INSERT OR REPLACE INTO catches_offline (id, user_id, species_id, weight_kg, length_cm, photo_uri_local, photo_url, latitude, longitude, location_name, water_body, caught_at, notes, is_released, synced, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
    [
      catchData.id,
      catchData.user_id,
      catchData.species_id,
      catchData.weight_kg,
      catchData.length_cm,
      catchData.photo_uri_local,
      catchData.photo_url,
      catchData.latitude,
      catchData.longitude,
      catchData.location_name,
      catchData.water_body,
      catchData.caught_at,
      catchData.notes,
      catchData.is_released ? 1 : 0,
    ],
  );
}

export function updateCatchOffline(id: string, updates: Partial<OfflineCatch>) {
  const d = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.weight_kg !== undefined) { fields.push('weight_kg = ?'); values.push(updates.weight_kg); }
  if (updates.length_cm !== undefined) { fields.push('length_cm = ?'); values.push(updates.length_cm); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }
  if (updates.is_released !== undefined) { fields.push('is_released = ?'); values.push(updates.is_released ? 1 : 0); }
  if (updates.sync_status !== undefined) { fields.push('sync_status = ?'); values.push(updates.sync_status); }
  if (updates.synced !== undefined) { fields.push('synced = ?'); values.push(updates.synced); }
  if (updates.photo_url !== undefined) { fields.push('photo_url = ?'); values.push(updates.photo_url); }

  if (fields.length === 0) return;
  fields.push("local_updated_at = datetime('now')");
  values.push(id);

  d.runSync(
    `UPDATE catches_offline SET ${fields.join(', ')} WHERE id = ?`,
    ...(values as any[]),
  );
}

export function deleteCatchOffline(id: string) {
  const d = getDb();
  d.runSync('DELETE FROM catches_offline WHERE id = ?', [id]);
}

export function getCatchesOffline(userId: string): OfflineCatch[] {
  const d = getDb();
  const result = d.getAllSync<Record<string, unknown>>(
    'SELECT * FROM catches_offline WHERE user_id = ? ORDER BY caught_at DESC',
    [userId],
  );
  return result.map(rowToCatch);
}

export function getCatchOffline(id: string): OfflineCatch | null {
  const d = getDb();
  const result = d.getAllSync<Record<string, unknown>>(
    'SELECT * FROM catches_offline WHERE id = ?',
    [id],
  );
  return result.length > 0 ? rowToCatch(result[0]) : null;
}

function rowToCatch(row: Record<string, unknown>): OfflineCatch {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    species_id: row.species_id as number | null,
    weight_kg: row.weight_kg as number | null,
    length_cm: row.length_cm as number | null,
    photo_uri_local: row.photo_uri_local as string | null,
    photo_url: row.photo_url as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    location_name: row.location_name as string | null,
    water_body: row.water_body as string | null,
    caught_at: row.caught_at as string,
    notes: row.notes as string | null,
    is_released: row.is_released as boolean | null,
    synced: row.synced as number,
    sync_status: row.sync_status as OfflineCatch['sync_status'],
    local_updated_at: row.local_updated_at as string,
  };
}

// Species cache
export function cacheSpecies(species: Array<{
  id: number;
  common_name: string;
  scientific_name: string;
  family: string | null;
  lw_a: number | null;
  lw_b: number | null;
  habitat: string[] | null;
  is_game_fish: boolean | null;
  conservation_status: string | null;
}>) {
  const d = getDb();
  const insert = d.prepareSync(
    `INSERT OR REPLACE INTO species_cache (id, common_name, scientific_name, family, lw_a, lw_b, habitat, is_game_fish, conservation_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const s of species) {
    insert.executeSync([
      s.id,
      s.common_name,
      s.scientific_name,
      s.family,
      s.lw_a,
      s.lw_b,
      s.habitat ? JSON.stringify(s.habitat) : null,
      s.is_game_fish ? 1 : 0,
      s.conservation_status,
    ]);
  }
}

export function searchSpeciesCache(query: string) {
  const d = getDb();
  return d.getAllSync<Record<string, unknown>>(
    `SELECT id, common_name, scientific_name, family
     FROM species_cache
     WHERE common_name LIKE ? OR scientific_name LIKE ?
     LIMIT 30`,
    [`%${query}%`, `%${query}%`],
  );
}

export function getPendingSyncCount(): number {
  const d = getDb();
  const result = d.getAllSync<Record<string, unknown>>(
    "SELECT COUNT(*) as count FROM sync_queue",
  );
  return (result[0]?.count as number) ?? 0;
}

// Sync queue
export function enqueueSync(operation: string, tableName: string, recordId: string, payload: Record<string, unknown>) {
  const d = getDb();
  d.runSync(
    'INSERT INTO sync_queue (operation, table_name, record_id, payload) VALUES (?, ?, ?, ?)',
    [operation, tableName, recordId, JSON.stringify(payload)],
  );
}

export function getSyncQueue() {
  const d = getDb();
  return d.getAllSync<Record<string, unknown>>(
    'SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 50',
  );
}

export function removeSyncQueueItem(id: number) {
  const d = getDb();
  d.runSync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

export function incrementSyncRetry(id: number) {
  const d = getDb();
  d.runSync(
    'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ? AND retry_count < 5',
    [id],
  );
}

export function removeFailedSyncItems() {
  const d = getDb();
  d.runSync('DELETE FROM sync_queue WHERE retry_count >= 5');
}

// Initialize DB on import
getDb();
