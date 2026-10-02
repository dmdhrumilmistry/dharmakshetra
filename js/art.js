// Hand-drawn SVG art: character emblems, tile icons and the board centrepiece.
// Palette follows Pichwai temple paintings: night indigo, gold leaf, lotus pink.

const IVORY = '#FBF3E0';
const GOLD = '#E9C46A';

const EMBLEMS = {
  // Krishna: peacock feather
  feather: `
    <path d="M18 58 C 26 46, 33 34, 40 13" stroke="${IVORY}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <g stroke="${IVORY}" stroke-width="1.2" stroke-linecap="round" opacity=".75">
      <path d="M27 42 l-8 -3"/><path d="M29 38 l-8 -5"/><path d="M31 34 l-7 -6"/>
      <path d="M28 44 l7 1"/><path d="M30 40 l8 0"/><path d="M33 36 l8 -1"/>
    </g>
    <g transform="rotate(20 41 22)">
      <ellipse cx="41" cy="22" rx="11" ry="15" fill="#1FA38D"/>
      <ellipse cx="41" cy="23.5" rx="7.2" ry="10" fill="${GOLD}"/>
      <ellipse cx="41" cy="24.5" rx="4.4" ry="6.4" fill="#2B3FA0"/>
      <ellipse cx="41" cy="25" rx="1.8" ry="2.8" fill="#0F1638"/>
    </g>`,
  // Balarama: plough
  plough: `
    <g fill="none" stroke="${IVORY}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 18 C 22 26, 34 34, 44 44"/>
      <path d="M44 44 L 52 56 L 40 52 Z" fill="${GOLD}" stroke="${GOLD}"/>
      <path d="M30 32 L 22 46"/>
      <path d="M17 44 L 28 48"/>
    </g>
    <circle cx="10" cy="18" r="3" fill="${GOLD}"/>`,
  // Arjuna: Gandiva bow and arrow
  bow: `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 7 C 50 20, 50 44, 22 57" stroke="${GOLD}" stroke-width="3.4"/>
      <path d="M22 7 L 22 57" stroke="${IVORY}" stroke-width="1.2"/>
      <path d="M8 32 L 54 32" stroke="${IVORY}" stroke-width="2.4"/>
      <path d="M47 26 L 56 32 L 47 38" stroke="${IVORY}" stroke-width="2.4"/>
      <path d="M8 32 L 4 27 M8 32 L 4 37 M12 32 L 8 27 M12 32 L 8 37" stroke="${IVORY}" stroke-width="1.6"/>
    </g>`,
  // Bhima: gada (mace)
  mace: `
    <path d="M15 51 L 35 31" stroke="${IVORY}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="13" cy="53" r="3.4" fill="${GOLD}"/>
    <circle cx="41" cy="25" r="12" fill="${GOLD}"/>
    <g stroke="#7A4E16" stroke-width="1.4" fill="none" opacity=".7">
      <path d="M31 21 C 37 25, 45 25, 51 21"/><path d="M30 28 C 37 32, 45 32, 52 28"/>
      <path d="M41 13 L 41 37"/>
    </g>
    <path d="M41 9 l 2.5 4 h -5 z" fill="${GOLD}"/>`,
  // Draupadi: lotus risen from fire
  lotus: `
    <g fill="#F4A7BB" stroke="${IVORY}" stroke-width="1.2" stroke-linejoin="round">
      <path d="M32 46 C 16 44, 8 34, 8 26 C 18 28, 26 34, 32 46 Z"/>
      <path d="M32 46 C 48 44, 56 34, 56 26 C 46 28, 38 34, 32 46 Z"/>
      <path d="M32 46 C 20 40, 16 26, 20 16 C 28 22, 32 34, 32 46 Z" fill="#EE87A3"/>
      <path d="M32 46 C 44 40, 48 26, 44 16 C 36 22, 32 34, 32 46 Z" fill="#EE87A3"/>
      <path d="M32 46 C 25 36, 25 20, 32 9 C 39 20, 39 36, 32 46 Z" fill="#E86A8E"/>
    </g>
    <path d="M14 52 C 24 48, 40 48, 50 52" stroke="${GOLD}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  // Karna: the sun
  sun: `
    <g stroke="${GOLD}" stroke-width="2.6" stroke-linecap="round">
      ${Array.from({ length: 12 }, (_, k) => {
        const a = (k * Math.PI) / 6;
        const r1 = 15, r2 = k % 2 ? 22 : 26;
        return `<line x1="${32 + r1 * Math.cos(a)}" y1="${32 + r1 * Math.sin(a)}" x2="${32 + r2 * Math.cos(a)}" y2="${32 + r2 * Math.sin(a)}"/>`;
      }).join('')}
    </g>
    <circle cx="32" cy="32" r="11.5" fill="${GOLD}"/>
    <circle cx="32" cy="32" r="6.5" fill="none" stroke="#B5701A" stroke-width="1.4"/>`,
  // Bhishma: conch (shankha)
  conch: `
    <path d="M14 42 C 10 28, 22 13, 38 14 C 52 15, 57 28, 50 38 C 45 45, 34 48, 24 54 C 20 50, 16 47, 14 42 Z" fill="${IVORY}"/>
    <g fill="none" stroke="#6D5BA8" stroke-width="1.8" stroke-linecap="round">
      <path d="M38 22 C 46 22, 49 30, 44 34 C 40 37, 34 34, 35 30 C 36 27, 40 28, 40 30"/>
      <path d="M18 40 C 24 36, 30 38, 34 42"/>
    </g>
    <path d="M24 54 L 18 58" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>`,
  // Hanuman: the mountain of healing herbs
  mountain: `
    <path d="M6 52 L 24 22 L 33 35 L 42 24 L 58 52 Z" fill="${IVORY}"/>
    <path d="M24 22 L 29 30 L 25 32 L 21 28 Z M42 24 L 46 31 L 41 32 Z" fill="#CFE3D4"/>
    <g fill="${GOLD}">
      <circle cx="20" cy="16" r="2.4"/><circle cx="31" cy="12" r="2"/><circle cx="44" cy="15" r="2.4"/>
    </g>
    <path d="M8 52 L 56 52" stroke="${GOLD}" stroke-width="2.4" stroke-linecap="round"/>`,
};

export function emblem(name) {
  return EMBLEMS[name] || '';
}

// A round medallion: coloured disc, gold rim, emblem.
export function medallion(char, color, { size = 40, dim = false, title = '' } = {}) {
  return `<svg class="medallion${dim ? ' dim' : ''}" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${title}">
    <circle cx="32" cy="32" r="31" fill="${GOLD}"/>
    <circle cx="32" cy="32" r="28.5" fill="${color}"/>
    <circle cx="32" cy="32" r="26.5" fill="none" stroke="${GOLD}" stroke-width=".8" opacity=".6"/>
    <g transform="translate(6.4 6.4) scale(.8)">${emblem(char)}</g>
  </svg>`;
}

// Small line icons for tiles. They use currentColor.
const ICON = {
  go: `<path d="M8 54 V 30 L 32 12 L 56 30 V 54" /><path d="M24 54 V 38 C 24 30, 40 30, 40 38 V 54"/><path d="M4 54 H 60"/><path d="M32 12 V 4 L 40 7 L 32 10"/>`,
  exile: `<path d="M32 6 C 18 10, 10 22, 18 30 C 8 36, 16 48, 30 44 V 58"/><path d="M34 58 V 44 C 48 48, 56 36, 46 30 C 54 22, 46 10, 32 6"/><path d="M22 58 H 44"/>`,
  rest: `<circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="5"/>${Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4;
    return `<line x1="${32 + 5 * Math.cos(a)}" y1="${32 + 5 * Math.sin(a)}" x2="${32 + 22 * Math.cos(a)}" y2="${32 + 22 * Math.sin(a)}"/>`;
  }).join('')}`,
  dice: `<rect x="8" y="22" width="48" height="12" rx="3" transform="rotate(-20 32 28)"/><rect x="8" y="34" width="48" height="12" rx="3" transform="rotate(14 32 40)"/><circle cx="22" cy="31" r="1.6" fill="currentColor"/><circle cx="40" cy="25" r="1.6" fill="currentColor"/><circle cx="24" cy="38" r="1.6" fill="currentColor"/><circle cx="42" cy="42" r="1.6" fill="currentColor"/>`,
  tirtha: `<path d="M6 40 C 14 34, 20 46, 28 40 S 42 34, 50 40 S 58 44, 60 42"/><path d="M6 50 C 14 44, 20 56, 28 50 S 42 44, 50 50 S 58 54, 60 52"/><path d="M14 30 H 50"/><path d="M18 22 H 46"/><path d="M22 14 H 42"/>`,
  pot: `<path d="M20 14 H 44"/><path d="M22 14 C 22 22, 10 26, 10 38 C 10 50, 20 56, 32 56 C 44 56, 54 50, 54 38 C 54 26, 42 22, 42 14"/><path d="M14 36 H 50"/><path d="M28 6 C 28 10, 36 10, 36 6"/>`,
  cow: `<path d="M14 18 C 8 16, 6 10, 10 6 C 12 12, 18 14, 22 16"/><path d="M50 18 C 56 16, 58 10, 54 6 C 52 12, 46 14, 42 16"/><path d="M20 18 H 44 C 46 30, 42 40, 40 46 C 38 54, 26 54, 24 46 C 22 40, 18 30, 20 18 Z"/><circle cx="27" cy="28" r="1.8" fill="currentColor"/><circle cx="37" cy="28" r="1.8" fill="currentColor"/><path d="M26 44 C 30 47, 34 47, 38 44"/>`,
  flute: `<path d="M8 50 L 56 14"/><path d="M10 54 L 58 18"/><circle cx="26" cy="38" r="1.6" fill="currentColor"/><circle cx="32" cy="33.5" r="1.6" fill="currentColor"/><circle cx="38" cy="29" r="1.6" fill="currentColor"/><circle cx="44" cy="24.5" r="1.6" fill="currentColor"/><path d="M16 46 C 12 52, 14 58, 20 60"/>`,
  diya: `<path d="M8 40 C 14 52, 50 52, 56 40 Z"/><path d="M32 36 C 26 30, 28 22, 32 12 C 36 22, 38 30, 32 36 Z"/><path d="M24 54 H 40"/>`,
  fire: `<path d="M32 56 C 18 56, 12 46, 16 36 C 18 42, 22 44, 24 42 C 20 30, 26 18, 34 8 C 34 20, 46 26, 48 38 C 50 48, 44 56, 32 56 Z"/><path d="M10 58 H 54"/>`,
  crown: `<path d="M10 46 L 6 18 L 20 32 L 32 12 L 44 32 L 58 18 L 54 46 Z"/><path d="M10 54 H 54"/><circle cx="32" cy="38" r="3"/>`,
};

export function icon(name, cls = 'ico') {
  return `<svg class="${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ''}</svg>`;
}

