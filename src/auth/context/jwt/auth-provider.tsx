import type { AuthState } from '../../types';

import { useSetState } from 'minimal-shared/hooks';
import { useMemo, useEffect, useCallback } from 'react';

import axios, { endpoints, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from 'src/lib/axios';

import { setSession } from './utils';
import { AuthContext } from '../auth-context';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: Props) {
  const { state, setState } = useSetState<AuthState>({ user: null, loading: true });

  const checkUserSession = useCallback(async () => {
    try {
      const hasSession =
        sessionStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);

      if (!hasSession) {
        setState({ user: null, loading: false });
        return;
      }

      // The API client refreshes an expired access token transparently.
      const res = await axios.get(endpoints.auth.me);
      setState({ user: res.data, loading: false });
    } catch (error) {
      console.error(error);
      await setSession(null);
      setState({ user: null, loading: false });
    }
  }, [setState]);

  useEffect(() => {
    checkUserSession();
    const onExpired = () => setState({ user: null, loading: false });
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------------------------------------------------

  const checkAuthenticated = state.user ? 'authenticated' : 'unauthenticated';

  const status = state.loading ? 'loading' : checkAuthenticated;

  const memoizedValue = useMemo(
    () => ({
      user: state.user
        ? {
            ...state.user,
            displayName: state.user.name,
            photoURL: state.user.avatarUrl,
            role: state.user.role?.key ?? null,
            roleName: state.user.role?.name ?? null,
            permissions: (state.user.permissions as string[]) ?? [],
          }
        : null,
      checkUserSession,
      loading: status === 'loading',
      authenticated: status === 'authenticated',
      unauthenticated: status === 'unauthenticated',
    }),
    [checkUserSession, state.user, status]
  );

  return <AuthContext value={memoizedValue}>{children}</AuthContext>;
}
