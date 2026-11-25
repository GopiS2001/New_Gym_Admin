import type { GridColDef } from '@mui/x-data-grid';
import type { ExerciseCard, ContentStatus } from '../api';

import { useDebounce } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridActionsCellItem } from '@mui/x-data-grid';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';

import { gymPaths } from '../paths';
import { Iconify } from '../components/icon';
import { P, usePermissions } from '../permissions';
import { ServerGrid, useGridState } from '../components/server-grid';
import { FilterBar, FilterOptions } from '../components/filter-drawer';
import { api, useList, invalidate, useOptions, DIFFICULTIES } from '../api';
import { Page, fDate, useConfirm, StatusLabel, DifficultyLabel } from '../components/common';

// ----------------------------------------------------------------------

const FILTER_DEFAULTS = {
  status: 'all' as 'all' | ContentStatus,
  typeId: '',
  categoryId: '',
  equipmentId: '',
  difficulty: '',
};

export function ExerciseListView() {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can(P.CONTENT_MANAGE);
  const grid = useGridState({ sortBy: 'updatedAt', sortOrder: 'desc' });
  const { confirm, dialog } = useConfirm();

  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const { status, typeId, categoryId, equipmentId, difficulty } = filters;
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 300);

  const { options: types } = useOptions('/admin/exercise-types');
  const { options: categories } = useOptions('/admin/exercise-categories');
  const { options: equipment } = useOptions('/admin/equipment');

  const { resetPage } = grid;
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, typeId, categoryId, equipmentId, difficulty]);

  const { data, isLoading, error, mutate } = useList<ExerciseCard>('/admin/exercises', {
    ...grid.state,
    search: q || undefined,
    status: status === 'all' ? undefined : status,
    typeId,
    categoryId,
    equipmentId,
    difficulty,
  });

  const counts = data?.statusCounts ?? {};
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);
  const filtersActive = !!(q || typeId || categoryId || equipmentId || difficulty);

  const setRowStatus = async (row: ExerciseCard, next: ContentStatus) => {
    try {
      await api.patch(`/admin/exercises/${row.id}/status`, { status: next });
      toast.success(
        {
          PUBLISHED: 'Published',
          DRAFT: 'Moved to draft',
          ARCHIVED: 'Archived — hidden from discovery',
        }[next]
      );
      invalidate('/admin/exercises');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const duplicate = async (row: ExerciseCard) => {
    try {
      const copy = await api.post<{ id: number }>(`/admin/exercises/${row.id}/duplicate`);
      toast.success('Duplicated as draft');
      router.push(gymPaths.exercises.edit(copy.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const remove = (row: ExerciseCard) =>
    confirm({
      title: 'Delete exercise permanently?',
      content: (
        <>
          <strong>{row.name}</strong> will be deleted. Exercises used in programs, workout history
          or member libraries can only be archived.
        </>
      ),
      confirmText: 'Delete',
      onConfirm: async () => {
        await api.delete(`/admin/exercises/${row.id}`);
        toast.success('Deleted');
        invalidate('/admin/exercises');
      },
    });

  const columns = useMemo<GridColDef<ExerciseCard>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Exercise',
        flex: 1,
        minWidth: 280,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              variant="rounded"
              src={row.imageUrl ?? undefined}
              sx={{ width: 56, height: 56, bgcolor: 'background.neutral' }}
            >
              <Iconify
                icon="solar:dumbbell-large-minimalistic-bold"
                sx={{ color: 'text.disabled' }}
              />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {row.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
                {row.categories.map((c) => c.name).join(' · ') || 'No category'}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        field: 'exerciseType',
        headerName: 'Type',
        width: 120,
        sortable: false,
        valueGetter: (_, row) => row.exerciseType?.name,
      },
      {
        field: 'equipment',
        headerName: 'Equipment',
        width: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {row.equipment.slice(0, 3).map((e) => (
              <Label key={e.id} variant="soft">
                {e.name}
              </Label>
            ))}
            {row.equipment.length > 3 && <Label variant="soft">+{row.equipment.length - 3}</Label>}
          </Box>
        ),
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
      { field: 'viewCount', headerName: 'Views', width: 90, type: 'number' },
      { field: 'saveCount', headerName: 'Saves', width: 90, type: 'number', sortable: false },
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
            onClick={() => router.push(gymPaths.exercises.preview(row.id))}
          />,
          ...(canManage
            ? [
                <GridActionsCellItem
                  showInMenu
                  key="edit"
                  label="Edit"
                  icon={<Iconify icon="solar:pen-bold" />}
                  onClick={() => router.push(gymPaths.exercises.edit(row.id))}
                />,
                <GridActionsCellItem
                  showInMenu
                  key="dup"
                  label="Duplicate"
                  icon={<Iconify icon="solar:copy-bold" />}
                  onClick={() => duplicate(row)}
                />,
                row.status === 'PUBLISHED' ? (
                  <GridActionsCellItem
                    showInMenu
                    key="unpub"
                    label="Move to draft"
                    icon={<Iconify icon="solar:eye-closed-bold" />}
                    onClick={() => setRowStatus(row, 'DRAFT')}
                  />
                ) : (
                  <GridActionsCellItem
                    showInMenu
                    key="pub"
                    label="Publish"
                    icon={<Iconify icon="solar:check-circle-bold" />}
                    onClick={() => setRowStatus(row, 'PUBLISHED')}
                  />
                ),
                row.status === 'ARCHIVED' ? (
                  <GridActionsCellItem
                    showInMenu
                    key="restore"
                    label="Restore to draft"
                    icon={<Iconify icon="solar:restart-bold" />}
                    onClick={() => setRowStatus(row, 'DRAFT')}
                  />
                ) : (
                  <GridActionsCellItem
                    showInMenu
                    key="archive"
                    label="Archive"
                    icon={<Iconify icon="solar:archive-down-minimlistic-bold" />}
                    onClick={() => setRowStatus(row, 'ARCHIVED')}
                  />
                ),
                <GridActionsCellItem
                  showInMenu
                  key="del"
                  label="Delete"
                  icon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  onClick={() => remove(row)}
                  style={{ color: 'var(--palette-error-main)' }}
                />,
              ]
            : []),
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage]
  );

  const select = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts: { value: string | number; label: string }[]
  ) => (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    >
      <MenuItem value="">All</MenuItem>
      {opts.map((o) => (
        <MenuItem key={o.value} value={String(o.value)}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Page
      title="Exercises"
      crumbs={[{ name: 'Content' }, { name: 'Exercises' }]}
      action={
        canManage && (
          <Button
            component={RouterLink}
            href={gymPaths.exercises.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New exercise
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
            canManage ? gymPaths.exercises.edit(row.id) : gymPaths.exercises.preview(row.id)
          )
        }
        emptyTitle={filtersActive ? 'No exercises match these filters' : 'No exercises yet'}
        emptyDescription={
          filtersActive
            ? 'Try clearing a filter.'
            : 'Create the first exercise to start the catalogue.'
        }
        toolbar={
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search exercises…"
            values={filters}
            defaults={FILTER_DEFAULTS}
            onApply={setFilters}
          >
            {(draft, setDraft) => (
              <>
                <FilterOptions
                  title="Status"
                  value={draft.status}
                  onChange={(v) => setDraft({ status: v })}
                  options={(['all', 'PUBLISHED', 'DRAFT', 'ARCHIVED'] as const).map((s) => ({
                    value: s,
                    label: s === 'all' ? 'All' : s[0] + s.slice(1).toLowerCase(),
                    count: s === 'all' ? totalAll : (counts[s] ?? 0),
                  }))}
                />
                {select(
                  'Type',
                  draft.typeId,
                  (v) => setDraft({ typeId: v }),
                  types.map((t) => ({ value: t.id, label: t.name }))
                )}
                {select(
                  'Category',
                  draft.categoryId,
                  (v) => setDraft({ categoryId: v }),
                  categories.map((t) => ({ value: t.id, label: t.name }))
                )}
                {select(
                  'Equipment',
                  draft.equipmentId,
                  (v) => setDraft({ equipmentId: v }),
                  equipment.map((t) => ({ value: t.id, label: t.name }))
                )}
                {select(
                  'Difficulty',
                  draft.difficulty,
                  (v) => setDraft({ difficulty: v }),
                  DIFFICULTIES
                )}
              </>
            )}
          </FilterBar>
        }
      />
      {dialog}
    </Page>
  );
}
