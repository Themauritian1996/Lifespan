# LIFESPAN — Fiche maîtresse

> Document de référence du projet. Toute modification du modèle, de l'interface ou des données
> doit respecter ces règles. En cas de doute : **ce fichier fait foi**, puis la matrice source
> (`matrice-simulateur-habitudes-vie-outcomes.pdf`), puis le code.

---

## 1. Mission

Lifespan est un simulateur public et gratuit qui montre à une personne comment ses habitudes
et paramètres de santé actuels se traduisent en outcomes de vie (espérance de vie, années en
bonne santé, risques, bonheur, stress), et **ce qui changerait si elle modifiait une variable**.
Le but est d'encourager le changement, sans culpabiliser ni faire de promesse médicale.

Trois temps, toujours présents :

| Temps | Question | Où |
|---|---|---|
| **Actuel** | Où j'en suis aujourd'hui ? | Maintenant |
| **Progrès** | Qu'est-ce que j'ai gagné depuis le début ? | Temps → historique |
| **Projection** | Qu'est-ce que je gagne si j'atteins mes objectifs ? | Simuler, Temps → projection |

---

## 2. Règles non négociables

1. **Science d'abord.** Chaque effet chiffré est rattaché à au moins une référence (`sources.js`)
   et à un grade de preuve (A, B, C). Aucune variable sans source.
2. **Transparence.** Toutes les formules sont visibles dans l'onglet Science. Une attribution de
   source non vérifiée est marquée `verify: true` et affichée avec ⚠.
3. **Associations, pas causalités.** Le texte dit « associé à », « d'après les cohortes ». Jamais
   « vous mourrez à X ans ». On affiche toujours une fourchette.
4. **Pas un dispositif médical.** Avertissement visible sur l'écran principal et dans Science.
5. **Données locales.** Aucune donnée ne quitte l'appareil (localStorage). Pas de serveur, pas de
   traceur, pas de cookie tiers. Export/import JSON manuel.
6. **Encourager, pas effrayer.** On met en avant les gains possibles (leviers) avant les risques.
   Les couleurs d'alerte restent rares.
7. **Une seule source de vérité pour les variables** : le tableau `VARS` de `model.js` alimente le
   formulaire de profil, le simulateur, les objectifs et le catalogue scientifique.

---

## 3. Modèle — pipeline de calcul

```
profil ─► log-HR par variable ─► domaines (combinaison + rétrécissement)
       ─► somme × k global ─► plafond doux ─► relatif à la population (archétypes)
       ─► × atténuation par l'âge ─► hazard individuel = h0(x) · exp(R(x))
       ─► table de survie ─► EV, EVBS, mortalité 10 ans, âge de risque
```

### 3.1 Mortalité de base
- Gompertz-Makeham par sexe : `h0(x) = A + B·e^(b·x)`.
- `b` fixé (H 0,088 ; F 0,098), `A` fixé (H 3e-4 ; F 1,5e-4), `B` résolu par bissection pour
  retrouver l'espérance de vie à la naissance du pays choisi.
- Pays : France (INSEE 2025 : H 80,3 / F 85,9), Belgique, Suisse, Canada, Québec, Royaume-Uni,
  États-Unis. Les valeurs hors France sont des approximations récentes (marquées dans le code).

### 3.2 Effets individuels
- Chaque variable renvoie un **log-HR** par outcome : `m` (mortalité toutes causes), `cvd`,
  `t2d`, `dem` (démence), `can` (cancer), `dep` (dépression).
- Courbes **non linéaires** (règle 0 de la matrice) : interpolation log-linéaire par morceaux
  entre des points tirés des méta-analyses (`curve(points, v)`), jamais un seul terme linéaire.
