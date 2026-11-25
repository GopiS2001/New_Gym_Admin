import type { GridColDef } from '@mui/x-data-grid';
import type { FieldDef, ResourceConfig } from './config';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useDebounce } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import ListItem from '@mui/material/ListItem';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/gym/components/icon';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { MediaField } from '../components/media';
import { api, useList, invalidate } from '../api';
import { P, usePermissions } from '../permissions';
import { RefMultiField } from '../components/fields';
import { ServerGrid, useGridState } from '../components/server-grid';
import { FilterBar, FilterOptions } from '../components/filter-drawer';
import { Page, useConfirm, StatusLabel, handleFormError } from '../components/common';

// ----------------------------------------------------------------------

type Row = Record<string, any> & { id: number; status: 'ACTIVE' | 'INACTIVE' };

const FILTER_DEFAULTS: { status: 'all' | 'ACTIVE' | 'INACTIVE'; group: string } = {
  status: 'all',
  group: '',
};

export function ReferenceView({ config }: { config: ResourceConfig }) {
  const { can } = usePermissions();
  const canManage = can(P.CONTENT_MANAGE);
  const grid = useGridState();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const { status, group } = filters;
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const q = useDebounce(search, 300);
  const { confirm, dialog } = useConfirm();

  const { resetPage } = grid;
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, group, config.key]);

  const { data, isLoading, error, mutate } = useList<Row>(config.apiPath, {
    ...grid.state,
    search: q || undefined,
    status: status === 'all' ? undefined : status,
    ...(config.groupFilter && group ? { [config.groupFilter.param]: group } : {}),
  });

  const refresh = () => invalidate(config.apiPath);

  const toggleStatus = async (row: Row) => {
    const next = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`${config.apiPath}/${row.id}/status`, { status: next });
      toast.success(next === 'ACTIVE' ? 'Activated' : 'Deactivated — hidden from the app');
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const remove = (row: Row) =>
    confirm({
      title: `Delete ${config.singular.toLowerCase()}?`,
      content: (
        <>
          <strong>{row[config.nameField]}</strong> will be permanently deleted. Records that are
          already in use cannot be deleted — deactivate them instead.
        </>
      ),
      confirmText: 'Delete',
      onConfirm: async () => {
        await api.delete(`${config.apiPath}/${row.id}`);
        toast.success('Deleted');
        refresh();
      },
    });

  const columns = useMemo<GridColDef[]>(
    () => [
      ...config.columns.map<GridColDef>((c) => ({
        field: c.field,
        headerName: c.headerName,
        width: c.width,
        flex: c.flex,
        sortable: !['image', 'chips', 'tags'].includes(c.kind ?? ''),
        renderCell: (p) => {
          const v = p.row[c.field];
          switch (c.kind) {
            case 'image':
              return (
                <Avatar variant="rounded" src={v ?? undefined} sx={{ width: 44, height: 44 }}>
                  <Iconify icon={config.icon} />
                </Avatar>
              );
            case 'status':
              return <StatusLabel status={v} />;
            case 'chips':
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(v ?? []).map((x: any) => (
                    <Label key={x.id} variant="soft">
                      {x.name}
                    </Label>
                  ))}
                </Box>
              );
            case 'tags':
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(v ?? []).map((x: string) => (
                    <Label key={x} variant="soft" color="info">
                      {x}
                    </Label>
                  ))}
                </Box>
              );
            default:
              return c.field === config.nameField ? (
                <Typography variant="subtitle2">{v}</Typography>
              ) : (
                <span>{v ?? '—'}</span>
              );
          }
        },
      })),
      {
        field: 'actions',
        headerName: '',
        width: 140,
        sortable: false,
        align: 'right',
        renderCell: (p) =>
          canManage ? (
            <Stack direction="row">
              <Tooltip title="Edit">
                <IconButton onClick={() => setEditing(p.row)}>
                  <Iconify icon="solar:pen-bold" />
                </IconButton>
              </Tooltip>
              <Tooltip title={p.row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                <IconButton onClick={() => toggleStatus(p.row)}>
                  <Iconify
                    icon={p.row.status === 'ACTIVE' ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
                  />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton color="error" onClick={() => remove(p.row)}>
                  <Iconify icon="solar:trash-bin-trash-bold" />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, canManage]
  );

  return (
    <Page
      title={config.label}
      crumbs={[{ name: 'Catalog' }, { name: config.label }]}
      action={
        canManage && (
          <Stack direction="row" spacing={1}>
            {config.hasSortOrder && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<Iconify icon="solar:sort-vertical-bold" />}
                onClick={() => setReorderOpen(true)}
              >
                Reorder
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setEditing('new')}
            >
              New {config.singular.toLowerCase()}
            </Button>
          </Stack>
        )
      }
    >
      <Typography sx={{ color: 'text.secondary', mb: 3, mt: -2 }}>{config.description}</Typography>

      <ServerGrid
        rows={data?.data ?? []}
        total={data?.meta.total ?? 0}
        columns={columns}
        loading={isLoading}
        error={error}
        onRetry={() => mutate()}
        gridProps={grid.gridProps}
        emptyTitle={`No ${config.label.toLowerCase()} yet`}
        emptyDescription={
          canManage
            ? `Create the first ${config.singular.toLowerCase()} to make it available in the app.`
            : undefined
        }
        toolbar={
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            values={filters}
            defaults={FILTER_DEFAULTS}
            onApply={setFilters}
          >
            {(draft, setDraft) => (
              <>
                {config.groupFilter && (
                  <FilterOptions
                    title="Group"
                    value={draft.group}
                    onChange={(v) => setDraft({ group: v })}
                    options={[{ value: '', label: 'All' }, ...config.groupFilter.options]}
                  />
                )}
                <FilterOptions
                  title="Status"
                  value={draft.status}
                  onChange={(v) => setDraft({ status: v })}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </>
            )}
          </FilterBar>
        }
      />

      {editing && (
        <ReferenceFormDialog
          config={config}
          row={editing === 'new' ? null : editing}
          defaultGroup={group}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {reorderOpen && <ReorderDialog config={config} onClose={() => setReorderOpen(false)} />}
      {dialog}
    </Page>
  );
}

// ----------------------------------------------------------------------

function buildSchema(fields: FieldDef[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((f) => {
    switch (f.type) {
      case 'text':
      case 'textarea':
        shape[f.name] = f.required
          ? z
              .string()
              .trim()
              .min(1, { error: `${f.label} is required` })
          : z.string().optional().nullable();
        break;
      case 'number':
        shape[f.name] = z.coerce.number().int().min(0).optional();
        break;
      case 'switch':
        shape[f.name] = z.boolean().optional();
        break;
      case 'select':
        shape[f.name] = f.required
          ? z.string().min(1, { error: `${f.label} is required` })
          : z.string().optional();
        break;
      case 'refMulti':
        shape[f.name] = z.array(z.number()).optional();
        break;
      case 'multiCheck':
        shape[f.name] = z.array(z.string()).min(1, { error: 'Select at least one' });
        break;
      case 'image':
        shape[f.name] = z.string().nullable().optional();
        break;
      default:
        break;
    }
  });
  return z.object(shape);
}

function ReferenceFormDialog({
  config,
  row,
  defaultGroup,
  onClose,
  onSaved,
}: {
  config: ResourceConfig;
  row: Row | null;
  defaultGroup?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const schema = useMemo(() => buildSchema(config.fields), [config.fields]);

  const defaultValues = useMemo(() => {
    const v: Record<string, unknown> = { ...(config.defaults ?? {}) };
    config.fields.forEach((f) => {
      if (f.type === 'switch' && f.name === 'active')
        v.active = row ? row.status === 'ACTIVE' : true;
      else if (row && row[f.name] !== undefined)
        v[f.name] = row[f.name] ?? (f.type === 'number' ? 0 : f.type === 'image' ? null : '');
      else if (v[f.name] === undefined)
        v[f.name] =
          f.type === 'number'
            ? 0
            : f.type === 'switch'
              ? false
              : f.type === 'image'
                ? null
                : f.type === 'refMulti' || f.type === 'multiCheck'
                  ? []
                  : '';
    });
    if (!row && config.groupFilter && defaultGroup) v[config.groupFilter.param] = defaultGroup;
    return v;
  }, [config, row, defaultGroup]);

  const methods = useForm({ resolver: zodResolver(schema) as any, defaultValues });

  // New records: pre-fill "Display order" with the next number from the API
  // (per group for grouped resources such as onboarding options).
  const autoOrder = !row && config.fields.some((f) => f.name === 'sortOrder');
  const groupParam = config.groupFilter?.param;
  const groupValue = groupParam ? (methods.watch(groupParam) as string | undefined) : undefined;
  useEffect(() => {
    if (!autoOrder) return undefined;
    let cancelled = false;
    const qs = groupParam && groupValue ? `?${groupParam}=${encodeURIComponent(groupValue)}` : '';
    api
      .get<{ sortOrder: number }>(`${config.apiPath}/next-sort-order${qs}`)
      .then((r) => {
        if (!cancelled && !methods.getFieldState('sortOrder').isDirty) {
          methods.setValue('sortOrder', r.sortOrder);
        }
      })
      .catch(() => {
        // Keep the default; the API also assigns the next order when none is sent.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOrder, config.apiPath, groupParam, groupValue]);

  const onSubmit = methods.handleSubmit(async (values: Record<string, any>) => {
    const { active, ...rest } = values;
    const body: Record<string, unknown> = {
      ...rest,
      status: active === false ? 'INACTIVE' : 'ACTIVE',
    };
    Object.keys(body).forEach((k) => {
      if (body[k] === '') body[k] = null;
    });
    if (!body.slug) delete body.slug;
    try {
      if (row) await api.patch(`${config.apiPath}/${row.id}`, body);
      else await api.post(config.apiPath, body);
      toast.success(row ? 'Saved' : `${config.singular} created`);
      onSaved();
    } catch (e) {
      handleFormError(e, methods);
    }
  });

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose}>
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>
          {row ? `Edit ${config.singular.toLowerCase()}` : `New ${config.singular.toLowerCase()}`}
        </DialogTitle>
        <DialogContent dividers>
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              pt: 1,
            }}
          >
            {config.fields.map((f) => {
              const full = { gridColumn: { sm: 'half' in f && f.half ? 'auto' : '1 / -1' } };
              switch (f.type) {
                case 'text':
                case 'textarea':
                  return (
                    <Box key={f.name} sx={full}>
                      <Field.Text
                        name={f.name}
                        label={f.label}
                        required={f.required}
                        helperText={f.helperText}
                        multiline={f.type === 'textarea'}
                        minRows={f.type === 'textarea' ? 3 : undefined}
                      />
                    </Box>
                  );
                case 'number':
                  return (
                    <Box key={f.name} sx={full}>
                      <Field.Text
                        name={f.name}
                        label={f.label}
                        type="number"
                        helperText={f.helperText}
                      />
                    </Box>
                  );
                case 'select':
                  return (
                    <Box key={f.name} sx={full}>
                      <Field.Select name={f.name} label={f.label} required={f.required}>
                        {f.options.map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Field.Select>
                    </Box>
                  );
                case 'switch':
                  return (
                    <Box key={f.name} sx={{ gridColumn: '1 / -1' }}>
                      <Field.Switch name={f.name} label={f.label} helperText={f.helperText} />
                    </Box>
                  );
                case 'refMulti':
                  return (
                    <Box key={f.name} sx={{ gridColumn: '1 / -1' }}>
                      <RefMultiField
                        name={f.name}
                        label={f.label}
                        path={f.path}
                        helperText={f.helperText}
                      />
                    </Box>
                  );
                case 'multiCheck':
                  return (
                    <Box key={f.name} sx={{ gridColumn: '1 / -1' }}>
                      <Field.MultiCheckbox
                        row
                        name={f.name}
                        label={f.label}
                        options={f.options}
                        helperText={f.helperText}
                      />
                    </Box>
                  );
                case 'image':
                  return (
                    <Box key={f.name} sx={{ gridColumn: '1 / -1' }}>
                      <MediaField name={f.name} label={f.label} folder={f.folder} />
                    </Box>
                  );
                default:
                  return null;
              }
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={methods.formState.isSubmitting}>
            {row ? 'Save changes' : 'Create'}
          </Button>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

// ----------------------------------------------------------------------

function ReorderDialog({ config, onClose }: { config: ResourceConfig; onClose: () => void }) {
  const { data } = useList<Row>(config.apiPath, {
    limit: 500,
    sortBy: 'sortOrder',
    sortOrder: 'asc',
  });
  const [items, setItems] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const list = items ?? data?.data ?? [];

  const move = (i: number, dir: -1 | 1) => {
    const next = [...list];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setItems(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`${config.apiPath}/reorder`, { ids: list.map((r) => r.id) });
      toast.success('Display order saved');
      invalidate(config.apiPath);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open fullWidth maxWidth="xs" onClose={onClose}>
      <DialogTitle>Display order — {config.label}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <List dense>
          {list.map((r, i) => (
            <ListItem
              key={r.id}
              secondaryAction={
                <>
                  <IconButton size="small" disabled={i === 0} onClick={() => move(i, -1)}>
                    <Iconify icon="eva:arrow-ios-upward-fill" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={i === list.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <Iconify icon="eva:arrow-ios-downward-fill" />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={`${i + 1}. ${r[config.nameField]}`}
                secondary={r.status === 'INACTIVE' ? 'Inactive' : undefined}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" loading={saving} onClick={save} disabled={!items}>
          Save order
        </Button>
      </DialogActions>
    </Dialog>
  );
}
