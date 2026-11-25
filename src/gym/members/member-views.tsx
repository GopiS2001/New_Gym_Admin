import type { GridColDef } from '@mui/x-data-grid';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useDebounce } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TablePagination from '@mui/material/TablePagination';

import { RouterLink } from 'src/routes/components';
import { useParams, useRouter } from 'src/routes/hooks';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { EmptyContent } from 'src/components/empty-content';

import { gymPaths } from '../paths';
import { Iconify } from '../components/icon';
import { P, Can, usePermissions } from '../permissions';
import { ServerGrid, useGridState } from '../components/server-grid';
import { FilterBar, FilterOptions } from '../components/filter-drawer';
import { deviceName, lastSeenText, PresenceBadge, SignedInLabel } from './presence';
import { api, useApi, useList, invalidate, useOptions, downloadJson } from '../api';
import {
  Page,
  fDate,
  KeyValue,
  fDuration,
  ErrorState,
  useConfirm,
  StatusLabel,
  handleFormError,
} from '../components/common';

// ----------------------------------------------------------------------

type MemberRow = {
  id: number;
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  avatarUrl: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  online: boolean;
  signedInDevices: number;
  createdAt: string;
  onboardingStatus: string;
  experienceLevel: { id: number; name: string } | null;
  weeklyWorkoutDays: number | null;
  primaryGoal: { id: number; name: string } | null;
  completedWorkouts: number;
  friendCount: number;
};

const MEMBER_FILTER_DEFAULTS = {
  status: 'all' as 'all' | MemberRow['status'],
  goalId: '',
  experienceLevelId: '',
  onboardingStatus: '',
  presence: '',
  from: '',
  to: '',
};

