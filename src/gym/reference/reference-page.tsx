import { useParams } from 'src/routes/hooks';

import { findResource } from './config';
import { Page } from '../components/common';
import { ReferenceView } from './reference-view';

// ----------------------------------------------------------------------

export function ReferencePage() {
  const { resource } = useParams();
  const config = findResource(resource);
  if (!config) return <Page title="Not found">Unknown catalog section.</Page>;
  return <ReferenceView key={config.key} config={config} />;
}
