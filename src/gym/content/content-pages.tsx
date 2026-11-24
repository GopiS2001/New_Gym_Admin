import { gymPaths } from '../paths';
import { ContentList } from './content-list';
import { DifficultyLabel } from '../components/common';

// ----------------------------------------------------------------------

export function ContentPage({ kind }: { kind: 'coaches' | 'templates' | 'collections' }) {
  if (kind === 'coaches') {
    return (
      <ContentList
        key={kind}
        title="Coaches"
        apiPath="/admin/coaches"
        icon="solar:user-id-bold"
        roundAvatar
        newHref={gymPaths.coaches.new}
        editHref={gymPaths.coaches.edit}
        subtitle={(r) => r.headline ?? `${r.programCount ?? 0} programs`}
        extraColumns={[
          {
            field: 'programCount',
            headerName: 'Programs',
            width: 100,
            type: 'number',
            sortable: false,
          },
        ]}
        emptyDescription="Coach profiles are informational. Only verified credentials are shown to members."
      />
    );
  }
  if (kind === 'templates') {
    return (
      <ContentList
        key={kind}
        title="Workout templates"
        apiPath="/admin/workout-templates"
        icon="solar:clipboard-list-bold-duotone"
        newHref={gymPaths.templates.new}
        editHref={gymPaths.templates.edit}
        subtitle={(r) =>
          [r.goal?.name, r.split, `${r.daysPerWeek}×/week`].filter(Boolean).join(' · ')
        }
        extraColumns={[
          {
            field: 'difficulty',
            headerName: 'Difficulty',
            width: 130,
            renderCell: ({ row }) => <DifficultyLabel value={row.difficulty} />,
          },
          {
            field: 'exercises',
            headerName: 'Exercises',
            width: 100,
            sortable: false,
            valueGetter: (_, r) => r.exercises?.length ?? 0,
          },
        ]}
        emptyDescription="Templates are reusable workout structures, separate from multi-week programs."
      />
    );
  }
  return (
    <ContentList
      key={kind}
      title="Featured collections"
      apiPath="/admin/collections"
      icon="solar:star-bold-duotone"
      newHref={gymPaths.collections.new}
      editHref={gymPaths.collections.edit}
      subtitle={(r) =>
        `${r.exercises?.length ?? 0} exercises · ${r.programs?.length ?? 0} programs${r.isFeatured ? ' · featured' : ''}`
      }
      emptyDescription="Curate exercises and programs for Home and Explore."
    />
  );
}
