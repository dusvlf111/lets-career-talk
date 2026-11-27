import 'server-only';

import { after } from 'next/server';

import { HttpError, type User } from './auth';
import { all, db, one, run } from './db';
import { publish } from './realtime';

export const MESSAGE_PAGE_SIZE = 50;
/** 공지 채널: 새 글은 관리자만, 스레드 답글은 누구나 */
export const ANNOUNCEMENT_CHANNEL_ID = 'general';
export const MAX_MESSAGE_LENGTH = 4000;

export type Channel = {
  id: string;
  name: string | null;
  type: 'public' | 'dm';
  topic: string;
};

export type MessageRow = {
  id: string;
  channel_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: number;
  edited_at: number | null;
  deleted_at: number | null;
  username: string;
  display_name: string;
  reply_count: number;
  last_reply_at: number | null;
};

export type Reaction = { emoji: string; count: number; mine: boolean };
export type Attachment = {
  id: string;
  url: string;
  name: string;
  content_type: string;
  size: number;
};
export type AttachmentInput = Omit<Attachment, 'id'>;
export type Message = MessageRow & { reactions: Reaction[]; attachments: Attachment[] };

export const MAX_ATTACHMENTS = 10;

/** 우리 Blob 스토어에 올라간 파일인지 확인 (토큰: vercel_blob_rw_{storeId}_{secret}) */
function isOwnBlobUrl(url: string) {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split('_')[3]?.toLowerCase();
  if (!storeId) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === `${storeId}.public.blob.vercel-storage.com`;
  } catch {
    return false;
  }
}

export function newId() {
  return crypto.randomUUID();
}

export async function getChannel(channelId: string) {
  return one<Channel>('SELECT id, name, type, topic FROM channels WHERE id = ?', [
    channelId,
  ]);
}

/** 읽기 권한: 공개 채널은 누구나, DM은 멤버만 */
export async function assertCanRead(user: User, channelId: string) {
  const channel = await getChannel(channelId);
  if (!channel) throw new HttpError(404, '채널을 찾을 수 없습니다.');
  if (channel.type === 'dm') {
    const member = await one(
      'SELECT 1 FROM channel_members WHERE channel_id = ? AND user_id = ?',
      [channelId, user.id],
    );
    if (!member) throw new HttpError(403, '접근 권한이 없습니다.');
  }
  return channel;
}

/** 쓰기 권한: 공개 채널은 글을 쓰면 자동으로 참여 처리 */
export async function assertCanWrite(user: User, channelId: string) {
  const channel = await assertCanRead(user, channelId);
  if (channel.type === 'public') await joinChannel(user.id, channelId);
  return channel;
}

export async function joinChannel(userId: string, channelId: string) {
  await run(
    `INSERT OR IGNORE INTO channel_members (channel_id, user_id, last_read_at, joined_at)
     VALUES (?, ?, ?, ?)`,
    [channelId, userId, Date.now(), Date.now()],
  );
}

const MESSAGE_SELECT = `
  SELECT m.id, m.channel_id, m.user_id, m.parent_id, m.body, m.created_at,
         m.edited_at, m.deleted_at, u.username, u.display_name,
         (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id AND r.deleted_at IS NULL) AS reply_count,
         (SELECT MAX(created_at) FROM messages r WHERE r.parent_id = m.id AND r.deleted_at IS NULL) AS last_reply_at
  FROM messages m JOIN users u ON u.id = m.user_id`;

