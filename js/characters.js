// Character portraits: painted anime-style images (assets/chars), with moods
// (idle, happy, sad, shock) shown as animated effects layered on top.

const BASE = 'assets/chars/';

export function portrait(id, mood = 'idle', { headOnly = false, cls = '' } = {}) {
  const src = `${BASE}${id}${headOnly ? '-face' : ''}.webp`;
  return `<span class="portrait p-${id} mood-${mood} ${headOnly ? 'head' : 'bust'} ${cls}"><img src="${src}" alt="" decoding="async" draggable="false"></span>`;
}

export const portraitSrc = (id, headOnly = false) => `${BASE}${id}${headOnly ? '-face' : ''}.webp`;

// What each character says when things happen. Short, in voice.
export const LINES = {
  krishna: {
    turn: ['Let the leela begin.', 'Watch closely now.', 'The flute is ready.'],
    buy: ['This land will dance to my flute.', 'Another gopi village for me.', 'Mine, with a smile.'],
    rentPay: ['Even I honour a debt.', 'Take it, friend. It returns.'],
    rentGet: ['Dharma always comes back around.', 'A small offering. Thank you.'],
    jail: ['Exile is only a pause in the play.', 'I have been in a prison before.'],
    go: ['Home to Hastinapura!', 'The circle turns once more.'],
    set: ['The whole set sings together.', 'Now the music is complete.'],
    build: ['A temple rises. How lovely.'],
    win: ['The play ends as it was always written.'],
    fall: ['Even I cannot change this leela.'],
    tax: ['An offering to the fire.'],
    card: ['Ah, my own leela.'],
  },
  balarama: {
    turn: ['My plough is hungry.', 'Strength first, then thought.'],
    buy: ['I will till this land myself.', 'A good field for the plough.'],
    rentPay: ['Hmph. Fair is fair.', 'Take it before I change my mind.'],
    rentGet: ['Pay up, little brother.', 'The harvest comes in.'],
    jail: ['They exile the plough-bearer?', 'I will break these chains.'],
    go: ['Back through the gates!'],
    set: ['All the fields are mine now.'],
    build: ['Built strong as my arms.'],
    win: ['Balarama stands tallest!'],
    fall: ['I will return to the hills.'],
    tax: ['A heavy tribute.'],
    card: ['What is this, then?'],
  },
  arjuna: {
    turn: ['Steady. Breathe. Aim.', 'Gandiva is drawn.'],
    buy: ['I claim it by the bow.', 'A worthy prize.'],
    rentPay: ['A warrior pays his debts.', 'Even arrows miss sometimes.'],
    rentGet: ['Right on target.', 'Bullseye.'],
    jail: ['Exile again? Govinda, guide me.', 'Thirteen years was enough!'],
    go: ['The banners of Hastinapura!'],
    set: ['Every target struck.'],
    build: ['A temple for my brothers.'],
    win: ['With Krishna at my side, always.'],
    fall: ['My bow grows heavy.'],
    tax: ['For the yajna.'],
    card: ['What does fate hold?'],
  },
  bhima: {
    turn: ['Out of my way!', 'I am hungry. Let us move.'],
    buy: ['Mine! Who will argue?', 'I will eat here every day.'],
    rentPay: ['Grr. Take it and go.', 'This hurts more than a mace.'],
    rentGet: ['Pay Bhima, or face the gada.', 'Ha! Feed me gold.'],
    jail: ['I will tear down the jail walls!', 'Not again, Shakuni!'],
    go: ['Home, and dinner!'],
    set: ['The whole kingdom bows to Bhima!'],
    build: ['Built with my own hands.'],
    win: ['Victory tastes better than laddoos!'],
    fall: ['Even the mace has fallen.'],
    tax: ['Taxes. Worse than demons.'],
    card: ['Let me see that.'],
  },
  draupadi: {
    turn: ['Let us see what fate dares.', 'My turn, and I am ready.'],
    buy: ['This realm is under my care now.', 'A fine choice.'],
    rentPay: ['Remember this kindness.', 'I will count every coin.'],
    rentGet: ['Akshaya Patra fills again.', 'Thank you for the offering.'],
    jail: ['Exile cannot break my spirit.', 'I have walked into the forest before.'],
    go: ['Back to the palace.'],
    set: ['The whole region answers to me.'],
    build: ['A temple for the people.'],
    win: ['Born of fire, crowned at last.'],
    fall: ['This is not the end of my story.'],
    tax: ['A fair tribute.'],
    card: ['Krishna, what now?'],
  },
  karna: {
    turn: ['The sun rises on my turn.', 'Watch the son of Surya.'],
    buy: ['Anga needs neighbours.', 'I will rule this justly.'],
    rentPay: ['A giver never counts his gifts.', 'Take it freely.'],
    rentGet: ['Even a giver must receive.', 'Surya smiles.'],
    jail: ['Fate tests me again.', 'Curses follow me everywhere.'],
    go: ['The sun circles home.'],
    set: ['Every kingdom under my sun.'],
    build: ['A shining temple.'],
    win: ['The sun stands highest at noon!'],
    fall: ['The chariot wheel sinks...'],
    tax: ['Give, and give again.'],
    card: ['Let Surya decide.'],
  },
  bhishma: {
    turn: ['I keep my vow. I move.', 'Patience wins wars.'],
    buy: ['For the throne of Hastinapura.', 'Held in trust.'],
    rentPay: ['A vow is a vow. I pay.', 'Duty before gold.'],
    rentGet: ['The elders must be honoured.', 'Duly received.'],
    jail: ['I choose when to leave.', 'An old man, sent to the forest?'],
    go: ['The city I swore to guard.'],
    set: ['The kingdom is whole again.'],
    build: ['A temple for the ancestors.'],
    win: ['The grandsire has spoken.'],
    fall: ['I lay down on my bed of arrows.'],
    tax: ['For the good of the realm.'],
    card: ['Let us see what the gods send.'],
  },
  hanuman: {
    turn: ['Jai Shri Ram!', 'One leap at a time!'],
    buy: ['I will guard this land forever.', 'Hanuman protects it now!'],
    rentPay: ['For Rama, I can spare it.', 'Ouch. My tail is singed.'],
    rentGet: ['Thank you, friend!', 'A gift for the Lord.'],
    jail: ['No wall can hold the son of Vayu!', 'I have escaped worse in Lanka.'],
    go: ['Leaping home!'],
    set: ['Every peak is mine!'],
    build: ['A temple for Rama!'],
    win: ['Jai Bajrangbali!'],
    fall: ['I will fly away and return.'],
    tax: ['For the Lord, gladly.'],
    card: ['A message from the gods?'],
  },
};

export function line(char, kind) {
  const list = (LINES[char] && LINES[char][kind]) || (LINES.krishna[kind]) || [''];
  return list[Math.floor(Math.random() * list.length)];
}
