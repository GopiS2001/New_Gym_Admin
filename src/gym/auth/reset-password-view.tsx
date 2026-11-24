import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import { useSearchParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Form, Field } from 'src/components/hook-form';

import { FormHead } from 'src/auth/components/form-head';

import { api } from '../api';
import { gymPaths } from '../paths';
import { handleFormError } from '../components/common';

// ----------------------------------------------------------------------

const passwordRule = z
  .string()
  .min(8, { error: 'At least 8 characters' })
  .regex(/[a-z]/, { error: 'Add a lowercase letter' })
  .regex(/[A-Z]/, { error: 'Add an uppercase letter' })
  .regex(/[0-9]/, { error: 'Add a number' });

/** Request a reset link, or (with ?token=…) set a new password. */
export default function ResetPasswordView() {
  const params = useSearchParams();
  const token = params.get('token');
  return (
    <>
      <title>Reset password</title>
      {token ? <SetPassword token={token} /> : <RequestLink />}
      <Link
        component={RouterLink}
        href={gymPaths.signIn}
        variant="subtitle2"
        sx={{ mt: 3, alignSelf: 'center' }}
      >
        Back to sign in
      </Link>
    </>
  );
}

function RequestLink() {
  const [sent, setSent] = useState<string | null>(null);
  const methods = useForm({
    resolver: zodResolver(z.object({ email: z.email({ error: 'Enter a valid email' }) })),
    defaultValues: { email: '' },
  });
  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const r = await api.post<{ message: string }>('/auth/forgot-password', v);
      setSent(r.message);
    } catch (e) {
      handleFormError(e, methods);
    }
  });
  return (
    <>
      <FormHead
        title="Forgot your password?"
        description="Enter your account email and we'll send a secure reset link."
      />
      {sent ? (
        <Alert severity="success">{sent}</Alert>
      ) : (
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text name="email" label="Email address" />
            <Button
              type="submit"
              size="large"
              variant="contained"
              color="inherit"
              loading={methods.formState.isSubmitting}
            >
              Send reset link
            </Button>
          </Stack>
        </Form>
      )}
    </>
  );
}

function SetPassword({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const methods = useForm({
    resolver: zodResolver(
      z
        .object({ password: passwordRule, confirmPassword: z.string() })
        .refine((v) => v.password === v.confirmPassword, {
          path: ['confirmPassword'],
          error: 'Passwords do not match',
        })
    ),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await api.post('/auth/reset-password', { token, ...v });
      setDone(true);
    } catch (e) {
      handleFormError(e, methods);
    }
  });
  return (
    <>
      <FormHead title="Choose a new password" />
      {done ? (
        <Alert severity="success">
          Password updated. You can now sign in. All other sessions were signed out.
        </Alert>
      ) : (
        <Form methods={methods} onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Field.Text name="password" label="New password" type="password" />
            <Field.Text name="confirmPassword" label="Confirm password" type="password" />
            <Button
              type="submit"
              size="large"
              variant="contained"
              color="inherit"
              loading={methods.formState.isSubmitting}
            >
              Update password
            </Button>
          </Stack>
        </Form>
      )}
    </>
  );
}
