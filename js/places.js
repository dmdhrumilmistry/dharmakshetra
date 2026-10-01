// Short stories for every place on the board, and the sketch scene for each.
// Scenes are lists of motif calls understood by sketch.js.

export const PLACES = {
  0: {
    story: 'King Hastin founded this city on the banks of the Ganga, and it became the seat of the Kuru dynasty. Here the Pandava and Kaurava princes grew up together and learned archery from Drona. Their quarrel over its throne grew into the great war.',
    why: 'The prize at the heart of the Mahabharata: the throne everyone fought for.',
    scene: [['sun', 250, 40, 16], ['hills'], ['palace', 160, 128, 1.15], ['flag', 160, 58], ['ground']],
  },
  1: {
    story: 'After escaping the burning lacquer house, the Pandavas hid in Ekachakra disguised as poor brahmins. A demon named Baka demanded a cart of food and a human life from the village every week. Kunti sent Bhima in the family\'s turn. He ate the whole cart, then wrestled Baka to death.',
    why: 'Where Bhima first showed the village that a protector had arrived.',
    scene: [['hills'], ['tree', 52, 130, 1.1], ['hut', 120, 132, 1], ['hut', 196, 136, 0.85], ['cart', 262, 140, 0.9], ['ground']],
  },
  2: { story: 'Blessings arrive from elders, sages and gods. Most are kind; a few are tests in disguise.', why: 'Draw an Ashirvad card.', scene: [['diya', 160, 104, 1.6], ['petals']] },
  3: {
    story: 'Duryodhana had a beautiful palace built in Varanavata from lac, resin and ghee, so it would burn in moments with the Pandavas inside. Vidura warned them in a riddle. They dug a tunnel beneath the floor and escaped on the night the house was set alight.',
    why: 'The first attempt on the Pandavas\' lives, and the first time they slipped away.',
    scene: [['hills'], ['house', 150, 132, 1.1], ['flames', 150, 92, 1.2], ['tunnel', 230, 150], ['ground']],
  },
  4: {
    story: 'The yajna is the sacrifice of fire, where offerings rise to the gods as smoke. King Drupada held one to gain a child who could defeat Drona. From the flames rose Dhrishtadyumna, armed and crowned, and then Draupadi.',
    why: 'Fire gives and fire takes. Pay your offering of 200.',
    scene: [['altar', 160, 136, 1.3], ['flames', 160, 96, 1.4], ['smoke', 160, 50]],
  },
  5: {
    story: 'The goddess Ganga married King Shantanu on one condition: he must never question her. She gave seven newborn sons back to the river to free them from a curse. When Shantanu stopped her at the eighth, she left him, and that son grew up to be Bhishma.',
    why: 'Mother of Bhishma, and the river that runs through the Kuru heartland.',
    scene: [['sun', 70, 44, 14], ['ghat', 110, 120, 1], ['temple', 70, 104, 0.8], ['river', 132], ['lotus', 240, 150, 0.8]],
  },
  6: {
    story: 'At Draupadi\'s swayamvara in Panchala, suitors had to string a mighty bow and pierce the eye of a turning fish by looking only at its reflection in water. Kings failed one after another. Arjuna, disguised as a brahmin, hit the mark with his first arrow.',
    why: 'Where Arjuna won Draupadi, and the Pandavas were revealed as alive.',
    scene: [['fishTarget', 160, 72, 1.1], ['pool', 160, 150], ['bow', 70, 120, 1], ['palace', 260, 132, 0.6], ['ground']],
  },
  7: { story: 'Krishna\'s leela is his divine play: sudden journeys, strange luck and twists no one sees coming.', why: 'Draw a Leela card.', scene: [['flute', 160, 104, 1.5], ['feather', 220, 70, 0.9], ['notes']] },
  8: {
    story: 'The Pandavas spent their thirteenth year of exile hidden at King Virata\'s court in Matsya. Yudhishthira became a courtier, Bhima a cook, Arjuna a dance teacher named Brihannala, and Draupadi a maid. When the Kauravas raided Virata\'s cattle, Arjuna took up his bow and routed them alone.',
    why: 'The year in disguise that ended the long exile.',
    scene: [['palace', 110, 128, 0.8], ['cow', 220, 140, 0.9], ['cow', 270, 148, 0.7], ['bow', 60, 130, 0.7], ['ground']],
  },
  9: {
    story: 'Shishupala, king of Chedi, was born with a curse that Krishna would end his life. Krishna promised Shishupala\'s mother he would forgive a hundred insults. At the Rajasuya in Indraprastha, Shishupala went past a hundred, and Krishna released the Sudarshana chakra.',
    why: 'A lesson in patience, and in its limits.',
    scene: [['chakra', 160, 78, 30], ['crown', 160, 142, 1], ['ground']],
  },
  10: {
    story: 'After losing the dice game, the Pandavas were exiled to the forest for twelve years, then had to live a thirteenth year unrecognised. Vanavas was hardship, but also where they met sages, gathered divine weapons and grew wise.',
    why: 'Exile. Just visiting, or serving your term.',
    scene: [['tree', 70, 134, 1.3], ['tree', 250, 136, 1.1], ['hut', 160, 138, 0.9], ['moon', 240, 40], ['ground']],
  },
  11: {
    story: 'The king of Kashi held a swayamvara for his three daughters, Amba, Ambika and Ambalika. Bhishma arrived and carried all three away for his brother. Amba, rejected by everyone afterwards, swore revenge and was reborn as Shikhandi, before whom Bhishma would lay down his bow.',
    why: 'The ancient city on the Ganga, and the root of Bhishma\'s fate.',
    scene: [['temple', 90, 112, 1], ['temple', 150, 104, 1.2], ['temple', 215, 114, 0.9], ['river', 148], ['diya', 270, 150, 0.6]],
  },
  12: {
    story: 'In the forest, Surya gave Yudhishthira the Akshaya Patra, a vessel that fed any number of guests until Draupadi herself had eaten. When the sage Durvasa arrived with his disciples after the meal, Draupadi prayed to Krishna. He ate a single grain left in the pot, and the sages felt full.',
    why: 'The vessel that never runs empty. Rent is 4x the dice, or 10x with both treasures.',
    scene: [['pot', 160, 120, 1.5], ['sun', 160, 46, 14], ['steam', 160, 76]],
  },
  13: {
    story: 'Jarasandha of Magadha was born in two halves, joined by a demoness named Jara. He attacked Mathura again and again and imprisoned many kings. Krishna, Bhima and Arjuna came to him in disguise. Bhima wrestled him for days, then tore him in two and threw the halves apart so they could not rejoin.',
    why: 'The fall of a tyrant, and freedom for the kings he had jailed.',
    scene: [['fort', 160, 126, 1.1], ['mace', 70, 120, 1], ['mace', 250, 120, 1, true], ['ground']],
  },
  14: {
    story: 'At the royal tournament, Karna matched every feat of Arjuna, but was mocked as a charioteer\'s son. Duryodhana crowned him king of Anga on the spot. Karna repaid that moment with a lifetime of loyalty, and became famous for never refusing anyone who asked him for a gift.',
    why: 'Karna\'s kingdom: a crown given in friendship.',
    scene: [['sun', 160, 60, 24], ['crown', 160, 134, 1.1], ['ground']],
  },
  15: {
    story: 'On the stormy night Krishna was born in Kamsa\'s prison, his father Vasudeva carried him across the flooding Yamuna in a basket. The river parted, and the serpent Shesha spread his hoods as an umbrella. Years later, Krishna danced on the hoods of the serpent Kaliya in these same waters.',
    why: 'The dark river of Krishna\'s birth and boyhood.',
    scene: [['rain'], ['basket', 160, 92, 1], ['river', 120], ['serpent', 240, 148, 0.8]],
  },
  16: {
    story: 'Princess Gandhari married the blind king Dhritarashtra and tied a blindfold over her own eyes for life. Her brother Shakuni came with her to Hastinapura. He loved his nephews, the Kauravas, and hated the Pandavas, and his loaded dice would change the fate of the world.',
    why: 'Home of a queen\'s vow and a schemer\'s dice.',
    scene: [['mountain', 90, 120, 1.2], ['mountain', 200, 128, 0.9], ['dice', 250, 150, 0.7], ['ground']],
  },
  17: { story: 'Blessings arrive from elders, sages and gods. Most are kind; a few are tests in disguise.', why: 'Draw an Ashirvad card.', scene: [['diya', 160, 104, 1.6], ['petals']] },
  18: {
    story: 'Shalya, king of Madra, was uncle to the twins Nakula and Sahadeva. On his way to join the Pandavas, Duryodhana tricked him with lavish hospitality and won his promise to fight for the Kauravas. As Karna\'s charioteer, Shalya kept praising Arjuna and draining Karna\'s confidence.',
    why: 'A good man bound by a promise to the wrong side.',
    scene: [['chariot', 160, 128, 1.1], ['hills'], ['ground']],
  },
  19: {
    story: 'Jayadratha of Sindhu once tried to carry Draupadi off from the forest. In the war, he held the Pandavas back while Abhimanyu died alone in the chakravyuha. Arjuna swore to kill him before the next sunset. As the day ended, Krishna dimmed the sun; Jayadratha stepped out of hiding, and the arrow found him.',
    why: 'A vow kept by a hair, with Krishna\'s help.',
    scene: [['sun', 240, 70, 20, true], ['river', 140], ['bow', 90, 110, 1], ['ground']],
  },
  20: {
    story: 'Kurukshetra is the field where the eighteen-day war was fought. Before the first arrow, Arjuna saw his teachers and cousins in the opposing army and let his bow fall. Krishna, his charioteer, spoke the Bhagavad Gita and showed him his universal form.',
    why: 'The field of dharma, where the Gita was sung.',
    scene: [['chariot', 160, 126, 1.25], ['flag', 186, 58], ['sun', 60, 46, 14], ['ground']],
  },
  21: {
    story: 'The kingdom of Kekaya lay far to the northwest. In an older age it was the home of Queen Kaikeyi of the Ramayana. In the Mahabharata, the five Kekaya brothers marched to Kurukshetra and fought in the front ranks for the Pandavas.',
    why: 'Steadfast allies from the western frontier.',
    scene: [['mountain', 80, 120, 1], ['fort', 200, 130, 0.9], ['flag', 200, 80], ['ground']],
  },
  22: { story: 'Krishna\'s leela is his divine play: sudden journeys, strange luck and twists no one sees coming.', why: 'Draw a Leela card.', scene: [['flute', 160, 104, 1.5], ['feather', 220, 70, 0.9], ['notes']] },
  23: {
    story: 'In Avanti, at the ashram of the sage Sandipani, Krishna and Balarama learned all sixty-four arts in sixty-four days. There Krishna befriended the poor boy Sudama. As his fee, Sandipani asked for his lost son, and Krishna brought the boy back from the realm of Yama.',
    why: 'Krishna\'s school, and the friendship with Sudama.',
    scene: [['hut', 110, 134, 1], ['tree', 220, 132, 1.1], ['scroll', 160, 150, 0.8], ['ground']],
  },
  24: {
    story: 'Princess Rukmini of Vidarbha loved Krishna, but her brother Rukmi promised her to Shishupala. She sent Krishna a secret letter. On the morning of the wedding, as she left the temple of the goddess, Krishna swept her into his chariot and carried her away.',
    why: 'The love story of Krishna and Rukmini.',
    scene: [['temple', 90, 116, 1], ['chariot', 220, 132, 0.9], ['lotus', 160, 150, 0.7], ['ground']],
  },
  25: {
    story: 'When the war began, Balarama refused to fight against either side. He went on a pilgrimage along the Saraswati, bathing at holy fords, and returned only for the final duel between Bhima and Duryodhana, both of whom had been his students.',
    why: 'The sacred river of Balarama\'s pilgrimage.',
    scene: [['river', 128], ['ghat', 90, 116, 0.8], ['plough', 230, 106, 1], ['sun', 260, 40, 12]],
  },
  26: {
    story: 'Kamyaka was one of the forests where the Pandavas lived in exile. Sages visited them there and told the old stories, among them Nala and Damayanti. It was also here that Jayadratha tried to abduct Draupadi while the brothers were away hunting.',
    why: 'A forest of stories during the long exile.',
    scene: [['tree', 60, 136, 1.2], ['tree', 130, 130, 1], ['tree', 250, 134, 1.3], ['deer', 190, 146, 0.8], ['ground']],
  },
  27: {
    story: 'Agni, sick from too many offerings of ghee, asked Krishna and Arjuna to let him devour the Khandava forest. Indra sent rain to protect it, but Arjuna\'s arrows held the clouds back. Agni gave Arjuna the Gandiva bow, and Krishna the Sudarshana chakra. The asura Maya was spared, and in thanks he built the Pandavas a palace.',
    why: 'Where Gandiva and Sudarshana were given.',
    scene: [['tree', 80, 134, 1.1], ['tree', 230, 134, 1.2], ['flames', 150, 110, 1.6], ['bow', 260, 70, 0.6]],
  },
  28: {
    story: 'Kamadhenu, the wish-granting cow, rose from the churning of the ocean. Her daughter Nandini lived with the sage Vasishtha. Eight Vasus stole Nandini and were cursed to be born as humans. The eighth, who had led the theft, became Bhishma and lived a long human life.',
    why: 'The divine cow behind Bhishma\'s birth. Rent is 4x the dice, or 10x with both treasures.',
    scene: [['cow', 160, 126, 1.6], ['sun', 250, 44, 12], ['ground']],
  },
  29: {
    story: 'Kurujangala is the heartland of the Kuru clan. Long ago King Kuru ploughed the plain with a golden plough so that it would become holy ground, and it was there, at Kurukshetra, that his descendants would one day meet in battle.',
    why: 'The ancestral land of the Kurus.',
    scene: [['plough', 150, 120, 1.3], ['field'], ['sun', 60, 44, 12]],
  },
  30: {
    story: 'In the Dyuta Sabha, Shakuni rolled loaded dice against Yudhishthira. Yudhishthira lost his wealth, his kingdom, his brothers, himself and finally Draupadi. When Dushasana tried to strip her in the assembly, she prayed to Krishna, and her sari became endless.',
    why: 'The rigged game that began the exile. Go straight to Vanavas.',
    scene: [['pillars'], ['dice', 160, 112, 1.2]],
  },
  31: {
    story: 'Krishna was born at midnight in Kamsa\'s prison in Mathura, the eighth child of Devaki and Vasudeva. Kamsa had been told this child would kill him. Krishna grew up in hiding, came back as a young man, overthrew Kamsa and freed his parents.',
    why: 'Krishna\'s birthplace.',
    scene: [['prison', 120, 120, 1], ['moon', 240, 44], ['temple', 236, 120, 0.8], ['ground']],
  },
  32: {
    story: 'In Gokula, Nanda and Yashoda raised the baby Krishna as their own. He stole butter from every pot the gopis hung out of reach. When Yashoda once looked into his mouth to check for mud, she saw the whole universe inside.',
    why: 'Krishna\'s childhood home among the cowherds.',
    scene: [['butterPot', 160, 74, 1.1], ['cow', 90, 142, 0.9], ['hut', 236, 138, 0.9], ['ground']],
  },
  33: { story: 'Blessings arrive from elders, sages and gods. Most are kind; a few are tests in disguise.', why: 'Draw an Ashirvad card.', scene: [['diya', 160, 104, 1.6], ['petals']] },
  34: {
    story: 'In the groves of Vrindavan, Krishna\'s flute called the gopis to dance the rasa under the moon with Radha. When Indra sent seven days of storms to punish the villagers, Krishna lifted Govardhan hill on one finger and sheltered everyone beneath it.',
    why: 'The groves of the flute, Radha and the rasa dance.',
    scene: [['moon', 250, 42], ['govardhan', 130, 108, 1.1], ['tree', 250, 136, 1], ['flute', 140, 154, 0.6], ['ground']],
  },
  35: {
    story: 'At Prayag the Ganga and Yamuna meet, joined, it is said, by the hidden Saraswati. Pilgrims believe a bath here washes away sin. During their exile, the sage Lomasha led Yudhishthira on a pilgrimage to holy fords like this one.',
    why: 'The meeting of three rivers.',
    scene: [['confluence'], ['ghat', 250, 110, 0.7], ['sun', 70, 44, 14]],
  },
  36: { story: 'Krishna\'s leela is his divine play: sudden journeys, strange luck and twists no one sees coming.', why: 'Draw a Leela card.', scene: [['flute', 160, 104, 1.5], ['feather', 220, 70, 0.9], ['notes']] },
  37: {
    story: 'The Pandavas were given a barren stretch called Khandavaprastha, and turned it into Indraprastha. Maya built them a hall of illusions there: floors that looked like pools and pools that looked like floors. When Duryodhana fell into one, the Pandavas laughed, and he never forgave them.',
    why: 'The Pandava capital, and the hall that sparked a grudge.',
    scene: [['palace', 160, 120, 1.2], ['pool', 160, 156], ['flag', 160, 50], ['ground']],
  },
  38: {
    story: 'Yudhishthira performed the Rajasuya, the sacrifice that made him emperor, and every king brought tribute. The first honour of the assembly went to Krishna. The splendour of that day filled Duryodhana with envy and led straight to the dice game.',
    why: 'The imperial sacrifice. Pay your tribute of 100.',
    scene: [['crown', 160, 96, 1.4], ['altar', 160, 148, 0.9]],
  },
  39: {
    story: 'To protect his people from Jarasandha\'s endless attacks, Krishna led the Yadavas from Mathura to the western sea. There the divine architect Vishwakarma raised Dwaraka, a golden city on the water. After Krishna left the world, the sea rose and took the city back.',
    why: 'Krishna\'s golden city by the sea.',
    scene: [['palace', 160, 108, 1.1], ['sea', 140], ['sun', 260, 40, 14], ['boat', 70, 150, 0.8]],
  },
};
