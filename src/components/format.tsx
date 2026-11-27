import { Fragment } from 'react';

import type { Member } from './api';

const TOKEN_RE = /(https?:\/\/[^\s<]+)|(<@[\w-]+>)|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)/g;

type MentionCtx = { meId: string; byId: Map<string, Member> };

/** 링크, @멘션, `코드`, **굵게** 정도만 지원하는 가벼운 포맷터 */
export function MessageBody({ text, meId, users }: { text: string; meId: string; users: Member[] }) {
  const ctx: MentionCtx = {
    meId,
    byId: new Map(users.map((u) => [u.id, u])),
  };
  return (
    <>
      {text.split('\n').map((line, i, lines) => (
        <Fragment key={i}>
          {formatLine(line, ctx)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

function formatLine(line: string, ctx: MentionCtx) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(line.slice(last, idx));
    const [token, url, mention, code, bold] = m;
    if (url) {
      out.push(
        <a key={idx} href={url} target="_blank" rel="noreferrer noopener" className="break-all text-primary hover:underline">
          {url}
        </a>,
      );
    } else if (mention) {
      // <@id> → @이름 (아이디는 화면에 노출하지 않는다)
      const user = ctx.byId.get(mention.slice(2, -1));
      if (!user) {
        out.push('@알 수 없음');
      } else {
        const isMe = user.id === ctx.meId;
        out.push(
          <span key={idx} className={`rounded-xxs px-0.5 font-medium ${isMe ? 'bg-point text-neutral-0' : 'bg-primary-10 text-primary'}`}>
            @{user.display_name}
          </span>,
        );
      }
    } else if (code) {
      out.push(
        <code key={idx} className="rounded border border-neutral-80 bg-neutral-90 px-1 text-[13px] text-requirement">
          {code.slice(1, -1)}
        </code>,
      );
    } else if (bold) {
      out.push(<strong key={idx}>{bold.slice(2, -2)}</strong>);
    } else {
      out.push(token);
    }
    last = idx + token.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
}

export function isSameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

const AVATAR_COLORS = ['#4D55F5', '#757BFF', '#1BC47D', '#00A8EB', '#CB81F2', '#FC5555', '#4138A3'];

export function Avatar({ name, id, size = 36 }: { name: string; id: string; size?: number }) {
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: AVATAR_COLORS[hash % AVATAR_COLORS.length], fontSize: size * 0.42 }}
    >
      {name.slice(0, 1)}
    </div>
  );
}
