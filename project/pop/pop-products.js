/* ============================================================
   KEMETED SAVEUR — catalogue produit partagé
   Source unique de vérité pour le panier, les pages produit et le
   webhook côté serveur (les prix sont dupliqués côté Edge Function
   pour ne jamais faire confiance à un prix envoyé par le client).
   Tarif B2B = -15% exactement sur le tarif B2C (arrondi au centime).
   ============================================================ */
function kemetedB2B(price) { return Math.round(price * 0.85); }

window.KEMETED_PRODUCTS = {
  bissap: {
    id: 'bissap', name: 'Bissap', cat: 'Hibiscus',
    price: 450, priceB2B: kemetedB2B(450),
    color: '#7A1F38', bg: '#FAD9DE',
    img: 'assets/splash-bissap.png',
    tagline: 'La fleur d\'hibiscus rouge, acidulée et florale. Le classique qui réveille.',
    description: 'Le Bissap Kemeted part de la fleur d\'hibiscus rouge, infusée puis pressée à froid, sans sucre ajouté. Acidulé, floral, vif — c\'est le jus qui réveille les papilles dès la première gorgée.',
    tags: ['Antioxydant', 'Vitamine C'],
    benefits: ['Riche en antioxydants', 'Soutient la tension', 'Source de vitamine C']
  },
  blanc: {
    id: 'blanc', name: 'Bissap Blanc', cat: 'Hibiscus blanc',
    price: 450, priceB2B: kemetedB2B(450),
    color: '#E0892F', bg: '#FBE9C2',
    img: 'assets/splash-bissap.png',
    tagline: 'Plus doux, plus solaire. Une variété rare à la robe orangée.',
    description: 'Cousin plus doux du bissap classique, l\'hibiscus blanc donne un jus solaire à la robe orangée — moins acidulé, plus rond, parfait pour les palais qui préfèrent la douceur.',
    tags: ['Digestion', 'Léger'],
    benefits: ['Facilite la digestion', 'Léger, hydratant', 'Peu calorique']
  },
  ditakh: {
    id: 'ditakh', name: 'Ditakh', cat: 'Detarium',
    price: 490, priceB2B: kemetedB2B(490),
    color: '#727F38', bg: '#D6EEDF',
    img: 'assets/ditakh.jpg',
    tagline: 'Le fruit vert acidulé du Sahel, vif et plein de fibres.',
    description: 'Le ditakh (Detarium senegalense) est un fruit vert du Sahel, peu connu hors d\'Afrique de l\'Ouest — vif, acidulé, gorgé de fibres. Un shot de vitalité qu\'on adore après le sport.',
    tags: ['Fibres', 'Immunité'],
    benefits: ['Très riche en fibres', 'Booste l\'immunité', 'Énergie durable']
  },
  bouye: {
    id: 'bouye', name: 'Bouye', cat: 'Baobab',
    price: 490, priceB2B: kemetedB2B(490),
    color: '#B6905C', bg: '#EFE3CF',
    img: 'assets/bouye.jpg',
    tagline: 'La pulpe crémeuse du baobab. Onctueuse et championne du calcium.',
    description: 'Le bouye est extrait de la pulpe du fruit du baobab, l\'arbre emblématique d\'Afrique. Onctueux et légèrement acidulé, c\'est une vraie source de calcium et de prébiotiques naturels.',
    tags: ['Calcium', 'Crémeux'],
    benefits: ['6× plus de calcium', 'Source de potassium', 'Prébiotiques naturels']
  },

  /* ---- Gourmandise (prix indicatifs — à ajuster ici si besoin, c'est
     la seule source à modifier pour changer un prix sur tout le site) ---- */
  donut: {
    id: 'donut', name: 'Donuts fourrés à la gelée de bissap', cat: 'Gourmandise',
    price: 390, priceB2B: kemetedB2B(390),
    color: '#7A1F38', bg: '#FAD9DE',
    img: 'assets/splash-bissap.png',
    tagline: 'Brioche moelleuse, cœur coulant d\'hibiscus rouge.',
    description: 'Nos donuts sont fourrés d\'une gelée de bissap maison — brioche moelleuse à l\'extérieur, cœur fondant et acidulé à l\'intérieur. Vendus par lot de 4.',
    tags: ['Fait maison', 'Lot de 4'],
    benefits: ['Gelée de bissap maison', 'Sans colorant artificiel', 'À partager (ou pas)']
  },
  bonbon: {
    id: 'bonbon', name: 'Bonbons gélatine cœurs bouye', cat: 'Gourmandise',
    price: 490, priceB2B: kemetedB2B(490),
    color: '#B6905C', bg: '#EFE3CF',
    img: 'assets/bottle-ditakh.png',
    tagline: 'Tendres, acidulés, au baobab.',
    description: 'Des bonbons gélifiés tendres, au cœur légèrement acidulé de bouye (baobab). Un format nomade pour retrouver le goût Kemeted partout. Sachet de 150g.',
    tags: ['Sachet 150g', 'Sans conservateur'],
    benefits: ['Pulpe de baobab', 'Format nomade', 'Sans conservateur']
  },
  pate: {
    id: 'pate', name: 'Pâtes de fruits ditakh', cat: 'Gourmandise',
    price: 450, priceB2B: kemetedB2B(450),
    color: '#727F38', bg: '#D6EEDF',
    img: 'assets/bottle-ditakh.png',
    tagline: 'Le vert acidulé, en bouchée.',
    description: 'Des pâtes de fruits artisanales au ditakh — le fruit vert et acidulé du Sahel, concentré en une bouchée sucrée-acidulée. Boîte de 12 pièces.',
    tags: ['Boîte de 12', 'Artisanal'],
    benefits: ['Fruit du Sahel', 'Sucre de canne uniquement', 'Fait à la main']
  },

  /* ---- Lancement Kemeted Saveur : coffret découverte, 200 exemplaires ---- */
  coffret: {
    id: 'coffret', name: 'Coffret Découverte — Lancement', cat: 'Édition de lancement',
    price: 1000, priceB2B: 1000, launch: true, stockId: 'coffret-decouverte', stockTotal: 200,
    color: '#F4D06A', bg: '#FBEDC6',
    img: 'assets/pyramid.png',
    tagline: '3 jus signature + 1 pass tombola Kemeted — édition limitée aux 200 premiers clients.',
    description: 'Pour le lancement de Kemeted Saveur : un coffret découverte à prix cassé pour les 200 premiers clients. Il contient 3 bouteilles (Bissap, Bissap Blanc, Ditakh) et un pass pour la tombola Kemeted &amp; Association.',
    tags: ['Édition limitée', '200 exemplaires'],
    benefits: ['3 jus signature au format découverte', '1 pass tombola Kemeted inclus', 'Prix de lancement, sans engagement'],
    contents: ['Bissap', 'Bissap Blanc', 'Ditakh']
  }
};
