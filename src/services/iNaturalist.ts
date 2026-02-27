import type { SpeciesSuggestion } from '../types';
import { getApiToken } from './iNaturalistAuth';

const API_URL = 'https://api.inaturalist.org/v1/computervision/score_image';

// Fish taxa: ray-finned fish + cartilaginous fish
const FISH_TAXON_IDS = [47178, 797045]; // Actinopterygii, Chondrichthyes

export interface FishIdResult {
  topSuggestion: SpeciesSuggestion | null;
  suggestions: SpeciesSuggestion[];
}

export async function identifyFish(photoUri: string): Promise<FishIdResult> {
  const token = await getApiToken();
  if (!token) {
    throw new Error('No iNaturalist token. Paste one in Settings → Fish ID.');
  }

  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'catch.jpg',
  } as any);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'User-Agent': 'FishingJournal/1 (mobile app)',
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`iNaturalist error: ${response.status}`);
  }

  const data = await response.json();
  const results = (data.results ?? []) as any[];

  const suggestions: SpeciesSuggestion[] = results
    .filter((r: any) => {
      // ancestor_ids may be absent in computervision responses; if missing,
      // include the result (API returns broad suggestions, fish are usually top).
      const ancestorIds: number[] | undefined = r.taxon?.ancestor_ids;
      if (!ancestorIds?.length) return true;
      return FISH_TAXON_IDS.some(id => ancestorIds.includes(id));
    })
    .slice(0, 5)
    .map((r: any) => ({
      taxon_id: r.taxon.id,
      common_name: r.taxon.preferred_common_name ?? null,
      scientific_name: r.taxon.name,
      confidence: r.combined_score ?? 0,
    }));

  return {
    topSuggestion: suggestions[0] ?? null,
    suggestions,
  };
}
