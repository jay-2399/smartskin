import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startNativePurchase } from "@/features/checkout/native-purchase";

/* Retry d'achat sur échec ÉCLAIR (rejet App Store 2.1(b) du 2026-08-03).
   Constat PostHog en review : des échecs StoreKit à ~45-70 ms (aucune feuille ne
   peut apparaître en si peu de temps) suivis d'un succès au retry 2 min après.
   Contrat : échec <600 ms = machine → relancer (max 3 tentatives au total) ;
   échec lent = refus humain (feuille annulée) → verdict immédiat, pas de relance. */

const post = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  post.mockReset();
  window.webkit = { messageHandlers: { native: { postMessage: post } } };
});
afterEach(() => {
  vi.useRealTimers();
  delete window.webkit;
  delete window.__smartskinPurchaseDone;
});

describe("startNativePurchase — retry sur échec éclair", () => {
  it("relance après un échec instantané, et rend le succès de la 2e tentative", () => {
    const onDone = vi.fn();
    startNativePurchase("lifetime", onDone);
    expect(post).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(70);              // échec façon review du 03/08 (~70 ms)
    window.__smartskinPurchaseDone!(false);
    expect(onDone).not.toHaveBeenCalled();   // pas de verdict : un retry est programmé

    vi.advanceTimersByTime(1200);            // la relance part
    expect(post).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(15000);           // vraie feuille cette fois
    window.__smartskinPurchaseDone!(true);
    expect(onDone).toHaveBeenCalledWith(true);
  });

  it("abandonne après 3 échecs éclair et rend false une seule fois", () => {
    const onDone = vi.fn();
    startNativePurchase("lifetime", onDone);
    for (let i = 0; i < 2; i++) {
      vi.advanceTimersByTime(50);
      window.__smartskinPurchaseDone!(false);
      vi.advanceTimersByTime(1200);
    }
    expect(post).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(50);
    window.__smartskinPurchaseDone!(false);  // 3e échec éclair → plus de relance
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith(false);
  });

  it("ne relance PAS quand l'utilisateur annule la feuille (échec lent)", () => {
    const onDone = vi.fn();
    startNativePurchase("weekly", onDone);
    vi.advanceTimersByTime(4200);            // la feuille s'est ouverte, il annule
    window.__smartskinPurchaseDone!(false);
    expect(onDone).toHaveBeenCalledWith(false);
    expect(post).toHaveBeenCalledTimes(1);   // aucune relance intempestive
  });

  it("succès direct → verdict immédiat, une seule demande native", () => {
    const onDone = vi.fn();
    startNativePurchase("lifetime", onDone);
    vi.advanceTimersByTime(20000);
    window.__smartskinPurchaseDone!(true);
    expect(onDone).toHaveBeenCalledWith(true);
    expect(post).toHaveBeenCalledTimes(1);
  });
});
