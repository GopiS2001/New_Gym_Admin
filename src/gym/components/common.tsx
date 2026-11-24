import type { UseFormReturn } from 'react-hook-form';
import type { LabelColor } from 'src/components/label';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { ApiError } from 'src/lib/axios';
import { Iconify } from 'src/gym/components/icon';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { gymPaths } from '../paths';

// ----------------------------------------------------------------------

const STATUS_COLORS: Record<string, LabelColor> = {
  ACTIVE: 'success',
  PUBLISHED: 'success',
  COMPLETED: 'success',
  DRAFT: 'warning',
  IN_PROGRESS: 'info',
  PAUSED: 'warning',
  INACTIVE: 'default',
  NOT_STARTED: 'default',
  ARCHIVED: 'default',
  DISCARDED: 'default',
  SUSPENDED: 'error',
  ABANDONED: 'error',
};

export function humanize(value?: string | null) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function StatusLabel({ status }: { status?: string | null }) {
  if (!status) return null;
  return (
    <Label variant="soft" color={STATUS_COLORS[status] ?? 'default'}>
      {humanize(status)}
    </Label>
  );
}

export function DifficultyLabel({ value }: { value?: string | null }) {
  if (!value) return null;
  const color: LabelColor =
    value === 'BEGINNER' ? 'info' : value === 'INTERMEDIATE' ? 'warning' : 'error';
  return (
    <Label variant="outlined" color={color}>
      {humanize(value)}
    </Label>
  );
}

// ----------------------------------------------------------------------

type PageProps = {
  title: string;
  crumbs?: { name: string; href?: string }[];
  action?: React.ReactNode;
  children: React.ReactNode;
  fill?: boolean;
};

/** Page shell: breadcrumbs, heading and actions. */
export function Page({ title, crumbs = [], action, children, fill }: PageProps) {
  return (
    <DashboardContent
      sx={fill ? { flexGrow: 1, display: 'flex', flexDirection: 'column' } : undefined}
    >
      <CustomBreadcrumbs
        heading={title}
        links={[
          { name: 'Dashboard', href: gymPaths.root },
          ...crumbs,
          ...(crumbs.length ? [] : [{ name: title }]),
        ]}
        action={action}
        sx={{ mb: { xs: 3, md: 4 } }}
      />
      {children}
    </DashboardContent>
  );
}

export function Section({
  title,
  subheader,
  action,
  children,
}: {
  title: string;
  subheader?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} subheader={subheader} action={action} sx={{ mb: 2 }} />
      <Divider />
      <Stack spacing={3} sx={{ p: 3 }}>
        {children}
      </Stack>
    </Card>
  );
}

export function ErrorState({ error, onRetry }: { error?: Error; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <Alert
      severity="error"
      variant="outlined"
      action={
        onRetry && (
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            startIcon={<Iconify icon="solar:restart-bold" />}
          >
            Retry
          </Button>
        )
      }
    >
      {error.message}
    </Alert>
  );
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, py: 0.75 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', width: 180, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ typography: 'body2', flexGrow: 1, minWidth: 0 }}>{children ?? '—'}</Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

/** Maps API validation details onto react-hook-form fields and toasts the rest. */
export function handleFormError(error: unknown, methods?: UseFormReturn<any>) {
  if (error instanceof ApiError && Array.isArray(error.details) && methods) {
    let mapped = 0;
    error.details.forEach((d) => {
      if (d.field) {
        methods.setError(d.field as any, { type: 'server', message: d.message });
        mapped++;
      }
    });
    toast.error(mapped ? 'Please fix the highlighted fields' : error.message);
    return;
  }
  toast.error(error instanceof Error ? error.message : 'Something went wrong');
}

// ----------------------------------------------------------------------

type ConfirmOptions = {
  title: string;
  content?: React.ReactNode;
  confirmText?: string;
  color?: 'error' | 'primary' | 'warning' | 'success' | 'inherit';
  onConfirm: () => Promise<unknown> | unknown;
};

/** Imperative confirmation dialog: `const { confirm, dialog } = useConfirm()` */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((o: ConfirmOptions) => setOpts(o), []);

  const dialog = (
    <ConfirmDialog
      open={!!opts}
      onClose={() => !busy && setOpts(null)}
      title={opts?.title}
      content={opts?.content}
      action={
        <Button
          variant="contained"
          color={opts?.color ?? 'error'}
          loading={busy}
          onClick={async () => {
            if (!opts) return;
            setBusy(true);
            try {
              await opts.onConfirm();
              setOpts(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Action failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          {opts?.confirmText ?? 'Confirm'}
        </Button>
      }
    />
  );

  return { confirm, dialog };
}

export function fDate(value?: string | Date | null, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function fDuration(seconds?: number | null) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m} min`;
}

// ----------------------------------------------------------------------

/** Finds the first nested validation message (e.g. weeks.2.workouts.0.title). */
function firstError(
  errors: unknown,
  path: string[] = []
): { path: string; message: string } | null {
  if (!errors || typeof errors !== 'object') return null;
  const e = errors as Record<string, any>;
  if (typeof e.message === 'string' && e.type) return { path: path.join('.'), message: e.message };
  for (const [k, v] of Object.entries(e)) {
    if (k === 'ref') continue;
    const hit = firstError(v, [...path, k]);
    if (hit) return hit;
  }
  return null;
}

/** `handleSubmit(onValid, onInvalid)` — tells the user what blocks saving. */
export function onInvalid(errors: unknown) {
  const hit = firstError(errors);
  const where = hit?.path
    .replace(/weeks\.(\d+)/, (_, i) => `Week ${Number(i) + 1}`)
    .replace(/workouts\.(\d+)/, (_, i) => `workout ${Number(i) + 1}`)
    .replace(/exercises\.(\d+)/, (_, i) => `exercise ${Number(i) + 1}`)
    .replace(/\./g, ' › ');
  toast.error(
    hit ? `${hit.message}${where ? ` (${where})` : ''}` : 'Please fix the highlighted fields'
  );
}
