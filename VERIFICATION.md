# Vérification du projet

## Ajouts du 4 novembre 2026

Progression par série : la première conserve la référence historique ; après validation, la progression est proposée sur la deuxième ou troisième série. Trois tests supplémentaires vérifient ce décalage, le poids du corps et l’absence de faux records. Les 53 tests de régression passent et TypeScript est valide ; avec les 6 tests du sélecteur et 8 tests système existants, la suite comprend 67 tests.

Bouton inférieur de repos, mode sans programme prioritaire, Live Activity iOS du repos, alerte locale de fin et rappel créatine configurable : [NOTIFICATIONS_ET_REPOS.md](./NOTIFICATIONS_ET_REPOS.md). Le choix explicite du mode libre prime désormais sur un ancien programme encore présent dans les préférences historiques. Aucun changement de schéma SQLite n’est nécessaire.

Les contrôles fonctionnels comprennent désormais 53 tests SQLite/logique, 6 tests du sélecteur et 8 tests système, soit 67. Les API natives de notifications et d’ActivityKit sont vérifiées par des adaptateurs ; leur rendu et livraison sur un vrai iPhone restent à valider dans le nouveau build natif. Les dépendances sont alignées sur les versions recommandées du SDK 58, dont Expo 58.0.23, Expo Widgets/Expo UI 58.0.27 et Safe Area Context 5.11.1.

## Fonctions pour les séances en salle

Notes persistantes, déplacement des exercices, alternatives locales préservant les séries, régularité hebdomadaire, repos plein écran, sauvegarde/restauration JSON, export Excel et widget iPhone : détails et parcours de validation dans [AMELIORATIONS_SEANCE.md](./AMELIORATIONS_SEANCE.md).

Les contrôles finaux réussissent : 53 tests de régression, 6 tests du sélecteur, 8 tests système, TypeScript, Expo Doctor 20/20 et export iOS. Le rollback de restauration est vérifié par une panne SQLite simulée après suppression et début de réinsertion. Le banc de tests refuse aussi les transactions Expo imbriquées. L’introspection Expo confirme l’extension du widget, le groupe partagé et le support Live Activities. Les interactions natives, le widget, la Live Activity et les notifications restent à confirmer sur iPhone dans le nouveau build.

## Correction de l’import TestFlight

Erreur signalée sur iPhone : `Different document picking in progress` à l’appel de `getDocumentAsync`. Le bouton restait actif pendant l’ouverture du sélecteur natif, permettant des appels concurrents. L’écran d’import était également présenté en fenêtre modale.

Un verrou synchrone local et un verrou partagé entre écrans empêchent les ouvertures simultanées. Le bouton attend la transition de navigation et reste désactivé pendant la sélection et la lecture. L’import utilise maintenant une présentation normale. Annuler ou recevoir une erreur libère le verrou ; une sélection native toujours en attente conserve son verrou. Les erreurs de sélection sont distinguées des erreurs de lecture, avec une indication de récupération si iOS reste bloqué. Aucun changement de base de données ni effacement de données.

TypeScript, les 25 tests SQLite et l’export iOS (1 541 modules, 78 assets) ont été relancés avec succès. Six tests supplémentaires du sélecteur réussissent : double appui, annulation, rejet natif, exception synchrone, sélection partagée entre écrans et reconnaissance de l’erreur rapportée. La validation du sélecteur UIKit sur un iPhone nécessite un nouveau build TestFlight ; les tests JavaScript ne reproduisent pas sa présentation native.

## Logo

L’image fournie est copiée sans modification dans `assets/brand-logo.png` (PNG RGB opaque, 1 254 × 1 254). Son empreinte SHA-256 est identique à celle du fichier fourni. Elle est utilisée pour l’icône de l’application, l’icône iOS, le splash via le plugin Expo et les en-têtes de l’accueil, du démarrage et du tutoriel. Les anciens fichiers d’images restent présents mais ne sont plus référencés par ces configurations.

La génération des tailles natives est effectuée par Expo pendant la compilation. Le changement d’icône installée et du splash natif nécessite un nouveau build iOS. Expo Go permet de voir le logo dans l’interface, mais ne valide pas le splash de production : https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/.

## Corrections

- Ancienne clé `expo.splash` refusée par le schéma du SDK 58 : remplacée par la configuration du plugin `expo-splash-screen`.
- Dépendances Expo alignées sur les correctifs du SDK 58, dont Expo 58.0.21. Les versions exactes sont conservées dans `package-lock.json`.
- `shell-quote` mis à jour vers 1.12.0 par `npm audit fix`, supprimant l’alerte critique détectée.
- Ancien SheetJS 0.18.5 remplacé par SheetJS 0.20.3, depuis la distribution officielle. L’archive est conservée dans `vendor/xlsx-0.20.3.tgz` et référencée par `file:` pour permettre une installation reproductible. Documentation : https://docs.sheetjs.com/docs/getting-started/installation/nodejs/.
- Les séries à zéro répétition ne génèrent plus de record, de point de progression ni de performance de référence. Cela protège notamment les paliers de pyramide ajoutés mais pas encore réalisés. Aucun historique utilisateur n’a été supprimé.

## Contrôles effectués

- TypeScript : réussi.
- Régression SQLite et logique : 53 tests réussis, dont anciennes migrations, import Excel, programmes, mode libre, tutoriel, notes, réorganisation, remplacement, régularité, repos, sauvegardes et rappel créatine. Six tests vérifient le sélecteur de fichiers et huit les notifications/Live Activities.
- Expo Doctor : 20/20 contrôles réussis.
- Introspection des plugins natifs Expo : réussie, configuration iOS générée sans erreur.
- Export du bundle iOS : réussi avec les 78 assets attendus, dont le nouveau logo et les 35 images d’exercices ; cet export est distinct d’une compilation native signée.

## Alertes de dépendances restantes

Après l’alignement compatible du SDK 58 le 4 novembre, le résumé npm signale **5 vulnérabilités modérées**, sans alerte haute ou critique dans ce résumé. Ce résultat remplace le relevé précédent du 29 octobre. Aucun `npm audit fix --force`, changement forcé de version majeure ou rétrogradation du SDK n’a été appliqué. Le détail des avis et des éventuelles corrections reste consultable avec `npm audit`.

## Validation encore nécessaire

La compilation native signée EAS et les essais TestFlight sur un iPhone restent à effectuer. Vérifier en particulier l’icône, le splash, le clavier, la vibration, le repos en arrière-plan, l’import depuis Fichiers et une mise à jour contenant déjà des séances. Aucun build n’a été envoyé à Apple pendant cette vérification.
