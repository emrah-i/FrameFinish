import { site } from './content';
import { serviceRoutes } from './service-routes';

export const pages: Record<string, readonly [title: string, description: string]> = {
  '/': [site.businessName, 'Planning a kitchen, bathroom, or flooring update in the Delaware County, Ohio area? Tell the Frame & Finish team about your project and get a FREE quote.'],
  '/contact': [`Contact Us | ${site.businessName}`, `Contact ${site.businessName} or tell us about your renovation project.`],
  '/privacy': [`Privacy Policy | ${site.businessName}`, `How ${site.businessName} handles inquiries and website usage information.`],
  '/terms': [`Terms and Conditions | ${site.businessName}`, 'Terms for using the Frame & Finish website, requesting an estimate, and coordinating remodeling projects.'],
  '/404': [`Page Not Found | ${site.businessName}`, `Return to ${site.businessName}.`],
  ...Object.fromEntries(serviceRoutes.map(service => [service.href, [`${service.pageTitle} | ${site.businessName}`, service.metaDescription] as const])),
};
