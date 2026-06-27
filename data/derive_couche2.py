#!/usr/bin/env python3
"""Dérive la couche 2 (classification) depuis data/catalog-couche1.json + products-raw.json.
Sortie : data/catalog-couche1-2.json (code) + data/catalog-full.csv (lisible).
Règles : actif curé -> targets(16 ConcernIds)/coûts/sécurité (alignés actives.ts).
INCI -> fragranceFree/alcoholFree ; descriptions -> fragranceFree de secours.
Relancer après tout changement de catalog-couche1.json : python3 data/derive_couche2.py
"""
import json, csv, os
HERE=os.path.dirname(os.path.abspath(__file__))
c1=json.load(open(os.path.join(HERE,'catalog-couche1.json')))
raw={r['asin']:r for r in json.load(open(os.path.join(HERE,'products-raw.json'))) if isinstance(r,dict) and r.get('asin')}

A = {
 "niacinamide":dict(t=["shine","pores","tone_evenness","redness"],cost=0,st=2,ev=4),"céramide":dict(t=["flaking","redness"],cost=0,st=1,ev=4),"ceramide":dict(t=["flaking","redness"],cost=0,st=1,ev=4),
 "squalane":dict(t=["flaking"],cost=0,st=1,ev=3),"hyaluron":dict(t=["flaking","fine_lines"],cost=0,st=1,ev=4),"ha":dict(t=["flaking","fine_lines"],cost=0,st=1,ev=4),
 "pro-vit b5":dict(t=["flaking","redness"],cost=0,st=1,ev=3),"panthénol":dict(t=["redness","flaking"],cost=0,st=1,ev=3),"madécasso":dict(t=["redness","flaking"],cost=0,st=1,ev=3),
 "centella":dict(t=["redness","flaking"],cost=0,st=1,ev=3),"avoine":dict(t=["redness","flaking"],cost=0,st=1,ev=3),"colloïdale":dict(t=["redness","flaking"],cost=0,st=1,ev=3),
 "calendula":dict(t=["redness","flaking"],cost=0,st=1,ev=2),"doux":dict(t=["redness","flaking"],cost=0,st=1,ev=3),"sans parfum":dict(t=["redness","flaking"],cost=0,st=1,ev=3),
 "barrière":dict(t=["flaking","redness"],cost=0,st=1,ev=3),"postbiotique":dict(t=["redness","flaking"],cost=0,st=1,ev=3),
 "salicylique":dict(t=["acne","comedones","pores","shine"],cost=2,st=3,ev=5,preg=1,sens=1),"bha":dict(t=["acne","comedones","pores","shine"],cost=2,st=3,ev=5,preg=1,sens=1),
 "lha":dict(t=["acne","comedones","pores"],cost=2,st=3,ev=4,sens=1),"glycolique":dict(t=["texture","radiance","tone_evenness","fine_lines"],cost=3,st=3,ev=4,sens=1),
 "lactique":dict(t=["texture","radiance","flaking","tone_evenness"],cost=2,st=2,ev=4,sens=1),"mandélique":dict(t=["texture","tone_evenness","acne","post_acne_marks"],cost=2,st=2,ev=3),
 "aha":dict(t=["texture","radiance","tone_evenness"],cost=3,st=3,ev=4,sens=1),"enzymat":dict(t=["texture","radiance"],cost=1,st=2,ev=3),"peeling":dict(t=["texture","radiance","tone_evenness"],cost=4,st=4,ev=4,sens=1),"gommage":dict(t=["texture","radiance"],cost=1,st=2,ev=2,sens=1),"pha":dict(t=["texture","radiance","tone_evenness"],cost=1,st=2,ev=3),
 "rétin":dict(t=["fine_lines","wrinkles","texture","acne","pores","tone_evenness"],cost=4,st=4,ev=5,preg=1,sens=1),"adapal":dict(t=["acne","comedones","texture"],cost=4,st=4,ev=5,preg=1,sens=1),
 "vit c":dict(t=["radiance","dark_spots","tone_evenness","fine_lines"],cost=1,st=3,ev=4,sens=1),"azéla":dict(t=["acne","redness","dark_spots","post_acne_marks","tone_evenness"],cost=1,st=3,ev=4),
 "peroxyde":dict(t=["acne"],cost=3,st=4,ev=5,sens=1),"tranexam":dict(t=["dark_spots","tone_evenness","post_acne_marks"],cost=1,st=3,ev=3),"kojique":dict(t=["dark_spots","tone_evenness"],cost=1,st=2,ev=3),
 "arbut":dict(t=["dark_spots","tone_evenness"],cost=0,st=2,ev=3),"brightenyl":dict(t=["dark_spots","tone_evenness"],cost=0,st=2,ev=2),"peptide":dict(t=["fine_lines","wrinkles"],cost=0,st=2,ev=3),
 "caféine":dict(t=["under_eye_puffiness","under_eye_circles"],cost=0,st=1,ev=2),"vitamine k":dict(t=["under_eye_circles","tone_evenness"],cost=0,st=2,ev=2),"zinc":dict(t=["acne","shine"],cost=1,st=2,ev=3),"cuivre":dict(t=["acne","shine"],cost=1,st=2,ev=2),
 "argile":dict(t=["pores","shine","comedones"],cost=1,st=2,ev=3,sens=1),"bentonite":dict(t=["pores","shine","comedones"],cost=1,st=2,ev=3,sens=1),"charbon":dict(t=["pores","shine"],cost=1,st=2,ev=2,sens=1),
 "volcani":dict(t=["pores","shine","comedones"],cost=1,st=2,ev=2,sens=1),"soufre":dict(t=["acne","shine"],cost=2,st=3,ev=3,sens=1),"calamine":dict(t=["acne","redness"],cost=1,st=2,ev=2),
 "hydrocoll":dict(t=["acne"],cost=0,st=1,ev=3),"microneedle":dict(t=["acne"],cost=1,st=2,ev=2),"matcha":dict(t=["redness","shine"],cost=0,st=1,ev=2),
 "antioxyd":dict(t=["radiance","tone_evenness"],cost=0,st=2,ev=3),"propolis":dict(t=["acne","radiance"],cost=0,st=2,ev=2),"botaniques":dict(t=["radiance","flaking"],cost=0,st=1,ev=2),
 "baume":dict(t=["flaking"],cost=0,st=1,ev=3),"huile":dict(t=["flaking"],cost=0,st=1,ev=3),"micellaire":dict(t=["flaking"],cost=0,st=1,ev=3),"hydratant":dict(t=["flaking"],cost=0,st=1,ev=3),
 "avocat":dict(t=["flaking"],cost=0,st=1,ev=3),"algue":dict(t=["flaking","under_eye_puffiness"],cost=0,st=1,ev=2),
}
CAT={"Nettoyant":("nettoyant","both",True),"Hydratant / Crème":("hydratant","both",False),"SPF":("spf","am",False),
 "Démaquillant":("démaquillant","pm",True),"Exfoliant — BHA / AHA / mécanique":("exfoliant","pm",False),"Sérum":("serum","both",False),
 "Traitement":("traitement","pm",False),"Masque":("masque","pm",False),"Contour des yeux":("contour_yeux","both",False),"Soin ciblé / Spot":("soin_cible","pm",False)}
