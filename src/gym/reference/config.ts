export type FieldDef =
  | {
      type: 'text' | 'textarea' | 'number';
      name: string;
      label: string;
      required?: boolean;
      helperText?: string;
      half?: boolean;
    }
  | { type: 'switch'; name: string; label: string; helperText?: string }
  | {
      type: 'select';
      name: string;
      label: string;
      options: { value: string; label: string }[];
      required?: boolean;
      half?: boolean;
    }
  | { type: 'refMulti'; name: string; label: string; path: string; helperText?: string }
  | { type: 'image'; name: string; label: string; folder: string }
  | {
      type: 'multiCheck';
      name: string;
      label: string;
      options: { value: string; label: string }[];
      helperText?: string;
    };

export type ColumnKind = 'image' | 'text' | 'status' | 'chips' | 'number' | 'icon' | 'tags';

export type ResourceConfig = {
  key: string;
  label: string;
  singular: string;
  description: string;
  apiPath: string;
  nameField: 'name' | 'label';
  icon: string;
  hasSortOrder: boolean;
  fields: FieldDef[];
  columns: {
    field: string;
    headerName: string;
    kind?: ColumnKind;
    width?: number;
    flex?: number;
  }[];
  /** Optional tab filter (e.g. onboarding option group) */
  groupFilter?: { param: string; options: { value: string; label: string }[] };
  defaults?: Record<string, unknown>;
};

export const LOGGING_FIELDS = [
  { value: 'sets', label: 'Sets' },
  { value: 'reps', label: 'Reps' },
  { value: 'weight', label: 'Weight' },
  { value: 'duration', label: 'Duration' },
  { value: 'distance', label: 'Distance' },
  { value: 'pace', label: 'Pace / speed' },
  { value: 'calories', label: 'Calories (estimate)' },
  { value: 'hold', label: 'Hold duration' },
  { value: 'rest', label: 'Rest timer' },
  { value: 'rpe', label: 'RPE / effort' },
  { value: 'notes', label: 'Notes' },
];

const common = {
  name: { type: 'text', name: 'name', label: 'Name', required: true, half: true } as FieldDef,
  slug: {
    type: 'text',
    name: 'slug',
    label: 'Slug',
    helperText: 'Leave empty to generate from the name',
    half: true,
  } as FieldDef,
  description: { type: 'textarea', name: 'description', label: 'Description' } as FieldDef,
  sortOrder: { type: 'number', name: 'sortOrder', label: 'Display order', half: true } as FieldDef,
  active: { type: 'switch', name: 'active', label: 'Active (visible in the app)' } as FieldDef,
  image: (folder: string) =>
    ({ type: 'image', name: 'imageUrl', label: 'Image', folder }) as FieldDef,
};

const baseColumns = (withImage = true): ResourceConfig['columns'] => [
  ...(withImage ? [{ field: 'imageUrl', headerName: '', kind: 'image' as const, width: 72 }] : []),
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'slug', headerName: 'Slug', width: 180 },
];

