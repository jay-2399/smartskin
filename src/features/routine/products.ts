/* Catalogue produits de la routine v2 (« storytelling »).
   Extrait de storytelling.ts pour être réutilisable par le sélecteur
   personnalisé (personalize.ts). Chaque produit est TAGUÉ :
   - `targets` : ids de préoccupations (cf. analysis/attributes.ts) qu'il adresse ;
   - `actives` : actifs clés (sert au filtrage / à la cohérence avec recommend.ts) ;
   - `unsafePregnancy` / `unsafeSensitive` : exclusions de sécurité (q7).
   Les textes « why » (marketing) sont conservés tels quels : un produit n'est
   montré que lorsque ses `targets` correspondent au bilan, donc sa justification
   reste pertinente. */

export type IconKey = "pump" | "dropper" | "jar" | "bottle";
export type TabKey = "day" | "night";

export interface Product {
  brand: string;
  name: string;
  img?: string;
  price: string;
  p: number;
  why: string;
  url: string;
  freq?: string;
  targets: string[];
  actives: string[];
  unsafePregnancy?: boolean;
  unsafeSensitive?: boolean;
}
export interface Step {
  cat: string;
  icon: IconKey;
  freq: string;
  use: string;
  options: Product[];
}
export interface RoutineData {
  day: Step[];
  night: Step[];
  diagnostic: string[];
  productCount: number;
}

/* Donnée de restock d'un produit choisi (consommable de la routine) : tout ce qu'il
   faut au dashboard pour estimer « fini dans ~X jours » avec la formule réelle. */
export interface RestockItem {
  name: string;
  asin: string;
  icon: IconKey;
  category: string;
  frequency: string;
  moment: string;
  size_ml: number;
}

/* Nettoyant — peau grasse / imperfections (BHA en rinçage = OK grossesse). */
export const CLEANSER: Product[] = [
  { brand: "La Roche-Posay", name: "Effaclar Gel Cleanser", img: "/prod-effaclar.png", price: "$18.99", p: 19, targets: ["acne", "comedones", "pores", "shine"], actives: ["salicylic_acid"], unsafeSensitive: true, why: "Ton diagnostic a relevé un <b>excès de sébum</b> et des <b>imperfections</b> sur la zone T. Ce gel nettoie en profondeur grâce à l'<b>acide salicylique 2%</b>, qui dissout le sébum incrusté et désobstrue les pores sans agresser ta peau. Utilisé matin et soir, il prépare la peau à recevoir les actifs ciblés de ta routine et limite l'apparition de nouvelles imperfections.", url: "https://www.laroche-posay.us/our-products/face/acne-products/effaclar-medicated-acne-face-wash-effaclaracnewash.html" },
  { brand: "CeraVe", name: "Foaming Cleanser", price: "$15", p: 15, targets: ["acne", "comedones", "pores", "shine"], actives: ["niacinamide"], why: "Une alternative plus douce si ta peau a tendance à tirailler. Sa <b>niacinamide</b> et ses <b>céramides</b> éliminent l'<b>excès de sébum</b> relevé par ton diagnostic tout en renforçant la <b>barrière cutanée</b>. Bon compromis efficacité/tolérance pour un usage quotidien.", url: "https://www.cerave.com/skincare/cleansers/foaming-facial-cleanser" },
  { brand: "Avène", name: "Cleanance Gel Nettoyant", price: "$17", p: 17, targets: ["acne", "comedones", "pores", "shine"], actives: [], why: "Pensé pour les peaux <b>grasses à imperfections</b> comme l'indique ton diagnostic. Ce gel purifie et matifie la zone T et cible l'<b>excès de sébum</b> sans décaper, le tout testé sous contrôle dermatologique.", url: "https://www.aveneusa.com" },
  { brand: "The Inkey List", name: "Salicylic Acid Cleanser", price: "$11", p: 11, targets: ["acne", "comedones", "pores"], actives: ["salicylic_acid"], unsafeSensitive: true, why: "Même logique que le produit recommandé, à prix mini. L'<b>acide salicylique 2%</b> et le <b>zinc</b> désincrustent les pores et ciblent les <b>points noirs</b> repérés dans ton diagnostic.", url: "https://www.theinkeylist.com" },
];
const CLEANSER_GENTLE: Product = { brand: "CeraVe", name: "Hydrating Cleanser", price: "$16", p: 16, targets: [], actives: [], why: "Un nettoyant doux non moussant qui retire impuretés et sébum du jour sans décaper la <b>barrière cutanée</b>. Il convient à toutes les peaux et prépare la peau aux soins suivants.", url: "https://www.cerave.com" };

