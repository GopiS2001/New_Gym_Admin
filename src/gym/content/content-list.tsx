import type { GridColDef } from '@mui/x-data-grid';
import type { ContentStatus } from '../api';

import { useDebounce } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GridActionsCellItem } from '@mui/x-data-grid';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { toast } from 'src/components/snackbar';

import { Iconify } from '../components/icon';
import { api, useList, invalidate } from '../api';
import { P, usePermissions } from '../permissions';
import { ServerGrid, useGridState } from '../components/server-grid';
import { Page, fDate, useConfirm, StatusLabel } from '../components/common';

// ----------------------------------------------------------------------

type Row = {
  id: number;
  name: string;
  imageUrl: string | null;
  status: ContentStatus;
  updatedAt: string;
  [k: string]: any;
};

type Props = {
  title: string;
  apiPath: string;
  icon: string;
  newHref: string;
  editHref: (id: number) => string;
  subtitle: (row: Row) => React.ReactNode;
  extraColumns?: GridColDef<Row>[];
  emptyDescription: string;
  roundAvatar?: boolean;
};

/** List screen shared by coaches, workout templates and featured collections. */
export function ContentList({
  title,
  apiPath,
  icon,
  newHref,
  editHref,
  subtitle,
  extraColumns = [],
  emptyDescription,
  roundAvatar,
}: Props) {
  const router = useRouter();
  const { can } = usePermissions();
  const canManage = can(P.CONTENT_MANAGE);
  const grid = useGridState();
  const { confirm, dialog } = useConfirm();
  const [status, setStatus] = useState<'all' | ContentStatus>('all');
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 300);

  const { resetPage } = grid;
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const { data, isLoading, error, mutate } = useList<Row>(apiPath, {
    ...grid.state,
    search: q || undefined,
    status: status === 'all' ? undefined : status,
  });

  const setRowStatus = async (row: Row, next: ContentStatus) => {
    try {
      await api.patch(`${apiPath}/${row.id}/status`, { status: next });
      toast.success(`${next[0]}${next.slice(1).toLowerCase()}`);
      invalidate(apiPath);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    }
  };

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 260,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              variant={roundAvatar ? 'circular' : 'rounded'}
              src={row.imageUrl ?? undefined}
              sx={{ width: 48, height: 48 }}
            >
              <Iconify icon={icon} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {row.name}
              </Typography>
              <Typography variant="caption" component="div" noWrap sx={{ color: 'text.secondary' }}>
                {subtitle(row)}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      ...extraColumns,
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: ({ row }) => <StatusLabel status={row.status} />,
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
        getActions: ({ row }) =>
          canManage
            ? [
                <GridActionsCellItem
                  showInMenu
                  key="edit"
                  label="Edit"
                  icon={<Iconify icon="solar:pen-bold" />}
                  onClick={() => router.push(editHref(row.id))}
                />,
                row.status === 'PUBLISHED' ? (
                  <GridActionsCellItem
                    showInMenu
                    key="unpub"
                    label="Unpublish"
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
                    key="rest"
                    label="Restore to draft"
                    icon={<Iconify icon="solar:restart-bold" />}
                    onClick={() => setRowStatus(row, 'DRAFT')}
                  />
                ) : (
                  <GridActionsCellItem
                    showInMenu
                    key="arch"
                    label="Archive"
                    icon={<Iconify icon="solar:archive-down-minimlistic-bold" />}
                    onClick={() => setRowStatus(row, 'ARCHIVED')}
                  />
                ),
                <GridActionsCellItem
                  showInMenu
                  key="del"
                  label="Delete"
                  style={{ color: 'var(--palette-error-main)' }}
                  icon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  onClick={() =>
                    confirm({
                      title: `Delete "${row.name}"?`,
                      content:
                        'This cannot be undone. Items in use by members can only be archived.',
                      confirmText: 'Delete',
                      onConfirm: async () => {
                        await api.delete(`${apiPath}/${row.id}`);
                        toast.success('Deleted');
                        invalidate(apiPath);
                      },
                    })
                  }
                />,
              ]
            : [],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, apiPath]
  );

  return (
    <Page
      title={title}
      crumbs={[{ name: 'Content' }, { name: title }]}
      action={
        canManage && (
          <Button
            component={RouterLink}
            href={newHref}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New
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
        onRowClick={canManage ? (row) => router.push(editHref(row.id)) : undefined}
        emptyTitle={`No ${title.toLowerCase()} yet`}
        emptyDescription={emptyDescription}
        toolbar={
          <>
            <Tabs
              value={status}
              onChange={(_, v) => setStatus(v)}
              sx={{ px: 2.5, boxShadow: (t) => `inset 0 -2px 0 0 ${t.vars.palette.divider}` }}
            >
              <Tab value="all" label="All" />
              <Tab value="PUBLISHED" label="Published" />
              <Tab value="DRAFT" label="Draft" />
              <Tab value="ARCHIVED" label="Archived" />
            </Tabs>
            <Box sx={{ p: 2 }}>
              <TextField
                size="small"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: 1, maxWidth: 360 }}
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
            </Box>
          </>
        }
      />
      {dialog}
    </Page>
  );
}
