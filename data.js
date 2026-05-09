/* ===== Brain Trust Data =====
 * Member roster, personas, and seeded historical sessions.
 * Personas are intentionally fictional / inside-joke style — edit freely.
 */

const BEER_STYLES = [
  "IPA", "Lager", "Pilsner", "Stout", "Sour", "Hazy IPA",
  "Wheat", "Pale Ale", "Porter", "Saison", "Light", "Cider",
  "NA Beer", "Sparkling Water", "Soda", "Iced Tea", "Coffee", "Lemonade"
];

const BRAIN_TRUST = [
  {
    id: "frank",
    name: "Frank Gambardella",
    handle: "@the_closer",
    initials: "FG",
    color: "#e2543a",
    archetype: "The Closer",
    tagline: "Late-game legend.",
    bio: "Quiet through the first half. Then the lights flicker, the kitchen closes, and Frank shifts into a gear nobody else has. The Brain Trust calls it 'The Gambardella Surge.'",
    signatureBeer: "West Coast IPA",
    favoriteStyle: "IPA",
    powerMoves: [
      { title: "The Closer", text: "Drinks faster after 11pm than the rest of us drink all night. Don't try to keep up." },
      { title: "Round Theory", text: "Refuses to leave on an odd number. The math is sacred." },
      { title: "Tab Strategy", text: "Always volunteers to grab the next round. Always returns with two." }
    ],
    paceProfile: { start: 0.9, late: 1.6 },
    styleMix: { "IPA": 0.40, "Hazy IPA": 0.25, "Lager": 0.15, "Pale Ale": 0.10, "Stout": 0.10 }
  },
  {
    id: "sasha",
    name: "Sasha Hsu",
    handle: "@the_strategist",
    initials: "SH",
    color: "#a16ad9",
    archetype: "The Strategist",
    tagline: "Pacing is a personality.",
    bio: "Sasha treats every session like a chess match. Hydrates between rounds. Reads the room. Has never once been the drunkest at the table — and somehow ends every night with the most stories.",
    signatureBeer: "Crisp Pilsner",
    favoriteStyle: "Pilsner",
    powerMoves: [
      { title: "The Pacer", text: "One beer per hour, no exceptions, until somebody dares her otherwise." },
      { title: "Sour Hour", text: "Mandates a sour beer at the midpoint of every session. House rule." },
      { title: "The Ledger", text: "Remembers every single thing you said three drinks ago. Bring it up if you want — she's ready." }
    ],
    paceProfile: { start: 1.0, late: 0.9 },
    styleMix: { "Pilsner": 0.30, "Sour": 0.25, "Lager": 0.20, "Wheat": 0.15, "Saison": 0.10 }
  },
  {
    id: "jack",
    name: "Jack Gilbert",
    handle: "@the_captain",
    initials: "JG",
    color: "#f5b13b",
    archetype: "The Captain",
    tagline: "Keeper of the spreadsheet.",
    bio: "Built this entire website. Started the Brain Trust group chat. Owns the spreadsheet. Always knows whose turn it is to buy. Balanced palate, balanced pace, unbalanced commitment to documentation.",
    signatureBeer: "Whatever's on tap and reasonably priced",
    favoriteStyle: "Pale Ale",
    powerMoves: [
      { title: "The Quartermaster", text: "Has a charged phone, a backup charger, and the Uber app already open." },
      { title: "Census Caller", text: "Counts heads every 20 minutes. The count must match the tab." },
      { title: "Founder's Tax", text: "Drinks one extra at the end of the night for surviving the group chat." }
    ],
    paceProfile: { start: 1.1, late: 1.1 },
    styleMix: { "Pale Ale": 0.25, "Lager": 0.25, "IPA": 0.20, "Hazy IPA": 0.15, "Stout": 0.15 }
  },
  {
    id: "grant",
    name: "Grant Gardner",
    handle: "@the_gardener",
    initials: "GG",
    color: "#6fbf73",
    archetype: "The Gardener",
    tagline: "Cultivates only the finest hops.",
    bio: "Will not — under any circumstances — drink a domestic light. Knows the brewery, the brewer, the brewer's dog. Has opinions about water pH. Brought a beer flight to a Super Bowl party once.",
    signatureBeer: "Triple Hazy IPA",
    favoriteStyle: "Hazy IPA",
    powerMoves: [
      { title: "The Snob (Affectionate)", text: "Will tell you what's wrong with your beer. You did not ask." },
      { title: "Brewery Pilgrim", text: "Has been to more breweries this year than most people have been to Targets." },
      { title: "Hop Forward", text: "Anything under 60 IBU is 'just water.'" }
    ],
    paceProfile: { start: 1.0, late: 1.0 },
    styleMix: { "Hazy IPA": 0.35, "IPA": 0.25, "Saison": 0.15, "Sour": 0.15, "Stout": 0.10 }
  },
  {
    id: "mike",
    name: "Mike Kelly",
    handle: "@the_anchor",
    initials: "MK",
    color: "#5fb6ff",
    archetype: "The Designated",
    tagline: "Sober. Steady. Scoring the rest of you.",
    bio: "Mike doesn't drink. Mike drives. Mike remembers. Six pints in, the rest of the Brain Trust suddenly thinks Mike is the funniest one at the table — and Mike, perfectly clear-headed, is taking notes. The conscience of the group. Track his NAs and waters here.",
    signatureBeer: "NA Beer (Athletic Brewing)",
    favoriteStyle: "NA Beer",
    nonDrinker: true,
    powerMoves: [
      { title: "The Designated", text: "Has driven home every single night since the founding. Refuses payment. Accepts gas station snacks." },
      { title: "Total Recall", text: "Beer-eight Frank confessed something. Stone-sober Mike heard it. Mike will bring it up at brunch." },
      { title: "The Anchor", text: "When the night threatens to fall apart, Mike steps in: tab settled, Ubers ordered, jackets accounted for." },
      { title: "NA Snob", text: "Has strong, considered opinions on which non-alcoholic beer is best. Will gladly tell you." }
    ],
    paceProfile: { start: 0.6, late: 0.5 },
    styleMix: { "NA Beer": 0.35, "Sparkling Water": 0.25, "Soda": 0.15, "Iced Tea": 0.10, "Coffee": 0.10, "Lemonade": 0.05 }
  },
  {
    id: "graham",
    name: "Graham Aird",
    handle: "@the_wildcard",
    initials: "GA",
    color: "#ffd061",
    archetype: "The Wildcard",
    tagline: "Plot twist incarnate.",
    bio: "Three Guinnesses, then a sour, then a tequila shot, then back to a stout. There is no system. There is only Graham. A historical anomaly that the group has chosen to accept.",
    signatureBeer: "Imperial Stout (Nitro)",
    favoriteStyle: "Stout",
    powerMoves: [
      { title: "Style Roulette", text: "Has never ordered the same beer twice in one session. Allegedly." },
      { title: "The Surge", text: "Goes from beer 2 to beer 6 in roughly 18 minutes. Then disappears for an hour." },
      { title: "Dark Side", text: "If it's black and on nitro, it's gone before you sit down." }
    ],
    paceProfile: { start: 1.4, late: 0.7 },
    styleMix: { "Stout": 0.30, "Porter": 0.20, "IPA": 0.15, "Sour": 0.15, "Cider": 0.10, "Saison": 0.10 }
  }
];

