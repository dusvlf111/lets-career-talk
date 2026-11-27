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

// 한글 호환 자모(ㄱ~ㅎ) → 초성 결합 자모. "@ㅂ"이나 조합 중인 "@바"로도 "밥"을 찾기 위함
const COMPAT_TO_CHOSEONG: Record<string, string> = {
  ㄱ: '\u1100', ㄲ: '\u1101', ㄴ: '\u1102', ㄷ: '\u1103', ㄸ: '\u1104', ㄹ: '\u1105', ㅁ: '\u1106',
  ㅂ: '\u1107', ㅃ: '\u1108', ㅅ: '\u1109', ㅆ: '\u110A', ㅇ: '\u110B', ㅈ: '\u110C', ㅉ: '\u110D',
  ㅊ: '\u110E', ㅋ: '\u110F', ㅌ: '\u1110', ㅍ: '\u1111', ㅎ: '\u1112',
};

function normalize(s: string) {
  return [...s.toLowerCase()].map((c) => COMPAT_TO_CHOSEONG[c] ?? c).join('').normalize('NFD');
}

/** 이름에 검색어가 포함되는지 (한글 부분 입력 포함) */
export function matchesName(name: string, query: string) {
  if (!query) return true;
  return normalize(name).includes(normalize(query));
}