async function attachReactions(user: User, rows: MessageRow[]): Promise<Message[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const reactions = await all<{
    message_id: string;
    emoji: string;
    count: number;
    mine: number;
  }>(
    `SELECT message_id, emoji, COUNT(*) AS count,
            MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine
     FROM reactions WHERE message_id IN (${placeholders})
     GROUP BY message_id, emoji ORDER BY MIN(created_at)`,
    [user.id, ...ids],
  );
  const byMessage = new Map<string, Reaction[]>();
  for (const r of reactions) {
    const list = byMessage.get(r.message_id) ?? [];
    list.push({ emoji: r.emoji, count: Number(r.count), mine: Number(r.mine) === 1 });
    byMessage.set(r.message_id, list);
  }
  const files = await all<Attachment & { message_id: string }>(
    `SELECT id, message_id, url, name, content_type, size FROM attachments
     WHERE message_id IN (${placeholders}) ORDER BY created_at`,
    ids,
  );
  const filesByMessage = new Map<string, Attachment[]>();
  for (const { message_id, ...f } of files) {
    const list = filesByMessage.get(message_id) ?? [];
    list.push({ ...f, size: Number(f.size) });
    filesByMessage.set(message_id, list);
  }
  return rows.map((r) => ({
    ...r,
    reply_count: Number(r.reply_count),
    body: r.deleted_at ? '' : r.body,
    reactions: byMessage.get(r.id) ?? [],
    attachments: r.deleted_at ? [] : (filesByMessage.get(r.id) ?? []),
  }));
}

export async function listMessages(user: User, channelId: string, before?: number) {
  const rows = await all<MessageRow>(
    `${MESSAGE_SELECT}
     WHERE m.channel_id = ? AND m.parent_id IS NULL
       AND (m.deleted_at IS NULL OR EXISTS (SELECT 1 FROM messages r WHERE r.parent_id = m.id AND r.deleted_at IS NULL))
       AND m.created_at < ?
     ORDER BY m.created_at DESC LIMIT ?`,
    [channelId, before ?? Number.MAX_SAFE_INTEGER, MESSAGE_PAGE_SIZE],
  );
  return attachReactions(user, rows.reverse());
}

export async function getMessage(user: User, messageId: string) {
  const row = await one<MessageRow>(`${MESSAGE_SELECT} WHERE m.id = ?`, [messageId]);
  if (!row) return null;
  const [message] = await attachReactions(user, [row]);
  return message;
}

export async function listThread(user: User, parentId: string) {
  const rows = await all<MessageRow>(
    `${MESSAGE_SELECT} WHERE m.parent_id = ? AND m.deleted_at IS NULL
     ORDER BY m.created_at ASC`,
    [parentId],
  );
  return attachReactions(user, rows);
}

