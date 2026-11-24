import type { GridColDef } from '@mui/x-data-grid';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Switch from '@mui/material/Switch';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import InputAdornment from '@mui/material/InputAdornment';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

import { Iconify } from '../components/icon';
import { RefMultiField } from '../components/fields';
import { api, useApi, useList, invalidate } from '../api';
import { ServerGrid, useGridState } from '../components/server-grid';
import {
  Page,
  fDate,
  humanize,
  KeyValue,
  ErrorState,
  useConfirm,
  StatusLabel,
  handleFormError,
} from '../components/common';

// ======================================================================
// Notifications
// ======================================================================

type NotificationTemplate = {
  id: number;
  name: string;
  title: string;
  body: string;
  type: 'REMINDER' | 'MOTIVATION' | 'ANNOUNCEMENT';
  trigger: 'SCHEDULED' | 'WORKOUT_REMINDER' | 'INACTIVITY' | 'MANUAL';
  targetSegment: {
    goalIds?: number[];
    experienceLevelIds?: number[];
    onboardingStatus?: string;
    remindersEnabledOnly?: boolean;
  } | null;
  schedule: { sendAt?: string; inactiveDays?: number; minutesBefore?: number } | null;
  status: 'ACTIVE' | 'INACTIVE';
  jobCount: number;
  updatedAt: string;
};

