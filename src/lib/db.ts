import 'server-only';

import { createClient, type Client, type InValue } from '@libsql/client';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT NOT NULL CHECK (type IN ('public', 'dm')),
    topic TEXT NOT NULL DEFAULT '',
    dm_key TEXT UNIQUE,
    created_by TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS channels_public_name
    ON channels(name) WHERE type = 'public'`,
  `CREATE TABLE IF NOT EXISTS channel_members (
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    last_read_at INTEGER NOT NULL DEFAULT 0,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (channel_id, user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS channel_members_user ON channel_members(user_id)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    parent_id TEXT,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    edited_at INTEGER,
    deleted_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS messages_channel
    ON messages(channel_id, parent_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS messages_parent ON messages(parent_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    url TEXT NOT NULL,
    name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS attachments_message ON attachments(message_id)`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS reactions (
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (message_id, user_id, emoji)
  )`,
];

const DEFAULT_CHANNELS = [
  { id: 'general', name: '공지', topic: '운영진 공지 채널입니다.' },
  { id: 'free', name: '자유', topic: '자유롭게 이야기해요.' },
  { id: 'qna', name: '질문', topic: '궁금한 점을 물어보세요.' },
];

let client: Client | null = null;
let ready: Promise<void> | null = null;

function getClient() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL ?? 'file:local.db';
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return client;
}

/** 나중에 추가된 컬럼. 이미 있으면 실패하므로 하나씩 시도한다 */
const ADDED_COLUMNS = [
  `ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'`,
  `ALTER TABLE users ADD COLUMN deactivated_at INTEGER`,
];

const MIGRATIONS = [
  // 예전 관리자(is_admin=1) → admin, 그중 가장 먼저 가입한 사람 → owner
  `UPDATE users SET role = 'admin' WHERE is_admin = 1 AND role = 'member'`,
  `UPDATE users SET role = 'owner'
     WHERE id = (SELECT id FROM users WHERE role IN ('owner', 'admin') ORDER BY created_at LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'owner')`,
];

async function init(db: Client) {
  await db.batch(SCHEMA, 'write');
  for (const sql of ADDED_COLUMNS) {
    await db.execute(sql).catch(() => {});
  }
  await db.batch(MIGRATIONS, 'write');
  const now = Date.now();
  await db.batch(
    DEFAULT_CHANNELS.map((c) => ({
      sql: `INSERT OR IGNORE INTO channels (id, name, type, topic, created_at)
            VALUES (?, ?, 'public', ?, ?)`,
      args: [c.id, c.name, c.topic, now],
    })),
    'write',
  );
}

/** 콜드 스타트마다 한 번 스키마를 보장한 뒤 클라이언트를 돌려준다. */
export async function db() {
  const c = getClient();
  if (!ready) {
    ready = init(c).catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return c;
}

export async function all<T>(sql: string, args: InValue[] = []) {
  const res = await (await db()).execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function one<T>(sql: string, args: InValue[] = []) {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}

export const DEFAULT_CHANNEL_IDS = DEFAULT_CHANNELS.map((c) => c.id);
