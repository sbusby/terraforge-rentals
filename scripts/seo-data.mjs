/**
 * schema.org structured data per page. Ported from src/pages/masterPage.js,
 * which injected this into the Wix host page. On Cloudflare the pages are
 * real pages, so build-site.mjs writes it straight into each <head>.
 */

export const SITE = 'https://www.terraforgellc.com';
const PHONE = '+12088630450';
const IMG = `${SITE}/images/t64-original.jpg`;
const LOGO = `${SITE}/images/logo.png`;

const AREA = [
  'Alexandria', 'Arlington', 'Springfield', 'Fairfax', 'Annandale', 'Burke', 'Lorton',
  'Mount Vernon', 'Falls Church', 'McLean', 'Vienna', 'Woodbridge', 'Manassas', 'Reston',
  'Herndon', 'Centreville', 'Chantilly', 'Stafford', 'Fredericksburg', 'Leesburg',
].map((name) => ({ '@type': 'City', name }));

const business = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'EquipmentRental'],
  '@id': `${SITE}/#business`,
  name: 'TerraForge LLC',
  alternateName: 'TerraForge Rentals',
  description:
    'Bobcat T64 compact track loader (skid steer) rental with delivery and pickup, serving Virginia job sites within 50 miles of Alexandria, VA (DC and Maryland coming soon). Delivery available every weekend, plus weekdays every other week; holidays included. Book online with live availability.',
  url: SITE,
  telephone: PHONE,
  email: 'rentals@terraforgellc.com',
  image: IMG,
  logo: LOGO,
  priceRange: '$425–$1,250',
  currenciesAccepted: 'USD',
  paymentAccepted: 'Credit Card, Debit Card',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Alexandria',
    addressRegion: 'VA',
    postalCode: '22310',
    addressCountry: 'US',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 38.7757, longitude: -77.0866 },
  areaServed: [
    { '@type': 'State', name: 'Virginia' },
    ...AREA,
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: '07:00',
      closes: '19:00',
      description: 'Delivery and pickup days',
    },
  ],
  potentialAction: {
    '@type': 'ReserveAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE}/book-a-rental`,
      actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'],
    },
    result: { '@type': 'Reservation', name: 'Bobcat T64 rental reservation' },
  },
};

const offer = (name, price) => ({
  '@type': 'Offer',
  name,
  price,
  priceCurrency: 'USD',
  availability: 'https://schema.org/InStock',
  url: `${SITE}/book-a-rental`,
  seller: { '@id': `${SITE}/#business` },
});

const product = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${SITE}/equipment#t64`,
  name: 'Bobcat T64 Compact Track Loader Rental — Delivered',
  description:
    'Late-model Bobcat T64 compact track loader delivered to your job site anywhere in Virginia within 50 miles of Alexandria. Standard dirt bucket included; pallet forks, brush grapple and stump bucket available. Flat pricing, online booking, delivery every weekend plus weekdays every other week.',
  image: IMG,
  brand: { '@type': 'Brand', name: 'Bobcat' },
  category: 'Construction Equipment Rental',
  offers: [
    offer('1-day rental', '425'),
    offer('Weekend (2-day) rental', '750'),
    offer('Weekly (7-day) rental', '1250'),
  ],
};

function q(question, answer) {
  return { '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } };
}

const faq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    q('How much does it cost to rent a Bobcat T64 near Alexandria, VA?', 'Flat rates: $425 for one day, $750 for a weekend (2 days), and $1,250 for a full week (7 days). We deliver to Virginia job sites only for now; DC and Maryland are coming soon. Delivery and pickup is one flat fee by zone: $275 (0–20 miles), $400 (21–35 miles) or $525 (36–50 miles). Attachments are $65–$110 per day.'),
    q('Do you deliver the skid steer, or do I need a trailer?', 'We deliver and pick up every rental — you never need a truck or trailer. Delivery and pickup are available every weekend, plus weekdays every other week, holidays included. The booking calendar shows exactly which days are open.'),
    q('Is there a deposit?', 'Yes. A $600 refundable damage deposit is collected at delivery by card, cash or check and refunded within 5 business days after pickup, per the Rental Terms. It is not charged online.'),
    q('What do I need to rent the machine?', 'You need prior skid steer or track loader experience, must be 21 or older with a valid driver’s license, agree to the Rental Terms, and have a job site with truck-and-trailer access. No special license is required to operate a compact track loader on private property.'),
    q('What is your cancellation policy?', 'Cancel 48 or more hours before delivery for a full refund minus a $50 booking fee. Inside 48 hours you receive a 50% refund. No-shows are not refunded.'),
    q('What attachments are available?', 'Pallet forks ($75/day), a brush grapple ($110/day) and a stump bucket ($65/day). A standard dirt bucket is included with the machine.'),
    q('Can I book online?', 'Yes. The Book a Rental page shows live availability; pick your delivery and pickup dates, choose attachments and your delivery zone, and pay securely online.'),
  ],
};

