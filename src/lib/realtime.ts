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

/**
 * - message.created: 메시지 전체를 실어 보내 받는 쪽이 다시 조회하지 않게 한다
 * - reaction: 변경분만 보낸다 (mine 여부는 받는 쪽에서 계산)
 * - message: 수정/삭제 등은 해당 목록만 다시 조회
 */
export type RealtimeEvent =
  | { type: 'message.created'; channelId: string; message: unknown }
  | {
      type: 'reaction';
      channelId: string;
      messageId: string;
      parentId: string | null;
      emoji: string;
      userId: string;
      added: boolean;
    }
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
