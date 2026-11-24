import { useState, useEffect } from 'react';
import { useDebounce } from 'minimal-shared/hooks';
import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import FormHelperText from '@mui/material/FormHelperText';

import { Iconify } from 'src/gym/components/icon';

import { useList, useOptions } from '../api';

// ----------------------------------------------------------------------
// Reference selects (value = id or id[])

type RefOption = { id: number; name?: string; label?: string };
const optionLabel = (o: RefOption) => o.name ?? o.label ?? `#${o.id}`;

type RefFieldProps = {
  name: string;
  label: string;
  path: string;
  params?: Record<string, string>;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
};

export function RefMultiField({
  name,
  label,
  path,
  params,
  helperText,
  placeholder,
}: RefFieldProps) {
  const { control } = useFormContext();
  const { options, isLoading } = useOptions<RefOption>(path, params);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const ids: number[] = field.value ?? [];
        const selected = ids.map(
          (id) => options.find((o) => o.id === id) ?? { id, name: `#${id}` }
        );
        return (
          <Autocomplete
            multiple
            loading={isLoading}
            options={options}
            value={selected}
            getOptionLabel={optionLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, v) => field.onChange(v.map((o) => o.id))}
            renderInput={(p) => (
              <TextField
                {...p}
                label={label}
                placeholder={placeholder}
                error={!!error}
                helperText={error?.message ?? helperText}
              />
            )}
            slotProps={{ chip: { size: 'small', variant: 'soft' } }}
          />
        );
      }}
    />
  );
}

export function RefSelectField({ name, label, path, params, helperText, required }: RefFieldProps) {
  const { control } = useFormContext();
  const { options, isLoading } = useOptions<RefOption>(path, params);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const value = field.value ? (options.find((o) => o.id === field.value) ?? null) : null;
        return (
          <Autocomplete
            loading={isLoading}
            options={options}
            value={value}
            getOptionLabel={optionLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            onChange={(_, v) => field.onChange(v?.id ?? null)}
            renderInput={(p) => (
              <TextField
                {...p}
                label={label}
                required={required}
                error={!!error}
                helperText={error?.message ?? helperText}
              />
            )}
          />
        );
      }}
    />
  );
}

// ----------------------------------------------------------------------
// Exercise search (async)

type ExOption = { id: number; name: string; imageUrl: string | null; status?: string };

export function useExerciseSearch(query: string, extra?: Record<string, string>) {
  const debounced = useDebounce(query, 300);
  const { data, isLoading } = useList<ExOption>('/admin/exercises', {
    search: debounced || undefined,
    limit: 25,
    sortBy: 'name',
    sortOrder: 'asc',
    ...extra,
  });
  return { options: data?.data ?? [], isLoading };
}

type ExercisePickerProps = {
  label?: string;
  value: ExOption | null;
  onChange: (v: ExOption | null) => void;
  excludeIds?: number[];
  error?: string;
  size?: 'small' | 'medium';
};

export function ExercisePicker({
  label = 'Exercise',
  value,
  onChange,
  excludeIds = [],
  error,
  size,
}: ExercisePickerProps) {
  const [input, setInput] = useState('');
  const { options, isLoading } = useExerciseSearch(input);

  return (
    <Autocomplete
      size={size}
      value={value}
      options={options.filter((o) => !excludeIds.includes(o.id) || o.id === value?.id)}
      loading={isLoading}
      filterOptions={(x) => x}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, v) => onChange(v)}
      renderOption={(props, o) => (
        <li {...props} key={o.id}>
          <Avatar
            variant="rounded"
            src={o.imageUrl ?? undefined}
            sx={{ width: 32, height: 32, mr: 1.5 }}
          >
            <Iconify icon="solar:dumbbell-large-minimalistic-bold" width={18} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>{o.name}</Box>
          {o.status && o.status !== 'PUBLISHED' && (
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              {o.status.toLowerCase()}
            </Typography>
          )}
        </li>
      )}
      renderInput={(p) => <TextField {...p} label={label} error={!!error} helperText={error} />}
    />
  );
}

/** Ordered list of exercise ids, shown as chips (value = id[]). Needs `initial` for labels. */
export function ExerciseMultiField({
  name,
  label,
  initial = [],
  excludeIds = [],
  helperText,
}: {
  name: string;
  label: string;
  initial?: ExOption[];
  excludeIds?: number[];
  helperText?: string;
}) {
  const { control } = useFormContext();
  const [known, setKnown] = useState<Record<number, ExOption>>({});

  useEffect(() => {
    setKnown((k) => ({ ...k, ...Object.fromEntries(initial.map((o) => [o.id, o])) }));
  }, [initial]);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const ids: number[] = field.value ?? [];
        return (
          <Stack spacing={1.5}>
            <ExercisePicker
              label={label}
              value={null}
              excludeIds={[...ids, ...excludeIds]}
              onChange={(o) => {
                if (!o) return;
                setKnown((k) => ({ ...k, [o.id]: o }));
                field.onChange([...ids, o.id]);
              }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ids.map((id) => (
                <Chip
                  key={id}
                  variant="soft"
                  avatar={
                    <Avatar src={known[id]?.imageUrl ?? undefined}>{known[id]?.name?.[0]}</Avatar>
                  }
                  label={known[id]?.name ?? `Exercise #${id}`}
                  onDelete={() => field.onChange(ids.filter((x) => x !== id))}
                />
              ))}
            </Box>
            {(error?.message || helperText) && (
              <FormHelperText error={!!error}>{error?.message ?? helperText}</FormHelperText>
            )}
          </Stack>
        );
      }}
    />
  );
}

// ----------------------------------------------------------------------
// Ordered string list (instructions, tips, …)

export function StringListField({
  name,
  label,
  placeholder,
  numbered,
  helperText,
}: {
  name: string;
  label: string;
  placeholder?: string;
  numbered?: boolean;
  helperText?: string;
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const items: string[] = field.value ?? [];
        const set = (next: string[]) => field.onChange(next);
        const move = (i: number, dir: -1 | 1) => {
          const next = [...items];
          [next[i], next[i + dir]] = [next[i + dir], next[i]];
          set(next);
        };

        return (
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">{label}</Typography>
            {items.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                {numbered && (
                  <Avatar
                    sx={{
                      width: 28,
                      height: 28,
                      mt: 1.25,
                      fontSize: 13,
                      fontWeight: 700,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    {i + 1}
                  </Avatar>
                )}
                <TextField
                  fullWidth
                  multiline
                  size="small"
                  value={item}
                  placeholder={placeholder}
                  onChange={(e) => set(items.map((x, j) => (j === i ? e.target.value : x)))}
                  error={!!(error as any)?.[i]}
                  helperText={(error as any)?.[i]?.message}
                />
                <Stack direction="row">
                  <IconButton
                    size="small"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    <Iconify icon="eva:arrow-ios-upward-fill" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    <Iconify icon="eva:arrow-ios-downward-fill" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => set(items.filter((_, j) => j !== i))}
                    aria-label="Remove"
                  >
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Stack>
              </Box>
            ))}
            <Box>
              <Button
                size="small"
                startIcon={<Iconify icon="mingcute:add-line" />}
                onClick={() => set([...items, ''])}
              >
                Add {numbered ? 'step' : 'item'}
              </Button>
            </Box>
            {(error?.message || helperText) && (
              <FormHelperText error={!!error?.message}>
                {error?.message ?? helperText}
              </FormHelperText>
            )}
          </Stack>
        );
      }}
    />
  );
}
