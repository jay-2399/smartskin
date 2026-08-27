import { NextResponse } from "next/server";
import {
  catalogue, marques, marqueDe, vision, extraireJson,
  imageDepuisDataUrl, typeImage, erreur, type Produit,
} from "@/lib/scan/moteur";
import { writeRateLimit } from "@/lib/rate-limit";

// RECONNAISSANCE D'UN PRODUIT À LA PHOTO, en deux temps : d'abord la MARQUE parmi ~400, puis le
// PRODUIT parmi ceux de cette marque. Découper ainsi évite de présenter 2 800 références d'un
// coup au modèle, et rend la seconde question beaucoup plus facile.
// Aucune des deux étapes n'abandonne sur un texte illisible : on déduit du packaging et
// l'utilisateur confirme. C'est lui qui tranche, pas le modèle.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Candidat = { nom: string; marque: string; image?: string; categorie?: string };
const enCandidat = (p: Produit): Candidat =>
  ({ nom: p.name, marque: marqueDe(p), image: p.image, categorie: p.category });

export async function POST(request: Request) {
  const rl = writeRateLimit(request, "scan-produit", 60);
  if (!rl.ok) {
    return NextResponse.json({ statut: "trop_de_requetes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  try {
    const { image } = await request.json().catch(() => ({}));
    const buf = imageDepuisDataUrl(image);
    if (!buf) return NextResponse.json({ statut: "image_invalide" }, { status: 400 });
    const img = [{ b64: buf.toString("base64"), type: typeImage(buf) }];
    const listeMarques = marques();

    // ── étape 1 : la marque
    const r1 = extraireJson(await vision(
      `You see a photo of a skincare product. Identify its BRAND.\n\n${listeMarques.join(" | ")}\n\n` +
      `If you CANNOT read the brand name (small, blurry, far away, angled, cropped), do NOT give up: ` +
      `infer from the packaging — tube or bottle shape, colours, typography, overall design — and ` +
      `propose your best guesses from the list. The user will confirm.\n` +
      `Set "lisible" to false when the photo is too poor to read anything at all.\n` +
      `Reply ONLY with JSON: {"marques":["<exact names from the list>"],"lisible":true|false} ` +
      `— up to 3 brands, best first, empty array only if truly nothing matches.`, img, 350));

    const trouvees = (Array.isArray(r1?.marques) ? r1.marques : [])
      .filter((m: unknown) => listeMarques.some((x) => x.toLowerCase() === String(m).toLowerCase()));
    if (!trouvees.length) {
      return NextResponse.json({ statut: r1?.lisible === false ? "photo_illisible" : "marque_inconnue" });
    }

    // ── étape 2 : le produit, parmi ceux des marques retenues
    const cands = catalogue().filter((p) =>
      trouvees.some((m: unknown) => marqueDe(p).toLowerCase() === String(m).toLowerCase()));
    if (!cands.length) return NextResponse.json({ statut: "marque_inconnue", marque: trouvees[0] });

    const r2 = extraireJson(await vision(
      `You see a photo of a ${trouvees[0]} skincare product. Identify WHICH product it is.\n` +
      `Here are all ${trouvees[0]} products in our catalog (format "id | category | name"):\n\n` +
      cands.map((p) => `${p.id} | ${p.category} | ${p.name}`).join("\n") + `\n\n` +
      `The label may be in ANY language. The same product is sold worldwide with translated labels ` +
      `while the packaging design stays identical. NEVER reject a product just because the label ` +
      `language differs from the catalog name.\n` +
      `If you CANNOT read the product name, identify from the PACKAGING instead: colour, bottle ` +
      `shape, pump or tube, layout, product line. Give your best guesses — a human will confirm.\n` +
      `Rank up to 3 plausible candidates, best first.\n` +
      `Reply ONLY with JSON: {"candidats":[{"id":<number>,"confiance":0-1}]}`, img, 400));

    const classes = (Array.isArray(r2?.candidats) ? r2.candidats : [])
      .map((x: { id: number }) => catalogue().find((p) => p.id === x.id))
      .filter((p: Produit | undefined): p is Produit => !!p && cands.includes(p))
      .slice(0, 3);

    if (!classes.length) {
      return NextResponse.json({ statut: "aucune_proposition", marque: trouvees[0], alternatives: [] });
    }
    return NextResponse.json({
      statut: "proposition",
      produit: enCandidat(classes[0]),
      alternatives: classes.slice(1).map(enCandidat),
    });
  } catch (e) {
    const { corps, code } = erreur(e);
    return NextResponse.json(corps, { status: code });
  }
}
