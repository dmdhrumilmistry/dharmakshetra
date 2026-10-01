// Static game data: board, card decks and the playable characters.

export const START_CASH = 1500;
export const GO_SALARY = 200;
export const JAIL_FINE = 50;
export const JAIL_POS = 10;
export const MAX_PLAYERS = 6;

export const GROUPS = {
  brown:  { name: 'Forest villages', color: '#8B5A3C', house: 50 },
  sky:    { name: 'Allied kingdoms', color: '#5FA8CC', house: 50 },
  pink:   { name: 'Eastern kingdoms', color: '#D9668F', house: 100 },
  orange: { name: 'Northwest kingdoms', color: '#E8893A', house: 100 },
  red:    { name: 'Western kingdoms', color: '#B8323F', house: 150 },
  yellow: { name: 'Kuru lands', color: '#D9AE2B', house: 150 },
  green:  { name: 'Braj', color: '#3E9B6B', house: 200 },
  indigo: { name: 'Divine cities', color: '#2B3A8C', house: 200 },
};

const realm = (name, group, price, rent, blurb) => ({ type: 'realm', name, group, price, rent, blurb });
const tirtha = (name, blurb) => ({ type: 'tirtha', name, price: 200, blurb });
const util = (name, blurb) => ({ type: 'util', name, price: 150, blurb });

export const TILES = [
  { type: 'go', name: 'Hastinapura', blurb: 'The Kuru capital. Collect 200 each time you pass.' },
  realm('Ekachakra', 'brown', 60, [2, 10, 30, 90, 160, 250], 'The village where Bhima slew the demon Baka.'),
  { type: 'ashirvad', name: 'Ashirvad', blurb: 'Draw a blessing.' },
  realm('Varanavata', 'brown', 60, [4, 20, 60, 180, 320, 450], 'Site of the lacquer house built to burn the Pandavas.'),
  { type: 'tax', name: 'Yajna Dakshina', amount: 200, blurb: 'Offer 200 to the sacrificial fire.' },
  tirtha('Ganga Ghat', 'Bathing steps on the river that is mother to Bhishma.'),
  realm('Panchala', 'sky', 100, [6, 30, 90, 270, 400, 550], 'Drupada\'s kingdom, where Draupadi rose from the fire.'),
  { type: 'leela', name: 'Leela', blurb: 'Draw from Krishna\'s divine play.' },
  realm('Matsya', 'sky', 100, [6, 30, 90, 270, 400, 550], 'King Virata\'s realm, where the Pandavas lived in disguise.'),
  realm('Chedi', 'sky', 120, [8, 40, 100, 300, 450, 600], 'Shishupala\'s land, whose hundred insults Krishna forgave.'),
  { type: 'exile', name: 'Vanavas', blurb: 'Forest exile. Just passing through, or serving your term.' },
  realm('Kashi', 'pink', 140, [10, 50, 150, 450, 625, 750], 'The eternal city on the Ganga, home of three princesses.'),
  util('Akshaya Patra', 'Draupadi\'s vessel that never runs empty. Rent is 4x the dice, or 10x if you hold both treasures.'),
  realm('Magadha', 'pink', 140, [10, 50, 150, 450, 625, 750], 'Jarasandha\'s fortress, broken by Bhima in a long duel.'),
  realm('Anga', 'pink', 160, [12, 60, 180, 500, 700, 900], 'The kingdom Duryodhana gifted to Karna.'),
  tirtha('Yamuna Ghat', 'The dark river Krishna crossed on the night of his birth.'),
  realm('Gandhara', 'orange', 180, [14, 70, 200, 550, 750, 950], 'Homeland of Shakuni and Queen Gandhari.'),
  { type: 'ashirvad', name: 'Ashirvad', blurb: 'Draw a blessing.' },
  realm('Madra', 'orange', 180, [14, 70, 200, 550, 750, 950], 'Realm of Shalya, uncle of the twins.'),
  realm('Sindhu', 'orange', 200, [16, 80, 220, 600, 800, 1000], 'Jayadratha\'s kingdom by the great river.'),
  { type: 'rest', name: 'Kurukshetra', blurb: 'Where Krishna sang the Gita. Rest here a while.' },
  realm('Kekaya', 'red', 220, [18, 90, 250, 700, 875, 1050], 'Western kingdom of steadfast allies.'),
  { type: 'leela', name: 'Leela', blurb: 'Draw from Krishna\'s divine play.' },
  realm('Avanti', 'red', 220, [18, 90, 250, 700, 875, 1050], 'Where Krishna and Balarama studied under Sandipani.'),
  realm('Vidarbha', 'red', 240, [20, 100, 300, 750, 925, 1100], 'Rukmini\'s homeland, from where Krishna carried her away.'),
  tirtha('Saraswati Tirtha', 'Balarama walked its banks on pilgrimage during the war.'),
  realm('Kamyaka Vana', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 'The forest of exile, where sages visited the Pandavas.'),
  realm('Khandava', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 'The forest Arjuna and Krishna offered to Agni.'),
  util('Kamadhenu', 'The wish-granting cow. Rent is 4x the dice, or 10x if you hold both treasures.'),
  realm('Kurujangala', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], 'The heartland of the Kuru clan.'),
  { type: 'dice', name: 'Dyuta Sabha', blurb: 'The rigged game of dice. Go straight to Vanavas.' },
  realm('Mathura', 'green', 300, [26, 130, 390, 900, 1100, 1275], 'Krishna\'s birthplace, freed from Kamsa.'),
  realm('Gokula', 'green', 300, [26, 130, 390, 900, 1100, 1275], 'Where young Krishna grew up with Yashoda and Nanda.'),
  { type: 'ashirvad', name: 'Ashirvad', blurb: 'Draw a blessing.' },
  realm('Vrindavan', 'green', 320, [28, 150, 450, 1000, 1200, 1400], 'Groves of the rasa dance and Krishna\'s flute.'),
  tirtha('Prayag Sangam', 'The meeting of three rivers.'),
  { type: 'leela', name: 'Leela', blurb: 'Draw from Krishna\'s divine play.' },
  realm('Indraprastha', 'indigo', 350, [35, 175, 500, 1100, 1300, 1500], 'The Pandava city, raised by Maya from the Khandava.'),
  { type: 'tax', name: 'Rajasuya Tribute', amount: 100, blurb: 'Pay 100 toward the imperial sacrifice.' },
  realm('Dwaraka', 'indigo', 400, [50, 200, 600, 1400, 1700, 2000], 'Krishna\'s golden city by the western sea.'),
];

