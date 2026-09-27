# Lifespan

Simulateur public et gratuit : il estime l'espérance de vie, les années en bonne santé, l'âge de risque,
les risques de maladie, le bonheur et le stress d'une personne selon ses habitudes et ses paramètres
cliniques, puis montre l'effet de chaque changement dans le temps.

- **Site web + application** : une seule base de code, installable sur l'écran d'accueil (PWA) et
  construite automatiquement en application Android (APK) par GitHub.
- **Données par personne, sur son appareil** : aucun serveur. Option de coffre chiffré (AES-256, code
  personnel) et sauvegardes chiffrées à exporter/importer.
- **Toutes les formules et sources** sont dans l'onglet Science et dans [`MASTER.md`](MASTER.md).

## Tester sur l'ordinateur

Double-cliquer sur **« Lancer Lifespan »** (raccourci dans ce dossier) : le navigateur s'ouvre sur
http://localhost:5173. Ou dans un terminal :

```bash
node tools/serve.mjs 5173 --open
```

## Publication automatique (GitHub)

Chaque envoi sur la branche `main` déclenche :

| Workflow | Résultat |
|---|---|
| `.github/workflows/pages.yml` | vérifie la calibration du modèle puis publie `app/` sur GitHub Pages |
| `.github/workflows/android.yml` | construit l'APK Android avec Capacitor et le publie dans *Releases* (`android-latest`) |

L'APK est une version « debug » signée automatiquement : installable directement sur Android
(autoriser l'installation depuis le navigateur). Pour le Play Store, il faudra une clé de signature.

## Rappels

| Plateforme | Fonctionnement |
|---|---|
| App Android | notifications locales programmées (check-in quotidien + rappel par quête), même app fermée |
| Site / app installée | notification quand Lifespan est ouvert ou actif ; bouton « Ajouter à mon agenda (.ics) » pour un rappel garanti |

## Vérifier le modèle

```bash
node tests/calibrate.mjs
```

## Avant une diffusion large

- Vérifier les sources marquées ⚠ (`verify: true` dans `app/js/sources.js`).
- Faire relire le modèle par un·e médecin ou épidémiologiste.
- Ajouter mentions légales et politique de confidentialité.
- Lifespan n'est pas un dispositif médical.