export function NotificationsView() {
  const grid = useGridState();
  const [editing, setEditing] = useState<NotificationTemplate | 'new' | null>(null);
  const { confirm, dialog } = useConfirm();
  const { data, isLoading, error, mutate } = useList<NotificationTemplate>(
    '/admin/notifications',
    grid.state
  );

  const toggle = async (row: NotificationTemplate) => {
    try {
      await api.patch(`/admin/notifications/${row.id}`, {
        status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      invalidate('/admin/notifications');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const columns: GridColDef<NotificationTemplate>[] = [
    {
      field: 'name',
      headerName: 'Template',
      flex: 1,
      minWidth: 260,
      renderCell: ({ row }) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {row.name}
          </Typography>
          <Typography variant="caption" component="div" noWrap sx={{ color: 'text.secondary' }}>
            {row.title} — {row.body}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 130,
      renderCell: ({ row }) => <Label variant="soft">{humanize(row.type)}</Label>,
    },
    {
      field: 'trigger',
      headerName: 'Trigger',
      width: 170,
      sortable: false,
      valueGetter: (_, r) => humanize(r.trigger),
    },
    { field: 'jobCount', headerName: 'Deliveries', width: 110, type: 'number', sortable: false },
    {
      field: 'status',
      headerName: 'Active',
      width: 100,
      renderCell: ({ row }) => (
        <Switch
          checked={row.status === 'ACTIVE'}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggle(row)}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row">
          <IconButton onClick={() => setEditing(row)}>
            <Iconify icon="solar:pen-bold" />
          </IconButton>
          <IconButton
            color="error"
            onClick={() =>
              confirm({
                title: 'Delete template?',
                content: 'Templates with delivery history can only be deactivated.',
                confirmText: 'Delete',
                onConfirm: async () => {
                  await api.delete(`/admin/notifications/${row.id}`);
                  toast.success('Deleted');
                  invalidate('/admin/notifications');
                },
              })
            }
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Page
      title="Notifications"
      action={
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => setEditing('new')}
        >
          New template
        </Button>
      }
    >
      <Alert severity="info" sx={{ mb: 3 }}>
        Templates are only sent to members who enabled reminders and granted notification permission
        on their device. Opt-outs are always respected.
      </Alert>
      <ServerGrid
        rows={data?.data ?? []}
        total={data?.meta.total ?? 0}
        columns={columns}
        loading={isLoading}
        error={error}
        onRetry={() => mutate()}
        gridProps={grid.gridProps}
        emptyTitle="No notification templates"
      />
      {editing && (
        <NotificationDialog
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {dialog}
    </Page>
  );
}

const NotificationSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name is required' }),
  title: z.string().trim().min(1, { error: 'Title is required' }).max(150),
  body: z.string().trim().min(1, { error: 'Message is required' }).max(500),
  type: z.enum(['REMINDER', 'MOTIVATION', 'ANNOUNCEMENT']),
  trigger: z.enum(['SCHEDULED', 'WORKOUT_REMINDER', 'INACTIVITY', 'MANUAL']),
  goalIds: z.array(z.number()),
  experienceLevelIds: z.array(z.number()),
  onboardingStatus: z.string(),
  inactiveDays: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().int().min(1).max(365).optional()
  ),
  sendAt: z.string().optional(),
  active: z.boolean(),
});

function NotificationDialog({
  row,
  onClose,
}: {
  row: NotificationTemplate | null;
  onClose: () => void;
}) {
  const methods = useForm({
    resolver: zodResolver(NotificationSchema) as any,
    defaultValues: {
      name: row?.name ?? '',
      title: row?.title ?? '',
      body: row?.body ?? '',
      type: row?.type ?? 'REMINDER',
      trigger: row?.trigger ?? 'WORKOUT_REMINDER',
      goalIds: row?.targetSegment?.goalIds ?? [],
      experienceLevelIds: row?.targetSegment?.experienceLevelIds ?? [],
      onboardingStatus: row?.targetSegment?.onboardingStatus ?? '',
      inactiveDays: row?.schedule?.inactiveDays ?? undefined,
      sendAt: row?.schedule?.sendAt?.slice(0, 16) ?? '',
      active: row ? row.status === 'ACTIVE' : true,
    },
  });
  const v = methods.watch();
  const [audience, setAudience] = useState<{ total: number; optedIn: number } | null>(null);

  const segment = {
    ...(v.goalIds.length ? { goalIds: v.goalIds } : {}),
    ...(v.experienceLevelIds.length ? { experienceLevelIds: v.experienceLevelIds } : {}),
    ...(v.onboardingStatus ? { onboardingStatus: v.onboardingStatus } : {}),
    remindersEnabledOnly: true,
  };
  const segKey = JSON.stringify(segment);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .post<{ total: number; optedIn: number }>('/admin/notifications/audience', {
          targetSegment: JSON.parse(segKey),
        })
        .then(setAudience)
        .catch(() => setAudience(null));
    }, 300);
    return () => clearTimeout(t);
  }, [segKey]);

  const onSubmit = methods.handleSubmit(async (values: any) => {
    const body = {
      name: values.name,
      title: values.title,
      body: values.body,
      type: values.type,
      trigger: values.trigger,
      targetSegment: segment,
      schedule: {
        ...(values.trigger === 'INACTIVITY' && values.inactiveDays
          ? { inactiveDays: values.inactiveDays }
          : {}),
        ...(values.trigger === 'SCHEDULED' && values.sendAt
          ? { sendAt: new Date(values.sendAt).toISOString() }
          : {}),
      },
      status: values.active ? 'ACTIVE' : 'INACTIVE',
    };
    try {
      if (row) await api.patch(`/admin/notifications/${row.id}`, body);
      else await api.post('/admin/notifications', body);
      toast.success('Saved');
      invalidate('/admin/notifications');
      onClose();
    } catch (e) {
      handleFormError(e, methods);
    }
  });

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>
          {row ? 'Edit notification template' : 'New notification template'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Field.Text name="name" label="Internal name" />
            <Field.Text
              name="title"
              label="Notification title"
              helperText={`${v.title.length}/150`}
            />
            <Field.Text
              name="body"
              label="Message"
              multiline
              minRows={2}
              helperText={`${v.body.length}/500`}
            />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <Field.Select name="type" label="Type">
                <MenuItem value="REMINDER">Reminder</MenuItem>
                <MenuItem value="MOTIVATION">Motivation</MenuItem>
                <MenuItem value="ANNOUNCEMENT">Announcement</MenuItem>
              </Field.Select>
              <Field.Select name="trigger" label="Trigger">
                <MenuItem value="WORKOUT_REMINDER">Member reminder schedule</MenuItem>
                <MenuItem value="INACTIVITY">After inactivity</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled date</MenuItem>
                <MenuItem value="MANUAL">Manual only</MenuItem>
              </Field.Select>
            </Box>
            {v.trigger === 'INACTIVITY' && (
              <Field.Text name="inactiveDays" label="Days without a workout" type="number" />
            )}
            {v.trigger === 'SCHEDULED' && (
              <Field.Text
                name="sendAt"
                label="Send at"
                type="datetime-local"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
            <Typography variant="subtitle2">Target audience</Typography>
            <RefMultiField name="goalIds" label="Goals (any)" path="/admin/goals" />
            <RefMultiField
              name="experienceLevelIds"
              label="Experience levels (any)"
              path="/admin/experience-levels"
            />
            <Field.Select name="onboardingStatus" label="Onboarding">
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="IN_PROGRESS">In progress</MenuItem>
            </Field.Select>
            {audience && (
              <Alert severity="info">
                Matches {audience.total} active members — {audience.optedIn} have reminders enabled
                and can receive it.
              </Alert>
            )}
            <Field.Switch name="active" label="Active" />
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

// ======================================================================
// Administrators & roles
// ======================================================================

type AdminUser = {
  id: number;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: number; key: string; name: string } | null;
};
type Role = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  userCount: number;
};
type Permission = { id: number; key: string; description: string; module: string };

export function AdministratorsView() {
  const [tab, setTab] = useState<'admins' | 'roles'>('admins');
  return (
    <Page title="Administrators">
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab value="admins" label="Admin users" />
        <Tab value="roles" label="Roles & permissions" />
      </Tabs>
      {tab === 'admins' ? <AdminUsers /> : <RolesMatrix />}
    </Page>
  );
}

function AdminUsers() {
  const { user } = useAuthContext();
  const grid = useGridState();
  const [creating, setCreating] = useState(false);
  const { confirm, dialog } = useConfirm();
  const { data, isLoading, error, mutate } = useList<AdminUser>('/admin/admin-users', grid.state);
  const { data: roles } = useApi<Role[]>('/admin/roles');

  const update = async (row: AdminUser, body: Record<string, unknown>, msg: string) => {
    try {
      await api.patch(`/admin/admin-users/${row.id}`, body);
      toast.success(msg);
      invalidate('/admin/admin-users');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const columns: GridColDef<AdminUser>[] = [
    {
      field: 'name',
      headerName: 'Admin',
      flex: 1,
      minWidth: 240,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar>{row.name[0]}</Avatar>
          <Box>
            <Typography variant="subtitle2">
              {row.name} {row.id === user?.id && <Label color="info">You</Label>}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {row.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 200,
      sortable: false,
      renderCell: ({ row }) =>
        !roles?.length ? (
          (row.role?.name ?? '—')
        ) : (
          <TextField
            select
            size="small"
            fullWidth
            value={row.role?.id ?? ''}
            disabled={row.id === user?.id}
            onChange={(e) => update(row, { roleId: Number(e.target.value) }, 'Role updated')}
          >
            {roles?.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name}
              </MenuItem>
            ))}
          </TextField>
        ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ row }) => <StatusLabel status={row.status} />,
    },
    {
      field: 'lastLoginAt',
      headerName: 'Last login',
      width: 160,
      renderCell: ({ row }) => fDate(row.lastLoginAt, true),
    },
    {
      field: 'actions',
      headerName: '',
      width: 220,
      sortable: false,
      renderCell: ({ row }) =>
        row.id === user?.id ? null : (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              onClick={() =>
                confirm({
                  title: 'Send password reset?',
                  content: `A secure reset link will be sent to ${row.email}.`,
                  color: 'primary',
                  confirmText: 'Send',
                  onConfirm: async () => {
                    const r = await api.post<{ message: string }>(
                      `/admin/admin-users/${row.id}/reset-password`
                    );
                    toast.success(r.message);
                  },
                })
              }
            >
              Reset password
            </Button>
            <Button
              size="small"
              color={row.status === 'ACTIVE' ? 'error' : 'success'}
              onClick={() =>
                update(
                  row,
                  { status: row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                  row.status === 'ACTIVE' ? 'Deactivated' : 'Activated'
                )
              }
            >
              {row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </Stack>
        ),
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => setCreating(true)}
        >
          Invite admin
        </Button>
      </Stack>
      <ServerGrid
        rows={data?.data ?? []}
        total={data?.meta.total ?? 0}
        columns={columns}
        loading={isLoading}
        error={error}
        onRetry={() => mutate()}
        gridProps={grid.gridProps}
      />
      {creating && <CreateAdminDialog roles={roles ?? []} onClose={() => setCreating(false)} />}
      {dialog}
    </>
  );
}

function CreateAdminDialog({ roles, onClose }: { roles: Role[]; onClose: () => void }) {
  const methods = useForm({
    resolver: zodResolver(
      z.object({
        name: z.string().trim().min(2, { error: 'Name is required' }),
        email: z.email({ error: 'Enter a valid email' }),
        password: z
          .string()
          .min(8, { error: 'At least 8 characters' })
          .regex(/[a-z]/, { error: 'Add a lowercase letter' })
          .regex(/[A-Z]/, { error: 'Add an uppercase letter' })
          .regex(/[0-9]/, { error: 'Add a number' }),
        roleId: z.coerce
          .number({ error: 'Choose a role' })
          .int()
          .positive({ error: 'Choose a role' }),
      })
    ) as any,
    defaultValues: { name: '', email: '', password: '', roleId: '' },
  });
  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await api.post('/admin/admin-users', v);
      toast.success('Admin created');
      invalidate('/admin/admin-users');
      onClose();
    } catch (e) {
      handleFormError(e, methods);
    }
  });
  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Invite admin</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Field.Text name="name" label="Full name" />
            <Field.Text name="email" label="Email" />
            <Field.Text
              name="password"
              label="Temporary password"
              type="password"
              helperText="Share securely; they can reset it from the sign-in page."
            />
            <Field.Select name="roleId" label="Role">
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </Field.Select>
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

