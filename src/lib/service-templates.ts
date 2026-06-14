/**
 * Service templates — curated starter catalogs per vertical. Cloned into
 * an org's service_categories + services tables via the "Use a template"
 * flow. Templates live here (not in the DB) so they're easy to edit and
 * version with the rest of the codebase.
 *
 * Pricing is in cents. `price === null` means "quote on request".
 * `price_type` is 'fixed' (exact price) or 'from' (starts at).
 */

export type PriceType = 'fixed' | 'from';

export interface TemplateService {
  name: string;
  description?: string;
  duration_min: number;
  price_cents: number | null;
  price_type: PriceType;
}

export interface TemplateCategory {
  name: string;
  services: TemplateService[];
}

export interface ServiceTemplate {
  key: string;
  label: string;
  blurb: string;
  categories: TemplateCategory[];
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    key: 'salon',
    label: 'Hair Salon',
    blurb: 'Cuts, color, treatments, and styling.',
    categories: [
      {
        name: 'Hair Cut & Style',
        services: [
          { name: "Women's Cut & Style", duration_min: 60, price_cents: 7500, price_type: 'fixed' },
          { name: "Men's Cut", duration_min: 30, price_cents: 4500, price_type: 'fixed' },
          { name: "Kid's Cut (under 12)", duration_min: 30, price_cents: 3000, price_type: 'fixed' },
          { name: 'Blowout', duration_min: 45, price_cents: 5500, price_type: 'fixed' },
          { name: 'Special Occasion Updo', duration_min: 75, price_cents: 9500, price_type: 'from' },
        ],
      },
      {
        name: 'Color',
        services: [
          { name: 'Single Process Color', duration_min: 90, price_cents: 9000, price_type: 'from' },
          { name: 'Full Highlights', duration_min: 120, price_cents: 18000, price_type: 'from' },
          { name: 'Partial Highlights', duration_min: 90, price_cents: 13000, price_type: 'from' },
          { name: 'Balayage', duration_min: 180, price_cents: 22000, price_type: 'from' },
          { name: 'Color Correction', duration_min: 240, price_cents: null, price_type: 'fixed' },
        ],
      },
      {
        name: 'Treatments',
        services: [
          { name: 'Deep Conditioning', duration_min: 30, price_cents: 4000, price_type: 'fixed' },
          { name: 'Gloss / Toner', duration_min: 30, price_cents: 4500, price_type: 'from' },
          { name: 'Keratin Treatment', duration_min: 180, price_cents: 25000, price_type: 'from' },
        ],
      },
    ],
  },
  {
    key: 'barbershop',
    label: 'Barbershop',
    blurb: 'Cuts, fades, beards, hot towel.',
    categories: [
      {
        name: 'Cuts',
        services: [
          { name: 'Classic Cut', duration_min: 30, price_cents: 3500, price_type: 'fixed' },
          { name: 'Skin Fade', duration_min: 45, price_cents: 4500, price_type: 'fixed' },
          { name: 'Beard Trim', duration_min: 20, price_cents: 2500, price_type: 'fixed' },
          { name: 'Cut + Beard', duration_min: 60, price_cents: 5500, price_type: 'fixed' },
          { name: 'Hot Towel Shave', duration_min: 30, price_cents: 4000, price_type: 'fixed' },
        ],
      },
    ],
  },
  {
    key: 'contractor',
    label: 'General Contractor / Handyman',
    blurb: 'Home repairs, remodels, and small jobs.',
    categories: [
      {
        name: 'Estimates',
        services: [
          { name: 'On-site Estimate', description: 'Free walk-through and written estimate.', duration_min: 30, price_cents: 0, price_type: 'fixed' },
        ],
      },
      {
        name: 'Common Jobs',
        services: [
          { name: 'Drywall Patch / Repair', duration_min: 60, price_cents: 15000, price_type: 'from' },
          { name: 'Interior Door Install', duration_min: 90, price_cents: 25000, price_type: 'from' },
          { name: 'TV Mount Install', duration_min: 60, price_cents: 12500, price_type: 'fixed' },
          { name: 'Deck Repair', duration_min: 240, price_cents: null, price_type: 'fixed' },
          { name: 'Bathroom Remodel Consultation', duration_min: 60, price_cents: 0, price_type: 'fixed' },
        ],
      },
    ],
  },
  {
    key: 'landscaper',
    label: 'Landscaping',
    blurb: 'Lawn care, design, and seasonal work.',
    categories: [
      {
        name: 'Estimates',
        services: [
          { name: 'Property Walk-through', description: 'Free assessment for new clients.', duration_min: 30, price_cents: 0, price_type: 'fixed' },
        ],
      },
      {
        name: 'Maintenance',
        services: [
          { name: 'Weekly Mowing', duration_min: 60, price_cents: 5000, price_type: 'from' },
          { name: 'Spring Cleanup', duration_min: 240, price_cents: 25000, price_type: 'from' },
          { name: 'Fall Cleanup', duration_min: 240, price_cents: 25000, price_type: 'from' },
          { name: 'Mulch Install (per yard)', duration_min: 60, price_cents: 8500, price_type: 'from' },
        ],
      },
      {
        name: 'Projects',
        services: [
          { name: 'Sod Install', duration_min: 240, price_cents: null, price_type: 'fixed' },
          { name: 'Paver Patio', duration_min: 480, price_cents: null, price_type: 'fixed' },
          { name: 'Garden Bed Design', duration_min: 120, price_cents: null, price_type: 'fixed' },
        ],
      },
    ],
  },
  {
    key: 'plumber',
    label: 'Plumbing',
    blurb: 'Repairs, installs, and emergency calls.',
    categories: [
      {
        name: 'Service Calls',
        services: [
          { name: 'Diagnostic Visit', description: 'Travel + first 30 minutes.', duration_min: 30, price_cents: 9500, price_type: 'fixed' },
          { name: 'Emergency Call (after hours)', duration_min: 60, price_cents: 18500, price_type: 'from' },
        ],
      },
      {
        name: 'Common Jobs',
        services: [
          { name: 'Drain Clearing', duration_min: 60, price_cents: 14500, price_type: 'from' },
          { name: 'Faucet Replacement', duration_min: 60, price_cents: 17500, price_type: 'from' },
          { name: 'Toilet Replacement', duration_min: 90, price_cents: 32500, price_type: 'from' },
          { name: 'Water Heater Install (50gal)', duration_min: 180, price_cents: 145000, price_type: 'from' },
        ],
      },
    ],
  },
  {
    key: 'photographer',
    label: 'Real Estate Photographer',
    blurb: 'Property photography, drone, video, and 3D tours.',
    categories: [
      {
        name: 'Photography Packages',
        services: [
          { name: 'HDR Photos — up to 1500 sqft', description: '25 edited HDR photos. Standard 24hr turnaround.', duration_min: 60,  price_cents: 19900, price_type: 'fixed' },
          { name: 'HDR Photos — 1501–3000 sqft',  description: '35 edited HDR photos. Standard 24hr turnaround.', duration_min: 90,  price_cents: 24900, price_type: 'fixed' },
          { name: 'HDR Photos — 3001+ sqft',      description: '50+ edited HDR photos. Standard 24hr turnaround.', duration_min: 120, price_cents: 29900, price_type: 'from' },
          { name: 'Twilight Photos',              description: '5 dusk/twilight exterior shots.',                  duration_min: 45,  price_cents: 15000, price_type: 'fixed' },
        ],
      },
      {
        name: 'Video & 3D',
        services: [
          { name: 'Walkthrough Video',           description: '60–90 sec cinematic walkthrough with music.',         duration_min: 60, price_cents: 24900, price_type: 'fixed' },
          { name: 'Aerial Drone Photos & Video', description: '10 aerial photos + 30s aerial clip.',                 duration_min: 45, price_cents: 19900, price_type: 'fixed' },
          { name: '3D Matterport Tour',          description: 'Full interactive 3D walkthrough. Pricing per sqft.',  duration_min: 90, price_cents: 34900, price_type: 'from' },
        ],
      },
      {
        name: 'Add-Ons',
        services: [
          { name: 'Floor Plan (2D)',         description: 'Schematic floor plan with room dimensions.',     duration_min: 30, price_cents: 7900, price_type: 'fixed' },
          { name: 'Virtual Staging',         description: 'Per photo. Empty rooms staged digitally.',       duration_min: 0,  price_cents: 4500, price_type: 'fixed' },
          { name: 'Rush Delivery — 12hr',    description: 'Edited photos within 12hrs of shoot.',           duration_min: 0,  price_cents: 5000, price_type: 'fixed' },
          { name: 'Property Website',        description: 'Single-property landing page with photos + map.', duration_min: 0, price_cents: 9900, price_type: 'fixed' },
        ],
      },
    ],
  },
  {
    key: 'makeup',
    label: 'Makeup Artist',
    blurb: 'Bridal, event, and editorial makeup.',
    categories: [
      {
        name: 'Bridal',
        services: [
          { name: 'Bridal Trial', duration_min: 75, price_cents: 12500, price_type: 'fixed' },
          { name: 'Wedding Day Makeup', duration_min: 90, price_cents: 25000, price_type: 'from' },
          { name: 'Bridesmaid Makeup', duration_min: 45, price_cents: 12500, price_type: 'fixed' },
        ],
      },
      {
        name: 'Events',
        services: [
          { name: 'Evening / Special Event', duration_min: 60, price_cents: 15000, price_type: 'fixed' },
          { name: 'Photoshoot / Editorial', duration_min: 60, price_cents: null, price_type: 'fixed' },
          { name: 'Lesson + Application', duration_min: 90, price_cents: 17500, price_type: 'fixed' },
        ],
      },
    ],
  },
];

export function findTemplate(key: string): ServiceTemplate | undefined {
  return SERVICE_TEMPLATES.find((t) => t.key === key);
}