export const BUYABLE = new Set(['realm', 'tirtha', 'util']);

export const groupTiles = (group) =>
  TILES.map((t, i) => (t.group === group ? i : -1)).filter((i) => i >= 0);

// Leela: Krishna's play. Mostly movement and fortune.
export const LEELA = [
  { text: 'Krishna lifts Govardhan to shelter you. Advance to Gokula.', kind: 'move', to: 32 },
  { text: 'The Pandavas set out from the capital. Advance to Hastinapura and collect 200.', kind: 'move', to: 0 },
  { text: 'Krishna summons you to his court. Advance to Dwaraka.', kind: 'move', to: 39 },
  { text: 'Bhima challenges Jarasandha. Advance to Magadha.', kind: 'move', to: 13 },
  { text: 'A pilgrimage calls. Advance to the nearest Tirtha. If it is owned, pay double rent.', kind: 'nearestTirtha' },
  { text: 'The river beckons. Advance to the nearest Tirtha. If it is owned, pay double rent.', kind: 'nearestTirtha' },
  { text: 'Hunger on the road. Advance to the nearest treasure. If it is owned, pay 10x the dice.', kind: 'nearestUtil' },
  { text: 'Ride to the meeting of rivers. Advance to Prayag Sangam.', kind: 'move', to: 35 },
  { text: 'Shakuni\'s loaded dice. Go back 3 tiles.', kind: 'back', n: 3 },
  { text: 'You lose everything at the dice hall. Go directly to Vanavas.', kind: 'jail' },
  { text: 'Krishna\'s flute softens the court. Keep this pardon to leave Vanavas free.', kind: 'jailCard' },
  { text: 'Monsoon damages the shrines. Pay 25 per temple and 100 per palace.', kind: 'repairs', h: 25, p: 100 },
  { text: 'The Sabha fines you for an unpaid toll. Pay 15.', kind: 'pay', n: 15 },
  { text: 'You are asked to host the Rajasuya feast. Pay each player 50.', kind: 'payEach', n: 50 },
  { text: 'Your chariot wins the race at Hastinapura. Collect 150.', kind: 'gain', n: 150 },
  { text: 'Kubera opens his treasury for a moment. Collect 50.', kind: 'gain', n: 50 },
];

