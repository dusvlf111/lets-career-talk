import { Fragment } from 'react';

const TOKEN_RE = /(https?:\/\/[^\s<]+)|(@[a-zA-Z0-9_]{3,20})|(`[^`\n]+`)|(\*\*[^*\n]+\*\*)/g;

/** 링크, @멘션, `코드`, **굵게** 정도만 지원하는 가벼운 포맷터 */
export function MessageBody({ text, myUsername }: { text: string; myUsername: string }) {
  return (
    <>
      {text.split('\n').map((line, i, lines) => (
        <Fragment key={i}>
          {formatLine(line, myUsername)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

function formatLine(line: string, me: string) {
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
      const isMe = mention.slice(1).toLowerCase() === me.toLowerCase();
      out.push(
        <span key={idx} className={`rounded px-0.5 ${isMe ? 'bg-point text-neutral-0' : 'bg-primary-10 text-primary'}`}>
          {mention}
        </span>,
      );
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

const AVATAR_COLORS = ['#e01e5a', '#36c5f0', '#2eb67d', '#ecb22e', '#611f69', '#1264a3', '#e8912d'];

export function Avatar({ name, id, size = 36 }: { name: string; id: string; size?: number }) {
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-md font-bold text-white"
      style={{ width: size, height: size, background: AVATAR_COLORS[hash % AVATAR_COLORS.length], fontSize: size * 0.42 }}
    >
      {name.slice(0, 1)}
    </div>
  );
}
