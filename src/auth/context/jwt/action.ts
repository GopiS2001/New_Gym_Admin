import axios, { endpoints, REFRESH_TOKEN_KEY } from 'src/lib/axios';

import { setSession } from './utils';

// ----------------------------------------------------------------------

export type SignInParams = {
  email: string;
  password: string;
};

/** Admin sign in — member accounts are rejected by the API. */
export const signInWithPassword = async ({ email, password }: SignInParams): Promise<void> => {
  const res = await axios.post(endpoints.auth.signIn, { email, password });
  const { accessToken, refreshToken } = res.data;
  if (!accessToken) throw new Error('Access token not found in response');
  await setSession(accessToken, refreshToken);
};

export const signOut = async (): Promise<void> => {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  try {
    if (refreshToken) await axios.post(endpoints.auth.logout, { refreshToken });
  } catch {
    // Ignore network errors — the local session is cleared regardless.
  }
  await setSession(null);
};

// ----------------------------------------------------------------------

export type SignUpParams = { email: string; password: string; firstName: string; lastName: string };

/** Admin self-registration is disabled: admins are invited by a Super Admin. */
export const signUp = async (_params: SignUpParams): Promise<void> => {
  throw new Error('Admin accounts are created by a Super Admin.');
};