function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE}${path}`,
    })),
  };
}

const crumb = (name, path) => breadcrumbs([['Home', '/'], [name, path]]);

const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  name: 'TerraForge Equipment Rentals',
  alternateName: 'TerraForge',
  url: SITE,
  publisher: { '@id': `${SITE}/#business` },
};

/**
 * Questions and structured data for one service-area page
 * (scripts/locations.mjs). The same questions render on the page, so the
 * FAQPage markup always matches visible text.
 */
export function locationData(loc, { fee, miles, prices, attRange, deposit, usd }) {
  const path = `/skid-steer-rental-${loc.slug}-va`;
  const faqs = [
    [
      `How much does it cost to rent a skid steer in ${loc.city}, VA?`,
      `The Bobcat T64 is ${usd(prices[1])} for one day, ${usd(prices[2])} for a weekend (2 days) or ${usd(prices[7])} for a full week. Delivery and pickup to ${loc.city} is one flat ${usd(fee)} fee, so a one-day rental comes to ${usd(prices[1] + fee)} and a weekend to ${usd(prices[2] + fee)} before tax. Attachments are ${attRange} per day.`,
    ],
    [
      `Do you deliver to ${loc.city}, or do I need a trailer?`,
      `We deliver and pick up every rental, so you never need a truck or trailer. ${loc.city} is in delivery Zone ${loc.zone} (${miles} miles from Alexandria). We cover ${loc.places}.`,
    ],
    [
      `Can I get a skid steer delivered in ${loc.city} on a Saturday or Sunday?`,
      'Yes. Weekend delivery and pickup is the core of what we do, every week, holidays included. Weekdays are open every other week. The booking calendar shows exactly which days are available.',
    ],
    [
      'What do I need to rent it?',
      `Prior skid steer or track loader experience, an operator who is 21 or older with a valid ID, and a job site our truck and trailer can reach. A ${deposit} refundable damage deposit is collected at delivery.`,
    ],
  ];
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE}${path}#service`,
    name: `Skid steer rental in ${loc.city}, VA`,
    serviceType: 'Skid steer and compact track loader rental with delivery',
    description: `Bobcat T64 compact track loader (skid steer) rental delivered to ${loc.city}, Virginia. Flat rates from ${usd(prices[1])} per day plus ${usd(fee)} delivery and pickup.`,
    url: `${SITE}${path}`,
    provider: { '@id': `${SITE}/#business` },
    areaServed: { '@type': 'City', name: loc.city, containedInPlace: { '@type': 'State', name: 'Virginia' } },
    offers: [
      offer('1-day rental', String(prices[1])),
      offer('Weekend (2-day) rental', String(prices[2])),
      offer('Weekly (7-day) rental', String(prices[7])),
    ],
  };
  const faqPage = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([qq, a]) => q(qq, a)) };
  return {
    faqs,
    jsonld: [business, service, faqPage, breadcrumbs([['Home', '/'], ['Delivery', '/delivery'], [`${loc.city}, VA`, path]])],
  };
}

/** Keyed by URL path (no leading slash; '' = home). */
export const PAGE_DATA = {
  '': [business, website],
  equipment: [business, product, crumb('Equipment', '/equipment')],
  attachments: [business, product, crumb('Attachments', '/attachments')],
  delivery: [business, crumb('Delivery', '/delivery')],
  requirements: [business, crumb('Requirements', '/requirements')],
  faq: [business, faq, crumb('FAQ', '/faq')],
  contact: [business, crumb('Contact', '/contact')],
  terms: [business, crumb('Rental Terms', '/terms')],
  'book-a-rental': [business, product, crumb('Book a Rental', '/book-a-rental')],
};