/* Sérum niacinamide — sébum, pores, rougeurs, marques. */
export const SERUM_NIA: Product[] = [
  { brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", img: "/prod-niacinamide.png", price: "~$6.50", p: 6.5, targets: ["shine", "pores", "redness", "post_acne_marks", "tone_evenness"], actives: ["niacinamide"], why: "Ton diagnostic pointe un <b>sébum</b> abondant et des <b>pores</b> visibles. La <b>niacinamide 10%</b> régule la production de sébum pendant que le <b>zinc</b> apaise les imperfections. En quelques semaines, le grain de peau s'affine et les marques s'atténuent. À appliquer le matin avant l'hydratant pour matifier la journée.", url: "https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html" },
  { brand: "Naturium", name: "Niacinamide Serum 12%", price: "$16", p: 16, targets: ["shine", "pores", "tone_evenness"], actives: ["niacinamide"], why: "Version plus concentrée pour les mêmes besoins. La <b>niacinamide 12%</b> resserre les <b>pores</b> identifiés dans ton diagnostic et unifie le teint, dans une texture fluide non collante.", url: "https://naturium.com" },
  { brand: "Paula's Choice", name: "10% Niacinamide Booster", price: "$49", p: 49, targets: ["pores", "shine"], actives: ["niacinamide"], why: "Un booster premium très ciblé sur les <b>pores</b> dilatés et le grain irrégulier de ton diagnostic. La <b>niacinamide 10%</b> affine la peau dans une base soyeuse, à mélanger à ton sérum ou hydratant.", url: "https://www.paulaschoice.com" },
  { brand: "Good Molecules", name: "Niacinamide Serum", price: "$12", p: 12, targets: ["shine", "pores"], actives: ["niacinamide"], why: "L'essentiel au prix le plus juste. Une <b>niacinamide</b> simple et efficace qui régule l'<b>excès de sébum</b> relevé par ton diagnostic, idéale pour débuter sans se ruiner.", url: "https://goodmolecules.com" },
];

/* Sérum hydratant — déshydratation, éclat. */
export const SERUM_HYDRA: Product[] = [
  { brand: "Typology", name: "A31 — Sérum Hydratant", img: "/prod-typology.png", price: "~$30", p: 30, targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "Même une peau grasse manque d'eau : ton diagnostic révèle une <b>déshydratation</b> sous l'excès de sébum. L'<b>acide hyaluronique</b> repulpe et la <b>vitamine B5</b> apaise, dans une texture légère <b>non grasse</b> qui n'obstrue pas les pores. Elle rééquilibre la peau et limite l'effet rebond de sébum lié au dessèchement.", url: "https://us.typology.com/products/hyaluronic-acid" },
  { brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", price: "$9", p: 9, targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "Le même bénéfice hydratant à prix mini. L'<b>acide hyaluronique</b> multi-poids et la <b>B5</b> repulpent la <b>déshydratation</b> notée dans ton diagnostic, sous une texture légère adaptée aux peaux mixtes à grasses.", url: "https://theordinary.com" },
  { brand: "La Roche-Posay", name: "Hyalu B5 Sérum", price: "$40", p: 40, targets: ["flaking", "radiance", "redness"], actives: ["hyaluronic_acid"], why: "Plus réparateur, si ton diagnostic montre aussi des <b>zones sensibilisées</b>. L'<b>acide hyaluronique</b>, la <b>vitamine B5</b> et le madécassoside repulpent et réparent les peaux fragilisées.", url: "https://www.laroche-posay.us" },
  { brand: "Vichy", name: "Minéral 89 Booster", price: "$30", p: 30, targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "Un booster fortifiant : l'<b>acide hyaluronique</b> et l'eau volcanique renforcent la <b>barrière cutanée</b> et hydratent intensément la peau déshydratée repérée dans ton diagnostic.", url: "https://www.vichyusa.com" },
];

/* Crème — hydratation finale, non comédogène. */
export const CREAM: Product[] = [
  { brand: "Dr. Althea", name: "345 Relief Cream", img: "/prod-dralthea.png", price: "$24–27", p: 25, targets: ["flaking", "post_acne_marks", "redness"], actives: ["moisturizer"], why: "Pour sceller l'hydratation sans relancer le <b>sébum</b> relevé par ton diagnostic. Cette crème <b>non comédogène</b> hydrate et <b>apaise</b> les zones <b>post-acné</b> et sensibles sans laisser de film gras. Elle clôt ta routine du matin et garde la peau confortable toute la journée.", url: "https://www.ulta.com/p/345-relief-cream-pimprod2056740" },
  { brand: "CeraVe", name: "Moisturizing Cream", price: "$17", p: 17, targets: ["flaking"], actives: ["moisturizer"], why: "Riche en <b>céramides</b> et <b>acide hyaluronique</b>, elle restaure la <b>barrière cutanée</b> sans provoquer de comédons — adaptée aux zones sensibilisées identifiées dans ton diagnostic.", url: "https://www.cerave.com" },
  { brand: "La Roche-Posay", name: "Toleriane Double Repair", price: "$21", p: 21, targets: ["flaking", "redness"], actives: ["moisturizer"], why: "<b>Céramides</b> et niacinamide pour apaiser et réparer au quotidien la peau réactive notée dans ton diagnostic, sans surcharger les pores.", url: "https://www.laroche-posay.us" },
  { brand: "Avène", name: "Tolérance Control Crème", price: "$32", p: 32, targets: ["redness", "flaking"], actives: ["moisturizer"], why: "Formule minimaliste et apaisante : elle calme les <b>rougeurs</b> et l'inconfort des zones sensibles relevées par ton diagnostic, idéale en cas de peau réactive.", url: "https://www.aveneusa.com" },
];

/* Exfoliant BHA (leave-on) — pores, points noirs. Déconseillé grossesse / peau réactive. */
export const EXFO: Product[] = [
  { brand: "Paula's Choice", name: "Skin Perfecting 2% BHA", img: "/prod-paula.png", price: "$37", p: 37, freq: "2-3×/sem", targets: ["acne", "comedones", "pores"], actives: ["salicylic_acid"], unsafePregnancy: true, unsafeSensitive: true, why: "Ton diagnostic révèle des <b>pores obstrués</b> et des <b>points noirs</b>. Cet exfoliant à l'<b>acide salicylique (BHA)</b> pénètre dans le pore pour dissoudre sébum et impuretés, lisse le grain et prévient les imperfections. À utiliser 2-3 soirs par semaine, jamais en même temps que d'autres actifs forts.", url: "https://www.paulaschoice.com/skin-perfecting-2pct-bha-liquid-exfoliant/201-2010.html" },
  { brand: "The Ordinary", name: "Salicylic Acid 2% Solution", price: "$9", freq: "2-3×/sem", p: 9, targets: ["acne", "comedones", "pores"], actives: ["salicylic_acid"], unsafePregnancy: true, unsafeSensitive: true, why: "Le même actif à prix mini. L'<b>acide salicylique 2%</b> cible les <b>pores obstrués</b> et les <b>points noirs</b> de ton diagnostic, à raison de 2-3 fois par semaine.", url: "https://theordinary.com" },
  { brand: "COSRX", name: "BHA Blackhead Power Liquid", price: "$25", freq: "le soir", p: 25, targets: ["comedones", "pores"], actives: ["salicylic_acid"], unsafePregnancy: true, unsafeSensitive: true, why: "Plus doux pour débuter l'exfoliation. Le <b>BHA</b> associé au saule blanc déloge les <b>points noirs</b> repérés dans ton diagnostic tout en respectant la peau.", url: "https://www.cosrx.com" },
  { brand: "COSRX", name: "AHA/BHA Clarifying Toner", price: "$19", freq: "2-3×/sem", p: 19, targets: ["pores", "texture"], actives: ["salicylic_acid", "aha"], unsafePregnancy: true, unsafeSensitive: true, why: "Une exfoliation légère <b>AHA/BHA</b> en entretien : elle affine le grain et désobstrue les <b>pores</b> notés dans ton diagnostic, en douceur.", url: "https://www.cosrx.com" },
];

/* Protection solaire — étape jour indispensable (anti-taches / anti-âge n°1). */
export const SPF: Product[] = [
  { brand: "La Roche-Posay", name: "Anthelios UVMune 400 SPF 50+", price: "$33", p: 33, targets: ["dark_spots", "post_acne_marks"], actives: ["spf"], why: "La protection solaire est le geste <b>anti-taches</b> et <b>anti-âge</b> n°1 : sans elle, les UV foncent les marques et la pigmentation et annulent les efforts du reste de la routine. Cette texture fluide ne laisse pas de fini blanc et se porte tous les jours, même sous le maquillage.", url: "https://www.laroche-posay.us" },
  { brand: "EltaMD", name: "UV Clear SPF 46", price: "$43", p: 43, targets: ["dark_spots", "redness"], actives: ["spf"], why: "Très apprécié des peaux à imperfections et sensibles : sa <b>niacinamide</b> apaise pendant que le SPF protège des UV, dans un fini léger non gras qui n'obstrue pas les pores.", url: "https://eltamd.com" },
  { brand: "Supergoop!", name: "Unseen Sunscreen SPF 40", price: "$38", p: 38, targets: ["dark_spots"], actives: ["spf"], why: "Un fini totalement invisible et velouté, parfait comme base de teint. Il protège des UV au quotidien sans trace blanche ni effet collant.", url: "https://supergoop.com" },
  { brand: "CeraVe", name: "Hydrating Mineral SPF 30", price: "$17", p: 17, targets: ["dark_spots", "redness"], actives: ["spf"], why: "Une protection minérale douce à petit prix, avec <b>céramides</b> et <b>niacinamide</b> : idéale pour les peaux réactives qui ne tolèrent pas les filtres chimiques.", url: "https://www.cerave.com" },
];

/* Masque purifiant (argile) — rituel hebdo pour peau grasse / pores / imperfections. */
export const MASK_PURIFYING: Product[] = [
  { brand: "Innisfree", name: "Super Volcanic Pore Clay Mask", price: "$18", p: 18, freq: "1×/sem le soir", targets: ["shine", "pores", "acne", "comedones"], actives: ["clay"], why: "Une fois par semaine, ce masque à l'<b>argile volcanique</b> absorbe l'excès de sébum et désincruste les pores en profondeur. Idéal pour la zone T grasse : il affine le grain et prévient les points noirs sans dessécher le reste du visage.", url: "https://us.innisfree.com" },
  { brand: "The INKEY List", name: "Kaolin Clay Mask", price: "$11", p: 11, freq: "1×/sem le soir", targets: ["shine", "pores", "comedones"], actives: ["clay"], why: "L'essentiel à prix mini : l'<b>argile kaolin</b> matifie et resserre visiblement les pores. Doux pour un usage hebdomadaire.", url: "https://www.theinkeylist.com" },
  { brand: "L'Oréal", name: "Pure-Clay Detox Mask", price: "$13", p: 13, freq: "1×/sem le soir", targets: ["shine", "pores"], actives: ["clay", "charcoal"], why: "Trois argiles + <b>charbon</b> pour détoxifier la peau grasse et illuminer le teint terne. Une cure éclat hebdomadaire.", url: "https://www.lorealparisusa.com" },
  { brand: "Aztec Secret", name: "Indian Healing Clay", price: "$14", p: 14, freq: "1×/sem le soir", targets: ["pores", "acne"], actives: ["clay"], why: "Le pot culte : <b>bentonite</b> 100 % pure, très absorbante. À réserver aux peaux grasses tolérantes, 1×/sem grand maximum.", url: "https://www.aztecsecret.com" },
];

/* Masque hydratant — rituel hebdo pour peau sèche / déshydratée / teint terne. */
export const MASK_HYDRATING: Product[] = [
  { brand: "Laneige", name: "Water Sleeping Mask", price: "$29", p: 29, freq: "1-2×/sem le soir", targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "Un masque de nuit qui repulpe la peau pendant le sommeil. Au réveil, le teint est <b>frais et rebondi</b> : parfait quand la peau tiraille ou manque d'éclat.", url: "https://us.laneige.com" },
  { brand: "Typology", name: "Masque de Nuit Repulpant", price: "$30", p: 30, freq: "1-2×/sem le soir", targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "Formule courte et clean à l'<b>acide hyaluronique</b> : il hydrate intensément la nuit et lisse le teint terne relevé dans ton diagnostic.", url: "https://us.typology.com" },
  { brand: "Garnier", name: "Moisture Bomb Sheet Mask", price: "$4", p: 4, freq: "1-2×/sem le soir", targets: ["flaking", "radiance"], actives: ["hyaluronic_acid"], why: "Le coup de boost express à petit prix : un masque tissu gorgé d'<b>acide hyaluronique</b> pour réhydrater en 15 minutes.", url: "https://www.garnierusa.com" },
  { brand: "e.l.f.", name: "Holy Hydration! Face Mask", price: "$14", p: 14, freq: "1-2×/sem le soir", targets: ["flaking"], actives: ["hyaluronic_acid"], why: "Crème-masque nourrissante à l'<b>acide hyaluronique</b> et au squalane : confort immédiat pour les peaux qui tiraillent.", url: "https://www.elfcosmetics.com" },
];

/* Variante « pourquoi » d'un produit (réutilisé le soir avec un autre texte). */
export function withWhy(list: Product[], idx: number, why: string): Product {
  return { ...list[idx], why };
}

/* Routine par défaut (peau mixte/grasse) — utilisée en démo `?demo=1` et comme
   secours si l'on n'a pas de bilan. Reproduit le catalogue d'origine + SPF. */
export const DEFAULT_ROUTINE: RoutineData = {
  day: [
    { cat: "Nettoyant", icon: "pump", freq: "Chaque matin", use: "Masse sur peau humide ~30 s, puis rince à l'eau tiède.", options: CLEANSER },
    { cat: "Sérum", icon: "dropper", freq: "Chaque matin", use: "3-4 gouttes sur peau propre, à faire pénétrer avant l'hydratant.", options: SERUM_NIA },
    { cat: "Sérum", icon: "dropper", freq: "Chaque matin", use: "Quelques gouttes sur peau encore légèrement humide.", options: SERUM_HYDRA },
    { cat: "Crème", icon: "jar", freq: "Chaque matin", use: "Une noisette pour sceller l'hydratation.", options: CREAM },
    { cat: "Protection", icon: "pump", freq: "Chaque matin", use: "En dernière étape, généreusement. À renouveler en cas d'exposition.", options: SPF },
  ],
  night: [
    { cat: "Nettoyant", icon: "pump", freq: "Chaque soir", use: "Masse pour retirer sébum et pollution du jour, puis rince.", options: [withWhy(CLEANSER, 0, "Au fil de la journée, sébum et pollution s'accumulent et obstruent les pores — à l'origine des <b>points noirs</b> repérés dans ton diagnostic. Ce nettoyant à l'<b>acide salicylique 2%</b> retire cet <b>excès de sébum</b> le soir et remet la peau à zéro avant les actifs nocturnes. Étape clé pour désincruster sans dessécher."), CLEANSER[1], CLEANSER[2], CLEANSER[3]] },
    { cat: "Exfoliant", icon: "bottle", freq: "2-3 soirs / sem", use: "Sur peau sèche après nettoyage, ne pas rincer. Jamais avec d'autres acides le même soir.", options: EXFO },
    { cat: "Sérum", icon: "dropper", freq: "Chaque soir", use: "Réhydrate juste après l'exfoliant, sur peau légèrement humide.", options: [withWhy(SERUM_HYDRA, 0, "Après l'exfoliant du soir, la peau peut tirailler. Ce sérum <b>acide hyaluronique</b> + <b>B5</b> réhydrate en profondeur et calme les <b>zones sensibilisées</b> repérées dans ton diagnostic. Il compense l'effet asséchant de l'exfoliation et préserve la <b>barrière cutanée</b> pendant la nuit."), SERUM_HYDRA[1], SERUM_HYDRA[2], SERUM_HYDRA[3]] },
    { cat: "Crème", icon: "jar", freq: "Chaque soir", use: "Une noisette en dernière étape, pour réparer la nuit.", options: [withWhy(CREAM, 0, "La nuit, la peau se répare. Cette crème <b>non comédogène</b> nourrit, <b>apaise</b> et soutient la <b>barrière cutanée</b> fragilisée par les imperfections et les marques <b>post-acné</b> de ton diagnostic, sans risque d'obstruer les pores."), CREAM[1], CREAM[2], CREAM[3]] },
  ],
  diagnostic: ["Excès de sébum", "Pores obstrués", "Imperfections"],
  productCount: 9,
};

/* Nettoyant doux dédié quand la peau n'a pas d'enjeu sébum/imperfections. */
export { CLEANSER_GENTLE };