- Hors des bornes des données : valeur plate (pas d'extrapolation).

### 3.3 Combinaison et anti-double comptage
- Base : **additif sur l'échelle log-HR** (= produit des HR), comme dans la matrice.
- Recouvrements gérés **par domaine** :
  - Aérobie : `fort + 0,4 × faible` entre AP modérée-vigoureuse et pas/jour (le plus protecteur
    compte en entier). Si VO2max connue : `fort + 0,3 × faible` entre forme et activité.
  - Pas/jour : log-HR × 0,85 (causalité inverse, fragilité).
  - Force : `fort + 0,3 × faible` entre musculation et force de préhension.
  - Sédentarité : atténuée par la MVPA (−60 % à 35 min/j, −90 % à 70 min/j ; Ekelund 2016).
  - Activité (domaine) × 0,85 si aérobie et force sont toutes deux protectrices.
  - Nutrition : somme × 0,6, bornée à [−0,45 ; +0,45].
  - Psychosocial : somme × 0,6 (fortes corrélations entre stress, dépression, solitude…).
  - Contexte (éducation, revenu) : somme × 0,7.
- **Médiation IMC** : le coefficient de l'IMC (et du tour de taille) est réduit jusqu'à 50 % selon
  le nombre de biomarqueurs connus parmi PAS, LDL, HbA1c (46–76 % du surrisque IMC passe par eux).
- **Globale** : chaque domaine × `k` (général 0,70 ; substances 0,92 ; corps 0,85), somme, puis plafond doux
  `C·tanh(L/C)` avec `C = 2,3`. Les substances (tabac surtout) sont peu rétrécies : c'est le facteur le plus
  robuste (HR quasi constants 25–79 ans, Jha 2013).

### 3.4 Relatif à la population
La mortalité nationale inclut déjà la distribution des facteurs de risque. On compare donc
l'individu à un **mélange d'archétypes** (sain 25 %, moyen 52 %, fumeur moyen 18 %, à risque 5 %) :
`Lpop(x) = ln Σ wᵢ(x)·exp(Lᵢ(x))`, avec **sélection par la survie** : `wᵢ(x) ∝ wᵢ·exp(−(e^(Lᵢ−L̄) − 1)·H₀(30→x))`
(les profils à risque sont moins nombreux aux âges avancés). Les variables que l'utilisateur ne connaît pas (biomarqueurs) sont
neutralisées **des deux côtés** (même masque de variables connues).
Test de contrôle : le profil « moyen » doit retrouver ±1 an l'EV nationale.

### 3.5 Âge
- Atténuation des HR avec l'âge (matrice §0) :
  - IMC, clinique : 1 jusqu'à 55 ans → 0,5 à 85 ans.
  - Substances : 1 jusqu'à 60 ans → 0,9 à 90 ans.
  - Autres : 1 jusqu'à 60 ans → 0,75 à 90 ans.
- Nadir IMC : 22 (≤ 50 ans) → 24 (≥ 70 ans).
- Éducation : −2,9 %/année < 50 ans, −1,9 % 50–69, −0,8 % ≥ 70 (Balaj 2024).
- Tabac arrêté : l'excès de risque décroît avec le temps depuis l'arrêt, et la part résiduelle
  dépend de l'âge d'arrêt (Jha 2013) — recalculé à chaque âge futur.

### 3.6 Sorties
| Sortie | Méthode |
|---|---|
| Espérance de vie (EV) | ∫ S(x) dx, pas de 0,25 an jusqu'à 115 ans ; log-HR évalué tous les 2,5 ans puis interpolé |
| Fourchette | R(x) × 0,6 et × 1,4 |
| EV en bonne santé (EVBS) | Sullivan : prévalence d'incapacité logistique π(x + Δ), calibrée sur HALE OMS (France 2021 : H 71,3 / F 74,4) ; Δ = âge de risque morbidité |
| Mortalité à 10 ans | 1 − S(a+10)/S(a) |
| Âge de risque | a + R(a)/b |
| Risques par maladie (10 ans) | incidence moyenne âge/sexe (ordre de grandeur) → `1 − (1−p₀)^RR` |
| Bonheur (0–100) | modèle de satisfaction de vie 0–10 (grade C, indicatif) |
| Stress (0–100) | stress perçu + effets documentés (activité, sommeil, méditation, liens) |
| Score Lifespan | EV restante actuelle / EV restante avec tous les leviers optimisés |

### 3.7 Projections dans le temps
- Chaque objectif = valeur cible + échéance. La valeur suit une rampe linéaire jusqu'à l'échéance.
- L'effet biologique suit la valeur avec un délai exponentiel `τ` (activité 0,5 an, sommeil 0,25,
  alcool 1, nutrition 1,5, clinique 0,5, psychosocial 0,5, contexte 1). Le tabac utilise son
  propre modèle de décroissance.
