/**
 * FEED mirrors the payload published by the backend agent swarm.
 * Swap this module for a fetch of the live endpoint when it's wired up.
 * Photo URLs are Wikipedia/Commons lead-image thumbnails (hotlink-friendly);
 * null falls back to an initials avatar.
 */
export const FEED = {
  meta: {
    competition: 'World Cup 2026',
    stage: 'Quarter-final',
    venue: 'Kansas City',
    date: 'Sat Jul 11',
    kickoff: '2:00 PM PT',
    kickoffLocal: '4:00 PM local',
    updated: '11:07 AM PT',
  },
  prediction: {
    pick: 'ENG',
    probs: { NOR: 0.27, DRW: 0.19, ENG: 0.54 },
    blurb:
      'England’s midfield control and set-piece edge outweigh the Haaland threat — but only just.',
    source: 'Consensus of 4 quant agents',
    reasoning: [
      {
        title: 'Midfield geometry',
        body: 'Rice and Bellingham compress the half-spaces where Norway build nearly all of their progressive carries. The transition volume Norway lives on projects well below their tournament baseline, and without it their attack becomes forecastable.',
      },
      {
        title: 'The Haaland variable',
        body: 'Haaland’s shot quality keeps Norway alive in every game state, and he is the single biggest reason this call stays narrow. One touch decides a knockout — the model respects that and refuses to call this comfortable.',
      },
      {
        title: 'Set pieces',
        body: 'England win first contact on dead balls at a rate Norway have not matched all cycle. In a bracket this tight, the quiet dead-ball edge is often the whole margin.',
      },
      {
        title: 'Market drift',
        body: 'The books moved toward England after midweek training reports flagged Ødegaard’s ankle. Our agents had it priced a day earlier — when the market catches up to the desk, conviction firms.',
      },
    ],
    agents: [
      { id: 'Poisson-xG', desc: 'Shot-quality simulation, ten thousand runs', lean: 'England, narrowly' },
      { id: 'Elo-market', desc: 'Rating prior blended with market movement', lean: 'England, firmly' },
      { id: 'Bayes-form', desc: 'Rolling form model over the last 18 matches', lean: 'England, narrowly' },
      { id: 'Scout-LLM', desc: 'Reads team news, pressers, injury reports', lean: 'England, with reservations' },
    ],
  },
  outcomes: {
    NOR: { label: 'Norway', color: 'var(--nor)' },
    DRW: { label: 'Draw', color: 'var(--drw)' },
    ENG: { label: 'England', color: 'var(--eng)' },
  },
  teams: {
    NOR: {
      code: 'NOR',
      name: 'Norway',
      flag: 'flags/norway.webp',
      coach: {
        name: 'Ståle Solbakken',
        photo: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Kopengagen-_%282%29.jpg',
      },
      xi: [
        { name: 'Ørjan Nyland', pos: 'GK', photo: 'players/orjan-nyland.webp' },
        { name: 'Julian Ryerson', pos: 'RB', photo: 'players/julian-ryerson.webp' },
        { name: 'Kristoffer Ajer', pos: 'CB', photo: 'players/kristoffer-ajer.webp' },
        { name: 'Leo Østigård', pos: 'CB', photo: 'players/leo-ostigard.webp' },
        { name: 'David Møller Wolfe', pos: 'LB', photo: 'players/david-moller-wolfe.webp' },
        { name: 'Sander Berge', pos: 'DM', photo: 'players/sander-berge.webp' },
        { name: 'Patrick Berg', pos: 'CM', photo: 'players/patrick-berg.webp' },
        { name: 'Martin Ødegaard', pos: 'AM', photo: 'players/martin-odegaard.webp' },
        { name: 'Antonio Nusa', pos: 'LW', photo: 'players/antonio-nusa.webp' },
        { name: 'Erling Haaland', pos: 'ST', photo: 'players/erling-haaland.webp' },
        { name: 'Alexander Sørloth', pos: 'ST', photo: 'players/alexander-sorloth.webp' },
      ],
    },
    ENG: {
      code: 'ENG',
      name: 'England',
      flag: 'flags/england.webp',
      coach: {
        name: 'Thomas Tuchel',
        photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Thomas_Tuchel_England_v_Ghana_23_June_2026-081.jpg/960px-Thomas_Tuchel_England_v_Ghana_23_June_2026-081.jpg',
      },
      /* XI aligned to the official 26-man squad (see /photos): O'Reilly,
         Eze, and Rashford in for Lewis-Skelly, Palmer, and Foden. */
      xi: [
        { name: 'Jordan Pickford', pos: 'GK', photo: 'players/jordan-pickford.webp' },
        { name: 'Reece James', pos: 'RB', photo: 'players/reece-james.webp' },
        { name: 'John Stones', pos: 'CB', photo: 'players/john-stones.webp' },
        { name: 'Marc Guéhi', pos: 'CB', photo: 'players/marc-guehi.webp' },
        { name: "Nico O'Reilly", pos: 'LB', photo: 'players/nico-oreilly.webp' },
        { name: 'Declan Rice', pos: 'DM', photo: 'players/declan-rice.webp' },
        { name: 'Jude Bellingham', pos: 'CM', photo: 'players/jude-bellingham.webp' },
        { name: 'Eberechi Eze', pos: 'AM', photo: 'players/eberechi-eze.webp' },
        { name: 'Bukayo Saka', pos: 'RW', photo: 'players/bukayo-saka.webp' },
        { name: 'Marcus Rashford', pos: 'LW', photo: 'players/marcus-rashford.webp' },
        { name: 'Harry Kane', pos: 'ST', photo: 'players/harry-kane.webp' },
      ],
    },
  },
}
