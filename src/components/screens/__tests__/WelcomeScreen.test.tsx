import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";

/* Régression du rejet App Store 2026-07-30 (Guideline 2.1(a)) : le bouton
   « Already have an account? » lançait une INSCRIPTION Apple, créait un compte en
   douce, puis déposait l'utilisateur sur le questionnaire. Ces tests figent le
   contrat inverse : ce bouton CONNECTE, il n'inscrit jamais. */

const signIn = vi.fn();
const push = vi.fn();
vi.mock("next-auth/react", () => ({ signIn: (...a: unknown[]) => signIn(...a) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

// L'app iOS pose ce drapeau : sans lui l'écran retombe sur le scan invité.
beforeEach(() => {
  signIn.mockReset();
  push.mockReset();
  window.__SMARTSKIN_NATIVE__ = true;
  window.webkit = { messageHandlers: { native: { postMessage: vi.fn() } } };
  // jsdom n'a ni matchMedia ni getTotalLength(). On répond « reduced-motion » : la jauge
  // décorative prend alors sa branche courte et n'appelle jamais l'API SVG manquante.
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  delete window.__SMARTSKIN_NATIVE__;
  delete window.webkit;
});

describe("WelcomeScreen — le bouton de retour compte", () => {
  it("s'annonce comme un login, pas comme une inscription", () => {
    render(<WelcomeScreen />);
    const bouton = screen.getByRole("button", { name: /Already have an account/i });
    expect(bouton).toHaveTextContent(/Log in/i);
    expect(bouton).not.toHaveTextContent(/Sign in/i);
  });

  it("demande une CONNEXION (mode login) — jamais une création de compte", async () => {
    signIn.mockResolvedValue({ ok: true });
    render(<WelcomeScreen />);
    await window.__smartskinAppleAuth!("jeton-apple", "Jayden");
    expect(signIn).toHaveBeenCalledWith("apple", expect.objectContaining({ mode: "login" }));
  });

  it("envoie au dashboard quand le compte existe", async () => {
    signIn.mockResolvedValue({ ok: true });
    render(<WelcomeScreen />);
    await window.__smartskinAppleAuth!("jeton-apple", "Jayden");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("dit clairement qu'il n'y a pas de compte, au lieu d'en créer un et de rediriger", async () => {
    signIn.mockResolvedValue({ ok: false }); // Apple ID inconnu → aucune session ouverte
    render(<WelcomeScreen />);
    await window.__smartskinAppleAuth!("jeton-apple", "");
    expect(await screen.findByText(/No SmartSkin account found/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("reste muet si l'utilisateur annule simplement la feuille Apple", async () => {
    render(<WelcomeScreen />);
    window.__smartskinAppleAuthError!("canceled");
    await waitFor(() => expect(screen.queryByText(/No SmartSkin account found/i)).not.toBeInTheDocument());
  });

  it("« Scan my skin » reste le parcours invité, sans passer par Apple", async () => {
    render(<WelcomeScreen />);
    await userEvent.click(screen.getByRole("button", { name: /Scan my skin/i }));
    expect(push).toHaveBeenCalledWith("/questions/age");
    expect(signIn).not.toHaveBeenCalled();
  });
});
