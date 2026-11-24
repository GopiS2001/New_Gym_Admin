import { useRef, useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';
import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CardActionArea from '@mui/material/CardActionArea';
import LinearProgress from '@mui/material/LinearProgress';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';

import { Iconify } from 'src/gym/components/icon';

import { toast } from 'src/components/snackbar';
import { EmptyContent } from 'src/components/empty-content';

import { api, useList, invalidate } from '../api';

// ----------------------------------------------------------------------

export type MediaAsset = {
  id: number;
  publicUrl: string;
  thumbnailUrl: string | null;
  mediaType: 'IMAGE' | 'VIDEO';
  mimeType: string;
  sizeBytes: number;
  originalName: string;
  altText: string | null;
  folder: string | null;
  metadata: { width?: number; height?: number } | null;
  createdAt: string;
  uploadedBy?: { id: number; name: string } | null;
};

export const MEDIA_FOLDERS = [
  'exercises',
  'programs',
  'coaches',
  'categories',
  'goals',
  'equipment',
  'muscles',
  'collections',
  'avatars',
  'general',
];

export function fBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const ACCEPT = {
  IMAGE: 'image/jpeg,image/png,image/webp,image/avif,image/gif',
  VIDEO: 'video/mp4,video/webm,video/quicktime',
};

/** Uploads a file to the media library and returns the asset. */
export function useUpload(folder: string) {
  const [progress, setProgress] = useState<number | null>(null);

  const upload = async (file: File) => {
    setProgress(0);
    try {
      const asset = await api.upload<MediaAsset>(
        '/admin/media',
        file,
        { folder },
        'post',
        setProgress
      );
      invalidate('/admin/media');
      return asset;
    } finally {
      setProgress(null);
    }
  };
  return { upload, progress, uploading: progress !== null };
}

// ----------------------------------------------------------------------

type LibraryDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
  mediaType?: 'IMAGE' | 'VIDEO';
};

export function MediaLibraryDialog({ open, onClose, onSelect, mediaType }: LibraryDialogProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const q = useDebounce(search, 300);
  const { data, isLoading } = useList<MediaAsset>(open ? '/admin/media' : null, {
    mediaType,
    search: q || undefined,
    page: page + 1,
    limit: 24,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Choose from media library</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by file name or alt text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          sx={{ mb: 2 }}
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
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        {!isLoading && !data?.data.length && (
          <EmptyContent
            title="No media found"
            description="Upload files from the Media library page or directly in the form."
          />
        )}
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
          }}
        >
          {data?.data.map((a) => (
            <Card key={a.id} variant="outlined">
              <CardActionArea onClick={() => onSelect(a)}>
                <MediaThumb asset={a} height={120} />
                <Typography variant="caption" noWrap sx={{ display: 'block', px: 1, py: 0.75 }}>
                  {a.originalName}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
        {!!data?.meta.total && (
          <TablePagination
            component="div"
            count={data.meta.total}
            page={page}
            rowsPerPage={24}
            rowsPerPageOptions={[24]}
            onPageChange={(_, p) => setPage(p)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function MediaThumb({
  asset,
  height = 140,
}: {
  asset: Pick<MediaAsset, 'publicUrl' | 'thumbnailUrl' | 'mediaType' | 'altText'>;
  height?: number;
}) {
  if (asset.mediaType === 'VIDEO') {
    return (
      <Box
        sx={{
          height,
          bgcolor: 'grey.900',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <video
          src={asset.publicUrl}
          muted
          preload="metadata"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Iconify
          icon="solar:play-circle-bold"
          width={40}
          sx={{ position: 'absolute', color: 'common.white' }}
        />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      loading="lazy"
      src={asset.thumbnailUrl ?? asset.publicUrl}
      alt={asset.altText ?? ''}
      sx={{ width: 1, height, objectFit: 'cover', display: 'block', bgcolor: 'background.neutral' }}
    />
  );
}

// ----------------------------------------------------------------------

type MediaFieldProps = {
  name: string;
  label: string;
  folder: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  helperText?: string;
  aspectRatio?: string;
};

/**
 * Form field holding a media URL. Upload a new file (stored in the media
 * library), pick an existing asset, or paste an external URL.
 */
export function MediaField({
  name,
  label,
  folder,
  mediaType = 'IMAGE',
  helperText,
  aspectRatio = '16 / 9',
}: MediaFieldProps) {
  const { control } = useFormContext();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, progress, uploading } = useUpload(folder);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const url: string | null = field.value || null;

        const onFile = async (file?: File) => {
          if (!file) return;
          try {
            const asset = await upload(file);
            field.onChange(asset.publicUrl);
            toast.success('Uploaded');
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Upload failed');
          }
        };

        return (
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">{label}</Typography>
            <Box
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
              sx={{
                aspectRatio,
                maxHeight: 280,
                borderRadius: 1.5,
                overflow: 'hidden',
                position: 'relative',
                border: (t) =>
                  `1px dashed ${error ? t.vars.palette.error.main : t.vars.palette.divider}`,
                bgcolor: 'background.neutral',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {url ? (
                mediaType === 'VIDEO' ? (
                  <video
                    src={url}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={url}
                    alt=""
                    sx={{ width: 1, height: 1, objectFit: 'cover' }}
                  />
                )
              ) : (
                <Stack
                  alignItems="center"
                  spacing={1}
                  sx={{ color: 'text.disabled', p: 2, textAlign: 'center' }}
                >
                  <Iconify
                    icon={
                      mediaType === 'VIDEO'
                        ? 'solar:videocamera-record-bold-duotone'
                        : 'solar:gallery-add-bold-duotone'
                    }
                    width={40}
                  />
                  <Typography variant="caption">
                    Drop a file here, upload, or pick from the library
                  </Typography>
                </Stack>
              )}
              {uploading && (
                <LinearProgress
                  variant="determinate"
                  value={progress ?? 0}
                  sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
                />
              )}
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="soft"
                loading={uploading}
                startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                onClick={() => inputRef.current?.click()}
              >
                Upload
              </Button>
              <Button
                size="small"
                variant="soft"
                startIcon={<Iconify icon="solar:gallery-wide-bold" />}
                onClick={() => setLibraryOpen(true)}
              >
                Library
              </Button>
              {url && (
                <Button
                  size="small"
                  color="error"
                  startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  onClick={() => field.onChange(null)}
                >
                  Remove
                </Button>
              )}
            </Stack>
            <TextField
              size="small"
              label="or paste a URL"
              value={url ?? ''}
              onChange={(e) => field.onChange(e.target.value || null)}
            />
            {(error?.message || helperText) && (
              <FormHelperText error={!!error}>{error?.message ?? helperText}</FormHelperText>
            )}

            <input
              ref={inputRef}
              hidden
              type="file"
              accept={ACCEPT[mediaType]}
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <MediaLibraryDialog
              open={libraryOpen}
              mediaType={mediaType}
              onClose={() => setLibraryOpen(false)}
              onSelect={(a) => {
                field.onChange(a.publicUrl);
                setLibraryOpen(false);
              }}
            />
          </Stack>
        );
      }}
    />
  );
}
