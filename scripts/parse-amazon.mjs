// Parseur réutilisable : extrait les 3 couches d'une fiche Amazon (markdown Bright Data).
// Usage : node scripts/parse-amazon.mjs <fichier.txt> <ASIN>  → imprime le JSON couche1+couche3 brut.
// La CLASSIFICATION (skinTypes, targets, night, sécurité, byProfile) reste manuelle/à part.
import fs from "node:fs";

const clean = (t) =>
  t
    .replace(/(?:Brief|Full) content visible, double tap to read (?:full|less|brief) content\./g, " ")
    .replace(/\[Verified Purchase\]\([^)]*\)|\[Size:[^\]]*\]\S*/g, " ")
    .split(/\d+ (?:people|person) found this helpful|Helpful|Report/)[0]
    .replace(/\s+/g, " ")
    .trim();

export function parseAmazon(raw) {
  // Les résultats scrape_batch sont du JSON → \n littéraux (2 caractères). On normalise
  // pour que les regex (aspects, customers_say) marchent comme sur un scrape simple.
  const txt = raw.replace(/\\n/g, " ").replace(/\\"/g, '"');
  const g = (re) => (txt.match(re) || [])[1] || null;
  const price = parseFloat(g(/\$([0-9]+\.[0-9]{2})/) || "0") || null;
  const rating = parseFloat(g(/([0-9]\.[0-9]) out of 5/) || "0") || null;
  const reviews = parseInt((g(/([0-9,]+) (?:global ratings|ratings)/) || "0").replace(/,/g, "")) || null;
  const bsr = parseInt((g(/#([0-9,]+) in/) || "0").replace(/,/g, "")) || null;
  const bought = g(/([0-9K,]+\+? bought in past month)/);
  const sizeV = parseFloat(g(/([0-9.]+) ?(?:fl oz|Fl Oz|Ounce)/) || "0") || null;
  let img = (txt.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9]{8,}\._[A-Z0-9_,]+_\.(?:jpg|png)/) || [])[0] || null;
  // Normalise la taille (certaines fiches renvoient une miniature ._US40_ → image minuscule).
  if (img) img = img.replace(/(\/images\/I\/[A-Za-z0-9]+)\.[^/]+\.(jpg|png)$/i, "$1._AC_SL500_.$2");
  const fragranceFree = /fragrance[- ]free|unscented/i.test(txt) || null;

  // customers_say
  const j = txt.indexOf("Customers say");
  let customersSay = null;
  if (j > 0) customersSay = clean(txt.slice(j + 13, j + 900).split(/AI Generated|Select to learn/)[0]).slice(0, 600);

  // aspects avec compteurs : chips « Aspect(nombre) » groupées près du bloc « Customers say »
  // (le format « learn more … » n'est pas fiable en mode batch). On borne à la zone du widget.
  const aspects = {};
  if (j > 0) {
    const win = txt.slice(j, j + 2600);
    for (const a of win.matchAll(/([A-Z][a-zA-Z ]{2,24})\((\d{2,5})\)/g)) {
      const k = a[1].trim();
      if (!aspects[k] && Object.keys(aspects).length < 8) aspects[k] = a[2];
    }
  }

  // avis
  const reviewsArr = [];
  const seen = new Set();
  for (const b of txt.split("Reviewed in the United States on ").slice(1)) {
    const m = b.match(/^([A-Za-z]+ \d+, \d{4})/);
    if (!m) continue;
    const t = clean(b.slice(m[0].length, m[0].length + 800));
    const key = t.slice(0, 60).toLowerCase();
    if (t.length > 55 && !seen.has(key)) {
      seen.add(key);
      reviewsArr.push({ author: "Verified buyer", rating: 5, verified: true, date: m[1], text: t.slice(0, 280) });
    }
    if (reviewsArr.length >= 3) break;
  }

  return { price, rating, reviews, bsr, bought, size_value: sizeV, image: img, fragranceFree,
    couche3: { customers_say: customersSay, aspects, reviews: reviewsArr } };
}

if (process.argv[2]) {
  const txt = fs.readFileSync(process.argv[2], "utf8");
  console.log(JSON.stringify(parseAmazon(txt), null, 1));
}
