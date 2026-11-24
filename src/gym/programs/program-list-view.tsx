import type { GridColDef } from '@mui/x-data-grid';
import type { Program, ContentStatus } from '../api';

import { useDebounce } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridActionsCellItem } from '@mui/x-data-grid';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { gymPaths } from '../paths';
import { Iconify } from '../components/icon';
import { P, usePermissions } from '../permissions';
import { ServerGrid, useGridState } from '../components/server-grid';
import { api, useList, invalidate, useOptions, DIFFICULTIES } from '../api';
import { Page, fDate, useConfirm, StatusLabel, DifficultyLabel } from '../components/common';

// ----------------------------------------------------------------------

export function ProgramListView() {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can(P.CONTENT_MANAGE);
  const grid = useGridState({ sortBy: 'updatedAt', sortOrder: 'desc' });
  const { confirm, dialog } = useConfirm();
  const [status, setStatus] = useState<'all' | ContentStatus>('all');
  const [search, setSearch] = useState('');
  const [goalId, setGoalId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const q = useDebounce(search, 300);
  const { options: goals } = useOptions('/admin/goals');

  const { resetPage } = grid;
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, goalId, difficulty]);

  const { data, isLoading, error, mutate } = useList<Program>('/admin/programs', {
    ...grid.state,
    search: q || undefined,
    status: status === 'all' ? undefined : status,
    goalId,
    difficulty,
  });
  const counts = data?.statusCounts ?? {};

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      invalidate('/admin/programs');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const columns = useMemo<GridColDef<Program>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Program',
        flex: 1,
        minWidth: 280,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              variant="rounded"
              src={row.imageUrl ?? undefined}
              sx={{ width: 64, height: 48 }}
            >
              <Iconify icon="solar:notebook-bold-duotone" />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {row.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
                {row.goal?.name ?? 'No goal'} {row.coach ? `· ${row.coach.name}` : ''}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        field: 'durationWeeks',
        headerName: 'Schedule',
        width: 150,
        renderCell: ({ row }) => `${row.durationWeeks} wk · ${row.daysPerWeek}×/wk`,
      },
      {
        field: 'difficulty',
        headerName: 'Difficulty',
        width: 130,
        renderCell: ({ row }) => <DifficultyLabel value={row.difficulty} />,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusLabel status={row.status} />,
      },
      {
        field: 'enrollmentCount',
        headerName: 'Followers',
        width: 100,
        type: 'number',
        sortable: false,
      },
      {
        field: 'updatedAt',
        headerName: 'Updated',
        width: 130,
        renderCell: ({ row }) => fDate(row.updatedAt),
      },
      {
        type: 'actions',
        field: 'actions',
        width: 60,
        getActions: ({ row }) => [
          <GridActionsCellItem
            showInMenu
            key="preview"
            label="Preview"
            icon={<Iconify icon="solar:eye-bold" />}
            onClick={() => router.push(gymPaths.programs.preview(row.id))}
          />,
          ...(canManage
            ? [
                <GridActionsCellItem
                  showInMenu
                  key="edit"
                  label="Edit"
                  icon={<Iconify icon="solar:pen-bold" />}
                  onClick={() => router.push(gymPaths.programs.edit(row.id))}
                />,
                <GridActionsCellItem
                  showInMenu
                  key="dup"
                  label="Duplicate"
                  icon={<Iconify icon="solar:copy-bold" />}
                  onClick={() =>
                    act(
                      () => api.post(`/admin/programs/${row.id}/duplicate`),
                      'Duplicated as draft'
                    )
                  }
                />,
                row.status === 'PUBLISHED' ? (
                  <GridActionsCellItem
                    showInMenu
                    key="unpub"
                    label="Unpublish"
                    icon={<Iconify icon="solar:eye-closed-bold" />}
                    onClick={() =>
                      act(
                        () => api.patch(`/admin/programs/${row.id}/status`, { status: 'DRAFT' }),
                        'Unpublished'
                      )
                    }
                  />
                ) : (
                  <GridActionsCellItem
                    showInMenu
                    key="pub"
                    label="Publish"
                    icon={<Iconify icon="solar:check-circle-bold" />}
                    onClick={() =>
                      act(
                        () =>
                          api.patch(`/admin/programs/${row.id}/status`, { status: 'PUBLISHED' }),
                        'Published'
                      )
                    }
                  />
                ),
                row.status === 'ARCHIVED' ? (
                  <GridActionsCellItem
                    showInMenu
                    key="restore"
                    label="Restore to draft"
                    icon={<Iconify icon="solar:restart-bold" />}
                    onClick={() =>
                      act(
                        () => api.patch(`/admin/programs/${row.id}/status`, { status: 'DRAFT' }),
                        'Restored'
                      )
                    }
                  />
                ) : (
                  <GridActionsCellItem
                    showInMenu
                    key="arch"
                    label="Archive"
                    icon={<Iconify icon="solar:archive-down-minimlistic-bold" />}
                    onClick={() =>
                      act(
                        () => api.patch(`/admin/programs/${row.id}/status`, { status: 'ARCHIVED' }),
                        'Archived'
                      )
                    }
                  />
                ),
                <GridActionsCellItem
                  showInMenu
                  key="del"
                  label="Delete"
                  icon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  style={{ color: 'var(--palette-error-main)' }}
                  onClick={() =>
                    confirm({
                      title: 'Delete program permanently?',
                      content: 'Programs that members have followed or saved can only be archived.',
                      confirmText: 'Delete',
                      onConfirm: async () => {
                        await api.delete(`/admin/programs/${row.id}`);
                        toast.success('Deleted');
                        invalidate('/admin/programs');
                      },
                    })
                  }
                />,
              ]
            : []),
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage]
  );

  return (
    <Page
      title="Programs"
      crumbs={[{ name: 'Content' }, { name: 'Programs' }]}
      action={
        canManage && (
          <Button
            component={RouterLink}
            href={gymPaths.programs.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New program
          </Button>
        )
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
        onRowClick={(row) =>
          router.push(
            canManage ? gymPaths.programs.edit(row.id) : gymPaths.programs.preview(row.id)
          )
        }
        emptyTitle="No programs found"
        emptyDescription="Programs are multi-week guided journeys built from published exercises."
        toolbar={
          <>
            <Tabs
              value={status}
              onChange={(_, v) => setStatus(v)}
              sx={{ px: 2.5, boxShadow: (t) => `inset 0 -2px 0 0 ${t.vars.palette.divider}` }}
            >
              {(['all', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((s) => (
                <Tab
                  key={s}
                  value={s}
                  iconPosition="end"
                  label={s === 'all' ? 'All' : s[0] + s.slice(1).toLowerCase()}
                  icon={
                    <Label
                      variant={s === status ? 'filled' : 'soft'}
                      color={s === 'PUBLISHED' ? 'success' : s === 'DRAFT' ? 'warning' : 'default'}
                    >
                      {s === 'all'
                        ? Object.values(counts).reduce((a, b) => a + b, 0)
                        : (counts[s] ?? 0)}
                    </Label>
                  }
                />
              ))}
            </Tabs>
            <Box sx={{ p: 2, gap: 2, display: 'flex', flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search programs…"
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
                label="Goal"
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                sx={{ minWidth: 180 }}
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
                size="small"
                label="Difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All</MenuItem>
                {DIFFICULTIES.map((d) => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </>
        }
      />
      {dialog}
    </Page>
  );
}