export async function createMessage(
  user: User,
  channel: Channel,
  body: string,
  parentId: string | null,
  attachments: AttachmentInput[] = [],
) {
  const text = body.trim();
  if (!text && attachments.length === 0) throw new HttpError(400, '메시지를 입력해주세요.');
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new HttpError(400, `파일은 한 번에 ${MAX_ATTACHMENTS}개까지 보낼 수 있어요.`);
  }
  if (attachments.some((a) => !isOwnBlobUrl(a.url))) {
    throw new HttpError(400, '잘못된 첨부파일입니다.');
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `메시지는 ${MAX_MESSAGE_LENGTH}자까지 입력할 수 있어요.`);
  }
  if (channel.id === ANNOUNCEMENT_CHANNEL_ID && !parentId && Number(user.is_admin) !== 1) {
    throw new HttpError(403, '공지 채널에는 운영진만 글을 쓸 수 있어요. 스레드로 답글을 남겨주세요.');
  }
  if (parentId) {
    const parent = await one<{ channel_id: string; parent_id: string | null }>(
      'SELECT channel_id, parent_id FROM messages WHERE id = ?',
      [parentId],
    );
    if (!parent || parent.channel_id !== channel.id || parent.parent_id) {
      throw new HttpError(400, '잘못된 스레드입니다.');
    }
  }
  const id = newId();
  const now = Date.now();
  const files: Attachment[] = attachments.map((a) => ({
    id: newId(),
    url: a.url,
    name: a.name.slice(0, 200),
    content_type: a.content_type.slice(0, 100),
    size: a.size,
  }));
  // 쓰기는 한 번의 왕복(batch)으로 처리
  await (await db()).batch(
    [
      {
        sql: `INSERT INTO messages (id, channel_id, user_id, parent_id, body, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, channel.id, user.id, parentId, text, now],
      },
      ...files.map((f) => ({
        sql: `INSERT INTO attachments (id, message_id, url, name, content_type, size, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [f.id, id, f.url, f.name, f.content_type, f.size, now],
      })),
      // 공개 채널에 처음 글을 쓰면 자동 참여, 내 글은 읽음 처리
      {
        sql: `INSERT INTO channel_members (channel_id, user_id, last_read_at, joined_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT (channel_id, user_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
        args: [channel.id, user.id, now, now],
      },
    ],
    'write',
  );
  // 방금 쓴 값으로 바로 메시지를 만든다 (다시 조회하지 않음)
  const message: Message = {
    id,
    channel_id: channel.id,
    user_id: user.id,
    parent_id: parentId,
    body: text,
    created_at: now,
    edited_at: null,
    deleted_at: null,
    username: user.username,
    display_name: user.display_name,
    reply_count: 0,
    last_reply_at: null,
    reactions: [],
    attachments: files,
  };
  after(() =>
    publish(
      { type: 'message.created', channelId: channel.id, message },
      { kind: channel.type, channelId: channel.id },
    ),
  );
  return message;
}

export function notifyReaction(
  channel: Pick<Channel, 'id' | 'type'>,
  event: { messageId: string; parentId: string | null; emoji: string; userId: string; added: boolean },
) {
  after(() =>
    publish({ type: 'reaction', channelId: channel.id, ...event }, { kind: channel.type, channelId: channel.id }),
  );
}

/** 실시간 알림은 응답을 보낸 뒤에 발행해서 사용자 대기 시간에 포함되지 않게 한다 */
export async function notifyMessage(
  channel: Pick<Channel, 'id' | 'type'>,
  messageId: string,
  parentId: string | null,
) {
  after(() =>
    publish(
      { type: 'message', channelId: channel.id, messageId, parentId },
      { kind: channel.type, channelId: channel.id },
    ),
  );
}

/** 사이드바용: 내가 참여한 공개 채널 + 전체 공개 채널 + DM + 안 읽은 수 */
export async function sidebar(user: User) {
  const channels = await all<
    Channel & { joined: number; unread: number; mention: number; dm_user_id: string | null; dm_name: string | null }
  >(
    `SELECT c.id, c.name, c.type, c.topic,
            CASE WHEN cm.user_id IS NULL THEN 0 ELSE 1 END AS joined,
            CASE WHEN cm.user_id IS NULL THEN 0 ELSE (
              SELECT COUNT(*) FROM messages m
              WHERE m.channel_id = c.id AND m.parent_id IS NULL AND m.deleted_at IS NULL
                AND m.user_id != ? AND m.created_at > cm.last_read_at
            ) END AS unread,
            CASE WHEN cm.user_id IS NULL THEN 0 ELSE (
              SELECT COUNT(*) FROM messages m
              WHERE m.channel_id = c.id AND m.deleted_at IS NULL AND m.user_id != ?
                AND m.created_at > cm.last_read_at AND m.body LIKE ?
            ) END AS mention,
            other.id AS dm_user_id, other.display_name AS dm_name
     FROM channels c
     LEFT JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = ?
     LEFT JOIN channel_members om ON c.type = 'dm' AND om.channel_id = c.id AND om.user_id != ?
     LEFT JOIN users other ON other.id = om.user_id
     WHERE c.type = 'public' OR cm.user_id IS NOT NULL
     ORDER BY c.created_at ASC`,
    [user.id, user.id, `%@${user.username}%`, user.id, user.id],
  );
  return channels.map((c) => ({
    ...c,
    joined: Number(c.joined) === 1,
    unread: Number(c.unread),
    mention: Number(c.mention),
  }));
}