/* Seeded historical sessions — deterministic so charts look populated.
 * Each seeded session: { id, name, date (ISO), entries: [{memberId, time (offset minutes), style}] }
 */
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pickStyle(rand, mix) {
  const r = rand();
  let acc = 0;
  for (const [style, p] of Object.entries(mix)) {
    acc += p;
    if (r <= acc) return style;
  }
  return Object.keys(mix)[0];
}

function generateSeedSessions() {
  const rand = seededRandom(42);
  const sessionNames = [
    "Friday Round Table",
    "Tuesday Trivia Massacre",
    "Sasha's Birthday",
    "Frank's Promotion",
    "Bowling Night",
    "Football Sunday",
    "The Tasting Flight Incident",
    "Open Mic Disaster"
  ];

  const now = Date.now();
  const sessions = [];

  for (let i = 0; i < 8; i++) {
    const date = new Date(now - (8 - i) * 7 * 24 * 60 * 60 * 1000 + (rand() - 0.5) * 3 * 24 * 60 * 60 * 1000);
    const entries = [];
    BRAIN_TRUST.forEach((m) => {
      // Base count per session for this member: 4-9 with archetype skew
      let base = 4 + Math.floor(rand() * 6);
      if (m.id === "frank") base += 2;
      if (m.id === "sasha") base -= 1;
      if (m.id === "graham") base += Math.round((rand() - 0.5) * 4); // wildcard
      if (m.id === "mike") base = 2 + Math.floor(rand() * 3); // designated driver — fewer NAs
      const count = Math.max(m.id === "mike" ? 1 : 2, base);

      const sessionStart = date.getTime();
      for (let b = 0; b < count; b++) {
        // Distribute over ~4 hours, with archetype pacing
        const phase = b / count;
        const paceFactor = phase < 0.5 ? m.paceProfile.start : m.paceProfile.late;
        const baseMinute = phase * 240;
        const jitter = (rand() - 0.5) * 30;
        const offsetMinutes = Math.max(0, baseMinute + jitter / paceFactor);
        const time = sessionStart + offsetMinutes * 60 * 1000;
        entries.push({
          memberId: m.id,
          time,
          style: pickStyle(rand, m.styleMix)
        });
      }
    });

    entries.sort((a, b) => a.time - b.time);
    sessions.push({
      id: "seed-" + i,
      name: sessionNames[i % sessionNames.length],
      date: date.toISOString(),
      startedAt: date.getTime(),
      endedAt: date.getTime() + 4 * 60 * 60 * 1000,
      entries,
      seed: true
    });
  }

  return sessions;
}

