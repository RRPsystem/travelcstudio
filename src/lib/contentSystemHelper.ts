export function getContentSystem(websiteType: string | null | undefined): 'ai' | 'wordpress' {
  if (!websiteType) return 'ai';

  if (websiteType === 'wordpress') {
    return 'wordpress';
  }

  return 'ai';
}

export function shouldUseWordPressContent(brand: { website_type?: string | null }): boolean {
  return getContentSystem(brand.website_type) === 'wordpress';
}

export function shouldUseAIContent(brand: { website_type?: string | null }): boolean {
  return getContentSystem(brand.website_type) === 'ai';
}
