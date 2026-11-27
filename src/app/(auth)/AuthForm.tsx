'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';

import { login, signup, type AuthState } from './actions';


type Field = { name: string; label: string; type?: string; placeholder?: string };

const SIGNUP_FIELDS: Field[] = [
  { name: 'username', label: '아이디', placeholder: '영문/숫자/_ 3~20자' },
  { name: 'displayName', label: '이름', placeholder: '톡방에 표시될 이름' },
  { name: 'password', label: '비밀번호', type: 'password', placeholder: '8자 이상' },
  { name: 'inviteCode', label: '입장 암호', type: 'password', placeholder: '운영진에게 받은 암호' },
];

const LOGIN_FIELDS: Field[] = [
  { name: 'username', label: '아이디' },
  { name: 'password', label: '비밀번호', type: 'password' },
];

export default function AuthForm({ mode, workspaceName }: { mode: 'login' | 'signup'; workspaceName: string }) {
  const isSignup = mode === 'signup';
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isSignup ? signup : login,
    undefined,
  );
  const fields = isSignup ? SIGNUP_FIELDS : LOGIN_FIELDS;

  // 세션 쿠키가 생긴 뒤 전체 새로고침으로 이동해 미들웨어/캐시 상태를 깨끗하게 한다
  useEffect(() => {
    if (state?.ok) window.location.replace('/c');
  }, [state]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-100 px-4 py-10">
      <form
        action={action}
        className="w-full max-w-[400px] rounded-lg bg-white px-6 py-10 md:border md:border-neutral-80 md:px-10 md:shadow-02"
      >
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="렛츠커리어" className="mx-auto mb-5 h-8" />
          <h1 className="text-small20 font-bold text-neutral-0">{workspaceName} 톡방</h1>
          <p className="mt-1 text-xsmall14 text-neutral-40">
            {isSignup ? '운영진에게 받은 입장 암호로 가입해요' : '다시 오신 걸 환영해요'}
          </p>
        </div>
        <div className="space-y-4">
          {fields.map((f) => (
            <label key={f.name} className="block space-y-1.5">
              <span className="text-xsmall14 font-semibold text-neutral-10">{f.label}</span>
              <input
                name={f.name}
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                required
                autoComplete={f.type === 'password' ? (isSignup ? 'new-password' : 'current-password') : 'username'}
                className="w-full rounded-md bg-neutral-95 p-3 text-xsmall16 text-neutral-0 md:text-xsmall14 outline-none ring-primary placeholder:text-neutral-50 focus:ring-1"
              />
            </label>
          ))}
        </div>
        {state?.error && (
          <p role="alert" className="mt-4 text-xsmall14 text-system-error">
            {state.error}
          </p>
        )}
        <button
          disabled={pending || state?.ok}
          className="mt-6 flex w-full items-center justify-center rounded-xs bg-primary py-3 text-xsmall16 font-medium text-white hover:bg-primary-hover disabled:bg-neutral-70"
        >
          {pending || state?.ok ? '처리 중…' : isSignup ? '가입하기' : '로그인'}
        </button>
        <p className="mt-5 text-center text-xsmall14 text-neutral-40">
          {isSignup ? '이미 계정이 있나요? ' : '처음이신가요? '}
          <Link href={isSignup ? '/login' : '/signup'} className="font-semibold text-primary hover:underline">
            {isSignup ? '로그인' : '회원가입'}
          </Link>
        </p>
      </form>
    </main>
  );
}
