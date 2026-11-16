import siteConfig from '../content/site.json';

export interface ServiceArea {
  name: string;
  shortName?: string;
  locations?: { city: string; state?: string }[];
  zipCodes: string[];
  partialZipCodes?: string[];
  services: string[];
}

export const site = { ...siteConfig, serviceAreas: siteConfig.serviceAreas as ServiceArea[] };
export const preview = !site.url || site.coverageProvisional;
export const disclosureVersion = 'intake-v4';
export const disclosure = `By submitting this form, you authorize ${site.businessName} to contact you by phone or email regarding your quote request.`;
export const marketingConsentVersion = 'marketing-email-v1';
export const marketingConsentText = `I agree to receive marketing emails from ${site.businessName}`;

export const photos = {
  kitchen: { id: 'kitchen', alt: 'Walnut kitchen island with cream cabinetry and bronze pendant lights' },
  bathroom: { id: 'bathroom', alt: 'Oak bathroom vanity next to a limestone shower' },
  basement: { id: 'basement', alt: 'Finished basement with warm lighting, bookshelves, and a seating area' },
  stair: { id: 'stair', alt: 'Sunlit white oak staircase and slatted entry millwork' },
};

export const projectCategories = [
  { id: 'kitchen', name: 'Kitchen Remodeling', description: 'Rethink the layout, update cabinetry, or make room for the way you cook and gather.', photo: photos.kitchen },
  { id: 'bathroom', name: 'Bathroom Remodeling', description: 'Explore better storage, a new shower, or a more comfortable everyday layout.', photo: photos.bathroom },
  { id: 'flooring', name: 'Flooring', description: 'Consider new flooring, updated transitions, and finishes that suit the rooms you use most.', photo: photos.stair },
  { id: 'interior', name: 'Interior Remodeling', description: 'Update several rooms or improve the way spaces connect throughout your home.', photo: photos.stair },
  { id: 'finishes', name: 'Interior Finish Upgrades', description: 'Explore cabinetry, flooring, or finish details as part of an interior remodeling project.', photo: photos.stair },
] as const;

const enabledServices = new Set(site.serviceAreas.flatMap(area => area.services));
export const displayedCategories = projectCategories.filter(category =>
  enabledServices.has(category.id),
);

export type Coverage = 'covered' | 'review' | 'outside';
export function checkCoverage(zip: string, category: string): Coverage {
  if (preview) return 'review';
  const matches = (area: ServiceArea) => category === 'unsure' || area.services.includes(category);
  if (site.serviceAreas.some(area => matches(area) && area.partialZipCodes?.includes(zip))) return 'review';
  return site.serviceAreas.some(area => matches(area) && area.zipCodes.includes(zip)) ? 'covered' : 'outside';
}