CLEAN={"shine","pores","comedones","redness","flaking","acne"}
FF_POS=['fragrance-free','fragrance free','unscented','no fragrance','without fragrance','sans parfum','no added fragrance','no synthetic fragrance','free of fragrance']
def skintypes(tg):
    s=set()
    if {"shine","pores","acne","comedones"}&set(tg): s|={"grasse","mixte"}
    if "flaking" in tg: s|={"seche","normale"}
    if "redness" in tg: s|={"sensible"}
    if {"fine_lines","wrinkles","dark_spots"}&set(tg): s|={"normale","mixte","seche"}
    return sorted(s) or ["tous"]

out=[]
for r in c1:
    actif=(r.get('actif') or '').lower(); ing=(r.get('ingredients') or '').lower()
    cat=r['cat']; typ,moment,rinse=CAT.get(cat,("autre","both",False))
    moment=r.get('moment') or moment  # respecter un moment explicite (ex. crèmes de nuit -> pm)
    tg=set();cost=0;st=1;ev=3;preg=False;sens=False
    for kw,at in A.items():
        if kw in actif:
            tg|=set(at["t"]);cost=max(cost,at["cost"]);st=max(st,at["st"]);ev=max(ev,at["ev"]);preg=preg or bool(at.get("preg"));sens=sens or bool(at.get("sens"))
    if cat=="SPF": preg=False; tg|={"tone_evenness"}; cost=min(cost,1)
    if rinse: tg={x for x in tg if x in CLEAN}; cost=max(0,cost-1); sens=sens and st>=3
    if rinse and not tg: tg={"shine","pores"}  # nettoyant sans cible -> bénéfice de base : dégraisser/désincruster
    rr=raw.get(r['asin'],{})
    desc=(str(rr.get('description') or '')+' '+str(rr.get('features') or '')+' '+str(rr.get('product_description') or '')+' '+(r.get('name') or '')).lower()
    if ing: ff=("parfum" not in ing and "fragrance" not in ing)
    elif any(k in desc for k in FF_POS): ff=True
    else: ff=None
    af=("alcohol denat" not in ing and "alcohol," not in ing) if ing else None
    freq="daily" if cat in("Nettoyant","Hydratant / Crème","SPF","Démaquillant","Contour des yeux") else("1-2x/sem" if cat=="Masque" else("3x/sem" if cost<=2 else "1-2x/sem"))
    out.append(dict(num=r['num'],asin=r['asin'],name=r['name'],brand=r.get('brand'),category=typ,price=r.get('price'),
        rating=r.get('rating'),reviews=r.get('reviews'),bsr=r.get('bsr'),bought=r.get('bought'),keyActives=r['actif'],
        targets=sorted(tg),skinTypes=skintypes(tg),moment=moment,frequency=freq,unsafePregnancy=preg,unsafeSensitive=sens,
        irritationCost=cost,activeStrength=st,evidenceLevel=ev,fragranceFree=ff,alcoholFree=af,image=r.get('image'),ingredients=r.get('ingredients'),
        night=bool(r.get('night')),texture=r.get('texture'),
        size_value=r.get('size_value'),size_unit=r.get('size_unit'),size_ml=r.get('size_ml'),image_amazon=r.get('image_amazon')))

