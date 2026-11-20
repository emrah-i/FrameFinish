import { displayedCategories, site } from './content';

export function serviceHref(id: string) {
  return `/services/${id === 'basement' ? 'basement-remodeling' : id}` as const;
}

const serviceDetails = {
  kitchen: {
    navLabel: 'Kitchen',
    pageTitle: 'Kitchen Remodeling in Harrisburg, PA',
    metaDescription: 'Plan a kitchen remodel in Harrisburg, PA, with custom cabinetry, new countertops, lighting coordination, and layout changes. Request a free quote.',
    summary: 'Plan a kitchen remodel around the way you cook, gather, and move through your home.',
    highlights: [
      { title: 'Custom Kitchen Design and Layout Planning', description: 'Plan where you prep, cook, and clean up, and make room for how people move through the kitchen.' },
      { title: 'Custom Kitchen Cabinetry', description: 'Plan cabinet sizes, drawers, and pantry storage around what you want to keep within reach.' },
      { title: 'Kitchen Countertops and Surface Materials', description: 'Compare countertop and backsplash materials based on how you use the kitchen and how much maintenance you prefer.' },
      { title: 'Appliance and Lighting Coordination', description: 'Work appliance dimensions, task lighting, and fixture locations into the layout early.' },
      { title: 'Structural Changes and Wall Removal', description: 'Discuss openings and wall removal ideas so structural and utility constraints can be reviewed before the layout is finalized.' },
      { title: 'Kitchen Flooring', description: 'Compare flooring options for spills and daily foot traffic, and plan how the kitchen floor will meet adjoining rooms.' },
    ],
    faqs: [
      ['Can I change my kitchen layout?', 'Yes. Start with what feels cramped or inconvenient. If you want to move the sink, range, or island, mention that in your quote request so the team can review the layout and utility locations.'],
      ['What should I consider when planning custom cabinets?', 'Make a list of what you want to store near the sink, range, and prep areas. Include bulky items and small appliances so the cabinet plan accounts for drawer depth, shelf height, and access.'],
      ['How do I choose a countertop material?', 'Consider how often you cook, how much upkeep you want, and how you use each work surface. Bring any samples you like so you can see them alongside your cabinet and backsplash choices.'],
      ['When should I choose appliances and lighting?', 'Share appliance dimensions and lighting ideas during layout planning. Clearances for appliance doors and the placement of lights over work surfaces can affect cabinet and electrical plans.'],
      ['What should I know before removing a kitchen wall?', 'Discuss whether the wall carries loads and whether it conceals plumbing, wiring, or ductwork. The team needs to review those conditions before confirming the scope.'],
      ['How much does it cost?', 'Cost depends on the kitchen’s size, cabinet and countertop selections, and whether layout changes require moving plumbing or electrical lines.'],
      ['How long does a kitchen remodel take?', 'The timeline depends on the project scope, layout changes, material availability, and cabinetry selections and lead times. We confirm your project timeline after reviewing the scope.'],
    ],
  },
  bathroom: {
    navLabel: 'Bathroom',
    pageTitle: 'Bathroom Remodeling in Harrisburg, PA',
    metaDescription: 'Explore bathroom remodeling in Harrisburg, PA, including custom layouts, vanity cabinetry, shower remodels, and tub-to-shower conversions.',
    summary: 'Plan a bathroom update for easier routines, more useful storage, and the finishes you want.',
    highlights: [
      { title: 'Custom Bathroom Remodel and Layout Planning', description: 'Plan fixture placement, storage, and clearances around how you use the bathroom each day.' },
      { title: 'Luxury Bathroom Remodel and Cabinetry', description: 'Coordinate cabinetry, vanity finishes, fixtures, tile, and lighting for a cohesive bathroom.' },
      { title: 'Shower Remodel', description: 'Plan changes to the shower layout, tile, fixtures, enclosure, and storage.' },
      { title: 'Tub-to-Shower Conversion', description: 'Explore a shower in the existing tub area and discuss entry, drainage, and enclosure options.' },
      { title: 'Master Bathroom Remodel', description: 'Plan the vanity, shower, tub, and storage around the routines of the people sharing the room.' },
      { title: 'Bathroom Flooring', description: 'Compare floor tile finishes and traction underfoot, and plan the transition at the bathroom doorway.' },
    ],
    faqs: [
      ['Can I change my bathroom layout?', 'Yes. Tell us which fixtures you want to move and why. Existing plumbing, the door swing, and the space around each fixture help determine which layouts are practical.'],
      ['How do I plan my bathroom vanity and cabinets?', 'List what you use daily and what needs a place out of sight. Think about drawer space, countertop room, sink placement, and whether wall storage would help.'],
      ['What can a shower remodel include?', 'A shower remodel can include tile, fixtures, a new enclosure, and built-in storage. Share how you want to use the shower so the quote can reflect the changes you have in mind.'],
      ['Can I replace my bathtub with a shower?', 'A tub-to-shower conversion is an option to discuss. Share the existing tub size and your preferences for the entry and enclosure so the team can review the space and drain location.'],
      ['How do I start planning a primary bathroom remodel?', 'List the changes that would make your daily routine easier, such as more vanity space, a different shower layout, or better storage. Include whether you want to keep a separate tub.'],
      ['How much does it cost?', 'Cost depends on the bathroom’s size, tile and fixture selections, and whether the project involves rebuilding the shower or moving plumbing.'],
      ['How long does a bathroom remodel take?', 'The timeline depends on layout changes, plumbing work, material availability, and tile installation. We confirm your project timeline after reviewing the scope.'],
    ],
  },
  basement: {
    navLabel: 'Basements',
    pageTitle: 'Basement Remodeling in Harrisburg, PA',
    metaDescription: 'Plan basement remodeling in Harrisburg, PA, with practical layouts, walls, ceilings, lighting, storage, and flooring. Request a free quote.',
    summary: 'Turn your unfinished basement into space for relaxing, working, or spending time together.',
    highlights: [
      { title: 'Layout and Framing', description: 'Plan room divisions and frame the space around how you want to use your basement.' },
      { title: 'Walls and Ceilings', description: 'Choose wall and ceiling finishes with room for existing systems and access where needed.' },
      { title: 'Basement Lighting', description: 'Plan lighting for work areas, seating, and everyday use, making the most of available natural light.' },
      { title: 'Flooring and Finishes', description: 'Choose flooring, colors, and trim suited to the space and the way you plan to use it.' },
      { title: 'Storage and Built-Ins', description: 'Plan storage for household items, hobbies, and equipment without losing useful living space.' },
      { title: 'Stairs and Access', description: 'Review stairs, doorways, and routes through the basement as part of the overall layout.' },
    ],
    faqs: [
      ['How do I start planning a basement remodeling project?', 'Think about how you want to use the space, what you need to store, and which areas should stay accessible. Share your priorities during the project review.'],
      ['What existing conditions should be reviewed first?', 'Tell us about moisture, uneven surfaces, low ceilings, and existing plumbing or electrical equipment. These conditions need to be reviewed before the finishing plan is confirmed.'],
      ['What can I use a finished basement for?', 'A finished basement can provide space for a family room, home office, hobbies, or recreation. The layout depends on the available space and existing conditions.'],
      ['How do I choose basement materials?', 'Consider moisture conditions, daily use, maintenance, and the look you want. We can discuss options for walls, ceilings, and flooring during planning.'],
      ['What should I include in a basement remodeling quote request?', 'Include your project ZIP code, approximate basement size, intended uses, and any known issues. Photos and a list of priorities can help with the project review.'],
      ['How much does basement remodeling cost?', 'Cost depends on the size, existing conditions, layout, materials, and the amount of work needed. We review the scope before preparing a quote.'],
      ['How long does basement remodeling take?', 'The timeline depends on the project scope, existing conditions, material availability, and the work involved. We confirm your project timeline after reviewing the scope.'],
    ],
  },
} as const;

export const serviceRoutes = displayedCategories.flatMap(category => {
  if (category.id !== 'kitchen' && category.id !== 'bathroom' && category.id !== 'basement') return [];
  return [{ ...category, ...serviceDetails[category.id], href: serviceHref(category.id) }];
});

export type ServiceRoute = (typeof serviceRoutes)[number];

export function findServiceRoute(path: string) {
  return serviceRoutes.find(service => service.href === path);
}
