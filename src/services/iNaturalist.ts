import type { SpeciesSuggestion } from '../types';

const API_URL = 'https://api.inaturalist.org/v1/computervision/score_image';

// Fish taxa: ray-finned fish + cartilaginous fish
const FISH_TAXON_IDS = [47178, 797045]; // Actinopterygii, Chondrichthyes

export interface FishIdResult {
  topSuggestion: SpeciesSuggestion | null;
  suggestions: SpeciesSuggestion[];
}

export async function identifyFish(photoUri: string): Promise<FishIdResult> {
  const formData = new FormData();
  formData.append('image', {
    uri: photoUri,
    type: 'image/jpeg',
    name: 'catch.jpg',
  } as any);
  formData.append('taxon_id', String(FISH_TAXON_IDS[0]));

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`iNaturalist error: ${response.status}`);
  }

  const data = await response.json();
  const results = (data.results ?? []) as any[];

  const suggestions: SpeciesSuggestion[] = results
    .filter((r: any) => {
      const ancestorIds: number[] = r.taxon?.ancestor_ids ?? [];
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