json.dump(out,open(os.path.join(HERE,'catalog-couche1-2.json'),'w'),ensure_ascii=False)
with open(os.path.join(HERE,'catalog-full.csv'),'w',newline='',encoding='utf-8') as f:
    w=csv.writer(f)
    w.writerow(["#","Produit","Catégorie","Prix","Note","Avis","BSR","Actifs","Cibles","Types de peau","Moment","Fréquence","Grossesse","Sensible","Irritation","Force","Preuve","Sans parfum","Image"])
    for r in sorted(out,key=lambda x:x['num']):
        w.writerow([r['num'],r['name'],r['category'],r.get('price'),r.get('rating'),r.get('reviews'),r.get('bsr'),r['keyActives'],
            ", ".join(r['targets']),", ".join(r['skinTypes']),r['moment'],r['frequency'],"⛔ non" if r['unsafePregnancy'] else "ok",
            "⚠ non" if r['unsafeSensitive'] else "ok",r['irritationCost'],r['activeStrength'],r['evidenceLevel'],
            {True:"oui",False:"non",None:"?"}[r['fragranceFree']],r.get('image') or ""])
ffk=sum(1 for r in out if r['fragranceFree'] is not None)
print(f"OK — {len(out)} produits | preg⛔:{sum(r['unsafePregnancy'] for r in out)} sens⚠:{sum(r['unsafeSensitive'] for r in out)} | fragranceFree connu:{ffk}/{len(out)}")