- Scénario **Maintien** = mêmes valeurs, l'âge avance. Scénario **Objectif** = rampes + délais.
- Historique = instantanés datés du profil (un par jour max), recalculés à l'âge de l'époque.

---

## 4. Benchmarks de calibration (tests/calibrate.mjs)

Le modèle doit rester dans ces zones (tolérance indiquée). Lancer `node tests/calibrate.mjs`
après **toute** modification de coefficient.

| # | Cas | Cible publiée | Tolérance |
|---|---|---|---|
| B1 | Profil moyen FR | EV nationale | ±1,5 an |
| B2 | 5 facteurs sains vs 0, à 50 ans (Li 2018) | +12,2 H / +14,0 F | ±3 ans |
| B3 | 8 facteurs vs 0, à 40 ans (Nguyen 2024) | +24 H / +20,5 F | ±5 ans |
| B4 | Fumeur continu vs jamais (Jha 2013) | ≥ 10 ans perdus | 8–13 |
| B5 | MVPA 150–300 vs 0 (Moore 2012) | +3,4 ans | ±1,5 |
| B6 | Alcool > 350 g/sem à 40 ans (Wood 2018) | −4 à −5 ans | ±1,5 |
| B7 | IMC 35 vs 23 à 40 ans (Peeters 2003) | −3 à −7 ans | dans la zone |
| B8 | Arrêt du tabac à 35 ans (Jha 2013) | ~ +9–10 ans | ±2,5 |

---

## 5. Grades de preuve

| Grade | Définition | Usage |
|---|---|---|
| **A** | Méta-analyses d'ECR ou de grandes cohortes concordantes, relation dose-réponse robuste, soutien causal (ECR, randomisation mendélienne) | Tabac, PAS, LDL, AP, IMC, alcool (seuil) |
| **B** | Méta-analyses de cohortes cohérentes, causalité plausible, confusion possible | Sommeil, pas, sédentarité, nutrition, solitude, dépression, PM2,5, éducation |
| **C** | Cohortes isolées, forte confusion ou causalité inverse, ou hypothèse de modélisation | Drogues (SMR), optimisme, café, bonheur, stress, EVBS |

---

## 6. Design system

**Direction** : instrument de mesure futuriste. Références : interface Nothing (matrice de points,
widgets ronds et carrés, rouge signal parcimonieux), sobriété Tesla (lignes fines, beaucoup de
noir, chiffres grands et calmes).

### Couleurs (tokens CSS)
| Token | Sombre (défaut) | Clair | Rôle |
|---|---|---|---|
| `--bg` | `#0A0A0B` | `#E9E9E6` | fond |
| `--surface` | `#141415` | `#FAFAF8` | widgets |
| `--surface-2` | `#1D1D1F` | `#F0F0EC` | contrôles |
| `--line` | `#2A2A2D` | `#D6D6D1` | filets |
| `--text` | `#F3F3F0` | `#0C0C0D` | texte |
| `--muted` | `#8C8C92` | `#66666B` | texte secondaire |
| `--accent` | `#FF3B30` rouge signal (au choix : ambre, menthe, glace, blanc) | idem, un peu plus sombre | objectif, action principale, point « live » |
| `--good` / `--warn` / `--bad` | menthe / ambre / corail | versions foncées | états de risque, toujours avec libellé |

