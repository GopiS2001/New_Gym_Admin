import type { GridColDef, GridSortModel, GridPaginationModel } from '@mui/x-data-grid';

import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import { DataGrid, gridClasses } from '@mui/x-data-grid';

import { EmptyContent } from 'src/components/empty-content';

import { ErrorState } from './common';

// ----------------------------------------------------------------------

export type GridState = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/** Pagination + sort state in the shape the API expects. */
export function useGridState(initial: Partial<GridState> = {}) {
  const [state, setState] = useState<GridState>({ page: 1, limit: 10, ...initial });

  // Keep these referentially stable: the DataGrid treats a new sortModel array as a sort
  // change and jumps back to the first page, which broke "next page" navigation.
  const paginationModel = useMemo<GridPaginationModel>(
    () => ({ page: state.page - 1, pageSize: state.limit }),
    [state.page, state.limit]
  );
  const sortModel = useMemo<GridSortModel>(
    () => (state.sortBy ? [{ field: state.sortBy, sort: state.sortOrder ?? 'asc' }] : []),
    [state.sortBy, state.sortOrder]
  );

  return {
    state,
    resetPage: () => setState((s) => ({ ...s, page: 1 })),
    gridProps: {
      paginationModel,
      sortModel,
      onPaginationModelChange: (m: GridPaginationModel) =>
        setState((s) => ({ ...s, page: m.page + 1, limit: m.pageSize })),
      onSortModelChange: (m: GridSortModel) =>
        setState((s) => {
          const sortBy = m[0]?.field;
          const sortOrder = (m[0]?.sort ?? undefined) as GridState['sortOrder'];
          // Ignore no-op notifications so they don't reset the current page.
          if (sortBy === s.sortBy && (sortOrder ?? 'asc') === (s.sortOrder ?? 'asc')) return s;
          return { ...s, page: 1, sortBy, sortOrder };
        }),
    },
  };
}

type Props = {
  rows: any[];
  columns: GridColDef[];
  total: number;
  loading?: boolean;
  error?: Error;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbar?: React.ReactNode;
  onRowClick?: (row: any) => void;
  gridProps: ReturnType<typeof useGridState>['gridProps'];
  rowHeight?: number | 'auto';
};

/** DataGrid with server-side pagination & sorting, plus empty and error states. */
export function ServerGrid({
  rows,
  columns,
  total,
  loading,
  error,
  onRetry,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  toolbar,
  onRowClick,
  gridProps,
  rowHeight = 'auto',
}: Props) {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column' }}>
      {toolbar}
      {error && (
        <div style={{ padding: 16 }}>
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      )}
      <DataGrid
        disableRowSelectionOnClick
        disableColumnFilter
        paginationMode="server"
        sortingMode="server"
        rows={rows}
        columns={columns}
        rowCount={total}
        loading={loading}
        pageSizeOptions={[10, 20, 50, 100]}
        getRowHeight={() => rowHeight}
        onRowClick={onRowClick ? (p) => onRowClick(p.row) : undefined}
        {...gridProps}
        slots={{
          noRowsOverlay: () => <EmptyContent title={emptyTitle} description={emptyDescription} />,
        }}
        slotProps={{ loadingOverlay: { variant: 'skeleton', noRowsVariant: 'skeleton' } }}
        sx={{
          minHeight: 420,
          [`& .${gridClasses.cell}`]: { display: 'flex', alignItems: 'center', py: 1 },
          ...(onRowClick ? { [`& .${gridClasses.row}`]: { cursor: 'pointer' } } : {}),
        }}
      />
    </Card>
  );
}