export function tileIcon(t) {
  switch (t.type) {
    case 'go': return icon('go');
    case 'exile': return icon('exile');
    case 'rest': return icon('rest');
    case 'dice': return icon('dice');
    case 'tirtha': return icon('tirtha');
    case 'util': return icon(t.name === 'Kamadhenu' ? 'cow' : 'pot');
    case 'leela': return icon('flute');
    case 'ashirvad': return icon('diya');
    case 'tax': return icon(t.amount >= 200 ? 'fire' : 'crown');
    default: return '';
  }
}

export const coin = `<svg class="coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#E9C46A" stroke="#A97B1C" stroke-width="1.2"/><path d="M10 4.5 L 11.6 8.4 L 15.5 10 L 11.6 11.6 L 10 15.5 L 8.4 11.6 L 4.5 10 L 8.4 8.4 Z" fill="#A97B1C"/></svg>`;

// Sudarshana chakra, spun behind the dice.
export function chakra(attrs = 'class="chakra"') {
  const teeth = Array.from({ length: 24 }, (_, k) => {
    const a = (k * Math.PI) / 12;
    const a2 = a + Math.PI / 24;
    const p = (r, ang) => `${(100 + r * Math.cos(ang)).toFixed(1)} ${(100 + r * Math.sin(ang)).toFixed(1)}`;
    return `M ${p(84, a)} L ${p(96, a2)} L ${p(84, a + Math.PI / 12)}`;
  }).join(' ');
  const spokes = Array.from({ length: 16 }, (_, k) => {
    const a = (k * Math.PI) / 8;
    return `<line x1="${100 + 22 * Math.cos(a)}" y1="${100 + 22 * Math.sin(a)}" x2="${100 + 70 * Math.cos(a)}" y2="${100 + 70 * Math.sin(a)}"/>`;
  }).join('');
  return `<svg ${attrs} viewBox="0 0 200 200" aria-hidden="true">
    <g fill="none" stroke="#E9C46A" stroke-linejoin="round">
      <path d="${teeth}" stroke-width="2" fill="rgba(233,196,106,.08)"/>
      <circle cx="100" cy="100" r="84" stroke-width="2.4"/>
      <circle cx="100" cy="100" r="72" stroke-width="1" opacity=".6"/>
      <g stroke-width="1.4" opacity=".55">${spokes}</g>
      <circle cx="100" cy="100" r="22" stroke-width="2"/>
    </g>
  </svg>`;
}