### Typographie
- **Geist fin (200–350)** : grands chiffres, chasse serrée (−0,035 à −0,05 em), chiffres tabulaires. Style instrument / Tesla.
- **Michroma** : mot-marque « LIFESPAN » uniquement (large, espacé).
- **Geist** : texte courant, 15 px mobile / 15–16 px desktop.
- **Geist Mono** : étiquettes, unités, données, en capitales espacées (0,08em).
- Échelle : 11 / 13 / 15 / 18 / 24 / 36 / 56 / 88.

### Formes
- Widgets : rayon 28 px (carrés), 999 px (pilules et ronds). Pas d'ombre, filet 1 px.
- Grille de widgets en 12 colonnes desktop, 2 colonnes mobile.
- Séries de graphiques : Historique = trait plein texte + points ; Maintien = pointillé gris ;
  Objectif = accent. Légende toujours présente + étiquettes directes.

### Navigation
- Mobile : barre du bas à 5 onglets (Maintenant, Simuler, Temps, Quêtes, Science), avatar-profil en haut.
- Desktop (≥ 960 px) : rail latéral gauche avec les mêmes 5 entrées.
- Deep links : `#now`, `#sim`, `#time`, `#quests`, `#science`, `#profile`.

---

## 6 bis. Avatar

Nuage de points 3D en rotation lente (glisser pour tourner). Silhouette : IMC, sexe, tour de taille ;
posture voûtée si âge de risque > 60 ; respiration ; cœur au rythme de la FC de repos ; cheveux gris
selon l'âge ; points éteints si vitalité basse ; halos d'organes (cerveau, poumons, cœur, métabolisme)
colorés selon le risque relatif, avec annotations sur le tableau de bord ; socle holographique dont
l'arc = score de potentiel.

## 6 ter. Données et sécurité

- Stockage local par appareil (`localStorage`), persistance demandée au navigateur.
- Coffre optionnel : AES-GCM 256, clé PBKDF2-SHA-256 (310 000 itérations) dérivée du code ; le code
  n'est jamais stocké ; code oublié = données irrécupérables (écran d'effacement).
- Sauvegardes exportables, chiffrées par mot de passe si souhaité ; rappel de sauvegarde tous les 30 jours.
- Comptes (v3) : e-mail + mot de passe via Firebase Auth (API REST, offre gratuite), un document Firestore
  `users/{uid}` qui ne contient que des blocs chiffrés. Clé de données aléatoire (AES-256) enveloppée
  par une clé dérivée du mot de passe ET par une clé dérivée d'un code de récupération (affiché une
  fois). Le serveur ne peut rien lire (chiffrement de bout en bout) ; mot de passe oublié → e-mail de
  réinitialisation + code de récupération. Cache local chiffré, synchronisation différée hors ligne.
- Sans compte : données locales, coffre optionnel par code.
- Règles Firestore : lecture/écriture de `users/{uid}` uniquement par l'utilisateur authentifié `uid`.
- Préférences d'appareil (`lifespan.prefs`, non sensibles) : langue FR/EN, thème, accent, taille du
  texte, animations, unités (kg/lb, cm/pouces, g/L ou mmol/L).

## 7. Gamification

| Élément | Règle |
|---|---|
| XP | check-in +20 ; chaque habitude atteinte +10 ; objectif créé +50 ; objectif atteint +200 |
| Niveau | `niveau = floor(sqrt(XP / 60)) + 1` |
| Série | jours consécutifs avec check-in |
| Quêtes du jour | 3, tirées des leviers principaux de l'utilisateur |
| Badges | 26, voir `BADGES` dans `app.js` ; paliers Bronze/Argent/Or ; barre de progression pour les badges verrouillés ; on récompense l'effort, pas une valeur de santé |
| Titres | un titre tous les 2 niveaux (Éveil → Légende) |
| Quêtes personnelles | case à cocher ou compteur ; chaque jour, certains jours, N fois/semaine ou une fois ; difficulté 10/20/35 XP ; rappel horaire ; série par quête |
| Journée parfaite | check-in + toutes les quêtes prévues faites |
| Rappels | Android : notifications locales ; web : notification si l'app est ouverte + export agenda .ics |
| Score Lifespan | % du potentiel d'EV réalisé (0–100) |

