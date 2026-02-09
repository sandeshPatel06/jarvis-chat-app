import * as SQLite from 'expo-sqlite';


const DB_NAME = 'jarvis.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDb = async () => {
    if (dbInstance) return dbInstance;
    if (initPromise) return await initPromise;

    initPromise = (async () => {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        dbInstance = db;
        initPromise = null;
        return db;
    })();

    return await initPromise;
};

export const initDatabase = async () => {
    try {
        const db = await getDb();

        await db.execAsync('PRAGMA journal_mode = WAL;');

        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT,
                avatar TEXT,
                email TEXT,
                phone_number TEXT
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                name TEXT,
                avatar TEXT,
                last_message TEXT,
                last_message_time TEXT,
                unread_count INTEGER,
                user_id INTEGER,
                is_group INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT,
                sender TEXT,
                text TEXT,
                file TEXT,
                file_type TEXT,
                file_name TEXT,
                timestamp TEXT,
                is_read INTEGER,
                is_delivered INTEGER,
                reactions TEXT,
                reply_to_json TEXT,
                is_unsent INTEGER DEFAULT 0,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            );
        `);

        const migrations = [
            'ALTER TABLE messages ADD COLUMN file TEXT;',
            'ALTER TABLE messages ADD COLUMN file_type TEXT;',
            'ALTER TABLE messages ADD COLUMN file_name TEXT;',
            'ALTER TABLE conversations ADD COLUMN user_id INTEGER;',
            'ALTER TABLE conversations ADD COLUMN is_group INTEGER DEFAULT 0;',
        ];

        for (const query of migrations) {
            try {
                await db.execAsync(query);
            } catch (e) {
                // Column likely exists, ignore
            }
        }

        console.log('[SQLite] Database initialized successfully');
    } catch (error) {
        console.error('[SQLite] Initialization failed:', error);
    }
};

// Key-Value Store Helpers (Replacement for SecureStore where appropriate)
export const kv = {
    set: async (key: string, value: string) => {
        const db = await getDb();
        await db.runAsync('INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)', [key, value]);
    },
    get: async (key: string) => {
        const db = await getDb();
        const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', [key]);
        return result?.value || null;
    },
    delete: async (key: string) => {
        const db = await getDb();
        await db.runAsync('DELETE FROM kv_store WHERE key = ?', [key]);
    }
};

export const getTableStats = async () => {
    const db = await getDb();
    const tables = await db.getAllAsync<{ name: string }>('SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%"');

    const stats = [];
    for (const table of tables) {
        const countResult = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table.name}`);
        stats.push({ name: table.name, count: countResult?.count || 0 });
    }
    return stats;
};
