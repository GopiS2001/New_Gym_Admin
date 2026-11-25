import type { Theme, SxProps } from '@mui/material/styles';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

type FilterBarProps<F extends Record<string, string>> = {
  /** Search box shown next to the Filters button. Omit to hide it. */
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** The filters currently applied to the table. */
  values: F;
  /** Default ("show everything") value of every filter; used by Reset and the active count. */
  defaults: F;
  /** Called with the drawer's choices when the user clicks Apply. */
  onApply: (values: F) => void;
  /** Filter controls rendered inside the drawer, bound to the draft (not yet applied) values. */
  children: (draft: F, setDraft: (patch: Partial<F>) => void) => React.ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * Table toolbar: optional search + one "Filters" button that opens a drawer with all filter
 * options. Choices in the drawer are a draft and only reach the table when Apply is clicked.
 */
export function FilterBar<F extends Record<string, string>>({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  values,
  defaults,
  onApply,
  children,
  sx,
}: FilterBarProps<F>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraftState] = useState<F>(values);

  const countActive = (f: F) => Object.keys(defaults).filter((k) => f[k] !== defaults[k]).length;
  const activeCount = countActive(values);
  const draftActive = countActive(draft);
  const draftChanged = Object.keys(defaults).some((k) => draft[k] !== values[k]);

  const setDraft = (patch: Partial<F>) => setDraftState((d) => ({ ...d, ...patch }));

  const handleOpen = () => {
    setDraftState(values);
    setOpen(true);
  };

  const handleApply = () => {
    onApply(draft);
    setOpen(false);
  };

  return (
    <>
      <Box
        sx={[
          { p: 2, gap: 2, display: 'flex', alignItems: 'center' },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {onSearchChange && (
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ flexGrow: 1, maxWidth: 360 }}
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
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Button
          color="inherit"
          onClick={handleOpen}
          endIcon={
            <Badge color="error" variant="dot" invisible={!activeCount}>
              <Iconify icon="ic:round-filter-list" />
            </Badge>
          }
        >
          Filters{activeCount ? ` (${activeCount})` : ''}
        </Button>
      </Box>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          backdrop: { invisible: true },
          paper: { sx: { width: { xs: 1, sm: 320 }, display: 'flex', flexDirection: 'column' } },
        }}
      >
        <Box sx={{ py: 2, pr: 1, pl: 2.5, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Filters
          </Typography>

          <IconButton onClick={() => setOpen(false)}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Scrollbar sx={{ flex: '1 1 auto' }}>
          <Stack spacing={3} sx={{ p: 2.5 }}>
            {children(draft, setDraft)}
          </Stack>
        </Scrollbar>

        <Divider />

        <Box sx={{ p: 2.5, gap: 1.5, display: 'flex' }}>
          <Button
            fullWidth
            color="inherit"
            variant="outlined"
            disabled={!draftActive}
            startIcon={<Iconify icon="solar:restart-bold" />}
            onClick={() => setDraftState(defaults)}
          >
            Reset
          </Button>
          <Button fullWidth variant="contained" disabled={!draftChanged} onClick={handleApply}>
            Apply
          </Button>
        </Box>
      </Drawer>
    </>
  );
}

// ----------------------------------------------------------------------

type FilterOptionsProps<T extends string> = {
  title: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
};

/** Single-choice group of chips (used for status / group filters inside the drawer). */
export function FilterOptions<T extends string>({
  title,
  value,
  onChange,
  options,
}: FilterOptionsProps<T>) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Chip
              key={o.value}
              size="small"
              clickable
              label={o.count === undefined ? o.label : `${o.label} (${o.count})`}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => onChange(o.value)}
            />
          );
        })}
      </Box>
    </Box>
  );
}
