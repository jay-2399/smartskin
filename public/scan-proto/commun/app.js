/* ═══════════════════════════════════════════════════════════════════════════
   SmartSkin — proto scan V2 · socle front (window.SS)
   Conforme à docs/specs/scan-v2-contrats.md §3 (stockage) et §4 (API).
   Style ES5 du proto (var/function) ; fetch + Promise natifs comme les pages.

   SPIKE AUTH (2026-08-30, observé en réel sur `next dev`, Auth.js v5) :
   · GET /api/auth/csrf → 200 JSON {"csrfToken":"<hex>"} + Set-Cookie
     authjs.csrf-token (HttpOnly) et authjs.callback-url. Le cookie repart tout
     seul (same-origin) ; on ne renvoie le jeton QUE dans le corps du POST.
   · POST /api/auth/callback/credentials (form-urlencoded : csrfToken+email+
     password, header X-Auth-Return-Redirect: 1) →
       échec  : 200 JSON {"url":"…/login?error=CredentialsSignin&code=credentials"}
       succès : 200 JSON {"url":"<callback-url>"} sans ?error= + cookie session.
     Sans le header : 302 vers la même URL. → détection d'erreur = « url
     contient error= », exactement comme le contrat le prévoyait.
   · POST /api/auth/signout (csrfToken, même header) → 200 {"url":"<origine>"}.
   Le flux REST est donc FAISABLE tel quel, pas de repli formulaire pleine page.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var SS = {};

  /* ── petits utilitaires ─────────────────────────────────────────────────── */
  function lireJSON(storage, cle, defaut) {
    try { var v = storage.getItem(cle); return v ? JSON.parse(v) : defaut; }
    catch (e) { return defaut; }
  }
  function ecrireJSON(storage, cle, val) {
    try { storage.setItem(cle, JSON.stringify(val)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function form(obj) {
    var k, out = [];
    for (k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        out.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k] == null ? "" : obj[k]));
      }
    }
    return out.join("&");
  }
  // mêmes seuils que le moteur (cf. 06-result-premium) : ≥75 good · ≥45 mid · sinon bad
  function teinte(n) { return n >= 75 ? "good" : n >= 45 ? "mid" : "bad"; }

  /* ── styles des modales/toasts : injectés par app.js lui-même ──────────────
     Les 5 pages d'origine (dont 06-result-premium) ne chargent PAS base.css :
     sans ceci, le modal Add-to-routine s'ouvrait NU — images à taille réelle,
     page élargie, écran « coupé » (bug vu sur iPhone le 2026-08-31).
     Valeurs LITTÉRALES (pas de var()) : les :root diffèrent d'une page à
     l'autre. Rules scopées sous .scrim pour ne jamais toucher la page hôte. */
  var CSS_MODAUX =
    ".scrim{position:fixed;inset:0;z-index:50;padding:24px;display:flex;align-items:center;justify-content:center;" +
    "background:rgba(15,18,26,0.44);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);}" +
    ".scrim .modal{width:100%;max-width:366px;border-radius:24px;padding:22px 20px 20px;font-family:'Manrope',sans-serif;color:#1A1D21;" +
    "background:linear-gradient(165deg,rgba(255,255,255,0.96),rgba(255,255,255,0.85));" +
    "-webkit-backdrop-filter:blur(24px) saturate(1.5);backdrop-filter:blur(24px) saturate(1.5);" +
    "border:1px solid rgba(255,255,255,0.92);box-shadow:inset 0 1.5px 0 #fff,0 30px 70px rgba(15,20,35,0.45);}" +
    ".scrim .modal-h{font-weight:800;font-size:20px;letter-spacing:-0.03em;color:#1A1D21;margin:6px 0 0;}" +
    ".scrim .modal-sub{font-size:12.5px;line-height:1.55;color:#6E7180;margin:5px 0 0;}" +
    ".scrim .modal-note{font-size:10px;color:#9DA2B3;text-align:center;margin:9px 0 0;letter-spacing:0.01em;}" +
    ".scrim .sec-kicker{font-size:8px;color:#9DA2B3;letter-spacing:0.18em;text-transform:uppercase;}" +
    ".scrim .swap-card{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;" +
    "background:#fff;border:1.5px solid #EDEFF7;box-shadow:0 4px 14px rgba(40,55,75,0.08);}" +
    ".scrim .swap-card.now{border-color:rgba(43,193,130,0.55);box-shadow:0 0 0 3px rgba(43,193,130,0.12),0 4px 14px rgba(40,55,75,0.08);}" +
    ".scrim .swap-card img{height:38px;width:auto;flex-shrink:0;}" +
    ".scrim .swap-vs{text-align:center;font-size:9px;font-weight:800;letter-spacing:0.16em;color:#9DA2B3;margin:9px 0;text-transform:uppercase;}" +
    ".scrim .swap-tag{font-size:8.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#189A66;}" +
    ".scrim .alt-name{font-weight:700;font-size:14px;letter-spacing:-0.02em;color:#1A1D21;margin:2px 0 0;}" +
    ".scrim .alt-score{margin-left:auto;text-align:right;flex-shrink:0;}" +
    ".scrim .alt-score b{display:block;font-weight:800;font-size:19px;letter-spacing:-0.5px;color:#189A66;}" +
    ".scrim .alt-score b.mid{color:#D9822B;}.scrim .alt-score b.bad{color:#D8543F;}" +
    ".scrim .alt-score span{font-size:8.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9DA2B3;}" +
    ".scrim .swap-verdict{display:flex;gap:9px;align-items:flex-start;margin:15px 0 0;padding:12px 13px;border-radius:14px;" +
    "background:rgba(43,193,130,0.1);border:1px solid rgba(43,193,130,0.3);}" +
    ".scrim .swap-verdict p{font-size:12px;line-height:1.5;color:#40424D;margin:0;}" +
    ".scrim .swap-verdict p b{font-weight:700;}" +
    ".scrim .rt-ic{width:26px;height:26px;border-radius:50%;flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;}" +
    ".scrim .rt-ic.good{background:rgba(43,193,130,0.14);color:#189A66;border:1px solid rgba(43,193,130,0.42);}" +
    ".scrim .cta-btn{width:100%;height:54px;background:linear-gradient(180deg,#2A2D34 0%,#1A1D21 100%);color:#fff;" +
    "font-family:'Manrope',sans-serif;font-weight:600;font-size:14.5px;letter-spacing:-0.01em;" +
    "border:1px solid rgba(255,255,255,0.08);border-radius:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;" +
    "box-shadow:0 8px 20px rgba(26,29,33,0.26),inset 0 1px 0 rgba(255,255,255,0.22);}" +
    ".scrim .cta-ghost{margin-top:12px;width:100%;height:54px;background:transparent;color:#1A1D21;" +
    "font-family:'Manrope',sans-serif;font-weight:600;font-size:14.5px;letter-spacing:-0.01em;" +
    "border:1.5px solid rgba(26,29,33,0.75);border-radius:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;}" +
    ".scrim .cta-sub{display:block;text-align:center;margin-top:14px;font-weight:600;font-size:12.5px;color:#6E7180;text-decoration:none;cursor:pointer;}" +
    ".scrim .auth-apple{margin-top:18px;width:100%;height:52px;border:none;border-radius:15px;cursor:pointer;" +
    "background:linear-gradient(180deg,#2A2D34,#191B1F);color:#fff;font-family:'Manrope',sans-serif;font-weight:700;font-size:14.5px;" +
    "display:flex;align-items:center;justify-content:center;gap:8px;" +
    "box-shadow:0 8px 20px rgba(26,29,33,0.26),inset 0 1px 0 rgba(255,255,255,0.22);}" +
    ".scrim .auth-apple .apple-slot{display:flex;align-self:stretch;}" +
    ".scrim .auth-apple .apple-slot svg{height:100%;width:auto;}" +
    ".ss-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 96px);z-index:60;" +
    "padding:11px 18px;border-radius:100px;white-space:nowrap;pointer-events:none;" +
    "background:linear-gradient(180deg,#2A2D34,#191B1F);color:#fff;font-family:'Manrope',sans-serif;font-size:12.5px;font-weight:700;letter-spacing:-0.01em;" +
    "box-shadow:0 10px 26px rgba(26,29,33,0.35),inset 0 1px 0 rgba(255,255,255,0.2);" +
    "animation:ssToast 2.3s cubic-bezier(.22,1,.36,1) both;}" +
    "@keyframes ssToast{0%{opacity:0;transform:translate(-50%,10px);}10%,85%{opacity:1;transform:translate(-50%,0);}100%{opacity:0;transform:translate(-50%,-6px);}}" +
    "@media (prefers-reduced-motion: reduce){.ss-toast{animation:none;transform:translateX(-50%);}}";
  function assurerStylesModaux() {
    if (document.getElementById("ss-styles-modaux")) return;
    var st = document.createElement("style");
    st.id = "ss-styles-modaux";
    st.textContent = CSS_MODAUX;
    document.head.appendChild(st);
  }

  function toast(txt) {
    assurerStylesModaux();
    var t = document.createElement("div");
    t.className = "ss-toast";
    t.textContent = txt;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2400);
  }
  function ouvrirScrim(html, surFond) {
    assurerStylesModaux();
    var sc = document.createElement("div");
    sc.className = "scrim";
    sc.innerHTML = html;
    sc.addEventListener("click", function (e) {
      if (e.target === sc && surFond) surFond();
    });
    document.body.appendChild(sc);
    return sc;
  }
  function fermerScrim(sc) { if (sc && sc.parentNode) sc.parentNode.removeChild(sc); }
  // page courante (fichier + query) pour les retours ?next=
  function pageCourante() {
    return (location.pathname.split("/").pop() || "index.html") + location.search;
  }

  /* ── SS.moi : /api/moi avec cache sessionStorage ss-moi (TTL 60 s) ──────── */
  var MOI_TTL = 60 * 1000;
  var MOI_NEUTRE = { connecte: false, premium: false, prenom: null, email: null };
  SS.moi = function (force) {
    var cache = lireJSON(sessionStorage, "ss-moi", null);
    if (!force && cache && typeof cache.t === "number" && Date.now() - cache.t < MOI_TTL) {
      return Promise.resolve({ connecte: !!cache.connecte, premium: !!cache.premium, prenom: cache.prenom || null, email: cache.email || null });
    }
    return fetch("/api/moi", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("moi_" + r.status); return r.json(); })
      .then(function (m) {
        var moi = { connecte: !!m.connecte, premium: !!m.premium, prenom: m.prenom || null, email: m.email || null };
        ecrireJSON(sessionStorage, "ss-moi", { connecte: moi.connecte, premium: moi.premium, prenom: moi.prenom, email: moi.email, t: Date.now() });
        return moi;
      })
      // serveur absent / offline : on répond « visiteur » sans mettre en cache
      .catch(function () { return MOI_NEUTRE; });
  };
  function purgerMoi() { try { sessionStorage.removeItem("ss-moi"); } catch (e) {} }

  /* ── SS.natif : pont natif V1 (contrat §5 — NE PAS MODIFIER) ────────────── */
  function postNatif(msg) {
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.native) {
        window.webkit.messageHandlers.native.postMessage(msg);
      }
    } catch (e) {}
  }
  SS.natif = {
    est: function () { return window.__SMARTSKIN_NATIVE__ === true; },

    // Sign in with Apple natif → callbacks globaux du pont.
    // Hors app : erreur immédiate (le web passe par 15-compte, pas par le pont).
    signInApple: function (ok, err) {
      if (!SS.natif.est()) { if (err) err("indisponible"); return; }
      window.__smartskinAppleAuth = function (idToken, name) { if (ok) ok(idToken, name); };
      window.__smartskinAppleAuthError = function (r) { if (err) err(r); };
      postNatif({ action: "signInWithApple" });
    },

    // Achat : recopie du retry « échec éclair » de native-purchase.ts — un échec
    // en <600 ms est un raté transitoire StoreKit (jamais un refus humain) → on
    // relance jusqu'à 2 fois à 1,2 s d'intervalle avant d'abandonner.
    achat: function (plan, cb) {
      if (SS.natif.est()) {
        var tentative = 0;
        var lancer = function () {
          tentative += 1;
          var t0 = Date.now();
          window.__smartskinPurchaseDone = function (ok) {
            if (!ok && Date.now() - t0 < 600 && tentative < 3) {
              setTimeout(lancer, 1200);
              return;
            }
            if (ok) purgerMoi();
            if (cb) cb(!!ok);
          };
          postNatif({ action: "purchase", plan: plan });
        };
        lancer();
        return;
      }
      // Fallback web (déblocage démo) : POST /api/iap/grant {plan} puis purge ss-moi.
      fetch("/api/iap/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan }),
      })
        .then(function (r) {
          var ok = r.ok;
          if (ok) purgerMoi();
          if (cb) cb(ok);
        })
        .catch(function () { if (cb) cb(false); });
    },

    restaurer: function (cb) {
      if (!SS.natif.est()) { if (cb) cb(false); return; }
      window.__smartskinRestoreDone = function (ok) {
        if (ok) {
          fetch("/api/iap/grant", { method: "POST" })
            .then(function () { purgerMoi(); if (cb) cb(true); })
            .catch(function () { purgerMoi(); if (cb) cb(true); });
          return;
        }
        if (cb) cb(false);
      };
      postNatif({ action: "restore" });
    },

    prix: function (cb) {
      if (!SS.natif.est()) return;
      window.__smartskinPrice = function (p) { if (p && cb) cb(p); };
      postNatif({ action: "getPrice" });
    },

    // Éligibilité à l'essai 7 j (offre d'intro Apple, une fois par compte) : le
    // paywall masque « 7 days free » pour les non-éligibles. Hors app : pas de
    // rappel — le web (démo) garde l'affichage essai par défaut.
    essaiEligible: function (cb) {
      // Callback enregistré même hors app (QA : __smartskinTrialEligible(false) en console).
      window.__smartskinTrialEligible = function (ok) { if (cb) cb(ok === true); };
      if (!SS.natif.est()) return;
      postNatif({ action: "getTrialEligibility" });
    },

    // Entitlement StoreKit → /api/iap/sync ; résout toujours (filet 4 s).
    syncEntitlement: function () {
      return new Promise(function (resolve) {
        if (!SS.natif.est()) { resolve(); return; }
        var fini = false;
        var done = function () { if (!fini) { fini = true; resolve(); } };
        window.__smartskinEntitlement = function (productId, expiresAt) {
          fetch("/api/iap/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: productId, expiresAt: expiresAt }),
          })
            .catch(function () {})
            .then(function () { purgerMoi(); done(); });
        };
        postNatif({ action: "getEntitlement" });
        setTimeout(done, 4000);
      });
    },
  };

  /* ── SS.auth : REST Auth.js v5 (forme observée par le spike, cf. en-tête) ── */
  function postAuth(chemin, params) {
    return SS.auth.csrf().then(function (csrfToken) {
      params.csrfToken = csrfToken;
      return fetch(chemin, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Auth-Return-Redirect": "1",
        },
        body: form(params),
      });
    }).then(function (r) {
      if (!r.ok) throw new Error("auth_" + r.status);
      return r.json();
    }).then(function (d) {
      var url = (d && d.url) || "";
      if (url.indexOf("error=") >= 0) {
        var m = url.match(/error=([^&]+)/);
        throw new Error(m ? decodeURIComponent(m[1]) : "AuthError");
      }
      purgerMoi();
      return d;
    });
  }
  SS.auth = {
    csrf: function () {
      return fetch("/api/auth/csrf", { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("csrf_" + r.status); return r.json(); })
        .then(function (d) { return d.csrfToken; });
    },
    // Apple (jeton d'identité du natif) — mode "login" ou "signup" (cf. features/auth)
    apple: function (idToken, name, mode) {
      return postAuth("/api/auth/callback/apple", { idToken: idToken, name: name || "", mode: mode || "signup" });
    },
    // email + mot de passe — réservé au mode ?dev=1 (contrat §4)
    loginEmail: function (email, mdp) {
      return postAuth("/api/auth/callback/credentials", { email: email, password: mdp });
    },
    // inscription SANS accès (sansAcces:true) puis connexion dans la foulée
    signup: function (email, mdp) {
      return fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: mdp, sansAcces: true }),
      }).then(function (r) {
        if (r.ok) return null;
        return r.json().catch(function () { return {}; }).then(function (d) {
          throw new Error((d && d.error) || "register_" + r.status);
        });
      }).then(function () {
        return SS.auth.loginEmail(email, mdp);
      });
    },
    signout: function () {
      return SS.auth.csrf().then(function (csrfToken) {
        return fetch("/api/auth/signout", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Auth-Return-Redirect": "1",
          },
          body: form({ csrfToken: csrfToken }),
        });
      }).then(function () { purgerMoi(); });
    },
  };

  /* ── SS.shelf : étagère locale (ss-shelf) + sync serveur ────────────────── */
  // ShelfItem = { nom, marque?, image?, categorie?, formule?, perso?, ajoute }
  function lireShelf() {
    var items = lireJSON(localStorage, "ss-shelf", null);
    if (items === null) {
      // migration depuis l'ancienne liste de noms ss-ma-routine (proto V1).
      // On NE supprime PAS l'ancienne clé : les 5 pages existantes l'écrivent
      // encore (leur mise à jour est un autre lot).
      var vieux = lireJSON(localStorage, "ss-ma-routine", []);
      items = [];
      for (var i = 0; i < vieux.length; i++) {
        if (typeof vieux[i] === "string" && vieux[i]) {
          items.push({ nom: vieux[i], ajoute: new Date().toISOString() });
        }
      }
      ecrireJSON(localStorage, "ss-shelf", items);
    }
    return items;
  }
  function ecrireShelf(items) { ecrireJSON(localStorage, "ss-shelf", items); }
  function trouverParNom(items, nom) {
    for (var i = 0; i < items.length; i++) {
      if ((items[i].nom || "").toLowerCase() === (nom || "").toLowerCase()) return i;
    }
    return -1;
  }
  function trouverParCategorie(items, cat) {
    if (!cat) return -1;
    for (var i = 0; i < items.length; i++) {
      if ((items[i].categorie || "").toLowerCase() === cat.toLowerCase()) return i;
    }
    return -1;
  }

  SS.shelf = {
    liste: function () { return lireShelf(); },

    // GET puis PUT /api/shelf si connecté. Fusion : union par nom, le LOCAL
    // gagne sur conflit. Tolérant : toute erreur résout sur la liste locale.
    sync: function () {
      return SS.moi().then(function (m) {
        if (!m.connecte) return lireShelf();
        return fetch("/api/shelf", { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error("shelf_" + r.status); return r.json(); })
          .then(function (d) {
            var serveur = (d && d.items) || [];
            var local = lireShelf();
            var fusion = [];
            var i;
            for (i = 0; i < serveur.length; i++) {
              if (trouverParNom(local, serveur[i].nom) < 0) fusion.push(serveur[i]);
            }
            for (i = 0; i < local.length; i++) fusion.push(local[i]);
            ecrireShelf(fusion);
            return fetch("/api/shelf", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: fusion }),
            }).catch(function () {}).then(function () { return fusion; });
          })
          .catch(function () { return lireShelf(); });
      });
    },

    // Ajout guidé : slot de catégorie libre → ajout direct + toast ;
    // occupé → modal de comparaison (maquette AddRoutine).
    addFlow: function (produit) {
      if (!produit || !produit.nom) return;
      var items = lireShelf();
      if (trouverParNom(items, produit.nom) >= 0) {
        toast("Already on your shelf");
        return;
      }
      var idx = trouverParCategorie(items, produit.categorie);
      if (idx < 0) {
        ajouterAuShelf(produit);
        toast("Added to your shelf");
        apresAjout();
        return;
      }
      SS.moi().then(function (m) { modalRemplacer(items[idx], produit, m.premium); });
    },
  };

  function ajouterAuShelf(produit, remplaceIdx) {
    var items = lireShelf();
    var item = {
      nom: produit.nom,
      marque: produit.marque || undefined,
      image: produit.image || undefined,
      categorie: produit.categorie || undefined,
      formule: typeof produit.formule === "number" ? produit.formule : null,
      perso: typeof produit.perso === "number" ? produit.perso : null,
      ajoute: new Date().toISOString(),
    };
    if (typeof remplaceIdx === "number" && remplaceIdx >= 0 && remplaceIdx < items.length) {
      items[remplaceIdx] = item;
    } else {
      items.push(item);
    }
    ecrireShelf(items);
  }

  // Après TOUT ajout : ss-nb-produits++ ; à 2 ou 3 produits, déconnecté et
  // jamais proposé → modal SaveShelf ; connecté → sync silencieuse.
  function apresAjout() {
    var nb = 0;
    try { nb = parseInt(localStorage.getItem("ss-nb-produits") || "0", 10) || 0; } catch (e) {}
    nb += 1;
    try { localStorage.setItem("ss-nb-produits", String(nb)); } catch (e) {}
    SS.moi().then(function (m) {
      if (m.connecte) { SS.shelf.sync(); return; }
      var propose = null;
      try { propose = localStorage.getItem("ss-compte-propose"); } catch (e) {}
      if ((nb === 2 || nb === 3) && propose !== "1") modalSaveShelf(nb);
    });
  }

  /* ── modal AddRoutine : le slot est occupé, comparer et décider ─────────── */
  function carteSwap(item, tagHtml, score, scoreLabel) {
    var img = item.image
      ? '<img src="' + esc(item.image) + '" alt="">'
      : "";
    var scoreHtml = typeof score === "number"
      ? '<div class="alt-score"><b class="' + teinte(score) + '">' + score + '</b><span>' + esc(scoreLabel) + "</span></div>"
      : "";
    return (
      img +
      "<div>" + tagHtml +
      '<p class="alt-name"' + (tagHtml ? ' style="margin-top:3px"' : "") + ">" + esc(item.nom) + "</p></div>" +
      scoreHtml
    );
  }
  function modalRemplacer(actuel, nouveau, premium) {
    var champ = premium ? "perso" : "formule";
    var label = premium ? "for you" : "formula";
    var sActuel = typeof actuel[champ] === "number" ? actuel[champ] : null;
    var sNouveau = typeof nouveau[champ] === "number" ? nouveau[champ] : null;
    // recommandation = meilleur score (perso si premium, sinon formule) ;
    // sans les deux scores, on ne tranche pas (pas de bandeau, garder = défaut).
    var remplacer = sActuel !== null && sNouveau !== null && sNouveau > sActuel;
    var verdict = "";
    if (sActuel !== null && sNouveau !== null && sNouveau !== sActuel) {
      var ecart = Math.abs(sNouveau - sActuel);
      verdict =
        '<div class="swap-verdict">' +
        '<span class="rt-ic good"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5"></path></svg></span>' +
        "<p>" + (remplacer
          ? "<b>The new scan fits you better.</b> " + esc(nouveau.nom) + " scores " + ecart + " points higher — we would swap it in."
          : "<b>Your current pick fits you better.</b> " + esc(actuel.nom) + " scores " + ecart + " points higher — we would keep it.") +
        "</p></div>";
    }
    var tag =
      '<span class="swap-tag"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.3l2.3 2.3 4.7-5"></path></svg> In your routine</span>';
    var btnGarder = '<button type="button" class="' + (remplacer ? "cta-ghost" : "cta-btn") + '" data-ss="garder"' + (remplacer ? "" : ' style="margin-top:16px; height:50px;"') + (remplacer ? ' style="height:50px;"' : "") + ">Keep " + esc(actuel.nom) + "</button>";
    var btnRemplacer = '<button type="button" class="' + (remplacer ? "cta-btn" : "cta-ghost") + '" data-ss="remplacer"' + (remplacer ? ' style="margin-top:16px; height:50px;"' : ' style="height:50px;"') + ">Replace with " + esc(nouveau.nom) + (remplacer ? "" : " anyway") + "</button>";
    var html =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<span class="sec-kicker">' + esc(nouveau.categorie || "Your shelf") + " &middot; this slot</span>" +
      '<p class="modal-h">Add to your routine?</p>' +
      '<p class="modal-sub">This slot is already filled &mdash; here is how they compare ' +
      (premium ? "<b style=\"color:var(--arsenic)\">for your skin</b>." : "on formula.") + "</p>" +
      '<div style="display:flex; flex-direction:column; margin-top:16px;">' +
      '<div class="swap-card now">' + carteSwap(actuel, tag, sActuel, label) + "</div>" +
      '<div class="swap-vs">versus the scan</div>' +
      '<div class="swap-card">' + carteSwap(nouveau, "", sNouveau, label) + "</div>" +
      "</div>" + verdict +
      (remplacer ? btnRemplacer + btnGarder : btnGarder + btnRemplacer) +
      '<p class="cta-sub" data-ss="annuler" style="margin-top:12px;">Cancel</p>' +
      "</div>";
    var sc = ouvrirScrim(html, function () { fermerScrim(sc); });
    sc.querySelector('[data-ss="annuler"]').addEventListener("click", function () { fermerScrim(sc); });
    sc.querySelector('[data-ss="garder"]').addEventListener("click", function () { fermerScrim(sc); });
    sc.querySelector('[data-ss="remplacer"]').addEventListener("click", function () {
      var items = lireShelf();
      var idx = trouverParNom(items, actuel.nom);
      ajouterAuShelf(nouveau, idx);
      fermerScrim(sc);
      toast("Swapped on your shelf");
      apresAjout();
    });
  }

  /* ── modal SaveShelf : proposer le compte (Apple seulement, PAS de Google) ── */
  var APPLE_SVG =
    '<svg viewBox="7 0 17 44" fill="currentColor" aria-hidden="true"><path d="M15.7099491,14.8846154 C16.5675461,14.8846154 17.642562,14.3048315 18.28274,13.5317864 C18.8625238,12.8312142 19.2852829,11.852829 19.2852829,10.8744437 C19.2852829,10.7415766 19.2732041,10.6087095 19.2490464,10.5 C18.2948188,10.5362365 17.1473299,11.140178 16.4588366,11.9494596 C15.9152893,12.56548 15.4200572,13.5317864 15.4200572,14.5222505 C15.4200572,14.6671964 15.4442149,14.8121424 15.4562937,14.8604577 C15.5166879,14.8725366 15.6133185,14.8846154 15.7099491,14.8846154 Z M12.6902416,29.5 C13.8618881,29.5 14.3812778,28.714876 15.8428163,28.714876 C17.3285124,28.714876 17.6546408,29.4758423 18.9591545,29.4758423 C20.2395105,29.4758423 21.0971074,28.292117 21.9063891,27.1325493 C22.8123013,25.8038779 23.1867451,24.4993643 23.2109027,24.4389701 C23.1263509,24.4148125 20.6743484,23.4122695 20.6743484,20.5979021 C20.6743484,18.1579784 22.6069612,17.0588048 22.7156707,16.974253 C21.4353147,15.1382708 19.490623,15.0899555 18.9591545,15.0899555 C17.5217737,15.0899555 16.3501271,15.9596313 15.6133185,15.9596313 C14.8161157,15.9596313 13.7652575,15.1382708 12.521138,15.1382708 C10.1536872,15.1382708 7.75,17.0950413 7.75,20.7911634 C7.75,23.0861411 8.64383344,25.513986 9.74300699,27.0842339 C10.6851558,28.4129053 11.5065162,29.5 12.6902416,29.5 Z"></path></svg>';
  function modalSaveShelf(nb) {
    var html =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<span class="sec-kicker">Just added &middot; ' + nb + " products</span>" +
      '<h2 class="modal-h" style="margin-top:7px;">Save your shelf</h2>' +
      '<p class="modal-sub" style="margin-top:7px; font-size:13px;">Your products live on this phone only. Two taps keeps them safe &mdash; on any phone, for good.</p>' +
      '<button type="button" class="auth-apple" data-ss="apple"><span class="apple-slot">' + APPLE_SVG + "</span>Sign in with Apple</button>" +
      '<p class="modal-note" style="margin-top:12px;">No spam &mdash; your shelf, backed up. That\'s it.</p>' +
      '<a href="#" class="cta-sub" data-ss="plustard" style="margin-top:4px;">Not now</a>' +
      "</div>";
    var sc = ouvrirScrim(html, function () { fermerScrim(sc); });
    sc.querySelector('[data-ss="apple"]').addEventListener("click", function () {
      location.href = "15-compte.html?next=" + encodeURIComponent(pageCourante());
    });
    sc.querySelector('[data-ss="plustard"]').addEventListener("click", function (e) {
      e.preventDefault();
      try { localStorage.setItem("ss-compte-propose", "1"); } catch (err) {}
      fermerScrim(sc);
    });
  }

  /* ── SS.historique : derniers scans (ss-historique, cap 50) ─────────────── */
  SS.historique = {
    // entree = {nom, marque, image, categorie, formule, perso, date?}
    // tête de liste, dédoublonné par nom (on garde le plus récent), cap 50.
    ajouter: function (entree) {
      if (!entree || !entree.nom) return;
      var l = lireJSON(localStorage, "ss-historique", []);
      var garde = [];
      for (var i = 0; i < l.length; i++) {
        if ((l[i].nom || "").toLowerCase() !== entree.nom.toLowerCase()) garde.push(l[i]);
      }
      garde.unshift({
        nom: entree.nom,
        marque: entree.marque || undefined,
        image: entree.image || undefined,
        categorie: entree.categorie || undefined,
        formule: typeof entree.formule === "number" ? entree.formule : null,
        perso: typeof entree.perso === "number" ? entree.perso : null,
        date: entree.date || new Date().toISOString(),
      });
      if (garde.length > 50) garde.length = 50;
      ecrireJSON(localStorage, "ss-historique", garde);
    },
    liste: function () { return lireJSON(localStorage, "ss-historique", []); },
  };

  /* ── SS.tabbar : pilule de navigation (Home · Scan · Historique) ────────── */
  var SVG_HOME = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.4 10 3l6.5 5.4V16a1.2 1.2 0 0 1-1.2 1.2h-3V12.5h-4.6v4.7h-3A1.2 1.2 0 0 1 3.5 16z"></path></svg>';
  var SVG_SCAN = '<svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6V3.6A1.6 1.6 0 0 1 3.6 2H6M12 2h2.4A1.6 1.6 0 0 1 16 3.6V6M16 12v2.4a1.6 1.6 0 0 1-1.6 1.6H12M6 16H3.6A1.6 1.6 0 0 1 2 14.4V12"></path></svg>';
  var SVG_HISTO = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5.6V10l3 1.8"></path><path d="M3.2 8.4a7 7 0 1 1-.4 3.4"></path><path d="M3 7.5V4.6M3.2 8.4l2.8-.7"></path></svg>';
  SS.tabbar = function (actif) {
    var bar = document.createElement("div");
    bar.className = "tabbar";
    bar.setAttribute("role", "navigation");
    bar.innerHTML =
      '<a class="tb-item' + (actif === "home" ? " active" : "") + '" href="11-dashboard.html" aria-label="Home" data-ss="home">' + SVG_HOME + "</a>" +
      '<a class="tb-scan" href="01-scan.html">' + SVG_SCAN + " Scan</a>" +
      '<a class="tb-item' + (actif === "histo" ? " active" : "") + '" href="13-historique.html" aria-label="History" data-ss="histo">' + SVG_HISTO + "</a>";
    // Home et Historique dépendent du statut premium → résolus au clic (SS.moi
    // est en cache 60 s, la latence est nulle en pratique).
    function brancher(sel, pagePremium, pageFree) {
      bar.querySelector(sel).addEventListener("click", function (e) {
        e.preventDefault();
        SS.moi().then(function (m) {
          location.href = m.premium ? pagePremium : pageFree;
        });
      });
    }
    brancher('[data-ss="home"]', "11-dashboard.html", "12-dashboard-free.html");
    brancher('[data-ss="histo"]', "13-historique.html", "14-historique-free.html");
    document.body.appendChild(bar);
    document.body.className += (document.body.className ? " " : "") + "has-tabbar";
  };

  window.SS = SS;
})();
