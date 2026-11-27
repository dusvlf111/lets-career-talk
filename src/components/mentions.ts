import type { Member } from './api';

/**
 * 멘션 저장 형식: <@userId>  (아이디가 화면에 노출되지 않고, 이름이 바뀌어도 유지됨)
 * 화면/입력창 형식: @표시이름
 */
export const STORED_MENTION_RE = /<@([\w-]+)>/g;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 저장된 본문 → 사람이 읽는 본문 (<@id> → @이름) */
export function toDisplayText(text: string, users: Member[]) {
  const byId = new Map(users.map((u) => [u.id, u.display_name]));
  return text.replace(STORED_MENTION_RE, (raw, id: string) => {
    const name = byId.get(id);
    return name ? `@${name}` : raw;
  });
}

/**
 * 입력한 본문 → 저장할 본문 (@이름 → <@id>)
 * picked: 자동완성으로 고른 이름→id (동명이인일 때 우선), 그 외엔 이름이 정확히 같은 사람
 */
export function toStoredText(text: string, users: Member[], picked: Map<string, string> = new Map()) {
  const candidates = new Map<string, string>();
  for (const u of users) if (!candidates.has(u.display_name)) candidates.set(u.display_name, u.id);
  for (const [name, id] of picked) candidates.set(name, id);

  // 긴 이름부터 바꿔야 '김철'과 '김철수'가 섞이지 않는다
  const names = [...candidates.keys()].sort((a, b) => b.length - a.length);
  if (names.length === 0) return text;
  const re = new RegExp(`@(${names.map(escapeRegExp).join('|')})(?=$|[\\s.,!?)\\]])`, 'g');
  return text.replace(re, (_, name: string) => `<@${candidates.get(name)}>`);
}