// Ashirvad: blessings from elders, sages and gods.
export const ASHIRVAD = [
  { text: 'Bhishma blesses your journey. Advance to Hastinapura and collect 200.', kind: 'move', to: 0 },
  { text: 'Surya smiles on your fields. Collect 200.', kind: 'gain', n: 200 },
  { text: 'The Ashwini twins heal your fever. Pay 50 for herbs.', kind: 'pay', n: 50 },
  { text: 'Cows from Gokula fetch a fair price. Collect 50.', kind: 'gain', n: 50 },
  { text: 'Vidura vouches for you. Keep this pardon to leave Vanavas free.', kind: 'jailCard' },
  { text: 'A curse follows you. Go directly to Vanavas.', kind: 'jail' },
  { text: 'Holi in Vrindavan. Collect 25 from every player.', kind: 'collectEach', n: 25 },
  { text: 'A bountiful harvest. Collect 100.', kind: 'gain', n: 100 },
  { text: 'Your guru dakshina is returned with thanks. Collect 20.', kind: 'gain', n: 20 },
  { text: 'Indra sends rain to your lands. Collect 100.', kind: 'gain', n: 100 },
  { text: 'You feed the priests of the yajna. Pay 100.', kind: 'pay', n: 100 },
  { text: 'You pay Dronacharya for archery lessons. Pay 50.', kind: 'pay', n: 50 },
  { text: 'Sudama\'s humble gift returns to you. Collect 25.', kind: 'gain', n: 25 },
  { text: 'Restore the temple spires. Pay 40 per temple and 115 per palace.', kind: 'repairs', h: 40, p: 115 },
  { text: 'You place second in the archery contest. Collect 10.', kind: 'gain', n: 10 },
  { text: 'An inheritance arrives from the Kuru treasury. Collect 100.', kind: 'gain', n: 100 },
];

// Each character has one divine power, usable once per game.
export const CHARACTERS = {
  krishna: {
    name: 'Krishna', title: 'Keeper of the flute', color: '#2F55B4', emblem: 'feather',
    power: 'Sudarshana', powerText: 'Choose your dice total (2 to 12) instead of rolling.',
  },
  balarama: {
    name: 'Balarama', title: 'Bearer of the plough', color: '#4F7A8C', emblem: 'plough',
    power: 'Halayudha', powerText: 'Your next temple is built for free.',
  },
  arjuna: {
    name: 'Arjuna', title: 'Archer of Gandiva', color: '#138A72', emblem: 'bow',
    power: 'Gandiva', powerText: 'The next rent you owe is waived.',
  },
  bhima: {
    name: 'Bhima', title: 'Son of the wind', color: '#8C4A2F', emblem: 'mace',
    power: 'Vayu\'s speed', powerText: 'Your next roll moves you double the distance.',
  },
  draupadi: {
    name: 'Draupadi', title: 'Born of the fire', color: '#C2185B', emblem: 'lotus',
    power: 'Akshaya Patra', powerText: 'Collect 200 from the bank right away.',
  },
  karna: {
    name: 'Karna', title: 'Son of Surya', color: '#C98A00', emblem: 'sun',
    power: 'Kavacha', powerText: 'Your next tax or card payment to the bank is waived.',
  },
  bhishma: {
    name: 'Bhishma', title: 'Keeper of the vow', color: '#6D5BA8', emblem: 'conch',
    power: 'Iccha Mrityu', powerText: 'Walk out of Vanavas now, or ignore the next sentence to it.',
  },
  hanuman: {
    name: 'Hanuman', title: 'Bannered on Arjuna\'s chariot', color: '#D9531E', emblem: 'mountain',
    power: 'Great leap', powerText: 'Leap to the next Tirtha before you roll.',
  },
};

export const CHARACTER_IDS = Object.keys(CHARACTERS);