function RolesMatrix() {
  const { data: roles, error, mutate } = useApi<Role[]>('/admin/roles');
  const { data: perms } = useApi<Permission[]>('/admin/permissions');
  const [draft, setDraft] = useState<Record<number, string[]>>({});
  const [newRole, setNewRole] = useState('');

  const modules = useMemo(() => {
    const map = new Map<string, Permission[]>();
    perms?.forEach((p) => map.set(p.module, [...(map.get(p.module) ?? []), p]));
    return [...map.entries()];
  }, [perms]);

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (!roles || !perms) return null;

  const keysFor = (r: Role) => draft[r.id] ?? r.permissionKeys;
  const toggle = (r: Role, key: string) => {
    const cur = keysFor(r);
    setDraft((d) => ({
      ...d,
      [r.id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
    }));
  };
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    try {
      for (const [id, keys] of Object.entries(draft))
        await api.patch(`/admin/roles/${id}`, { permissionKeys: keys });
      toast.success('Permissions saved');
      setDraft({});
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const create = async () => {
    try {
      await api.post('/admin/roles', { name: newRole, permissionKeys: ['dashboard.view'] });
      setNewRole('');
      mutate();
      toast.success('Role created');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <Card>
      <Stack
        direction="row"
        spacing={2}
        sx={{ p: 2 }}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
          Permissions are enforced by the API on every request — hiding a menu is not the only
          protection.
        </Typography>
        <TextField
          size="small"
          placeholder="New role name"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
        />
        <Button variant="outlined" disabled={newRole.trim().length < 2} onClick={create}>
          Add role
        </Button>
        <Button variant="contained" disabled={!dirty} onClick={save}>
          Save changes
        </Button>
      </Stack>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Permission</TableCell>
              {roles.map((r) => (
                <TableCell key={r.id} align="center">
                  <Typography variant="subtitle2">{r.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {r.userCount} admin(s)
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {modules.map(([module, list]) => [
              <TableRow key={module}>
                <TableCell
                  colSpan={roles.length + 1}
                  sx={{ bgcolor: 'background.neutral', typography: 'overline' }}
                >
                  {module}
                </TableCell>
              </TableRow>,
              ...list.map((p) => (
                <TableRow key={p.key} hover>
                  <TableCell>
                    <Typography variant="body2">{p.description}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {p.key}
                    </Typography>
                  </TableCell>
                  {roles.map((r) => (
                    <TableCell key={r.id} align="center">
                      <Checkbox
                        checked={keysFor(r).includes(p.key)}
                        disabled={r.key === 'super_admin'}
                        onChange={() => toggle(r, p.key)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              )),
            ])}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

// ======================================================================
// Audit logs
// ======================================================================

type AuditEntry = {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  adminUser: { id: number; name: string; email: string } | null;
};

export function AuditLogView() {
  const grid = useGridState();
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const { data, isLoading, error, mutate } = useList<AuditEntry>('/admin/audit-logs', {
    ...grid.state,
    entityType,
    action,
    search: search || undefined,
  });
  const entityTypes: string[] = (data as any)?.entityTypes ?? [];

  const columns: GridColDef<AuditEntry>[] = [
    {
      field: 'createdAt',
      headerName: 'When',
      width: 170,
      sortable: false,
      renderCell: ({ row }) => fDate(row.createdAt, true),
    },
    {
      field: 'adminUser',
      headerName: 'Admin',
      width: 180,
      sortable: false,
      valueGetter: (_, r) => r.adminUser?.name ?? 'System',
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <Label
          variant="soft"
          color={
            row.action === 'delete' ? 'error' : row.action === 'create' ? 'success' : 'default'
          }
        >
          {row.action}
        </Label>
      ),
    },
    {
      field: 'entityType',
      headerName: 'Entity',
      width: 160,
      sortable: false,
      valueGetter: (_, r) => `${r.entityType}${r.entityId ? ` #${r.entityId}` : ''}`,
    },
    { field: 'summary', headerName: 'Summary', flex: 1, minWidth: 240, sortable: false },
  ];

  return (
    <Page title="Audit logs">
      <ServerGrid
        rows={data?.data ?? []}
        total={data?.meta.total ?? 0}
        columns={columns}
        loading={isLoading}
        error={error}
        onRetry={() => mutate()}
        gridProps={grid.gridProps}
        onRowClick={setSelected}
        emptyTitle="No audit entries"
        toolbar={
          <Stack direction="row" spacing={2} sx={{ p: 2 }} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Search summary…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 220 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="eva:search-fill" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              size="small"
              label="Entity"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">All</MenuItem>
              {entityTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              {[
                'create',
                'update',
                'delete',
                'publish',
                'unpublish',
                'archive',
                'activate',
                'deactivate',
                'suspend',
                'restore',
                'export',
                'upload',
                'replace',
                'password_reset_sent',
              ].map((a) => (
                <MenuItem key={a} value={a}>
                  {humanize(a)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        }
      />
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        slotProps={{ paper: { sx: { width: { xs: 1, md: 640 }, p: 3 } } }}
      >
        {selected && (
          <Stack spacing={2}>
            <Typography variant="h6">{selected.summary ?? selected.action}</Typography>
            <Box>
              <KeyValue label="When">{fDate(selected.createdAt, true)}</KeyValue>
              <KeyValue label="Admin">
                {selected.adminUser
                  ? `${selected.adminUser.name} (${selected.adminUser.email})`
                  : 'System'}
              </KeyValue>
              <KeyValue label="Entity">
                {selected.entityType} {selected.entityId && `#${selected.entityId}`}
              </KeyValue>
              <KeyValue label="IP address">{selected.ipAddress ?? '—'}</KeyValue>
              <KeyValue label="Device">{selected.userAgent ?? '—'}</KeyValue>
            </Box>
            <JsonDiff before={selected.beforeJson} after={selected.afterJson} />
          </Stack>
        )}
      </Drawer>
    </Page>
  );
}

function JsonDiff({ before, after }: { before: unknown; after: unknown }) {
  const b = (before && typeof before === 'object' ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === 'object' ? after : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(
    (k) => !['updatedAt', 'createdAt'].includes(k)
  );
  const changed = keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  const fmt = (v: unknown) =>
    v === undefined ? '—' : typeof v === 'string' ? v : JSON.stringify(v, null, 1);

  if (!before && !after)
    return (
      <Typography sx={{ color: 'text.secondary' }}>
        No data snapshot recorded for this action.
      </Typography>
    );
  if (!changed.length)
    return <Typography sx={{ color: 'text.secondary' }}>No field changes.</Typography>;

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Field</TableCell>
          <TableCell>Before</TableCell>
          <TableCell>After</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {changed.map((k) => (
          <TableRow key={k}>
            <TableCell sx={{ fontWeight: 600, verticalAlign: 'top' }}>{k}</TableCell>
            <TableCell
              sx={{
                color: 'error.main',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: 12,
                verticalAlign: 'top',
              }}
            >
              {fmt(b[k])}
            </TableCell>
            <TableCell
              sx={{
                color: 'success.main',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: 12,
                verticalAlign: 'top',
              }}
            >
              {fmt(a[k])}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ======================================================================
// Account
// ======================================================================

export function AccountView() {
  const { user } = useAuthContext();
  const methods = useForm({
    resolver: zodResolver(
      z
        .object({
          currentPassword: z.string().min(1, { error: 'Required' }),
          newPassword: z
            .string()
            .min(8, { error: 'At least 8 characters' })
            .regex(/[a-z]/, { error: 'Add a lowercase letter' })
            .regex(/[A-Z]/, { error: 'Add an uppercase letter' })
            .regex(/[0-9]/, { error: 'Add a number' }),
          confirmPassword: z.string(),
        })
        .refine((v) => v.newPassword === v.confirmPassword, {
          path: ['confirmPassword'],
          error: 'Passwords do not match',
        })
    ),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const onSubmit = methods.handleSubmit(async (v) => {
    try {
      await api.post('/auth/change-password', v);
      toast.success('Password changed');
      methods.reset();
    } catch (e) {
      handleFormError(e, methods);
    }
  });

  return (
    <Page title="My account">
      <Stack spacing={3} sx={{ maxWidth: 640 }}>
        <Card sx={{ p: 3 }}>
          <KeyValue label="Name">{user?.name}</KeyValue>
          <KeyValue label="Email">{user?.email}</KeyValue>
          <KeyValue label="Role">{user?.roleName}</KeyValue>
          <KeyValue label="Permissions">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(user?.permissions ?? []).map((p: string) => (
                <Label key={p} variant="soft">
                  {p}
                </Label>
              ))}
            </Box>
          </KeyValue>
        </Card>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Change password
          </Typography>
          <Form methods={methods} onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <Field.Text name="currentPassword" label="Current password" type="password" />
              <Field.Text name="newPassword" label="New password" type="password" />
              <Field.Text name="confirmPassword" label="Confirm new password" type="password" />
              <Box>
                <Button type="submit" variant="contained" loading={methods.formState.isSubmitting}>
                  Update password
                </Button>
              </Box>
            </Stack>
          </Form>
        </Card>
      </Stack>
    </Page>
  );
}
