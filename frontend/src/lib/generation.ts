import type { Generation, GenerationLabel, GenerationSlug } from "@/types/api";

export type GenerationOption = {
  slug: GenerationSlug;
  apiValue: Generation;
  label: GenerationLabel;
};

export const GENERATION_OPTIONS: readonly GenerationOption[] = [
  {
    slug: "teen",
    apiValue: "TEEN",
    label: "10대",
  },
  {
    slug: "twenty",
    apiValue: "TWENTY",
    label: "20대",
  },
];

export function getGenerationBySlug(slug: string): GenerationOption | null {
  return GENERATION_OPTIONS.find((option) => option.slug === slug) ?? null;
}

export function getGenerationByApiValue(
  generation: Generation,
): GenerationOption {
  return GENERATION_OPTIONS.find((option) => option.apiValue === generation)!;
}

export function isGenerationSlug(slug: string): slug is GenerationSlug {
  return getGenerationBySlug(slug) !== null;
}
