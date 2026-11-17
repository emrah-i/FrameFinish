import { displayedCategories, site } from './content';

export function serviceHref(id: string) {
  return `/services/${id}` as const;
}

const serviceDetails = {
  kitchen: {
    navLabel: 'Kitchen',
    pageTitle: 'Kitchen Remodeling in Dallas, TX',
    metaDescription: 'Plan a kitchen remodel in Dallas, TX, with custom cabinetry, new countertops, lighting coordination, and layout changes. Request a free quote.',
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
    ],
  },
  bathroom: {
    navLabel: 'Bathroom',
    pageTitle: 'Bathroom Remodeling in Dallas, TX',
    metaDescription: 'Explore bathroom remodeling in Dallas, TX, including custom layouts, vanity cabinetry, shower remodels, and tub-to-shower conversions.',
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
    ],
  },
  flooring: {
    navLabel: 'Flooring',
    pageTitle: 'Flooring in Dallas, TX',
    metaDescription: 'Plan flooring replacement in Dallas, TX, from material selection and removal to subfloor preparation, installation, transitions, and trim.',
    summary: 'Explore flooring updates for the rooms you use most, from replacing one worn surface to updating several rooms.',
    highlights: [
      { title: 'Material and Layout Planning', description: 'Compare flooring options for each room and plan how the layout will flow between spaces.' },
      { title: 'Existing Floor Removal', description: 'Identify which surfaces need to come up and where the new flooring will meet floors that are staying.' },
      { title: 'Subfloor Preparation', description: 'Review uneven, soft, or damaged areas and plan the preparation the new floor needs.' },
      { title: 'Flooring Installation', description: 'Plan installation around the selected material, the rooms involved, and how they connect.' },
      { title: 'Transitions and Trim', description: 'Choose transition pieces, baseboards, and trim details for doorways and room edges.' },
      { title: 'Stair Flooring', description: 'Choose stair tread finishes and plan how they’ll transition to the flooring at the top and bottom of the stairs.' },
    ],
    faqs: [
      ['How do I choose flooring for each room?', 'Consider foot traffic, pets, moisture, and cleaning. A kitchen, entry, and bedroom can have different needs, even if you want a consistent look throughout the home.'],
      ['Does the existing flooring need to be removed?', 'It depends on the condition of the existing surface and the requirements of the new flooring. Tell us what is in each room so removal can be considered in your quote.'],
      ['What does it take to prepare the subfloor?', 'Preparation depends on what is beneath the current floor and how flat and sound it is. Mention any soft spots, uneven areas, or signs of moisture when you request a quote.'],
      ['How do I plan flooring transitions and trim?', 'Start with the doorways and room edges where new flooring meets another surface. The materials and any difference in height help determine which transitions and trim will fit.'],
      ['What should I include in a flooring quote request?', 'Include your project ZIP code, the rooms you want to update, the current flooring, and any materials you are considering. Approximate measurements and known trouble spots also help.'],
      ['How much does it cost?', 'Cost depends on the square footage, flooring material, and how much existing flooring removal or subfloor preparation is needed.'],
    ],
  },
} as const;

export const serviceRoutes = displayedCategories.flatMap(category => {
  if (category.id !== 'kitchen' && category.id !== 'bathroom' && category.id !== 'flooring') return [];
  return [{ ...category, ...serviceDetails[category.id], href: serviceHref(category.id) }];
});

export type ServiceRoute = (typeof serviceRoutes)[number];

export function findServiceRoute(path: string) {
  return serviceRoutes.find(service => service.href === path);
}
