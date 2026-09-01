import { NextResponse } from "next/server";
import {
  dictionnaire, moteurDisponible, scoreFormule, scorePerso,
  parseInci, categoriser, ficheIngredients, vision, extraireJson,
  imageDepuisDataUrl, typeImage, erreur,
} from "@/lib/scan/moteur";
import { sessionPremium, PROFIL_NEUTRE } from "@/lib/scan/acces";
import { profilUtilisateur } from "@/lib/scan/profil-utilisateur";
import { writeRateLimit } from "@/lib/rate-limit";

// LIRE UNE ÉTIQUETTE PHOTOGRAPHIÉE. Le second chemin, quand la reconnaissance du flacon échoue :
// le moteur n'a besoin QUE de la liste INCI, donc il peut noter n'importe quel produit du marché,
// y compris absent du catalogue. Réponse de MÊME FORME que /api/produit/fiche.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROMPT =
  `This photo shows the back label of a skincare product. Read the INGREDIENTS list.\n\n` +
  `Transcribe it EXACTLY as printed, in order, separated by commas. Keep the original spelling ` +
  `and any parentheses. Do not translate, do not reorder, do not add or remove anything. ` +
  `If a word is unreadable, write it as best you can rather than skipping it.\n` +
  `Also report the product name and brand if they appear anywhere on the label.\n\n` +
  `Reply ONLY with JSON: {"inci":"<the full list, or null if you cannot find one>",` +
  `"nom":"<product name if visible, else null>","marque":"<brand if visible, else null>",` +
  `"lisible":true|false,"partielle":true|false}\n` +
  `Set "partielle" to true if part of the list is cut off, blurred or hidden.`;

export async function POST(request: Request) {
  const rl = writeRateLimit(request, "scan-inci", 40);
  if (!rl.ok) {
    return NextResponse.json({ statut: "trop_de_requetes" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  try {
    const { image } = await request.json().catch(() => ({}));
    const buf = imageDepuisDataUrl(image);
    if (!buf) return NextResponse.json({ statut: "image_invalide" }, { status: 400 });

    const r = extraireJson(await vision(PROMPT, [{ b64: buf.toString("base64"), type: typeImage(buf) }], 2000));
    const inci = typeof r?.inci === "string" ? r.inci : null;
    if (!inci || r?.lisible === false) return NextResponse.json({ statut: "illisible" });

    const nom = typeof r?.nom === "string" ? r.nom : "";
    const marque = typeof r?.marque === "string" ? r.marque : "";
    // Sans identité catalogue, la CATÉGORIE se déduit de la composition — et le métier décide
    // de toute la grille de notation. On renvoie donc aussi le niveau de confiance, pour que
    // l'écran propose de corriger.
    const cat = categoriser(nom, inci);
    // Gating : gratuit = formule + ingrédients NEUTRES, sans perso (même règle que fiche).
    const { uid, premium } = await sessionPremium();
    // Un premium SANS bilan visage ne reçoit jamais une peau inventée : profil neutre,
    // pas de score perso, et `profilManquant` dit à l'écran quoi proposer.
    const resolution = premium ? await profilUtilisateur(uid) : null;
    const pr = resolution?.etat === "ok" ? resolution.profil : PROFIL_NEUTRE;
    const f = scoreFormule(inci, cat.categorie, cat.filtresUV);
    const score: Record<string, unknown> = { disponible: moteurDisponible(), formule: f };
    if (resolution?.etat === "ok") score.perso = scorePerso(inci, pr, cat.categorie, f, cat.filtresUV);
    else if (resolution) score.profilManquant = resolution.etat;

    return NextResponse.json({
      statut: "ok",
      produit: { nom: nom || "Produit scanné", marque, image: null, categorie: cat.categorie, inci },
      score,
      ingredients: ficheIngredients(inci, dictionnaire(), pr),
      lecture: {
        source: "étiquette photographiée", confianceCategorie: cat.confiance,
        partielle: r?.partielle === true, nbIngredients: parseInci(inci).length,
      },
    });
  } catch (e) {
    const { corps, code } = erreur(e);
    return NextResponse.json(corps, { status: code });
  }
}
