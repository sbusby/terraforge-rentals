/**
 * TerraForge Rentals — site-wide page code.
 *
 * 1. SEO: injects schema.org structured data (LocalBusiness / Product / FAQ)
 *    into the real page <head>. The visible content lives in HTML embeds
 *    (iframes), which search engines don't credit to the page, so this is
 *    how Google learns what each page is about and can show rich results.
 * 2. Embed bridge: lets any HTML embed on any page ask the host page to
 *    navigate (used by the booking widget to open the secure checkout).
 */

import wixLocation from 'wix-location';
import wixSeoFrontend from 'wix-seo-frontend';

const SITE = 'https://www.terraforgellc.com';
const PHONE = '+12088630450';
const IMG = 'https://static.wixstatic.com/media/ee1515_eab3000dd4c148939ac45a4f5338f348~mv2.png';
const LOGO = 'https://static.wixstatic.com/media/ee1515_a76842c6e69d47c2bd07aac74d5f94b6~mv2.png';

const AREA = [
  'Alexandria', 'Arlington', 'Springfield', 'Fairfax', 'Annandale', 'Burke', 'Lorton',
  'Mount Vernon', 'Falls Church', 'McLean', 'Vienna', 'Woodbridge', 'Manassas', 'Reston',
  'Herndon', 'Centreville', 'Chantilly', 'Washington DC', 'Bethesda', 'Silver Spring',
  'Fort Washington', 'Waldorf', 'Stafford', 'Fredericksburg', 'Leesburg',
].map((name) => ({ '@type': 'City', name }));

const business = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'EquipmentRental'],
  '@id': `${SITE}/#business`,
  name: 'TerraForge LLC',
  alternateName: 'TerraForge Rentals',
  description:
    'Bobcat T64 compact track loader (skid steer) rental with delivery and pickup, serving a 50-mile radius of Alexandria, VA. Delivery available Thursday through Sunday, including weekends. Book online with live availability.',
  url: SITE,
  telephone: PHONE,
  email: 'seanbusby10@gmail.com',
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
    {
      '@type': 'GeoCircle',
      geoMidpoint: { '@type': 'GeoCoordinates', latitude: 38.7757, longitude: -77.0866 },
      geoRadius: '80467',
    },
    ...AREA,
  ],
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '07:00',
      closes: '19:00',
      description: 'Delivery and pickup days',
    },
  ],
  potentialAction: {
    '@type': 'ReserveAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/book-a-rental`, actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'] },
    result: { '@type': 'Reservation', name: 'Bobcat T64 rental reservation' },
  },
};

const product = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${SITE}/equipment#t64`,
  name: 'Bobcat T64 Compact Track Loader Rental — Delivered',
  description:
    'Late-model Bobcat T64 compact track loader delivered to your job site anywhere within 50 miles of Alexandria, VA. Standard dirt bucket included; pallet forks, brush grapple and stump bucket available. Flat pricing, online booking, delivery Thu–Sun.',
  image: IMG,
  brand: { '@type': 'Brand', name: 'Bobcat' },
  category: 'Construction Equipment Rental',
  offers: [
    { '@type': 'Offer', name: '1-day rental', price: '425', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${SITE}/book-a-rental`, seller: { '@id': `${SITE}/#business` } },
    { '@type': 'Offer', name: 'Weekend (2-day) rental', price: '750', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${SITE}/book-a-rental`, seller: { '@id': `${SITE}/#business` } },
    { '@type': 'Offer', name: 'Weekly (7-day) rental', price: '1250', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: `${SITE}/book-a-rental`, seller: { '@id': `${SITE}/#business` } },
  ],
};

const faq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    q('How much does it cost to rent a Bobcat T64 near Alexandria, VA?', 'Flat rates: $425 for one day, $750 for a weekend (2 days), and $1,250 for a full week (7 days). Delivery and pickup is one flat fee by zone: $275 (0–20 miles), $400 (21–35 miles) or $525 (36–50 miles). Attachments are $65–$110 per day.'),
    q('Do you deliver the skid steer, or do I need a trailer?', 'We deliver and pick up every rental — you never need a truck or trailer. Delivery and pickup are available Thursday through Sunday, including weekends.'),
    q('Is there a deposit?', 'Yes. A $600 refundable damage deposit is collected at delivery by card, cash or check and refunded within 5 business days after pickup, per the Rental Terms. It is not charged online.'),
    q('What do I need to rent the machine?', 'You must be 21 or older with a valid driver’s license, agree to the Rental Terms, and have a job site with truck-and-trailer access. No special license is required to operate a compact track loader on private property.'),
    q('What is your cancellation policy?', 'Cancel 48 or more hours before delivery for a full refund minus a $50 booking fee. Inside 48 hours you receive a 50% refund. No-shows are not refunded.'),
    q('What attachments are available?', 'Pallet forks ($75/day), a brush grapple ($110/day) and a stump bucket ($65/day). A standard dirt bucket is included with the machine.'),
    q('Can I book online?', 'Yes. The Book a Rental page shows live availability; pick your delivery and pickup dates, choose attachments and your delivery zone, and pay securely online.'),
  ],
};

function q(question, answer) {
  return {
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  };
}

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

const PAGE_DATA = {
  '': [business],
  'equipment': [business, product, breadcrumbs([['Home', '/'], ['Equipment', '/equipment']])],
  'attachments': [business, product, breadcrumbs([['Home', '/'], ['Attachments', '/attachments']])],
  'delivery': [business, breadcrumbs([['Home', '/'], ['Delivery', '/delivery']])],
  'requirements': [business, breadcrumbs([['Home', '/'], ['Requirements', '/requirements']])],
  'faq': [business, faq, breadcrumbs([['Home', '/'], ['FAQ', '/faq']])],
  'contact': [business, breadcrumbs([['Home', '/'], ['Contact', '/contact']])],
  'terms': [business, breadcrumbs([['Home', '/'], ['Rental Terms', '/terms']])],
  'book-a-rental': [business, product, breadcrumbs([['Home', '/'], ['Book a Rental', '/book-a-rental']])],
};

const TRUSTED_NAV = /^https:\/\/([a-z0-9-]+\.)*(terraforgellc\.com|wix\.com|wixsite\.com)\//i;

$w.onReady(function () {
  // --- SEO structured data ---
  try {
    const slug = (wixLocation.path[0] || '').toLowerCase();
    const data = PAGE_DATA[slug] || [business];
    wixSeoFrontend.setStructuredData(data).catch((err) => console.warn('setStructuredData', err));
  } catch (err) {
    console.warn('SEO structured data skipped', err);
  }

  // --- Embed → host bridge ---
  try {
    $w('HtmlComponent').forEach((h) => {
      h.onMessage((event) => {
        const d = event && event.data;
        if (!d || typeof d !== 'object') return;
        if (d.type === 'terraforge:navigate' && typeof d.url === 'string' && TRUSTED_NAV.test(d.url)) {
          wixLocation.to(d.url);
        }
      });
    });
  } catch (err) {
    /* no embeds on this page */
  }
});
