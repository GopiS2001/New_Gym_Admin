import type { MediaAsset } from '../components/media';

import { useRef, useState } from 'react';
import { useDebounce } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardActionArea from '@mui/material/CardActionArea';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';

import { toast } from 'src/components/snackbar';
import { EmptyContent } from 'src/components/empty-content';

import { Iconify } from '../components/icon';
import { P, usePermissions } from '../permissions';
import { api, useApi, useList, invalidate } from '../api';
import { fBytes, useUpload, MediaThumb, MEDIA_FOLDERS } from '../components/media';
import { Page, fDate, KeyValue, ErrorState, useConfirm } from '../components/common';

// ----------------------------------------------------------------------

export function MediaView() {
  const { can } = usePermissions();
  const canManage = can(P.MEDIA_MANAGE);
  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [folder, setFolder] = useState('');
  const [uploadFolder, setUploadFolder] = useState('general');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = useDebounce(search, 300);
  const { upload, progress, uploading } = useUpload(uploadFolder);

  const { data, isLoading, error, mutate } = useList<MediaAsset>('/admin/media', {
    search: q || undefined,
    mediaType,
    folder,
    page: page + 1,
    limit: 24,
  });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      try {
        await upload(f);
        toast.success(`Uploaded ${f.name}`);
      } catch (e) {
        toast.error(`${f.name}: ${e instanceof Error ? e.message : 'Upload failed'}`);
      }
    }
  };

  return (
    <Page
      title="Media library"
      action={
        canManage && (
          <Stack direction="row" spacing={1}>
            <TextField
              select
              size="small"
              label="Upload to"
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              {MEDIA_FOLDERS.map((f) => (
                <MenuItem key={f} value={f} sx={{ textTransform: 'capitalize' }}>
                  {f}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              loading={uploading}
              startIcon={<Iconify icon="eva:cloud-upload-fill" />}
              onClick={() => inputRef.current?.click()}
            >
              Upload
            </Button>
          </Stack>
        )
      }
    >
      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <Card
        onDragOver={(e) => {
          if (canManage) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (canManage) onFiles(e.dataTransfer.files);
        }}
        sx={{
          p: 2.5,
          outline: dragging ? (t) => `2px dashed ${t.vars.palette.primary.main}` : 'none',
        }}
      >
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Search file name or alt text…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
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
            label="Type"
            value={mediaType}
            onChange={(e) => {
              setMediaType(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 130 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="IMAGE">Images</MenuItem>
            <MenuItem value="VIDEO">Videos</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Folder"
            value={folder}
            onChange={(e) => {
              setFolder(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            {MEDIA_FOLDERS.map((f) => (
              <MenuItem key={f} value={f} sx={{ textTransform: 'capitalize' }}>
                {f}
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        {uploading && <LinearProgress variant="determinate" value={progress ?? 0} sx={{ mb: 2 }} />}
        <ErrorState error={error} onRetry={() => mutate()} />

        {isLoading && !data ? (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            }}
          >
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} variant="rounded" height={190} />
            ))}
          </Box>
        ) : !data?.data.length ? (
          <EmptyContent
            title="No media yet"
            description={
              canManage
                ? 'Drag files here or use Upload. Images get thumbnails automatically.'
                : undefined
            }
            sx={{ py: 8 }}
          />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            }}
          >
            {data.data.map((a) => (
              <Card key={a.id} variant="outlined">
                <CardActionArea onClick={() => setSelected(a)}>
                  <MediaThumb asset={a} height={140} />
                  <Box sx={{ p: 1.25 }}>
                    <Typography variant="subtitle2" noWrap>
                      {a.originalName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {fBytes(a.sizeBytes)} · {a.folder}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
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
      </Card>

      <MediaDrawer
        asset={selected}
        canManage={canManage}
        onClose={() => setSelected(null)}
        onChanged={(a) => setSelected(a)}
      />
    </Page>
  );
}

function MediaDrawer({
  asset,
  canManage,
  onClose,
  onChanged,
}: {
  asset: MediaAsset | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: (a: MediaAsset | null) => void;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const { confirm, dialog } = useConfirm();
  const { data: usage } = useApi<{
    inUse: boolean;
    references: { table: string; column: string; count: number }[];
  }>(asset ? `/admin/media/${asset.id}/usage` : null);

  const [lastId, setLastId] = useState<number | null>(null);
  if (asset && asset.id !== lastId) {
    setLastId(asset.id);
    setAlt(asset.altText ?? '');
  }

  if (!asset) return <Drawer anchor="right" open={false} onClose={onClose} />;

  const saveAlt = async () => {
    setBusy(true);
    try {
      const a = await api.patch<MediaAsset>(`/admin/media/${asset.id}`, { altText: alt || null });
      toast.success('Saved');
      invalidate('/admin/media');
      onChanged({ ...asset, ...a });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const replace = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      await api.upload<MediaAsset>(`/admin/media/${asset.id}/file`, file, {}, 'put');
      toast.success('File replaced — every reference now shows the new file');
      invalidate('/admin/media');
      onChanged({
        ...asset,
        publicUrl: `${asset.publicUrl.split('?')[0]}?v=${Date.now()}`,
        thumbnailUrl: asset.thumbnailUrl
          ? `${asset.thumbnailUrl.split('?')[0]}?v=${Date.now()}`
          : null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Replace failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: 1, sm: 420 } } } }}
    >
      <Stack direction="row" alignItems="center" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Media details
        </Typography>
        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Stack>
      <Box sx={{ px: 2 }}>
        <Box sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
          {asset.mediaType === 'VIDEO' ? (
            <video src={asset.publicUrl} controls style={{ width: '100%' }} />
          ) : (
            <Box
              component="img"
              src={asset.publicUrl}
              alt={asset.altText ?? ''}
              sx={{ width: 1, display: 'block' }}
            />
          )}
        </Box>
      </Box>
      <Stack spacing={2} sx={{ p: 2 }}>
        <Box>
          <KeyValue label="File">{asset.originalName}</KeyValue>
          <KeyValue label="Type">{asset.mimeType}</KeyValue>
          <KeyValue label="Size">{fBytes(asset.sizeBytes)}</KeyValue>
          {asset.metadata?.width && (
            <KeyValue label="Dimensions">
              {asset.metadata.width} × {asset.metadata.height}
            </KeyValue>
          )}
          <KeyValue label="Uploaded">
            {fDate(asset.createdAt, true)} {asset.uploadedBy ? `by ${asset.uploadedBy.name}` : ''}
          </KeyValue>
        </Box>
        <TextField
          size="small"
          label="Public URL"
          value={asset.publicUrl.split('?')[0]}
          slotProps={{
            input: {
              readOnly: true,
              endAdornment: (
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(asset.publicUrl.split('?')[0]);
                    toast.success('Copied');
                  }}
                >
                  <Iconify icon="solar:copy-bold" />
                </IconButton>
              ),
            },
          }}
        />
        {usage &&
          (usage.inUse ? (
            <Alert severity="info">
              Used by:{' '}
              {usage.references.map((r) => `${r.table.replace(/_/g, ' ')} (${r.count})`).join(', ')}
            </Alert>
          ) : (
            <Alert severity="success">Not referenced by any content.</Alert>
          ))}
        {canManage && (
          <>
            <TextField
              size="small"
              label="Alt text (accessibility)"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
            <Button
              variant="soft"
              onClick={saveAlt}
              loading={busy}
              disabled={alt === (asset.altText ?? '')}
            >
              Save alt text
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              loading={busy}
              startIcon={<Iconify icon="solar:restart-bold" />}
              onClick={() => replaceRef.current?.click()}
            >
              Replace file (keeps URL)
            </Button>
            <input
              ref={replaceRef}
              hidden
              type="file"
              accept={asset.mediaType === 'VIDEO' ? asset.mimeType : 'image/*'}
              onChange={(e) => {
                replace(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <Button
              color="error"
              variant="soft"
              disabled={usage?.inUse}
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
              onClick={() =>
                confirm({
                  title: 'Delete this file?',
                  content: 'The file will be removed from storage permanently.',
                  confirmText: 'Delete',
                  onConfirm: async () => {
                    await api.delete(`/admin/media/${asset.id}`);
                    toast.success('Deleted');
                    invalidate('/admin/media');
                    onChanged(null);
                  },
                })
              }
            >
              {usage?.inUse ? 'In use — cannot delete' : 'Delete'}
            </Button>
          </>
        )}
      </Stack>
      {dialog}
    </Drawer>
  );
}
