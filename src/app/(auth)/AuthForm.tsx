'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';

import { login, signup, type AuthState } from './actions';

const COHORT = process.env.NEXT_PUBLIC_COHORT_NAME ?? '렛츠커리어';

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

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isSignup ? signup : login,
    undefined,
  );
  const fields = isSignup ? SIGNUP_FIELDS : LOGIN_FIELDS;

  // 세션 쿠키가 생긴 뒤 전체 새로고침으로 이동해 미들웨어/캐시 상태를 깨끗하게 한다
  useEffect(() => {
    if (state?.ok) window.location.replace('/c/general');
  }, [state]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#3f0e40] p-4">
      <form
        action={action}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold">{COHORT} 톡방</h1>
          <p className="text-sm text-neutral-500">
            {isSignup ? '입장 암호로 가입하고 함께 이야기해요' : '다시 오신 걸 환영해요'}
          </p>
        </div>
        {fields.map((f) => (
          <label key={f.name} className="block space-y-1">
            <span className="text-sm font-medium">{f.label}</span>
            <input
              name={f.name}
              type={f.type ?? 'text'}
              placeholder={f.placeholder}
              required
              autoComplete={f.type === 'password' ? (isSignup ? 'new-password' : 'current-password') : 'username'}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-[#611f69] focus:ring-2 focus:ring-[#611f69]/20"
            />
          </label>
        ))}
        {state?.error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {state.error}
          </p>
        )}
        <button
          disabled={pending}
          className="w-full rounded-md bg-[#611f69] py-2.5 font-semibold text-white hover:bg-[#4a154b] disabled:opacity-60"
        >
          {pending || state?.ok ? '처리 중…' : isSignup ? '가입하기' : '로그인'}
        </button>
        <p className="text-center text-sm text-neutral-500">
          {isSignup ? '이미 계정이 있나요? ' : '처음이신가요? '}
          <Link href={isSignup ? '/login' : '/signup'} className="font-medium text-[#611f69] underline">
            {isSignup ? '로그인' : '회원가입'}
          </Link>
        </p>
      </form>
    </main>
  );
}
