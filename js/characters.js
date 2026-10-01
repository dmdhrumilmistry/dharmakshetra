// Comic-style character portraits drawn in SVG, with moods:
// idle, happy, sad and shock. Eyes blink and props sway via CSS.

const OL = '#2B1B0E';
const st = (w = 1.8) => `stroke="${OL}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const GOLD = '#E9B949';
const GOLD_D = '#C98A1E';

const FACE = 'M29 47 C 29 31, 38 25, 50 25 C 62 25, 71 31, 71 47 C 71 62, 62 73, 50 73 C 38 73, 29 62, 29 47 Z';
const HAIR = 'M28.5 49 C 25 30, 37 21.5, 50 21.5 C 63 21.5, 75 30, 71.5 49 C 70 41, 66 36, 60 34.5 C 53 37.5, 43 37.5, 37 35 C 33 38, 30 43, 28.5 49 Z';
const SHOULDERS = 'M12 100 C 13 87, 28 80, 50 80 C 72 80, 87 87, 88 100 Z';
const SHOULDERS_WIDE = 'M4 100 C 6 85, 26 78, 50 78 C 74 78, 94 85, 96 100 Z';

function eyes(mood, y = 49) {
  if (mood === 'happy') {
    return `<g class="eyes"><path d="M38.5 ${y + 1} Q42 ${y - 3.5} 45.5 ${y + 1}" fill="none" ${st(2.3)}/><path d="M54.5 ${y + 1} Q58 ${y - 3.5} 61.5 ${y + 1}" fill="none" ${st(2.3)}/></g>`;
  }
  if (mood === 'shock') {
    return `<g class="eyes"><circle cx="42" cy="${y}" r="4.3" fill="#fff" ${st(1.4)}/><circle cx="58" cy="${y}" r="4.3" fill="#fff" ${st(1.4)}/>
      <circle cx="42" cy="${y}" r="1.7" fill="${OL}"/><circle cx="58" cy="${y}" r="1.7" fill="${OL}"/></g>`;
  }
  const ry = mood === 'sad' ? 3 : 3.6;
  return `<g class="eyes"><ellipse cx="42" cy="${y}" rx="2.8" ry="${ry}" fill="${OL}"/><ellipse cx="58" cy="${y}" rx="2.8" ry="${ry}" fill="${OL}"/>
    <circle cx="43" cy="${y - 1.4}" r="1" fill="#fff"/><circle cx="59" cy="${y - 1.4}" r="1" fill="#fff"/>
    ${mood === 'sad' ? `<path d="M61 ${y + 4} q1.6 3 0 4.4 q-1.6 -1.4 0 -4.4z" fill="#7FC8F0" ${st(0.8)}/>` : ''}</g>`;
}

function brows(mood, { color = OL, w = 1.9, fierce = false } = {}) {
  let l, r;
  if (mood === 'happy') { l = 'M38 41.5 Q42 38.8 46 40.8'; r = 'M54 40.8 Q58 38.8 62 41.5'; }
  else if (mood === 'sad') { l = 'M38 43 Q42 42.2 46 40.2'; r = 'M54 40.2 Q58 42.2 62 43'; }
  else if (mood === 'shock') { l = 'M38 40 Q42 36.6 46 39.2'; r = 'M54 39.2 Q58 36.6 62 40'; }
  else if (fierce) { l = 'M38 41 Q42 41.6 46 43.6'; r = 'M54 43.6 Q58 41.6 62 41'; }
  else { l = 'M38 43 Q42 40.8 46 42.4'; r = 'M54 42.4 Q58 40.8 62 43'; }
  return `<path d="${l}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/><path d="${r}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
}