export function MemberListView() {
  const router = useRouter();
  const { can } = usePermissions();
  const grid = useGridState({ sortBy: 'createdAt', sortOrder: 'desc' });
  const [filters, setFilters] = useState(MEMBER_FILTER_DEFAULTS);
  const { status, goalId, experienceLevelId, onboardingStatus, presence, from, to } = filters;
  const [search, setSearch] = useState('');
  const { confirm, dialog } = useConfirm();
  const [createOpen, setCreateOpen] = useState(false);
  const q = useDebounce(search, 300);
  const { options: goals } = useOptions('/admin/goals');
  const { options: levels } = useOptions('/admin/experience-levels');

  const { resetPage } = grid;
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, goalId, experienceLevelId, onboardingStatus, presence, from, to]);

  const query = {
    search: q || undefined,
    status: status === 'all' ? undefined : status,
    goalId,
    experienceLevelId,
    onboardingStatus,
    presence: presence || undefined,
    registeredFrom: from || undefined,
    registeredTo: to ? `${to}T23:59:59` : undefined,
  };
  // Refresh every 30 s so online / offline stays current.
  const { data, isLoading, error, mutate } = useList<MemberRow>(
    '/admin/users',
    { ...grid.state, ...query },
    { refreshInterval: 30_000 }
  );
  const counts = data?.statusCounts ?? {};
  const onlineNow = (data as { onlineNow?: number } | undefined)?.onlineNow ?? 0;
  const canManage = can(P.USERS_MANAGE);

  const forceLogout = (row: MemberRow) =>
    confirm({
      title: `Force logout ${row.name}?`,
      content: `${row.name} will be signed out of the app on all ${row.signedInDevices === 1 ? '' : `${row.signedInDevices} `}device${row.signedInDevices === 1 ? '' : 's'} right away. They can log in again with their password.`,
      confirmText: 'Force logout',
      color: 'error',
      onConfirm: async () => {
        const r = await api.post<{ message: string }>(`/admin/users/${row.id}/force-logout`);
        toast.success(r.message);
        mutate();
      },
    });

  const exportCsv = async () => {
    const qs = new URLSearchParams(
      Object.entries(query).filter(([, v]) => v) as [string, string][]
    ).toString();
    try {
      await api.download(
        `/admin/users/export${qs ? `?${qs}` : ''}`,
        `members-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const columns = useMemo<GridColDef<MemberRow>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Member',
        flex: 1,
        minWidth: 260,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar src={row.avatarUrl ?? undefined}>{row.name[0]}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {row.name}
              </Typography>
              <Typography variant="caption" component="div" noWrap sx={{ color: 'text.secondary' }}>
                {row.email} {!row.emailVerified && '· unverified'}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        field: 'online',
        headerName: 'Activity',
        width: 150,
        sortable: false,
        renderCell: ({ row }) => <PresenceBadge online={row.online} lastSeenAt={row.lastSeenAt} />,
      },
      {
        field: 'signedInDevices',
        headerName: 'Signed in',
        width: 120,
        sortable: false,
        renderCell: ({ row }) => <SignedInLabel devices={row.signedInDevices} />,
      },
      {
        field: 'primaryGoal',
        headerName: 'Goal',
        width: 170,
        sortable: false,
        valueGetter: (_, r) => r.primaryGoal?.name ?? '—',
      },
      {
        field: 'experienceLevel',
        headerName: 'Experience',
        width: 170,
        sortable: false,
        valueGetter: (_, r) => r.experienceLevel?.name ?? '—',
      },
      {
        field: 'onboardingStatus',
        headerName: 'Onboarding',
        width: 130,
        sortable: false,
        renderCell: ({ row }) => <StatusLabel status={row.onboardingStatus} />,
      },
      {
        field: 'completedWorkouts',
        headerName: 'Workouts',
        width: 100,
        type: 'number',
        sortable: false,
      },
      {
        field: 'friendCount',
        headerName: 'Friends',
        width: 90,
        type: 'number',
        sortable: false,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusLabel status={row.status} />,
      },
      {
        field: 'createdAt',
        headerName: 'Registered',
        width: 130,
        renderCell: ({ row }) => fDate(row.createdAt),
      },
      {
        field: 'lastLoginAt',
        headerName: 'Last login',
        width: 130,
        renderCell: ({ row }) => fDate(row.lastLoginAt),
      },
      ...(canManage
        ? [
            {
              field: 'actions',
              headerName: '',
              width: 70,
              sortable: false,
              align: 'right',
              renderCell: ({ row }) =>
                row.signedInDevices > 0 ? (
                  <Tooltip title="Force logout" arrow>
                    <IconButton
                      color="error"
                      aria-label={`Force logout ${row.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        forceLogout(row);
                      }}
                    >
                      <Iconify icon="solar:logout-2-bold" />
                    </IconButton>
                  </Tooltip>
                ) : null,
            } satisfies GridColDef<MemberRow>,
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage]
  );

  return (
    <Page
      title="Members"
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          <Label
            variant="soft"
            color={onlineNow ? 'success' : 'default'}
            startIcon={
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'currentColor' }} />
            }
            sx={{ height: 36, px: 1.5, cursor: 'pointer' }}
            onClick={() =>
              setFilters((f) => ({ ...f, presence: presence === 'online' ? '' : 'online' }))
            }
          >
            {onlineNow} online now
          </Label>
          <Can permission={P.USERS_EXPORT}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<Iconify icon="solar:export-bold" />}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </Can>
          <Can permission={P.USERS_MANAGE}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setCreateOpen(true)}
            >
              New member
            </Button>
          </Can>
        </Stack>
      }
    >
      <ServerGrid
        rows={data?.data ?? []}
        total={data?.meta.total ?? 0}
        columns={columns}
        loading={isLoading}
        error={error}
        onRetry={() => mutate()}
        gridProps={grid.gridProps}
        onRowClick={(row) => router.push(gymPaths.members.details(row.id))}
        emptyTitle="No members found"
        emptyDescription="Members appear here once they create an account in the app."
        toolbar={
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or email…"
            values={filters}
            defaults={MEMBER_FILTER_DEFAULTS}
            onApply={setFilters}
          >
            {(draft, setDraft) => (
              <>
                <FilterOptions
                  title="Status"
                  value={draft.status}
                  onChange={(v) => setDraft({ status: v })}
                  options={(['all', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const).map((s) => ({
                    value: s,
                    label: s === 'all' ? 'All' : s[0] + s.slice(1).toLowerCase(),
                    count:
                      s === 'all'
                        ? Object.values(counts).reduce((a, b) => a + b, 0)
                        : (counts[s] ?? 0),
                  }))}
                />
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Goal"
                  value={draft.goalId}
                  onChange={(e) => setDraft({ goalId: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  {goals.map((g) => (
                    <MenuItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Experience"
                  value={draft.experienceLevelId}
                  onChange={(e) => setDraft({ experienceLevelId: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  {levels.map((g) => (
                    <MenuItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Onboarding"
                  value={draft.onboardingStatus}
                  onChange={(e) => setDraft({ onboardingStatus: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="IN_PROGRESS">In progress</MenuItem>
                  <MenuItem value="NOT_STARTED">Not started</MenuItem>
                </TextField>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Activity"
                  value={draft.presence}
                  onChange={(e) => setDraft({ presence: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="online">Online now</MenuItem>
                  <MenuItem value="offline">Offline</MenuItem>
                  <MenuItem value="signed_in">Signed in</MenuItem>
                  <MenuItem value="signed_out">Signed out</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Registered from"
                  value={draft.from}
                  onChange={(e) => setDraft({ from: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Registered to"
                  value={draft.to}
                  onChange={(e) => setDraft({ to: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </>
            )}
          </FilterBar>
        }
      />
      {createOpen && can(P.USERS_MANAGE) && (
        <CreateMemberDialog onClose={() => setCreateOpen(false)} />
      )}
      {dialog}
    </Page>
  );
}

// ----------------------------------------------------------------------

const passwordRule = z
  .string()
  .min(8, { error: 'At least 8 characters' })
  .regex(/[a-z]/, { error: 'Add a lowercase letter' })
  .regex(/[A-Z]/, { error: 'Add an uppercase letter' })
  .regex(/[0-9]/, { error: 'Add a number' });

function CreateMemberDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const methods = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(2, { error: 'Name is required' }),
        email: z.email({ error: 'Enter a valid email' }),
        password: passwordRule,
      })
    ),
    defaultValues: { name: '', email: '', password: '' },
  });
  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      const m = await api.post<{ id: number }>('/admin/users', v);
      toast.success('Member created');
      invalidate('/admin/users');
      router.push(gymPaths.members.details(m.id));
    } catch (e) {
      handleFormError(e, methods);
    }
  });
  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>New member account</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Alert severity="info">
              Members normally sign up in the app. Use this only when an admin-created account is
              required.
            </Alert>
            <Field.Text name="name" label="Full name" />
            <Field.Text name="email" label="Email" />
            <Field.Text
              name="password"
              label="Temporary password"
              type="password"
              helperText="Ask the member to change it after first login"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={methods.formState.isSubmitting}>
            Create
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

type MemberDetail = {
  friendCount?: number;
  presence: {
    online: boolean;
    lastSeenAt: string | null;
    signedIn: boolean;
    devices: { lastActiveAt: string; userAgent: string | null; ipAddress: string | null }[];
  };
  id: number;
  name: string;
  email: string;
  status: MemberRow['status'];
  avatarUrl: string | null;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  onboarding: {
    status: string;
    completedAt: string | null;
    gender: string | null;
    genderCustom: string | null;
    preferredActivity: string | null;
    experienceLevel: string | null;
    weeklyWorkoutDays: number | null;
    goals: { id: number; name: string; isPrimary: boolean }[];
    focusAreas: { id: number; name: string }[];
    motivations: { id: number; label: string }[];
    equipment: { id: number; name: string }[];
  };
  reminders: { enabled: boolean; time: string | null; timezone: string | null; days: number[] };
  stats: {
    sessions: Record<string, number>;
    lastWorkoutAt: string | null;
    savedExercises: number;
    savedPrograms: number;
    collections: number;
  };
  measurements: {
    id: number;
    measurementType: string;
    value: number;
    unit: string;
    measuredAt: string;
  }[];
  enrollments: {
    id: number;
    status: string;
    currentWeek: number;
    currentDay: number;
    completedWorkouts: number;
    startedAt: string;
    program: { id: number; name: string };
  }[];
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MemberDetailView() {
  const { id } = useParams();
  const { can } = usePermissions();
  const {
    data: m,
    error,
    mutate,
  } = useApi<MemberDetail>(id ? `/admin/users/${id}` : null, {
    refreshInterval: 30_000,
  });
  const [tab, setTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const { confirm, dialog } = useConfirm();

  if (error) {
    return (
      <Page
        title="Member"
        crumbs={[{ name: 'Members', href: gymPaths.members.root }, { name: 'Details' }]}
      >
        <ErrorState error={error} onRetry={() => mutate()} />
      </Page>
    );
  }
  if (!m) {
    return (
      <Page
        title="Member"
        crumbs={[{ name: 'Members', href: gymPaths.members.root }, { name: 'Details' }]}
      >
        <Skeleton variant="rounded" height={160} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={360} />
      </Page>
    );
  }

  const changeStatus = (
    status: MemberRow['status'],
    verb: string,
    color: 'error' | 'warning' | 'success'
  ) =>
    confirm({
      title: `${verb} ${m.name}?`,
      content:
        status === 'ACTIVE'
          ? 'The member will be able to sign in again.'
          : 'The member will be signed out on all devices and cannot sign in until restored.',
      confirmText: verb,
      color,
      onConfirm: async () => {
        await api.patch(`/admin/users/${m.id}/status`, { status });
        toast.success(`${verb} done`);
        mutate();
        invalidate('/admin/users');
      },
    });

  const forceLogout = () =>
    confirm({
      title: `Force logout ${m.name}?`,
      content: `${m.name} will be signed out of the app on all devices right away. They can log in again with their password.`,
      confirmText: 'Force logout',
      color: 'error',
      onConfirm: async () => {
        const r = await api.post<{ message: string }>(`/admin/users/${m.id}/force-logout`);
        toast.success(r.message);
        mutate();
        invalidate('/admin/users');
      },
    });

  const sendReset = () =>
    confirm({
      title: 'Send password reset link?',
      content: `A secure reset link will be emailed to ${m.email}. Admins never see or set member passwords.`,
      confirmText: 'Send link',
      color: 'primary',
      onConfirm: async () => {
        const r = await api.post<{ message: string }>(`/admin/users/${m.id}/reset-password`);
        toast.success(r.message);
      },
    });

  const exportData = async () => {
    try {
      const data = await api.get(`/admin/users/${m.id}/export`);
      downloadJson(data, `member-${m.id}-export.json`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const completed = m.stats.sessions.COMPLETED ?? 0;

  return (
    <Page
      title={m.name}
      crumbs={[{ name: 'Members', href: gymPaths.members.root }, { name: m.name }]}
    >
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
          <Avatar src={m.avatarUrl ?? undefined} sx={{ width: 72, height: 72, fontSize: 28 }}>
            {m.name[0]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5">{m.name}</Typography>
              <StatusLabel status={m.status} />
            </Stack>
            <Typography sx={{ color: 'text.secondary' }}>
              {m.email} · {m.emailVerified ? 'email verified' : 'email not verified'} · joined{' '}
              {fDate(m.createdAt)}
            </Typography>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 1.5 }}
            >
              <PresenceBadge
                online={m.presence.online}
                lastSeenAt={m.presence.lastSeenAt}
                compact
              />
              {!m.presence.online && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {lastSeenText(m.presence.lastSeenAt)}
                </Typography>
              )}
              <SignedInLabel devices={m.presence.devices.length} />
              {m.presence.devices.map((d, i) => (
                <Tooltip
                  key={i}
                  title={`Last active ${fDate(d.lastActiveAt, true)}${d.ipAddress ? ` · IP ${d.ipAddress}` : ''}`}
                  arrow
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    <Iconify
                      icon="solar:smartphone-bold"
                      width={14}
                      sx={{ mr: 0.5, verticalAlign: 'middle' }}
                    />
                    {deviceName(d.userAgent)}
                  </Typography>
                </Tooltip>
              ))}
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Can permission={P.USERS_MANAGE}>
              {m.presence.signedIn && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Iconify icon="solar:logout-2-bold" />}
                  onClick={forceLogout}
                >
                  Force logout
                </Button>
              )}
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Iconify icon="solar:lock-password-outline" />}
                onClick={sendReset}
              >
                Reset password
              </Button>
              {m.status === 'ACTIVE' ? (
                <>
                  <Button
                    variant="soft"
                    color="warning"
                    onClick={() => changeStatus('INACTIVE', 'Deactivate', 'warning')}
                  >
                    Deactivate
                  </Button>
                  <Button
                    variant="soft"
                    color="error"
                    onClick={() => changeStatus('SUSPENDED', 'Suspend', 'error')}
                  >
                    Suspend
                  </Button>
                </>
              ) : (
                <Button
                  variant="soft"
                  color="success"
                  onClick={() =>
                    changeStatus(
                      'ACTIVE',
                      m.status === 'SUSPENDED' ? 'Restore' : 'Activate',
                      'success'
                    )
                  }
                >
                  {m.status === 'SUSPENDED' ? 'Restore' : 'Activate'}
                </Button>
              )}
            </Can>
            <Can permission={P.USERS_EXPORT}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Iconify icon="solar:export-bold" />}
                onClick={exportData}
              >
                Export data
              </Button>
            </Can>
          </Stack>
        </Stack>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Completed workouts', value: completed },
          { label: 'Last workout', value: fDate(m.stats.lastWorkoutAt) },
          { label: 'Saved exercises', value: m.stats.savedExercises },
          { label: 'Collections', value: m.stats.collections },
        ].map((s) => (
          <Grid key={s.label} size={{ xs: 6, md: 3 }}>
            <Card sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {s.label}
              </Typography>
              <Typography variant="h4">{s.value}</Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="overview" label="Onboarding & preferences" />
        <Tab value="workouts" label="Workouts" />
        <Tab value="programs" label="Programs" />
        <Tab value="measurements" label="Measurements" />
        <Tab
          value="friends"
          label="Friends"
          iconPosition="end"
          icon={
            <Label variant={tab === 'friends' ? 'filled' : 'soft'} color="info">
              {m.friendCount ?? 0}
            </Label>
          }
        />
      </Tabs>

      {tab === 'friends' && <MemberFriends memberId={m.id} />}

      {tab === 'overview' && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Onboarding answers <StatusLabel status={m.onboarding.status} />
              </Typography>
              <KeyValue label="Primary goal">
                {m.onboarding.goals.find((g) => g.isPrimary)?.name ?? '—'}
              </KeyValue>
              <KeyValue label="Preferred activity">
                {m.onboarding.preferredActivity ?? '—'}
              </KeyValue>
              <KeyValue label="Focus areas">
                {m.onboarding.focusAreas.map((f) => (
                  <Label key={f.id} variant="soft" sx={{ mr: 0.5, mb: 0.5 }}>
                    {f.name}
                  </Label>
                ))}
              </KeyValue>
              <KeyValue label="Tracking motivation">
                {m.onboarding.motivations.map((x) => x.label).join(', ') || '—'}
              </KeyValue>
              <KeyValue label="Experience">{m.onboarding.experienceLevel ?? '—'}</KeyValue>
              <KeyValue label="Weekly target">
                {m.onboarding.weeklyWorkoutDays
                  ? `${m.onboarding.weeklyWorkoutDays} days / week`
                  : '—'}
              </KeyValue>
              <KeyValue label="Equipment">
                {m.onboarding.equipment.map((x) => x.name).join(', ') || '—'}
              </KeyValue>
              <KeyValue label="Gender">
                {m.onboarding.genderCustom || m.onboarding.gender || 'Not provided'}
              </KeyValue>
              <KeyValue label="Completed">{fDate(m.onboarding.completedAt, true)}</KeyValue>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Reminder preferences
              </Typography>
              <KeyValue label="Reminders">
                {m.reminders.enabled ? <Label color="success">On</Label> : <Label>Off</Label>}
              </KeyValue>
              <KeyValue label="Days">
                {m.reminders.days.map((d) => DAY_NAMES[d]).join(', ') || '—'}
              </KeyValue>
              <KeyValue label="Time">{m.reminders.time ?? '—'}</KeyValue>
              <KeyValue label="Timezone">{m.reminders.timezone ?? '—'}</KeyValue>
              <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
              <KeyValue label="Last login">{fDate(m.lastLoginAt, true)}</KeyValue>
            </Card>
          </Grid>
        </Grid>
      )}

      {tab === 'workouts' && <MemberWorkouts memberId={m.id} />}

      {tab === 'programs' && (
        <Card>
          {m.enrollments.length ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Program</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Completed workouts</TableCell>
                  <TableCell>Started</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {m.enrollments.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.program.name}</TableCell>
                    <TableCell>
                      <StatusLabel status={e.status} />
                    </TableCell>
                    <TableCell>
                      Week {e.currentWeek}, day {e.currentDay}
                    </TableCell>
                    <TableCell>{e.completedWorkouts}</TableCell>
                    <TableCell>{fDate(e.startedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyContent title="Not following any program" sx={{ py: 6 }} />
          )}
        </Card>
      )}

      {tab === 'measurements' && (
        <Card>
          {m.measurements.length ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {m.measurements.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>{fDate(x.measuredAt)}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>
                      {x.measurementType.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {x.value} {x.unit}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyContent
              title="No measurements recorded"
              description="Body weight is optional during onboarding."
              sx={{ py: 6 }}
            />
          )}
        </Card>
      )}

      {editOpen && can(P.USERS_MANAGE) && (
        <EditMemberDialog member={m} onClose={() => setEditOpen(false)} onSaved={() => mutate()} />
      )}
      {dialog}
    </Page>
  );
}

function EditMemberDialog({
  member,
  onClose,
  onSaved,
}: {
  member: MemberDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const methods = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(2, { error: 'Name is required' }),
        email: z.email({ error: 'Enter a valid email' }),
      })
    ),
    defaultValues: { name: member.name, email: member.email },
  });
  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await api.patch(`/admin/users/${member.id}`, v);
      toast.success('Member updated');
      onSaved();
      invalidate('/admin/users');
      onClose();
    } catch (e) {
      handleFormError(e, methods);
    }
  });
  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Edit member</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Field.Text name="name" label="Full name" />
            <Field.Text
              name="email"
              label="Email"
              helperText="Changing the email requires the member to verify it again"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={methods.formState.isSubmitting}>
            Save
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

type Session = {
  id: number;
  title: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  program: { id: number; name: string } | null;
  exercises: {
    id: number;
    exercise: { name: string };
    sets: {
      id: number;
      reps: number | null;
      weightValue: number | null;
      weightUnit: string | null;
      durationSeconds: number | null;
    }[];
  }[];
};

type FriendPerson = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  status: MemberRow['status'];
  friendCount: number;
  online: boolean;
};

type MemberFriendsData = {
  friendCount: number;
  friends: (FriendPerson & { since: string })[];
  incoming: { requestId: number; sentAt: string; person: FriendPerson }[];
  outgoing: { requestId: number; sentAt: string; person: FriendPerson }[];
};

/** Read-only view of a member's friends and pending friend requests. */
function MemberFriends({ memberId }: { memberId: number }) {
  const { data, error, isLoading, mutate } = useApi<MemberFriendsData>(
    `/admin/users/${memberId}/friends`,
    {
      refreshInterval: 30_000,
    }
  );

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (isLoading || !data) return <Skeleton variant="rounded" height={240} />;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Card>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 3, pb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Friends
            </Typography>
            <Label
              variant="soft"
              color="info"
              startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
            >
              {data.friendCount} {data.friendCount === 1 ? 'friend' : 'friends'}
            </Label>
          </Stack>
          {data.friends.length ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Activity</TableCell>
                  <TableCell align="right">Their friends</TableCell>
                  <TableCell align="right">Friends since</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.friends.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell>
                      <FriendCell person={f} />
                    </TableCell>
                    <TableCell>
                      <PresenceBadge online={f.online} lastSeenAt={null} compact />
                    </TableCell>
                    <TableCell align="right">{f.friendCount}</TableCell>
                    <TableCell align="right">{fDate(f.since)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyContent
              title="No friends yet"
              description="Friends appear here once a request is accepted."
              sx={{ py: 6 }}
            />
          )}
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={3}>
          <RequestList
            title="Requests received"
            items={data.incoming}
            empty="No pending requests received."
          />
          <RequestList
            title="Requests sent"
            items={data.outgoing}
            empty="No pending requests sent."
          />
        </Stack>
      </Grid>
    </Grid>
  );
}

function FriendCell({ person }: { person: FriendPerson }) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      component={RouterLink}
      href={gymPaths.members.details(person.id)}
      sx={{
        color: 'inherit',
        textDecoration: 'none',
        minWidth: 0,
        '&:hover .friend-name': { textDecoration: 'underline' },
      }}
    >
      <Avatar src={person.avatarUrl ?? undefined} sx={{ width: 36, height: 36 }}>
        {person.name[0]}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography className="friend-name" variant="subtitle2" noWrap>
          {person.name} {person.status !== 'ACTIVE' && <StatusLabel status={person.status} />}
        </Typography>
        <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
          {person.email}
        </Typography>
      </Box>
    </Stack>
  );
}

function RequestList({
  title,
  items,
  empty,
}: {
  title: string;
  items: MemberFriendsData['incoming'];
  empty: string;
}) {
  return (
    <Card sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <Label variant="soft" color={items.length ? 'warning' : 'default'}>
          {items.length}
        </Label>
      </Stack>
      {items.length ? (
        <Stack spacing={2} divider={<Divider flexItem sx={{ borderStyle: 'dashed' }} />}>
          {items.map((r) => (
            <Stack key={r.requestId} direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <FriendCell person={r.person} />
              </Box>
              <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
                {fDate(r.sentAt)}
              </Typography>
            </Stack>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {empty}
        </Typography>
      )}
    </Card>
  );
}

function MemberWorkouts({ memberId }: { memberId: number }) {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useList<Session>(`/admin/users/${memberId}/workouts`, {
    page: page + 1,
    limit: 10,
  });

  if (isLoading && !data) return <Skeleton variant="rounded" height={240} />;
  if (!data?.data.length)
    return (
      <Card>
        <EmptyContent title="No workouts logged yet" sx={{ py: 6 }} />
      </Card>
    );

  return (
    <Card>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Workout</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Exercises & sets</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.data.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Typography variant="subtitle2">{s.title ?? 'Workout'}</Typography>
                {s.program && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {s.program.name}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <StatusLabel status={s.status} />
              </TableCell>
              <TableCell>{fDate(s.completedAt ?? s.startedAt, true)}</TableCell>
              <TableCell>{fDuration(s.durationSeconds)}</TableCell>
              <TableCell>
                {s.exercises.map((e) => (
                  <Typography key={e.id} variant="body2">
                    <strong>{e.exercise.name}</strong>:{' '}
                    {e.sets
                      .map((x) =>
                        [
                          x.reps && `${x.reps}`,
                          x.weightValue && `${x.weightValue}${x.weightUnit?.toLowerCase() ?? ''}`,
                          x.durationSeconds && `${x.durationSeconds}s`,
                        ]
                          .filter(Boolean)
                          .join('×')
                      )
                      .join(', ') || 'no sets'}
                  </Typography>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={data.meta.total}
        page={page}
        rowsPerPage={10}
        rowsPerPageOptions={[10]}
        onPageChange={(_, p) => setPage(p)}
      />
    </Card>
  );
}
