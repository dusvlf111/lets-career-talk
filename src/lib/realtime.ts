import 'server-only';

import { createHttpClient, type PubSubHttpClient } from '@ably/pubsub-server';

import { all } from './db';

let rest: PubSubHttpClient | null = null;

export function ablyRest() {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  rest ??= createHttpClient({ key });
  return rest;
}

export type RealtimeEvent =
  | { type: 'message'; channelId: string; messageId: string; parentId: string | null }
  | { type: 'channels' };

/**
 * 채널 이벤트를 발행한다.
 * - 공개 채널: pub:{channelId}
 * - DM: 멤버 각자의 user:{userId} (다른 사람이 구독할 수 없도록)
 * - 채널 목록 변경: global
 */
export async function publish(
  event: RealtimeEvent,
  target: { kind: 'public' | 'dm' | 'global'; channelId?: string },
) {
  const client = ablyRest();
  if (!client) return;
  try {
    if (target.kind === 'global') {
      await client.channels.get('global').publish('event', event);
      return;
    }
    if (target.kind === 'public') {
      await client.channels.get(`pub:${target.channelId}`).publish('event', event);
      return;
    }
    const members = await all<{ user_id: string }>(
      'SELECT user_id FROM channel_members WHERE channel_id = ?',
      [target.channelId!],
    );
    await Promise.all(
      members.map((m) =>
        client.channels.get(`user:${m.user_id}`).publish('event', event),
      ),
    );
  } catch (e) {
    console.error('Ably publish 실패', e);
  }
}