function mouth(mood, { y = 61, lip = OL } = {}) {
  if (mood === 'happy') return `<path d="M43 ${y - 1} Q50 ${y + 9} 57 ${y - 1} Q50 ${y + 1.5} 43 ${y - 1} Z" fill="#7A2E1E" ${st(1.5)}/><path d="M46.5 ${y + 3.6} Q50 ${y + 2} 53.5 ${y + 3.6} Q50 ${y + 6.5} 46.5 ${y + 3.6}Z" fill="#E86A6A"/>`;
  if (mood === 'sad') return `<path d="M45 ${y + 3} Q50 ${y - 1} 55 ${y + 3}" fill="none" stroke="${lip}" stroke-width="1.9" stroke-linecap="round"/>`;
  if (mood === 'shock') return `<ellipse cx="50" cy="${y + 2}" rx="3" ry="3.8" fill="#7A2E1E" ${st(1.4)}/>`;
  return `<path d="M45 ${y} Q50 ${y + 3.6} 55 ${y}" fill="none" stroke="${lip}" stroke-width="1.9" stroke-linecap="round"/>`;
}

const nose = (y = 52) => `<path d="M50 ${y} Q48.2 ${y + 4} 50.6 ${y + 4.4}" fill="none" ${st(1.3)}/>`;
const blush = (mood) => `<ellipse cx="36.5" cy="57" rx="3.6" ry="2" fill="#F07A7A" opacity="${mood === 'happy' ? 0.5 : 0.28}"/><ellipse cx="63.5" cy="57" rx="3.6" ry="2" fill="#F07A7A" opacity="${mood === 'happy' ? 0.5 : 0.28}"/>`;

function head(skin, { ears = true } = {}) {
  return `<path d="M43 66 L 43 81 L 57 81 L 57 66 Z" fill="${skin}" ${st(1.6)}/>
    ${ears ? `<ellipse cx="29" cy="50" rx="4.5" ry="6" fill="${skin}" ${st(1.6)}/><ellipse cx="71" cy="50" rx="4.5" ry="6" fill="${skin}" ${st(1.6)}/>` : ''}
    <path d="${FACE}" fill="${skin}" ${st(1.9)}/>`;
}

function crown({ tall = false, low = false, color = GOLD, band = GOLD_D, jewel = '#C0392B' } = {}) {
  const top = tall ? 4 : low ? 19 : 9;
  const side = tall ? 13 : low ? 25 : 16;
  return `<path d="M31 34 L 32.5 ${side} L 40.5 ${side + 8} L 50 ${top} L 59.5 ${side + 8} L 67.5 ${side} L 69 34 Z" fill="${color}" ${st(1.7)}/>
    <path d="M30 30.5 H 70 V 36 Q 50 38.6 30 36 Z" fill="${band}" ${st(1.6)}/>
    <circle cx="50" cy="${(top + 34) / 2 + 2}" r="3.1" fill="${jewel}" ${st(1.2)}/>
    <circle cx="39" cy="33.2" r="1.1" fill="#FFF4D0"/><circle cx="61" cy="33.2" r="1.1" fill="#FFF4D0"/><circle cx="50" cy="34" r="1.1" fill="#FFF4D0"/>`;
}

const tilak = `<path d="M47.6 36.8 Q50 45 52.4 36.8" fill="none" stroke="#FBF3E0" stroke-width="1.4" stroke-linecap="round"/><path d="M50 38.4 V 43" stroke="#C0392B" stroke-width="1.4" stroke-linecap="round"/>`;
const studs = (r = 2.3, color = GOLD) => `<circle cx="28.6" cy="57" r="${r}" fill="${color}" ${st(1.1)}/><circle cx="71.4" cy="57" r="${r}" fill="${color}" ${st(1.1)}/>`;
const necklace = (y = 84) => `<path d="M38 ${y - 2} Q50 ${y + 8} 62 ${y - 2}" fill="none" stroke="${GOLD}" stroke-width="2.2"/><circle cx="50" cy="${y + 3.4}" r="2" fill="#C0392B" ${st(0.9)}/>`;

