# Dharmakshetra

A board game of realms and trade set in the world of the Mahabharata. Travel from Hastinapura to Dwaraka, claim kingdoms, raise temples and palaces, draw Krishna's Leela and the Ashirvad of the elders, and outlast your rivals on the field of dharma.

Everything runs in the browser. There is no server and no build step: host it on GitHub Pages (or any static host) and play.

## Ways to play

- **On this device**: one browser, any mix of people taking turns (hot seat) and computer players.
- **Online with friends**: one player hosts, shares a room code or invite link, and everyone else joins from their own browser. Up to 6 players, with computer players filling empty seats if you like. Text chat and **voice chat** are built in.

It is designed for every screen: a two-column table on desktops, a stacked layout on tablets, and on phones a player strip, a full-width board and a thumb-friendly control dock (with a side-by-side layout in landscape). Menus and deeds open as bottom sheets on phones.

## Made to feel like a game

- **A hand-painted world**: a summer sky with drifting clouds, rolling hills and floating motes of light, cream paper panels with inked comic outlines, halftone dots and comic lettering, and a river valley with a hill temple at the heart of the board.
- **One tap to play**: Quick play starts you against two computer rivals straight from the start screen. Pick a character from the showcase, or use Custom game for friends on one device.
- **Progress and badges**: earn XP for claiming realms, completing sets, building, collecting rent and finishing games. Level up through the ranks from Shishya to Chakravartin and unlock 15 badges, all kept on your device. The standings screen shows what you earned, with a one-tap rematch.
- **A friendly guide**: on your first games, your character explains each new moment (rolling, claiming, auctions, building, debts) once. Tips can be switched off in the menu.
- **Divine characters**: each character has a comic-inked anime portrait set against a painted summer sky. Portraits breathe, catch a sweep of divine light, and react with layered effects: sparkles when claiming land, a blue rain when paying rent, comic shock lines when sent into exile.
- **Comic panels**: rent, exile, full sets, cards, trades and victories pop up as comic panels with speech bubbles in each character's voice and bold sound-effect bursts.
- **Motion**: 3D dice tumble and settle, tokens hop tile by tile with a puff of dust, gold floats up as it changes hands, owner seals stamp onto claimed land, temples rise, and petals fall when someone completes a set or wins. A Build button appears when you can raise temples.
- **Your pace**: choose Relaxed, Normal or Fast game speed from the menu. Reduced-motion settings are respected.
- **Stories**: tap any tile to see a painted scene of the place, with its ink outlines drawing in, and read the story from the epic of why it matters.
- Synthesised sounds, optional ambient music (a tanpura drone with a bamboo flute in raga Bhupali) and, on phones, light haptic feedback.

## The characters

Each player takes on a character with one divine power, usable once per game before rolling.

| Character | Power | Effect |
|---|---|---|
| Krishna | Sudarshana | Choose your dice total (2 to 12) |
| Balarama | Halayudha | Your next temple is free |
| Arjuna | Gandiva | The next rent you owe is waived |
| Bhima | Vayu's speed | Your next roll moves double |
| Draupadi | Akshaya Patra | Collect 200 at once |
| Karna | Kavacha | Your next tax or card payment is waived |
| Bhishma | Iccha Mrityu | Leave Vanavas now, or ignore the next sentence to it |
| Hanuman | Great leap | Leap to the next Tirtha before you roll |

## The board

- 22 realms in 8 colour groups, from the forest villages of Ekachakra and Varanavata to the divine cities of Indraprastha and Dwaraka.
- 4 Tirthas (river crossings) and 2 divine treasures (Akshaya Patra and Kamadhenu).
- Corners: Hastinapura (collect 200 when passing), Vanavas (exile), Kurukshetra (rest) and the Dyuta Sabha (the rigged dice game that sends you into exile).
- Hold a full colour group to double its rent and build temples evenly; four temples become a palace.
- Unwanted landings go to auction. Players can trade realms, gold and pardon cards at any time. The other player can accept, decline or send back a **counter offer**, and both sides are told how it went. Computer players counter low offers too.

The full rules are in the game under "How to play".

## How the networking works

- Multiplayer uses **WebRTC data channels**, so game traffic flows directly between browsers.
- To find each other, browsers exchange connection offers through the free public [PeerJS](https://peerjs.com/) broker. No game data is stored there.
- NAT traversal uses **Google's public STUN servers** (`stun.l.google.com:19302` and `stun1` to `stun4`).
- The host's browser is the authority: it runs the rules, the computer players, and sends the game state to everyone. Guests send only their moves, and the host checks each move belongs to the sender.
- Connections are kept alive with heartbeats. A guest who refreshes or drops reconnects automatically to the same seat. If a guest is gone for good, the host can hand their seat to the computer.
- The host's game is saved in the browser, so a host who closes the tab can resume from the start screen and reopen the same room code.

STUN covers most home networks. Some strict corporate or mobile carrier networks block direct peer connections; for those, add a **TURN server** in the game under **Connection settings** (on the start screen, or in the in-game menu):

- Enter one or more TURN servers (address, username, password). They are stored only in your browser.
- **Test connection** shows whether your network can reach Google STUN and your TURN relay.
- **Always relay through TURN** forces traffic through the relay, which also hides your IP address from other players.
- A host can choose to **include the TURN settings in the invite link**. They travel in the link's `#fragment`, which browsers never send to any server, and are used by guests for that session only. Share such links only with people you trust.

TURN servers are offered by providers such as Metered and Cloudflare, or you can run your own with coturn.

### Voice chat

- Voice uses WebRTC audio calls over the same peer connections setup (PeerJS, Google STUN and any TURN servers you add).
- Players can join voice from the lobby or during the game. Everyone in voice connects directly to everyone else (a small mesh, fine for up to 6 players).
- Mute and leave buttons sit in the top bar; a green glow shows who is speaking, and a mic badge shows who is in voice.
- Voice needs microphone permission and a secure page (https), which GitHub Pages provides.

## Art credits

Character portraits were generated with the FLUX.1-schnell model (Apache 2.0 licence, free for commercial use, no watermark) through AI Horde, a free community image network. The source files are in `assets/chars`. Board art, sketches and icons are hand-built SVG.

## Run locally

Any static file server works, for example:

```sh
npm start            # serves on http://localhost:8080
```

ES modules do not load from `file://`, so open the game through a server rather than double-clicking `index.html`.

## Tests

The rules engine is pure JavaScript with no DOM access. The test plays hundreds of complete all-computer games and checks that no game stalls and the state stays valid (no negative gold, no orphaned holdings, no buildings on pledged land).

```sh
npm test
```

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repository, open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.

The site appears at `https://<user>.github.io/dharmakshetra/`. Invite links use the page's own address, so they work from wherever you host it.

Note: GitHub Pages for a private repository requires a paid GitHub plan (Pro, Team or Enterprise). On a free plan, make the repository public or host the folder on another static host.

## Project layout

```
index.html        page shell and screens
css/style.css     visual design
js/data.js        board, cards and characters
js/engine.js      game rules (pure, host-side)
js/bot.js         computer players
js/net.js         WebRTC networking (PeerJS + Google STUN)
js/settings.js    TURN settings, invite sharing, connection test
js/voice.js       voice chat mesh
js/characters.js  character portraits and their lines
js/comic.js       comic panels, banners, floating gold, confetti
js/places.js      stories and sketch scenes for every place
js/sketch.js      pencil-and-wash sketch renderer
js/ui.js          rendering
js/art.js         board art, emblems and icons
js/sound.js       synthesised sounds
js/main.js        app controller
tests/            engine simulation test, plus portrait and sketch preview sheets
```
