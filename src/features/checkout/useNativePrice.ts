"use client";
import { useEffect, useState } from "react";
import { isNativeApp, fetchNativePrice } from "./native-purchase";

/** Prix affiché sur le paywall : le prix localisé réel venu d'Apple (StoreKit) dans
 *  l'app iOS ; sinon le `fallback` (navigateur web, où il n'y a pas de StoreKit). */
export function useNativePrice(fallback: string): string {
  const [price, setPrice] = useState(fallback);
  useEffect(() => {
    if (!isNativeApp()) return;
    fetchNativePrice(setPrice);
  }, []);
  return price;
}
