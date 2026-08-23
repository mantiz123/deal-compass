export type Listing = {
  id: string;
  title: string;
  city: string;
  state: string;
  price: number;
  type: "residential" | "land" | "investment";
  landType?: "residential-lots" | "rural" | "development" | "investment";
  beds?: number;
  baths?: number;
  sqft?: number;
  acres?: number;
  status: "available" | "under-contract" | "sold";
  blurb: string;
};

export const listings: Listing[] = [
  {
    id: "bonds-ave-3306",
    title: "3306 Bonds Ave",
    city: "Birmingham",
    state: "AL",
    price: 62000,
    type: "investment",
    beds: 3,
    baths: 1,
    sqft: 1240,
    status: "available",
    blurb: "Full-gut opportunity in an appreciating Birmingham pocket. Strong ARV spread for a fix & flip.",
  },
  {
    id: "cahaba-heights-lot",
    title: "Cahaba Heights Infill Lot",
    city: "Vestavia Hills",
    state: "AL",
    price: 48000,
    type: "land",
    landType: "residential-lots",
    acres: 0.34,
    status: "available",
    blurb: "Utilities at the street, ready-to-build residential lot in a top school district.",
  },
  {
    id: "tuscaloosa-rehab",
    title: "Riverfront Cottage",
    city: "Tuscaloosa",
    state: "AL",
    price: 118000,
    type: "residential",
    beds: 3,
    baths: 2,
    sqft: 1480,
    status: "available",
    blurb: "Renovated cottage minutes from campus. Turnkey rental or owner-occupant ready.",
  },
  {
    id: "shelby-rural-40",
    title: "40 Acres — Shelby County",
    city: "Columbiana",
    state: "AL",
    price: 210000,
    type: "land",
    landType: "rural",
    acres: 40,
    status: "available",
    blurb: "Mixed timber and pasture with road frontage. Recreation, homestead or long-hold.",
  },
  {
    id: "huntsville-dev-parcel",
    title: "Development Parcel — Research Park",
    city: "Huntsville",
    state: "AL",
    price: 675000,
    type: "land",
    landType: "development",
    acres: 6.2,
    status: "under-contract",
    blurb: "Entitled acreage in the fastest-growing employment corridor in the Southeast.",
  },
  {
    id: "savannah-portfolio",
    title: "4-Property Rental Portfolio",
    city: "Savannah",
    state: "GA",
    price: 540000,
    type: "investment",
    status: "available",
    blurb: "Stabilized portfolio with in-place tenants and a single closing.",
  },
  {
    id: "greenville-lots",
    title: "Two Adjoining Lots",
    city: "Greenville",
    state: "SC",
    price: 96000,
    type: "land",
    landType: "investment",
    acres: 1.1,
    status: "available",
    blurb: "Buy-and-hold land play in the path of growth on Greenville's east side.",
  },
  {
    id: "pensacola-flip",
    title: "Coastal Flip Candidate",
    city: "Pensacola",
    state: "FL",
    price: 189000,
    type: "investment",
    beds: 3,
    baths: 2,
    sqft: 1610,
    status: "available",
    blurb: "Cosmetic rehab near the bay with comps supporting a healthy exit.",
  },
];

export const markets = [
  {
    slug: "alabama",
    name: "Alabama",
    tagline: "Our home market.",
    cities: ["Birmingham", "Huntsville", "Tuscaloosa", "Montgomery", "Mobile"],
    copy:
      "Birmingham and its surrounding counties are where KLOSE operates daily. Deep contractor benches, low basis and reliable exits make Alabama the core of our acquisition strategy.",
    stats: [
      { k: "Median entry", v: "$65k" },
      { k: "Avg rehab", v: "$42k" },
      { k: "Days to exit", v: "96" },
    ],
  },
  {
    slug: "florida",
    name: "Florida",
    tagline: "Panhandle and Gulf Coast.",
    cities: ["Pensacola", "Panama City", "Jacksonville"],
    copy:
      "Coastal demand with strong resale velocity. We underwrite insurance and flood exposure conservatively before we ever make an offer.",
    stats: [
      { k: "Median entry", v: "$175k" },
      { k: "Avg rehab", v: "$55k" },
      { k: "Days to exit", v: "88" },
    ],
  },
  {
    slug: "georgia",
    name: "Georgia",
    tagline: "Atlanta metro and the coast.",
    cities: ["Atlanta", "Columbus", "Savannah"],
    copy:
      "A deep buyer pool and consistent rent growth. We focus on infill neighborhoods where renovated product clears quickly.",
    stats: [
      { k: "Median entry", v: "$140k" },
      { k: "Avg rehab", v: "$48k" },
      { k: "Days to exit", v: "82" },
    ],
  },
  {
    slug: "south-carolina",
    name: "South Carolina",
    tagline: "Upstate growth corridor.",
    cities: ["Greenville", "Spartanburg", "Columbia"],
    copy:
      "Manufacturing-driven job growth is pulling population into the Upstate. Land in the path of that growth is our primary play here.",
    stats: [
      { k: "Median entry", v: "$120k" },
      { k: "Avg rehab", v: "$40k" },
      { k: "Days to exit", v: "90" },
    ],
  },
  {
    slug: "texas",
    name: "Texas",
    tagline: "Selective, high-conviction only.",
    cities: ["Dallas–Fort Worth", "San Antonio", "Houston"],
    copy:
      "We enter Texas only where we have boots on the ground and a verified contractor. Volume matters less than execution certainty.",
    stats: [
      { k: "Median entry", v: "$195k" },
      { k: "Avg rehab", v: "$60k" },
      { k: "Days to exit", v: "78" },
    ],
  },
];

export const landCategories = [
  {
    slug: "residential-lots",
    name: "Residential Lots",
    copy: "Build-ready infill lots with utilities available, priced for builders and owner-occupants.",
  },
  {
    slug: "rural",
    name: "Rural Land",
    copy: "Acreage for recreation, homesteads and timber. Road frontage and access verified before listing.",
  },
  {
    slug: "development",
    name: "Development Land",
    copy: "Larger parcels with zoning and entitlement paths in growth corridors.",
  },
  {
    slug: "investment",
    name: "Investment Land",
    copy: "Long-hold positions in the path of growth, acquired below replacement basis.",
  },
] as const;
