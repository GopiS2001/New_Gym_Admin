import type { GridColDef, GridSortModel, GridPaginationModel } from '@mui/x-data-grid';

import { useState } from 'react';

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

  const paginationModel: GridPaginationModel = { page: state.page - 1, pageSize: state.limit };
  const sortModel: GridSortModel = state.sortBy
    ? [{ field: state.sortBy, sort: state.sortOrder ?? 'asc' }]
    : [];

  return {
    state,
    resetPage: () => setState((s) => ({ ...s, page: 1 })),
    gridProps: {
      paginationModel,
      sortModel,
      onPaginationModelChange: (m: GridPaginationModel) =>
        setState((s) => ({ ...s, page: m.page + 1, limit: m.pageSize })),
      onSortModelChange: (m: GridSortModel) =>
        setState((s) => ({
          ...s,
          page: 1,
          sortBy: m[0]?.field,
          sortOrder: (m[0]?.sort ?? undefined) as GridState['sortOrder'],
        })),
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
