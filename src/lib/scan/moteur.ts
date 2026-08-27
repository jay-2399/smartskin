// Cœur partagé des routes de scan produit. Porté depuis le prototype (smartskin-scan-proto),
// où il tournait dans un petit serveur Node autonome. Ici il est chargé UNE fois par instance
// et gardé en mémoire : le catalogue fait 2,9 Mo, on ne le relit pas à chaque requête.
//
// Règle de survie : aucune de ces fonctions ne doit jeter d'exception non rattrapée. Une route
// qui plante fait tomber le processus Node — donc TOUTE l'app, pas seulement le scan.
import fs from "node:fs";
import path from "node:path";
// Moteur en JS pur, porté tel quel du prototype : volontairement non retypé, pour que
// toute correction faite ici reste échangeable avec le bac à sable.
import { scoreFormule, scorePerso, moteurDisponible, parseInci, CONFIG } from "./scoring.mjs";
import { categoriser } from "./categorise.mjs";

const DOSSIER = path.join(process.cwd(), "data", "scan");
const lire = (f: string) => JSON.parse(fs.readFileSync(path.join(DOSSIER, f), "utf8"));

export type Produit = {
  name: string; brand?: string; image?: string; inci?: string;
  category?: string; filtresUV?: boolean; id?: number;
};

// ── chargement paresseux, une seule fois par instance ────────────────────────
let _catalogue: Produit[] | null = null;
let _dico: Record<string, unknown> | null = null;
let _profil: Record<string, unknown> | null = null;
let _marques: string[] | null = null;

export const catalogue = (): Produit[] => (_catalogue ??=
  (lire("catalog.json") as Produit[]).map((p, i) => ({ ...p, id: i })));
export const dictionnaire = () => (_dico ??= lire("dictionnaire.json"));
export const profil = () => (_profil ??= lire("profil.json"));
export const marqueDe = (p: Produit) => (p.brand || p.name.split(" ")[0]).trim();
export const marques = (): string[] => (_marques ??=
  [...new Set(catalogue().map(marqueDe))].sort());

export { scoreFormule, scorePerso, moteurDisponible, parseInci, categoriser, CONFIG };

// ── appel vision (Anthropic), le seul point qui sort sur le réseau ───────────
const CLE = process.env.ANTHROPIC_API_KEY;
const MODELE = process.env.SCAN_MODEL || "claude-haiku-4-5-20251001";

/** Le format réel se lit dans les octets d'en-tête : l'extension ment souvent. */
export function typeImage(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" &&
      buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "image/jpeg";
}

export class PanneService extends Error {}

export async function vision(prompt: string, images: { b64: string; type: string }[], maxTokens = 400) {
  if (!CLE) throw new PanneService("clé absente");
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 45000);
  try {
    const contenu = [
      ...images.map((im) => ({ type: "image", source: { type: "base64", media_type: im.type, data: im.b64 } })),
      { type: "text", text: prompt },
    ];
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELE, max_tokens: maxTokens, messages: [{ role: "user", content: contenu }] }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const txt = (await r.text()).slice(0, 200);
      // crédit épuisé, quota, surcharge : ce n'est pas la faute de la photo, et l'écran doit
      // le dire autrement (« reconnaissance indisponible ») que « photo illisible ».
      if (/credit balance|rate_limit|overloaded/i.test(txt) || r.status === 429 || r.status >= 500) {
        throw new PanneService(txt);
      }
      throw new Error(`Anthropic ${r.status}: ${txt}`);
    }
    const d = await r.json();
    // joindre TOUS les blocs texte : le premier bloc peut être du raisonnement
    return (d.content || []).filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text).join("");
  } finally { clearTimeout(minuteur); }
}

/** Extrait le premier objet JSON d'une réponse, même noyé dans du texte ou des ``` */
export function extraireJson(s: string): Record<string, unknown> | null {
  try { return JSON.parse(s.replace(/```json|```/g, "").trim()); } catch { /* on tente autrement */ }
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* illisible */ } }
  return null;
}

/** Décode une data URL en Buffer, en refusant ce qui est trop gros. */
export function imageDepuisDataUrl(v: unknown, maxOctets = 9e6): Buffer | null {
  if (typeof v !== "string" || v.length > maxOctets * 1.4) return null;
  const buf = Buffer.from(v.replace(/^data:image\/\w+;base64,/, ""), "base64");
  return buf.length > 64 && buf.length <= maxOctets ? buf : null;
}

// ── détail des ingrédients, identique pour les deux chemins d'entrée ─────────
// (produit du catalogue, ou étiquette photographiée) : la fiche doit afficher la même chose.
type Fiche = {
  role?: string; benefits?: string[]; benefitPower?: number; fragrance?: boolean;
  essentialOil?: boolean; pregnancyFlag?: boolean; euFragranceAllergen?: boolean; src?: string;
  risks?: { irritant?: number; sensibilisant?: number; comedogenic?: number };
};
type ProfilPeau = {
  skinType?: string; sensitivity?: number; pregnancy?: boolean;
  concerns?: Record<string, number>;
};

export function ficheIngredients(inci: string, dico: Record<string, Fiche>, pr: ProfilPeau) {
  return parseInci(inci).map((it: { name: string; pos: number; fiche?: Fiche }) => {
    const d = it.fiche || dico[it.name] || null;
    if (!d) return { nom: it.name, pos: it.pos, groupe: "inconnu" };
    const grav = Math.max(d.risks?.irritant || 0, Math.ceil((d.risks?.comedogenic || 0) / 2));
    const sensi = d.risks?.sensibilisant || 0;
    const flagPerso = (d.fragrance && (pr.sensitivity || 0) > 0)
      || (sensi >= 2 && (pr.sensitivity || 0) >= 2)
      || ((d.risks?.comedogenic || 0) >= 3 && ["oily", "combination"].includes(pr.skinType || ""))
      || (d.essentialOil && (pr.sensitivity || 0) >= 2)
      || (d.pregnancyFlag && pr.pregnancy);
    const utile = d.role === "active" && (d.benefits || []).some((b) => pr.concerns?.[b]);
    return {
      nom: it.name, pos: it.pos,
      groupe: d.role === "active" && d.benefits?.length ? "benefique"
            : (grav >= 2 || d.fragrance || d.essentialOil) ? "surveiller" : "neutre",
      benefits: d.benefits || [], power: d.benefitPower || 0,
      irritant: d.risks?.irritant || 0, sensibilisant: sensi,
      comedo: d.risks?.comedogenic || 0, allergene: !!d.euFragranceAllergen,
      src: d.src || "", flagPerso, utile,
    };
  });
}

/** Réponse d'erreur uniforme. `panne` distingue « service indisponible » de « mauvaise photo ». */
export function erreur(e: unknown) {
  const panne = e instanceof PanneService;
  return { corps: panne ? { statut: "service_indisponible" } : { statut: "erreur" }, code: panne ? 200 : 500 };
}
