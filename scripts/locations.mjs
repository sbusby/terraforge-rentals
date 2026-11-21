/**
 * Service-area landing pages: one per city, built by build-site.mjs into
 * /skid-steer-rental-<city>-va. Prices and delivery fees are NOT written here;
 * the build reads them from src/public/rental.js and works out each city's
 * zone from the ZIP lists in delivery.html, so these pages can never disagree
 * with the booking page or the ZIP calculator.
 *
 * Keep every page's copy specific to the place. Near-identical city pages are
 * what Google calls doorway pages; only add a city if there is something true
 * and different to say about renting there.
 */

export const LOCATIONS = [
  {
    slug: 'alexandria',
    city: 'Alexandria',
    county: 'City of Alexandria & Fairfax County',
    zips: ['22301', '22302', '22303', '22304', '22305', '22306', '22307', '22308', '22309', '22310', '22311', '22312', '22314', '22315'],
    places: 'Old Town, Del Ray, Rosemont, Seminary Hill, the West End, Franconia, Rose Hill, Kingstowne, Hybla Valley and Fort Hunt',
    intro:
      'TerraForge is based in Alexandria, so this is our home turf and our shortest delivery run. A late-model Bobcat T64 compact track loader shows up on a flatbed at your driveway and leaves the same way. You never hitch a trailer or stand at a rental counter.',
    jobs: [
      ['Backyard regrades and drainage fixes', 'Alexandria sits on heavy marine clay that holds water against foundations. The T64 moves and regrades that clay in an afternoon instead of a week of wheelbarrows.'],
      ['Driveway and patio tear-outs', 'Break out and load old concrete, asphalt or pavers, then spread and grade the new gravel base with the included 80-inch bucket.'],
      ['Mulch, stone and soil delivery days', 'Have bulk material dropped at the curb and move it to the back yard yourself. Pallet forks handle sod, pavers and block.'],
      ['Storm and brush cleanup', 'Add the brush grapple for downed limbs and overgrown lots in the older, tree-heavy neighborhoods south of the Beltway.'],
    ],
    access:
      'Old Town and Del Ray have narrow streets, on-street parking and alleys. Tell us about the approach when you book so we can plan where the flatbed unloads. The included bucket is 80 inches wide, so measure your gate or side yard first: you need about seven feet clear.',
    nearby: ['springfield', 'arlington', 'lorton', 'falls-church'],
  },
  {
    slug: 'arlington',
    city: 'Arlington',
    county: 'Arlington County',
    zips: ['22201', '22202', '22203', '22204', '22205', '22206', '22207', '22209', '22213'],
    places: 'Clarendon, Ballston, Lyon Park, Cherrydale, Westover, Columbia Pike, Shirlington, Fairlington and North Arlington',
    intro:
      'Arlington lots are tight and the nearest equipment yards are a haul away with a trailer you probably do not own. We bring a Bobcat T64 compact track loader to your Arlington address and pick it up when the work is done, weekends included.',
    jobs: [
      ['Teardown and infill prep', 'Clear a lot, strip topsoil, and move fill around a new foundation on the small infill sites Arlington is known for.'],
      ['Sloped-yard grading', 'North Arlington yards drop toward the Potomac. Rubber tracks hold a slope better than a wheeled skid steer and are easier on the lawn.'],
      ['Retaining wall and hardscape work', 'Carry block, stone and gravel from the street to the back of the lot with the bucket or pallet forks.'],
      ['Tree and root cleanup', 'The stump bucket digs out root balls and trenches narrow runs. The grapple loads the brush.'],
    ],
    access:
      'Many Arlington streets are permit-parking with cars on both sides. We need room to stop a truck and trailer and lower the ramps, so a clear stretch of curb or an open driveway on delivery morning makes the drop quick.',
    nearby: ['alexandria', 'falls-church', 'mclean', 'vienna'],
  },
  {
    slug: 'fairfax',
    city: 'Fairfax',
    county: 'City of Fairfax & Fairfax County',
    zips: ['22030', '22031', '22032', '22033'],
    places: 'Fairfax City, Mantua, Fair Oaks, Fairfax Station edges, Kings Park West and the George Mason area',
    intro:
      'Fairfax has the half-acre and one-acre lots where a compact track loader pays for itself in a weekend. We deliver a Bobcat T64 to your Fairfax property, set it where you want it, and come back for it when you are finished.',
    jobs: [
      ['Yard expansion and land clearing', 'Push back the tree line, clear brush with the grapple, and pull stumps on wooded lots along Braddock Road and Route 123.'],
      ['Driveway work', 'Regrade a long gravel driveway, fix washouts, and spread new stone evenly.'],
      ['Pool, shed and addition prep', 'Cut a pad, haul off the spoil, and backfill once the work is in.'],
      ['Landscape supply runs', 'Move pallets of sod, stone and mulch from the street to the far corner of the lot.'],
    ],
    access:
      'Most Fairfax driveways take the flatbed without trouble. If the work is behind the house, check the side-yard width: with the 80-inch bucket on, the T64 needs about seven feet clear.',
    nearby: ['vienna', 'springfield', 'falls-church', 'manassas'],
  },
  {
    slug: 'springfield',
    city: 'Springfield',
    county: 'Fairfax County',
    zips: ['22150', '22151', '22152', '22153'],
    places: 'Springfield, West Springfield, North Springfield, Newington and Fairfax County Parkway neighborhoods',
    intro:
      'Springfield is minutes from our yard, which makes it one of the easiest places to get a machine on short notice. A Bobcat T64 compact track loader arrives on our flatbed and is ready to work as soon as it rolls off.',
    jobs: [
      ['Backyard leveling', 'Flatten a sloped 1960s and 70s subdivision yard for a patio, play area or shed.'],
      ['Drainage and swale work', 'Cut swales and move clay away from foundations and window wells.'],
      ['Concrete and deck demo cleanup', 'Load broken concrete and old deck framing into a dumpster in a few passes.'],
      ['Mulch and topsoil spreading', 'Move ten yards of mulch before lunch instead of over three weekends.'],
    ],
    access:
      'Cul-de-sacs and pipestem driveways are common here. Let us know if yours is shared or steep so we can pick the right place to unload.',
    nearby: ['alexandria', 'lorton', 'fairfax', 'woodbridge'],
  },
  {
    slug: 'falls-church',
    city: 'Falls Church',
    county: 'City of Falls Church & Fairfax County',
    zips: ['22041', '22042', '22043', '22044', '22046'],
    places: 'Falls Church City, Seven Corners, Bailey’s Crossroads, Lake Barcroft, Pimmit Hills and West Falls Church',
    intro:
      'Falls Church is full of older homes on mature lots being renovated, rebuilt or re-landscaped. We deliver a Bobcat T64 compact track loader to the job and take it away after, so the only thing you plan is the work.',
    jobs: [
      ['Renovation site work', 'Excavate for an addition footing approach, move fill, and grade when the build is done.'],
      ['Lake Barcroft slopes', 'Tracked machines are the right tool for the steep, soft lots around the lake.'],
      ['Old driveway removal', 'Tear out cracked asphalt and prep the base for pavers or new concrete.'],
      ['Overgrown lot cleanup', 'Grapple out years of brush, vines and fallen limbs.'],
    ],
    access:
      'Streets inside the City of Falls Church are narrow and tree-lined. A clear driveway apron or 60 feet of open curb is enough for us to unload.',
    nearby: ['arlington', 'mclean', 'vienna', 'alexandria'],
  },
  {
    slug: 'mclean',
    city: 'McLean',
    county: 'Fairfax County',
    zips: ['22101', '22102'],
    places: 'McLean, Langley, Chesterbrook, Salona Village and Tysons',
    intro:
      'McLean properties are large, wooded and often sloped, which is exactly where a compact track loader earns its keep. We deliver a Bobcat T64 to your McLean site and collect it when you are done, including Saturdays and Sundays.',
    jobs: [
      ['Estate landscaping projects', 'Move boulders, set stone, and place root-balled trees with the forks.'],
      ['Wooded lot clearing', 'Clear underbrush and fallen timber with the brush grapple and dig stumps with the stump bucket.'],
      ['Long driveway maintenance', 'Regrade and re-stone a gravel drive after a wet season.'],
      ['Builder and contractor fill-ins', 'A second machine for a weekend when your own is tied up on another site.'],
    ],
    access:
      'Gated driveways and long private lanes are fine. Send the gate code and any weight limits on bridges or culverts when you book.',
    nearby: ['arlington', 'vienna', 'falls-church', 'fairfax'],
  },
  {
    slug: 'vienna',
    city: 'Vienna',
    county: 'Fairfax County',
    zips: ['22180', '22181', '22182'],
    places: 'the Town of Vienna, Oakton edges, Wolf Trap and Tysons West',
    intro:
      'Vienna is in the middle of a long teardown-and-rebuild wave, and every one of those lots needs dirt moved. Rent a Bobcat T64 compact track loader with delivery to your Vienna address and skip the trailer entirely.',
    jobs: [
      ['Final grading on new builds', 'Spread topsoil and set the finish grade before sod goes down.'],
      ['Backyard projects', 'Patios, sport courts, sheds and garden walls all start with a flat, compacted pad.'],
      ['Wolf Trap acreage', 'Clear trails, move firewood rounds and maintain gravel on the larger lots north of town.'],
      ['Material staging', 'Unload and place pallets of stone, block and sod with the forks.'],
    ],
    access:
      'Town of Vienna streets are residential and quiet. We unload at the curb or in the driveway and can track the machine across the lawn on request.',
    nearby: ['fairfax', 'mclean', 'falls-church', 'arlington'],
  },
  {
    slug: 'lorton',
    city: 'Lorton',
    county: 'Fairfax County',
    zips: ['22079'],
    places: 'Lorton, Mason Neck, Laurel Hill and Gunston',
    intro:
      'Lorton and Mason Neck have some of the biggest residential lots in southern Fairfax County. We run a Bobcat T64 compact track loader down Route 1 to your property and pick it up when the job wraps.',
    jobs: [
      ['Mason Neck land management', 'Clear brush, maintain trails and move storm debris on wooded waterfront acreage.'],
      ['Horse and hobby-farm chores', 'Regrade paddocks, move round bales with the forks, and clean up fence lines.'],
      ['New-construction grading', 'Finish grade and topsoil on Laurel Hill and infill lots.'],
      ['Gravel drive repair', 'Fill potholes, crown the drive and spread fresh stone.'],
    ],
    access:
      'Long gravel lanes are no problem for the flatbed as long as there is room to turn around. Tell us if the last stretch is soft after rain.',
    nearby: ['springfield', 'woodbridge', 'alexandria', 'fairfax'],
  },
  {
    slug: 'woodbridge',
    city: 'Woodbridge',
    county: 'Prince William County',
    zips: ['22191', '22192', '22193'],
    places: 'Woodbridge, Lake Ridge, Dale City, Occoquan and Marumsco',
    intro:
      'Prince William County is where lots get bigger and DIY projects get more ambitious. We deliver a Bobcat T64 compact track loader to Woodbridge, Lake Ridge and Dale City, and one flat fee covers both the drop-off and the pickup.',
    jobs: [
      ['Yard regrading on hilly lots', 'Lake Ridge and Dale City yards are rarely flat. Cut, fill and level for a usable back yard.'],
      ['Driveway extensions and parking pads', 'Excavate, lay stone base and grade for a wider drive or an RV pad.'],
      ['Clearing wooded back lots', 'Grapple brush and small trees, then dig the stumps.'],
      ['Retaining wall prep', 'Dig the footing trench and carry block to the wall line.'],
    ],
    access:
      'Standard subdivision streets work well. If you are in an HOA, check whether it limits where equipment can be parked overnight.',
    nearby: ['lorton', 'manassas', 'springfield', 'fredericksburg'],
  },
  {
    slug: 'manassas',
    city: 'Manassas',
    county: 'City of Manassas & Prince William County',
    zips: ['20109', '20110', '20111', '20112'],
    places: 'Manassas, Manassas Park, Sudley, Yorkshire and the Route 234 corridor',
    intro:
      'Manassas has a mix of acreage, older in-town lots and small contractors who need a machine for a few days. We bring a Bobcat T64 compact track loader to your Manassas job site and haul it out when you finish.',
    jobs: [
      ['Acreage cleanup', 'Clear fence rows, move brush piles and reclaim overgrown corners of a multi-acre lot south of town.'],
      ['Gravel and stone work', 'Spread crusher run for drives, pads and barn aprons.'],
      ['Small-contractor rentals', 'Landscapers and hardscapers use the T64 for a weekend install without owning a second machine.'],
      ['Trench and footing prep', 'Rough in grades and dig shallow footings with the stump bucket.'],
    ],
    access:
      'Rural addresses off Route 234 and Route 28 sometimes have soft shoulders. A firm place to stop a truck and trailer is all we need.',
    nearby: ['fairfax', 'woodbridge', 'leesburg', 'springfield'],
  },
  {
    slug: 'leesburg',
    city: 'Leesburg',
    county: 'Loudoun County',
    zips: ['20175', '20176'],
    places: 'Leesburg, Lansdowne edges, Lucketts and the Route 15 corridor',
    intro:
      'Loudoun County properties run from quarter-acre subdivisions to working farms, and Leesburg sits in the middle of it. We deliver a Bobcat T64 compact track loader to Leesburg job sites at the edge of our Virginia service area.',
    jobs: [
      ['Farm and acreage projects', 'Maintain farm lanes, move hay and feed pallets, and clean up after storms.'],
      ['Rocky-soil grading', 'Loudoun ground is full of rock. Tracks and 68 horsepower get through what a compact tractor will not.'],
      ['New-home landscaping', 'Final grade, topsoil and sod prep on new construction.'],
      ['Pond, arena and pad work', 'Shape, fill and level for riding rings, pole barns and outbuildings.'],
    ],
    access:
      'Leesburg is in our farthest delivery zone, so weekly rentals make the most of the trip. Long farm lanes are fine if the truck can turn around.',
    nearby: ['manassas', 'fairfax', 'vienna', 'mclean'],
  },
  {
    slug: 'fredericksburg',
    city: 'Fredericksburg',
    county: 'City of Fredericksburg, Stafford & Spotsylvania',
    zips: ['22401', '22405', '22406'],
    places: 'Fredericksburg, Falmouth, south Stafford and the Route 17 corridor',
    intro:
      'Fredericksburg is the southern edge of our delivery area and has plenty of room to work. We bring a Bobcat T64 compact track loader down I-95 to your site and pick it up at the end of the rental.',
    jobs: [
      ['Lot clearing for new builds', 'Clear brush and small timber, grub stumps and rough grade a home site.'],
      ['Long driveway construction', 'Cut in, stone and crown a new gravel drive on acreage.'],
      ['Riverfront and wooded cleanup', 'Grapple out deadfall and flood debris along the Rappahannock.'],
      ['Weekend farm work', 'Fence-line clearing, pad building and moving palletized materials.'],
    ],
    access:
      'This is our longest run, so a weekend or weekly rental gives you the best value on the delivery fee. Share the nearest cross street for rural addresses.',
    nearby: ['woodbridge', 'manassas', 'lorton', 'springfield'],
  },
];

export const locationPath = (loc) => `skid-steer-rental-${loc.slug}-va`;