// The board centrepiece: a Pichwai-style lotus pond and mandala.
let artSeq = 0;
export function centreArt() {
  const id = `ca${++artSeq}`;
  const petals = (n, r, len, w, color, op) => Array.from({ length: n }, (_, k) => {
    const a = (360 / n) * k;
    return `<path transform="rotate(${a} 300 300)" d="M300 ${300 - r} C ${300 + w} ${300 - r - len * 0.4}, ${300 + w * 0.6} ${300 - r - len * 0.9}, 300 ${300 - r - len} C ${300 - w * 0.6} ${300 - r - len * 0.9}, ${300 - w} ${300 - r - len * 0.4}, 300 ${300 - r} Z" fill="${color}" opacity="${op}"/>`;
  }).join('');
  const lotusFlower = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 0 C -26 -4, -38 -18, -40 -30 C -24 -28, -10 -16, 0 0 Z" fill="#F4A7BB"/>
      <path d="M0 0 C 26 -4, 38 -18, 40 -30 C 24 -28, 10 -16, 0 0 Z" fill="#F4A7BB"/>
      <path d="M0 0 C -16 -10, -22 -32, -14 -48 C -4 -38, 2 -18, 0 0 Z" fill="#EE87A3"/>
      <path d="M0 0 C 16 -10, 22 -32, 14 -48 C 4 -38, -2 -18, 0 0 Z" fill="#EE87A3"/>
      <path d="M0 0 C -10 -16, -10 -40, 0 -58 C 10 -40, 10 -16, 0 0 Z" fill="#E86A8E"/>
    </g>`;
  const pad = (x, y, r) => `<g transform="translate(${x} ${y})"><ellipse rx="${r}" ry="${r * 0.36}" fill="#1E7C6B"/><path d="M0 0 L ${r * 0.9} ${-r * 0.12}" stroke="#16594D" stroke-width="2"/></g>`;
  return `<svg class="centre-art" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="${id}-glow" cx="50%" cy="46%" r="55%">
        <stop offset="0" stop-color="#34479A"/>
        <stop offset=".7" stop-color="#1B2758"/>
        <stop offset="1" stop-color="#141D45"/>
      </radialGradient>
      <pattern id="${id}-stars" width="40" height="40" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="8" r="1" fill="#E9C46A" opacity=".35"/>
        <circle cx="26" cy="28" r=".8" fill="#FBF3E0" opacity=".25"/>
      </pattern>
    </defs>
    <rect width="600" height="600" fill="url(#${id}-glow)"/>
    <rect width="600" height="600" fill="url(#${id}-stars)"/>
    <g opacity=".22">
      ${petals(16, 150, 70, 26, '#E9C46A', 0.5)}
      ${petals(16, 150, 52, 18, '#FBF3E0', 0.25)}
    </g>
    <g fill="none" stroke="#E9C46A" opacity=".35">
      <circle cx="300" cy="300" r="148" stroke-width="1.5"/>
      <circle cx="300" cy="300" r="232" stroke-width="1" stroke-dasharray="2 6"/>
    </g>
    <g opacity=".9">
      <path d="M0 520 C 120 498, 220 540, 320 520 S 520 500, 600 518 V 600 H 0 Z" fill="#17496A" opacity=".75"/>
      <path d="M0 548 C 140 530, 240 566, 360 546 S 540 536, 600 548 V 600 H 0 Z" fill="#123B57"/>
      <g stroke="#7FB8C9" stroke-width="1.4" opacity=".5" fill="none">
        <path d="M40 560 q 14 -6 28 0 t 28 0"/><path d="M430 572 q 14 -6 28 0 t 28 0"/><path d="M250 586 q 14 -6 28 0 t 28 0"/>
      </g>
      ${pad(70, 540, 34)}${pad(520, 552, 30)}${pad(180, 574, 22)}${pad(440, 584, 20)}
      ${lotusFlower(92, 536, 0.9)}${lotusFlower(500, 548, 0.75)}${lotusFlower(198, 570, 0.5)}
    </g>
    <g transform="translate(470 40) rotate(28)" opacity=".85">
      <path d="M0 200 C 6 140, 4 80, 0 0" stroke="#FBF3E0" stroke-width="2" fill="none"/>
      ${Array.from({ length: 18 }, (_, k) => `<path d="M0 ${30 + k * 9} q ${-26 + k * 0.6} ${-4} ${-34 + k} ${-16}" stroke="#2E9C7E" stroke-width="1.2" fill="none" opacity=".8"/><path d="M0 ${30 + k * 9} q ${26 - k * 0.6} ${-4} ${34 - k} ${-16}" stroke="#2E9C7E" stroke-width="1.2" fill="none" opacity=".8"/>`).join('')}
      <ellipse cx="0" cy="18" rx="22" ry="30" fill="#1FA38D"/>
      <ellipse cx="0" cy="21" rx="14" ry="20" fill="#E9C46A"/>
      <ellipse cx="0" cy="23" rx="8.5" ry="12.5" fill="#2B3FA0"/>
      <ellipse cx="0" cy="24" rx="3.6" ry="5.4" fill="#0F1638"/>
    </g>
    <g transform="translate(40 120) rotate(-32)" opacity=".8">
      <rect x="0" y="0" width="210" height="12" rx="6" fill="#C98A3A"/>
      <rect x="18" y="0" width="8" height="12" fill="#E9C46A"/><rect x="186" y="0" width="8" height="12" fill="#E9C46A"/>
      ${[60, 82, 104, 126, 148, 170].map((x) => `<circle cx="${x}" cy="6" r="2.4" fill="#5A3412"/>`).join('')}
      <path d="M22 12 C 18 30, 26 44, 16 58" stroke="#E86A8E" stroke-width="2" fill="none"/>
      <circle cx="16" cy="60" r="4" fill="#E86A8E"/>
    </g>
  </svg>`;
}

// Interface icons (stroke, currentColor).
const UI_ICON = {
  mic: '<rect x="24" y="8" width="16" height="30" rx="8"/><path d="M16 30 C 16 42, 24 48, 32 48 C 40 48, 48 42, 48 30 M32 48 V56 M24 56 H40"/>',
  micOff: '<rect x="24" y="8" width="16" height="30" rx="8"/><path d="M16 30 C 16 42, 24 48, 32 48 C 40 48, 48 42, 48 30 M32 48 V56 M24 56 H40 M10 10 L54 54"/>',
  headset: '<path d="M12 40 V32 C 12 20, 21 10, 32 10 C 43 10, 52 20, 52 32 V40"/><rect x="8" y="36" width="10" height="16" rx="4"/><rect x="46" y="36" width="10" height="16" rx="4"/><path d="M52 50 C 52 56, 44 58, 36 58"/>',
  hangup: '<path d="M8 36 C 18 26, 46 26, 56 36 L 52 44 L 42 40 L 40 34 C 36 32, 28 32, 24 34 L 22 40 L 12 44 Z"/>',
  speaker: '<path d="M10 24 H20 L34 12 V52 L20 40 H10 Z M42 22 C 48 28, 48 36, 42 42 M48 16 C 58 26, 58 38, 48 48"/>',
  speakerOff: '<path d="M10 24 H20 L34 12 V52 L20 40 H10 Z M42 24 L56 40 M56 24 L42 40"/>',
  menu: '<path d="M12 18 H52 M12 32 H52 M12 46 H52"/>',
  scroll: '<path d="M18 10 H46 C 50 10, 52 14, 52 18 V54 H22 C 18 54, 14 50, 14 46 V14 C 14 12, 16 10, 18 10 Z M22 22 H44 M22 30 H44 M22 38 H36"/>',
  swap: '<path d="M14 22 H50 L40 12 M50 42 H14 L24 52"/>',
  chat: '<path d="M10 14 H54 V44 H28 L16 54 V44 H10 Z M20 26 H44 M20 34 H36"/>',
  realm: '<path d="M14 56 V8 M14 10 H46 L38 20 L46 30 H14"/>',
  gear: '<circle cx="32" cy="32" r="8"/><path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58 M13.6 13.6 L19.3 19.3 M44.7 44.7 L50.4 50.4 M13.6 50.4 L19.3 44.7 M44.7 19.3 L50.4 13.6"/>',
  users: '<circle cx="24" cy="22" r="8"/><path d="M8 52 C 8 40, 16 34, 24 34 C 32 34, 40 40, 40 52"/><circle cx="44" cy="20" r="6"/><path d="M42 32 C 50 32, 56 38, 56 48"/>',
  close: '<path d="M16 16 L48 48 M48 16 L16 48"/>',
  music: '<path d="M24 46 V14 L50 8 V40"/><circle cx="18" cy="46" r="6"/><circle cx="44" cy="40" r="6"/>',
  musicOff: '<path d="M24 46 V14 L50 8 V40"/><circle cx="18" cy="46" r="6"/><circle cx="44" cy="40" r="6"/><path d="M8 8 L56 56"/>',
  trophy: '<path d="M20 8 H44 V24 C 44 32, 38 38, 32 38 C 26 38, 20 32, 20 24 Z M20 14 H10 C 10 24, 14 28, 20 28 M44 14 H54 C 54 24, 50 28, 44 28 M32 38 V48 M22 56 H42 L40 48 H24 Z"/>',
  play: '<path d="M20 12 L50 32 L20 52 Z"/>',
  help: '<circle cx="32" cy="32" r="24"/><path d="M24 26 C 24 18, 40 16, 40 26 C 40 32, 32 32, 32 40 M32 48 V48.5"/>',
  bolt: '<path d="M36 6 L14 36 H30 L26 58 L50 26 H34 Z"/>',
  build: '<path d="M32 6 L46 22 V56 H18 V22 Z M26 56 V42 C 26 36, 38 36, 38 42 V56 M10 56 H54"/>',
  back: '<path d="M38 14 L20 32 L38 50"/>',
  next: '<path d="M26 14 L44 32 L26 50"/>',
  dice: '<rect x="10" y="10" width="44" height="44" rx="10"/><circle cx="22" cy="22" r="2.5"/><circle cx="32" cy="32" r="2.5"/><circle cx="42" cy="42" r="2.5"/>',
};

// Badge icons for the trophy hall.
const BADGE_ICON = {
  flag: '<path d="M16 58 V6 M16 8 C 26 2, 34 14, 50 8 V32 C 34 38, 26 26, 16 32"/>',
  crown: '<path d="M10 46 L 6 18 L 20 32 L 32 12 L 44 32 L 58 18 L 54 46 Z M10 54 H54"/>',
  temple: '<path d="M32 4 L44 22 V56 H20 V22 Z M14 56 H50 M28 56 V44 C 28 40, 36 40, 36 44 V56 M32 4 V0"/>',
  palace: '<path d="M32 6 C 46 12, 52 22, 52 28 H12 C 12 22, 18 12, 32 6 Z M8 28 H56 V56 H8 Z M26 56 V42 C 26 36, 38 36, 38 42 V56 M16 36 V44 M48 36 V44"/>',
  coins: '<ellipse cx="26" cy="20" rx="16" ry="6"/><path d="M10 20 V30 C 10 34, 42 34, 42 30 V20 M10 30 V40 C 10 44, 42 44, 42 40"/><ellipse cx="42" cy="44" rx="14" ry="5"/><path d="M28 44 V52 C 28 56, 56 56, 56 52 V44"/>',
  dice: '<rect x="8" y="8" width="30" height="30" rx="6"/><rect x="26" y="26" width="30" height="30" rx="6"/><circle cx="17" cy="17" r="2"/><circle cx="29" cy="29" r="2"/><circle cx="35" cy="35" r="2"/><circle cx="47" cy="47" r="2"/>',
  spark: '<path d="M32 4 L38 26 L60 32 L38 38 L32 60 L26 38 L4 32 L26 26 Z"/>',
  swap: '<path d="M10 22 H50 L40 12 M54 42 H14 L24 52"/>',
  wave: '<path d="M4 26 C 12 18, 20 34, 28 26 S 44 18, 52 26 S 60 30, 60 30 M4 40 C 12 32, 20 48, 28 40 S 44 32, 52 40 S 60 44, 60 44"/>',
  chakra: '<circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="6"/><path d="M32 8 V26 M32 38 V56 M8 32 H26 M38 32 H56 M15 15 L28 28 M36 36 L49 49 M49 15 L36 28 M28 36 L15 49"/>',
  trophy: '<path d="M20 8 H44 V24 C 44 32, 38 38, 32 38 C 26 38, 20 32, 20 24 Z M20 14 H10 C 10 24, 14 28, 20 28 M44 14 H54 C 54 24, 50 28, 44 28 M32 38 V48 M22 56 H42 L40 48 H24 Z"/>',
  star: '<path d="M32 6 L39 24 L58 24 L43 36 L49 56 L32 44 L15 56 L21 36 L6 24 L25 24 Z"/>',
  sun: '<circle cx="32" cy="32" r="12"/><path d="M32 4 V12 M32 52 V60 M4 32 H12 M52 32 H60 M12 12 L18 18 M46 46 L52 52 M12 52 L18 46 M46 18 L52 12"/>',
  mask: '<path d="M8 16 C 20 10, 44 10, 56 16 C 56 40, 46 56, 32 56 C 18 56, 8 40, 8 16 Z M18 28 C 22 24, 26 24, 28 28 M36 28 C 38 24, 42 24, 46 28 M24 42 C 28 46, 36 46, 40 42"/>',
  diya: '<path d="M8 40 C 14 52, 50 52, 56 40 Z M32 36 C 26 30, 28 22, 32 12 C 36 22, 38 30, 32 36 Z M24 56 H40"/>',
};
export function badgeIcon(name, cls = 'bdg-ico') {
  return `<svg class="${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BADGE_ICON[name] || ''}</svg>`;
}
export function uiIcon(name, cls = 'uic') {
  return `<svg class="${cls}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI_ICON[name] || ''}</svg>`;
}