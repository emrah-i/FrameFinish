import { site } from './content';
import { serviceRoutes } from './service-routes';

const titleBrand = 'Frame & Finish Home Remodeling';

export const pages: Record<string, readonly [title: string, description: string]> = {
  '/': ['Home Remodeling in Dallas, Texas | Frame and Finish Home Remodeling', 'Planning a kitchen, bathroom, or flooring update in Dallas, TX? Tell the Frame & Finish team about your project and get a FREE quote.'],
  '/about': [`About Us | ${titleBrand}`, 'Learn about Frame & Finish, serving Dallas homeowners since 2006 with kitchen remodeling, bathroom remodeling, and flooring services.'],
  '/contact': [`Contact Us | ${titleBrand}`, `Contact ${site.businessName} or tell us about your renovation project.`],
  '/privacy': [`Privacy Policy | ${titleBrand}`, `How ${site.businessName} handles inquiries and website usage information.`],
  '/terms': [`Terms and Conditions | ${titleBrand}`, 'Terms for using the Frame & Finish website, requesting an estimate, and coordinating remodeling projects.'],
  '/404': [`Page Not Found | ${titleBrand}`, `Return to ${site.businessName}.`],
  ...Object.fromEntries(serviceRoutes.map(service => [service.href, [`${service.pageTitle} | ${titleBrand}`, service.metaDescription] as const])),
};