---

## 8. Architecture

```
lifespan/
  MASTER.md              ← ce fichier
  README.md              ← installation, déploiement, app mobile
  app/                   ← site web + PWA (aucune étape de build)
    index.html
    manifest.webmanifest, sw.js
    css/styles.css
    js/sources.js        ← bibliographie
    js/model.js          ← VARS, pays, archétypes, courbes
    js/engine.js         ← table de survie, sorties, projections
    js/avatar.js         ← avatar matrice de points (canvas)
    js/charts.js         ← graphiques SVG
    js/app.js            ← état, stockage, rendu des écrans
  tests/calibrate.mjs    ← benchmarks du §4
  tools/serve.py         ← serveur de dev sans cache
  tools/build-artifact.mjs  ← version mono-fichier (dist/)
  capacitor.config.json, package.json  ← empaquetage Android / iOS
```

Scripts classiques (pas de modules ES) pour que l'app s'ouvre aussi en `file://` et dans une WebView.

---

## 9. Journal des décisions

| Date | Décision | Raison |
|---|---|---|
| 2026-09-27 | LDL : relation monotone issue des ECR (CTT), pas la courbe en U observationnelle | Le simulateur sert à décider d'un changement → source interventionnelle (matrice §0) |
| 2026-09-27 | Sommeil : plateau 7–8 h, branche longue × 0,6 | Recommandations 7–9 h ; causalité inverse probable pour le long sommeil |
| 2026-09-27 | Alcool : aucun effet protecteur sous 100 g/sem | Randomisation mendélienne (matrice §7) |
| 2026-09-27 | Drogues : SMR rétrécis sur l'échelle log (× 0,5 usage régulier, × 0,2 occasionnel) | SMR issus de populations en traitement, surestimés |
| 2026-09-27 | HDL : poids 0,5 ; triglycérides : risque CV seulement | Marqueurs non causaux (RM) / non significatifs après ajustement |
| 2026-09-27 | Stress, bonheur, méditation, nature : sorties « indicatives » (grade C) | Preuves plus faibles, mesures auto-rapportées |
| 2026-09-27 | Verre standard = 10 g d'alcool | Définition française / OMS |
| 2026-09-27 | k = 0,70 / 0,92 / 0,85 ; aérobie 0,4 ; archétypes 25/52/18/5 + sélection par la survie | Calibrage : les 14 benchmarks §4 passent (voir `node tests/calibrate.mjs`) |
| 2026-09-27 | Pas de décalage de morbidité supplémentaire (EVBS suit l'âge de risque) | Sinon le gain d'EVBS dépassait nettement celui d'EV (Li 2020, Nyberg 2020) |
| 2026-09-27 | Benchmark B5 : activité + pas ensemble | Dans les cohortes déclaratives, la MVPA inclut la marche : tester l'une sans l'autre sous-estime l'effet |
| 2026-09-27 | v3 : comptes chiffrés de bout en bout (Firebase gratuit), accueil/connexion, profils tous supprimables, réglages (langue, unités, texte, animations), correctif barre d'état Android | Demande utilisateur |
| 2026-09-27 | v2 : chiffres Geist fins, avatar 3D, quêtes personnelles, coffre chiffré, rappels natifs, publication GitHub | Demande utilisateur : look plus professionnel, données par personne sécurisées, gamification |
| 2026-09-27 | Arrêt du tabac dans une projection : à l'échéance de l'objectif | L'objectif s'exprime « non-fumeur d'ici telle date » ; la baisse de risque suit ensuite le modèle Jha |