const SEED_SESSIONS = generateSeedSessions();

const LORE = [
  {
    tag: "Origin",
    title: "The Founding",
    text: "On a forgotten Friday in a corner booth, six humans declared themselves a Brain Trust and ordered a pitcher. The pitcher arrived. The Brain Trust did not leave. The booth has not been the same since."
  },
  {
    tag: "Sacred Rule #1",
    title: "Never on an Odd",
    text: "No member shall conclude a session on an odd-numbered beer. To do so disrespects the round, the table, and the ancestors who came before."
  },
  {
    tag: "Sacred Rule #2",
    title: "The Spreadsheet is Canon",
    text: "Whatever the Captain logs is what happened. Memory is fallible. Spreadsheets are not. If you didn't see it, but Jack wrote it down, it happened."
  },
  {
    tag: "Sacred Rule #3",
    title: "Style Roulette",
    text: "Every session, exactly one member must order a beer outside their declared comfort zone. Refusal results in buying the next round. Graham is exempt; Graham IS the roulette wheel."
  },
  {
    tag: "Legend",
    title: "The Gambardella Surge",
    text: "First witnessed on a Thursday that was definitely supposed to end by 9. Frank consumed four beers in 23 minutes between hours four and five. Time, as we understand it, briefly broke."
  },
  {
    tag: "Legend",
    title: "Sasha's Sour Hour",
    text: "At precisely the midpoint of every session, Sasha orders a sour. Nobody knows how she knows. The bar staff has stopped asking."
  },
  {
    tag: "Legend",
    title: "The Hsu Memory Vault",
    text: "Sasha can recall, verbatim, anything anyone said three drinks ago. This was funny exactly once. It is now a constitutional crisis."
  },
  {
    tag: "Legend",
    title: "Graham's 47-Minute Disappearance",
    text: "Date and location withheld. Graham left to use the bathroom. Returned 47 minutes later with a stout, a story about a dog, and zero explanation. The Brain Trust accepts this without comment."
  },
  {
    tag: "Etiquette",
    title: "Cheers Protocol",
    text: "Eye contact is mandatory. Failure to make eye contact during a cheers results in a curse of seven years' bad pints. We made this rule up. We honor it anyway."
  }
];

const RECORDS_KEYS = [
  { key: "mostInOneSession", title: "Most Beers, One Session" },
  { key: "highestAvg", title: "Highest Average Pace" },
  { key: "fastestPace", title: "Fastest Beer-to-Beer" },
  { key: "longestSession", title: "Longest Session Survived" },
  { key: "mostSessionsWon", title: "Most Sessions as Top Drinker" },
  { key: "mostStyles", title: "Most Beer Styles Tried" }
];