export const RESOURCES: ResourceConfig[] = [
  {
    key: 'goals',
    label: 'Goals',
    singular: 'Goal',
    description: 'Fitness goals offered during onboarding and used for recommendations.',
    apiPath: '/admin/goals',
    nameField: 'name',
    icon: 'solar:target-bold-duotone',
    hasSortOrder: true,
    fields: [
      common.name,
      common.slug,
      common.description,
      {
        type: 'text',
        name: 'motivationMessage',
        label: 'Motivation message',
        helperText: 'Shown on the onboarding motivation screen',
      },
      {
        type: 'text',
        name: 'icon',
        label: 'Icon (Iconify name)',
        helperText: 'e.g. solar:dumbbell-large-bold-duotone',
        half: true,
      },
      common.sortOrder,
      common.image('goals'),
      common.active,
    ],
    columns: [
      ...baseColumns(),
      { field: 'sortOrder', headerName: 'Order', kind: 'number', width: 90 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'focus-areas',
    label: 'Focus areas',
    singular: 'Focus area',
    description: 'Body parts members can focus on (onboarding, profile and recommendations).',
    apiPath: '/admin/focus-areas',
    nameField: 'name',
    icon: 'solar:body-bold-duotone',
    hasSortOrder: true,
    fields: [
      common.name,
      common.slug,
      common.description,
      common.sortOrder,
      common.image('categories'),
      common.active,
    ],
    columns: [
      ...baseColumns(),
      { field: 'sortOrder', headerName: 'Order', kind: 'number', width: 90 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'exercise-categories',
    label: 'Exercise categories',
    singular: 'Category',
    description: 'Categories shown in Explore → Exercises.',
    apiPath: '/admin/exercise-categories',
    nameField: 'name',
    icon: 'solar:widget-5-bold-duotone',
    hasSortOrder: true,
    fields: [
      common.name,
      common.slug,
      common.description,
      common.sortOrder,
      common.image('categories'),
      common.active,
    ],
    columns: [
      ...baseColumns(),
      { field: 'sortOrder', headerName: 'Order', kind: 'number', width: 90 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'exercise-types',
    label: 'Exercise types',
    singular: 'Exercise type',
    description: 'Types decide which logging fields the workout logger shows.',
    apiPath: '/admin/exercise-types',
    nameField: 'name',
    icon: 'solar:list-check-bold-duotone',
    hasSortOrder: true,
    fields: [
      common.name,
      common.slug,
      common.description,
      {
        type: 'multiCheck',
        name: 'loggingFields',
        label: 'Logging fields',
        options: LOGGING_FIELDS,
        helperText: 'Fields members fill in when logging this type',
      },
      { type: 'text', name: 'icon', label: 'Icon (Iconify name)', half: true },
      common.sortOrder,
      common.active,
    ],
    defaults: { loggingFields: ['sets', 'reps', 'weight', 'notes'] },
    columns: [
      { field: 'name', headerName: 'Name', flex: 1 },
      { field: 'loggingFields', headerName: 'Logging fields', kind: 'tags', flex: 2 },
      { field: 'sortOrder', headerName: 'Order', kind: 'number', width: 90 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'equipment',
    label: 'Equipment',
    singular: 'Equipment',
    description: 'Individual equipment. Group items (e.g. Full Gym) under Equipment groups.',
    apiPath: '/admin/equipment',
    nameField: 'name',
    icon: 'solar:dumbbell-large-bold-duotone',
    hasSortOrder: true,
    fields: [
      common.name,
      common.slug,
      common.description,
      {
        type: 'refMulti',
        name: 'groupIds',
        label: 'Equipment groups',
        path: '/admin/equipment-groups',
      },
      common.sortOrder,
      common.image('equipment'),
      common.active,
    ],
    defaults: { groupIds: [] },
    columns: [
      ...baseColumns(),
      { field: 'groups', headerName: 'Groups', kind: 'chips', flex: 1 },
      { field: 'sortOrder', headerName: 'Order', kind: 'number', width: 90 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'equipment-groups',
    label: 'Equipment groups',
    singular: 'Equipment group',
    description: 'Convenience selections such as "Full Gym" that expand into equipment.',
    apiPath: '/admin/equipment-groups',
    nameField: 'name',
    icon: 'solar:box-bold-duotone',
    hasSortOrder: true,
    fields: [
      common.name,
      common.slug,
      common.description,
      {
        type: 'refMulti',
        name: 'equipmentIds',
        label: 'Included equipment',
        path: '/admin/equipment',
      },
      common.sortOrder,
      common.image('equipment'),
      common.active,
    ],
    defaults: { equipmentIds: [] },
    columns: [
      ...baseColumns(),
      { field: 'equipment', headerName: 'Equipment', kind: 'chips', flex: 2 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'muscles',
    label: 'Muscles',
    singular: 'Muscle',
    description: 'Muscles used as primary / secondary targets on exercises.',
    apiPath: '/admin/muscles',
    nameField: 'name',
    icon: 'solar:health-bold-duotone',
    hasSortOrder: false,
    fields: [
      common.name,
      common.slug,
      { type: 'text', name: 'muscleGroup', label: 'Muscle group', half: true },
      { type: 'text', name: 'bodyRegion', label: 'Body region', half: true },
      common.description,
      { type: 'image', name: 'imageUrl', label: 'Image / diagram', folder: 'muscles' },
      common.active,
    ],
    columns: [
      ...baseColumns(),
      { field: 'muscleGroup', headerName: 'Group', width: 140 },
      { field: 'bodyRegion', headerName: 'Region', width: 140 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'experience-levels',
    label: 'Experience levels',
    singular: 'Experience level',
    description: 'Strength-training experience ranges asked during onboarding.',
    apiPath: '/admin/experience-levels',
    nameField: 'name',
    icon: 'solar:chart-2-bold-duotone',
    hasSortOrder: true,
    fields: [
      common.name,
      common.slug,
      common.description,
      {
        type: 'number',
        name: 'rank',
        label: 'Rank (0 = newest)',
        helperText: 'Used to match programs to experience',
        half: true,
      },
      common.sortOrder,
      common.active,
    ],
    columns: [
      { field: 'name', headerName: 'Name', flex: 1 },
      { field: 'rank', headerName: 'Rank', kind: 'number', width: 90 },
      { field: 'sortOrder', headerName: 'Order', kind: 'number', width: 90 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
  {
    key: 'onboarding-options',
    label: 'Onboarding options',
    singular: 'Option',
    description: 'Answer options for gender, preferred activity and tracking motivation.',
    apiPath: '/admin/onboarding-options',
    nameField: 'label',
    icon: 'solar:checklist-minimalistic-bold-duotone',
    hasSortOrder: true,
    groupFilter: {
      param: 'group',
      options: [
        { value: 'GENDER', label: 'Gender' },
        { value: 'ACTIVITY', label: 'Preferred activity' },
        { value: 'MOTIVATION', label: 'Tracking motivation' },
      ],
    },
    fields: [
      {
        type: 'select',
        name: 'group',
        label: 'Question',
        required: true,
        half: true,
        options: [
          { value: 'GENDER', label: 'Gender' },
          { value: 'ACTIVITY', label: 'Preferred activity' },
          { value: 'MOTIVATION', label: 'Tracking motivation' },
        ],
      },
      { type: 'text', name: 'label', label: 'Label', required: true, half: true },
      common.slug,
      { type: 'text', name: 'description', label: 'Helper text' },
      { type: 'switch', name: 'allowsFreeText', label: 'Allow free-text answer' },
      common.sortOrder,
      common.image('general'),
      common.active,
    ],
    columns: [
      { field: 'label', headerName: 'Label', flex: 1 },
      { field: 'group', headerName: 'Question', width: 170 },
      { field: 'sortOrder', headerName: 'Order', kind: 'number', width: 90 },
      { field: 'status', headerName: 'Status', kind: 'status', width: 120 },
    ],
  },
];

export const findResource = (key?: string) => RESOURCES.find((r) => r.key === key);
