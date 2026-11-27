import { getSettings } from '@/lib/settings';

import AuthForm from '../AuthForm';

// 워크스페이스 이름은 관리자 설정에서 바뀔 수 있으므로 요청마다 읽는다
export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  const { workspace_name } = await getSettings();
  return <AuthForm mode="signup" workspaceName={workspace_name} />;
}