function mace(x, y) {
  return `<g class="prop"><path d="M${x - 15} 100 L ${x - 2} ${y + 8}" stroke="${OL}" stroke-width="6" stroke-linecap="round"/>
    <path d="M${x - 15} 100 L ${x - 2} ${y + 8}" stroke="#7A4E25" stroke-width="3.6" stroke-linecap="round"/>
    <circle cx="${x}" cy="${y}" r="11" fill="#E0A33A" ${st(1.8)}/>
    <path d="M${x - 10} ${y - 3} Q ${x} ${y + 2} ${x + 10} ${y - 3}" fill="none" stroke="#9A6512" stroke-width="1.3"/>
    <path d="M${x - 10} ${y + 4} Q ${x} ${y + 9} ${x + 10} ${y + 4}" fill="none" stroke="#9A6512" stroke-width="1.3"/>
    <path d="M${x} ${y - 11} L ${x + 2.2} ${y - 16} L ${x - 2.2} ${y - 16} Z" fill="#E0A33A" ${st(1.2)}/></g>`;
}

const SPECS = {
  krishna: (m) => `
    <path d="M27.5 46 C 22 58, 22 72, 27 80 L 33.5 76 C 30.5 66, 30 56, 31.5 48 Z" fill="${OL}"/>
    <path d="M72.5 46 C 78 58, 78 72, 73 80 L 66.5 76 C 69.5 66, 70 56, 68.5 48 Z" fill="${OL}"/>
    <path d="${SHOULDERS}" fill="#F2B632" ${st()}/>
    <path d="M36 82 Q50 93 64 82" fill="none" stroke="#C0392B" stroke-width="2.2"/>
    ${head('#5E8FDB')}
    ${studs(2.6)}
    ${eyes(m)}${brows(m)}${nose()}${mouth(m)}${blush(m)}
    <path d="${HAIR}" fill="${OL}"/>
    ${tilak}
    ${crown()}
    <g class="sway"><path d="M60 26 C 62 18, 64 10, 67 2" fill="none" stroke="#FBF3E0" stroke-width="1.6" stroke-linecap="round"/>
      <g transform="rotate(22 67 6)"><ellipse cx="67" cy="6" rx="6.4" ry="9.4" fill="#1FA38D" ${st(1.2)}/><ellipse cx="67" cy="7" rx="4.1" ry="6.1" fill="#E9C46A"/><ellipse cx="67" cy="7.6" rx="2.5" ry="3.7" fill="#2B3FA0"/><ellipse cx="67" cy="8" rx="1" ry="1.5" fill="#0F1638"/></g></g>
    <path d="M27 86 Q50 108 73 86" fill="none" stroke="#2E7D4F" stroke-width="3.6" stroke-linecap="round"/>
    ${[[31, 91.5], [40, 97.5], [50, 99.6], [60, 97.5], [69, 91.5]].map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="2.3" fill="${k % 2 ? '#FBF3E0' : '#E86A8E'}" ${st(0.8)}/>`).join('')}
    <g class="prop"><path d="M20 97 L 80 83 L 81.2 86.6 L 21.2 100.6 Z" fill="#B5651D" ${st(1.5)}/>
      ${[40, 47, 54, 61].map((x) => `<circle cx="${x}" cy="${97 - (x - 20) * 0.233}" r="0.95" fill="${OL}"/>`).join('')}
      <path d="M27 95.4 L 28.5 99" stroke="#E9C46A" stroke-width="1.8"/><path d="M21 99 q -3 4 -1 8" fill="none" stroke="#E86A8E" stroke-width="1.5"/></g>`,

  balarama: (m) => `
    <g class="prop"><path d="M10 100 L 27 30" stroke="${OL}" stroke-width="6" stroke-linecap="round"/><path d="M10 100 L 27 30" stroke="#8B5A2B" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M22.5 26 L 33 31 L 26 37 Z" fill="${GOLD}" ${st(1.4)}/><path d="M19 52 L 28 55" stroke="${OL}" stroke-width="3" stroke-linecap="round"/></g>
    <path d="${SHOULDERS}" fill="#3B5BA5" ${st()}/>
    ${necklace()}
    ${head('#F2D1AE')}
    ${studs(2.6)}
    ${eyes(m)}${brows(m)}${nose()}${mouth(m)}${blush(m)}
    <path d="${HAIR}" fill="${OL}"/>
    ${tilak}
    ${crown({ color: '#F0C75A' })}`,

  arjuna: (m) => `
    <g class="prop"><path d="M73 14 C 97 38, 97 76, 76 99" fill="none" stroke="${OL}" stroke-width="5.4" stroke-linecap="round"/>
      <path d="M73 14 C 97 38, 97 76, 76 99" fill="none" stroke="#D9A441" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M73 14 L 76 99" stroke="#FBF3E0" stroke-width="0.9"/></g>
    <g class="prop">${[20, 25, 30].map((x, k) => `<path d="M${x} 86 L ${x - 4} ${62 - k * 2}" stroke="${OL}" stroke-width="1.4"/><path d="M${x - 4} ${62 - k * 2} l -2 -4 l 4 1 z" fill="#FBF3E0" ${st(0.8)}/>`).join('')}</g>
    <path d="${SHOULDERS}" fill="#E7DFCB" ${st()}/>
    <path d="M22 88 Q50 78 78 88" fill="none" stroke="#138A72" stroke-width="3"/>
    <path d="M44 81 L 50 92 L 56 81" fill="none" stroke="#138A72" stroke-width="2.2"/>
    ${head('#E0A472')}
    ${studs()}
    ${eyes(m)}${brows(m, { fierce: m === 'idle' })}${nose()}
    <path d="M44.5 58.4 Q47.5 56.6 50 58.2 Q52.5 56.6 55.5 58.4" fill="none" ${st(1.6)}/>
    ${mouth(m, { y: 62 })}${blush(m)}
    <path d="${HAIR}" fill="${OL}"/>
    ${crown({ tall: true })}`,

  bhima: (m) => `
    ${mace(84, 42)}
    <path d="${SHOULDERS_WIDE}" fill="#8C2F2F" ${st()}/>
    <path d="M32 84 Q50 96 68 84" fill="none" stroke="${GOLD}" stroke-width="3"/>
    <path d="M24 86 L 28 92 M76 86 L 72 92" stroke="${GOLD}" stroke-width="2.5" stroke-linecap="round"/>
    ${head('#B87545')}
    ${studs(2.4)}
    ${eyes(m)}${brows(m, { w: 3, fierce: m === 'idle' })}${nose()}
    <path d="M37.5 59.5 C 41 54.5, 47 56, 50 57.4 C 53 56, 59 54.5, 62.5 59.5 C 60 58.8, 57.5 59.6, 55 60.6 C 53 61.2, 51 60.4, 50 60 C 49 60.4, 47 61.2, 45 60.6 C 42.5 59.6, 40 58.8, 37.5 59.5 Z" fill="${OL}"/>
    ${mouth(m, { y: 63 })}${blush(m)}
    <path d="${HAIR}" fill="${OL}"/>
    <path d="M28.5 46 q -3 -5 0 -10 M71.5 46 q 3 -5 0 -10" fill="none" stroke="${OL}" stroke-width="3"/>
    ${crown({ low: true })}`,

  draupadi: (m) => `
    <path d="M25 46 C 17 64, 17 86, 21 100 L 79 100 C 83 86, 83 64, 75 46 Z" fill="${OL}"/>
    <circle cx="50" cy="19" r="9.5" fill="${OL}"/>
    ${[[42, 14], [46, 10.5], [51, 9.6], [56, 11], [59, 15]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9" fill="#FBF3E0" ${st(0.6)}/>`).join('')}
    <path d="${SHOULDERS}" fill="#C2185B" ${st()}/>
    <path d="M14 100 C 20 88, 38 80, 62 81 L 52 100 Z" fill="#951046" ${st(1.4)}/>
    <path d="M17 97 C 25 88, 40 82.5, 61 81.6" fill="none" stroke="${GOLD}" stroke-width="2.2"/>
    ${necklace(83)}
    ${head('#D79C72')}
    <path d="M26.4 55.5 h 4.4 l 1.2 4.4 h -6.8 z M69.2 55.5 h 4.4 l 1.2 4.4 h -6.8 z" fill="${GOLD}" ${st(1)}/>
    ${eyes(m)}
    <path d="M38.4 47 l -2 -1.6 M61.6 47 l 2 -1.6" ${st(1.2)}/>
    ${brows(m, { w: 1.5 })}${nose()}
    <circle cx="54.6" cy="56" r="2" fill="none" stroke="${GOLD}" stroke-width="1.1"/>
    ${mouth(m, { lip: '#B03A48' })}${blush(m)}
    <path d="M28.5 50 C 25 30, 37 21.5, 50 21.5 C 63 21.5, 75 30, 71.5 50 C 69 38, 60 31, 50 31.5 C 40 31, 31 38, 28.5 50 Z" fill="${OL}"/>
    <path d="M50 22.4 L 50 31.2" stroke="${GOLD}" stroke-width="1.3"/>
    <circle cx="50" cy="33.2" r="2.3" fill="${GOLD}" ${st(1)}/>
    <circle cx="50" cy="40.6" r="1.7" fill="#C0392B"/>`,

  karna: (m) => `
    <g class="halo"><circle cx="50" cy="44" r="33" fill="#F6D27A" opacity=".55"/>
      ${Array.from({ length: 16 }, (_, k) => {
        const a = (k * Math.PI) / 8;
        const p = (r, d = 0) => `${(50 + r * Math.cos(a + d)).toFixed(1)} ${(44 + r * Math.sin(a + d)).toFixed(1)}`;
        return `<path d="M${p(31, -0.12)} L ${p(45)} L ${p(31, 0.12)} Z" fill="${GOLD}" ${st(1)}/>`;
      }).join('')}</g>
    <path d="${SHOULDERS}" fill="#E3A92B" ${st()}/>
    ${[0, 1, 2].map((r) => `<path d="M${18 + r * 3} ${90 + r * 4} Q 50 ${80 + r * 4} ${82 - r * 3} ${90 + r * 4}" fill="none" stroke="#B87A14" stroke-width="1.2"/>`).join('')}
    <path d="M39 84 Q50 80 61 84 L 59 100 H 41 Z" fill="#F4C64E" ${st(1.4)}/>
    <circle cx="50" cy="90" r="3.4" fill="#E9573F" ${st(1)}/>
    ${head('#E2A270')}
    <circle cx="28.4" cy="58.5" r="4.2" fill="none" stroke="${OL}" stroke-width="3.6"/><circle cx="28.4" cy="58.5" r="4.2" fill="none" stroke="${GOLD}" stroke-width="2"/>
    <circle cx="71.6" cy="58.5" r="4.2" fill="none" stroke="${OL}" stroke-width="3.6"/><circle cx="71.6" cy="58.5" r="4.2" fill="none" stroke="${GOLD}" stroke-width="2"/>
    ${eyes(m)}${brows(m, { fierce: m === 'idle' })}${nose()}
    <path d="M44.5 58.4 Q47.5 56.8 50 58.2 Q52.5 56.8 55.5 58.4" fill="none" ${st(1.5)}/>
    ${mouth(m, { y: 62 })}${blush(m)}
    <path d="${HAIR}" fill="${OL}"/>
    ${crown({ jewel: '#E9573F' })}`,

  bhishma: (m) => `
    <path d="${SHOULDERS}" fill="#EDE6D6" ${st()}/>
    <path d="M20 90 L 64 100" stroke="#6D5BA8" stroke-width="6"/>
    ${head('#EAC197')}
    <path d="M34 54 l 3 1.4 M66 54 l -3 1.4" ${st(1)}/>
    ${eyes(m)}${brows(m, { color: '#F3EFE6', w: 3.2, fierce: m === 'idle' })}
    <path d="M38 43.4 l 8 -1 M54 42.4 l 8 1" stroke="${OL}" stroke-width=".6" opacity=".4"/>
    ${nose()}
    <path d="M31 54 C 31 72, 39 92, 50 97 C 61 92, 69 72, 69 54 C 64 63, 58 66.5, 50 66.5 C 42 66.5, 36 63, 31 54 Z" fill="#F3EFE6" ${st(1.6)}/>
    <path d="M40 74 q 2 8 6 12 M60 74 q -2 8 -6 12 M50 70 v 18" fill="none" stroke="#C9C0AE" stroke-width="1.1"/>
    ${mouth(m, { y: 62.6 })}
    <path d="M40.5 60.4 C 45 57, 48.5 58.4, 50 59.4 C 51.5 58.4, 55 57, 59.5 60.4 C 55 62.4, 52 61.4, 50 61.4 C 48 61.4, 45 62.4, 40.5 60.4 Z" fill="#F3EFE6" ${st(1.2)}/>
    <path d="${HAIR}" fill="#F3EFE6" ${st(1.4)}/>
    <path d="M27.5 47 C 25 56, 27 64, 30 68 M72.5 47 C 75 56, 73 64, 70 68" fill="none" stroke="#F3EFE6" stroke-width="3.4" stroke-linecap="round"/>
    <circle cx="50" cy="40.5" r="1.4" fill="#C0392B"/>
    ${crown({ color: '#D9DCE6', band: '#AEB3C6', jewel: '#6D5BA8' })}`,

  hanuman: (m) => `
    <path d="M18 100 C 4 86, 6 64, 17 60 C 24 58, 25 67, 18 67" fill="none" stroke="${OL}" stroke-width="6" stroke-linecap="round"/>
    <path d="M18 100 C 4 86, 6 64, 17 60 C 24 58, 25 67, 18 67" fill="none" stroke="#C9541F" stroke-width="3.6" stroke-linecap="round"/>
    ${mace(84, 44)}
    <path d="${SHOULDERS}" fill="#E8893A" ${st()}/>
    <path d="M30 84 L 66 100" stroke="#FBF3E0" stroke-width="1.6"/>
    ${necklace(84)}
    <path d="M43 66 L 43 81 L 57 81 L 57 66 Z" fill="#C9541F" ${st(1.6)}/>
    <ellipse cx="22.5" cy="48" rx="6.2" ry="7.6" fill="#C9541F" ${st(1.6)}/><ellipse cx="22.5" cy="48" rx="3.2" ry="4.6" fill="#F2B08A"/>
    <ellipse cx="77.5" cy="48" rx="6.2" ry="7.6" fill="#C9541F" ${st(1.6)}/><ellipse cx="77.5" cy="48" rx="3.2" ry="4.6" fill="#F2B08A"/>
    <path d="M25 47 C 25 29, 37 21, 50 21 C 63 21, 75 29, 75 47 C 75 64, 65 75, 50 75 C 35 75, 25 64, 25 47 Z" fill="#C9541F" ${st(1.9)}/>
    <path d="M31.5 50 C 30.5 39, 40 34.5, 50 41 C 60 34.5, 69.5 39, 68.5 50 C 68.5 61.5, 62 72, 50 72 C 38 72, 31.5 61.5, 31.5 50 Z" fill="#F4C99B" ${st(1.2)}/>
    ${eyes(m, 48)}${brows(m)}
    <circle cx="48.3" cy="56.6" r="1.1" fill="${OL}"/><circle cx="51.7" cy="56.6" r="1.1" fill="${OL}"/>
    <path d="M50 58 v 2" ${st(1.1)}/>
    ${mouth(m, { y: 62 })}${blush(m)}
    ${crown()}`,
};

let seq = 0;
export function portrait(id, mood = 'idle', { headOnly = false, cls = '' } = {}) {
  const spec = SPECS[id] || SPECS.krishna;
  const view = headOnly ? '14 3 72 72' : '0 0 100 100';
  return `<svg class="portrait p-${id} mood-${mood} ${cls}" viewBox="${view}" aria-hidden="true" style="--blink:${-((++seq * 1.7) % 6).toFixed(1)}s">${spec(mood)}</svg>`;
}

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
