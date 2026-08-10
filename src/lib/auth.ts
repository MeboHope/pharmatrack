import { Session, User } from '@supabase/supabase-js';
import { UserAccount } from '../types';
import { supabase } from './supabase';

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserAccount['role'];
  created_at: string;
}

const toUserAccount = (row: ProfileRow, isVerified: boolean): UserAccount => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone ?? undefined,
  role: row.role,
  isVerified,
  createdAt: row.created_at.slice(0, 10),
});

/**
 * Loads the profile row for a signed in auth user. The profile is created by a
 * database trigger on signup, but a freshly confirmed user can briefly race it,
 * so fall back to inserting it here.
 */
export const loadProfile = async (user: User): Promise<UserAccount> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(`Loading profile: ${error.message}`);

  const isVerified = Boolean(user.email_confirmed_at ?? user.confirmed_at);

  if (data) return toUserAccount(data as ProfileRow, isVerified);

  const metadata = user.user_metadata ?? {};
  const fallback: ProfileRow = {
    id: user.id,
    name: typeof metadata.name === 'string' ? metadata.name : (user.email ?? '').split('@')[0],
    email: user.email ?? '',
    phone: typeof metadata.phone === 'string' ? metadata.phone : null,
    role: typeof metadata.role === 'string' ? (metadata.role as UserAccount['role']) : 'Clinician',
    created_at: user.created_at,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .upsert(fallback)
    .select()
    .single();

  if (insertError) throw new Error(`Creating profile: ${insertError.message}`);

  return toUserAccount(inserted as ProfileRow, isVerified);
};

export const getCurrentSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Reading session: ${error.message}`);
  return data.session;
};

export const signIn = async (email: string, password: string): Promise<UserAccount> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Login failed. Please try again.');
  return loadProfile(data.user);
};

export interface SignUpParams {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserAccount['role'];
}

export interface SignUpResult {
  /** Null when the project requires email confirmation before the first login. */
  user: UserAccount | null;
  needsEmailConfirmation: boolean;
}

export const signUp = async ({
  name,
  email,
  password,
  phone,
  role,
}: SignUpParams): Promise<SignUpResult> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone: phone ?? '', role } },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Sign up failed. Please try again.');

  if (!data.session) return { user: null, needsEmailConfirmation: true };

  return { user: await loadProfile(data.user), needsEmailConfirmation: false };
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw new Error(error.message);
};

export const updatePassword = async (newPassword: string): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
};

export const updateProfile = async (
  userId: string,
  updates: { name?: string; phone?: string; role?: UserAccount['role'] }
): Promise<void> => {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) throw new Error(`Updating profile: ${error.message}`);
};
