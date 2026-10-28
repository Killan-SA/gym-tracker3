# Vérification du projet après intégration du logo

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
- Régression SQLite en mémoire : 25 tests réussis, dont migration des anciennes données, import Excel avec la nouvelle bibliothèque, programmes, tutoriel, reset et pyramides.
- Expo Doctor : 20/20 contrôles réussis.
- Introspection des plugins natifs Expo : réussie, configuration iOS générée sans erreur.
- Export du bundle iOS : réussi avec les 78 assets attendus, dont le nouveau logo et les 35 images d’exercices ; cet export est distinct d’une compilation native signée.

## Alertes de dépendances restantes

Après les correctifs compatibles, npm signale encore **8 paquets affectés : 5 alertes basses et 3 hautes**, sans alerte critique. Les deux avis amont sont :

| Dépendance | Chaîne observée | État |
| --- | --- | --- |
| `deepmerge` 4.3.1 | Expo → `@expo/config` | Aucun correctif publié selon GHSA-gcqx-w48m-w2h4. |
| `zod` 3.25.76 | Expo → `@expo/cli` | Le correctif annoncé est en 4.6.6, hors de la plage majeure 3 demandée par cette version d’Expo CLI. |

Ces dépendances appartiennent aux outils Expo de configuration et de développement du projet. Les paquets Expo qui en dépendent héritent aussi des alertes, d’où le total de huit. Ce résultat ne constitue pas une preuve d’absence de risque. Aucune rétrogradation du SDK ni substitution majeure forcée de dépendance n’a été appliquée.

Avis officiels : https://github.com/advisories/GHSA-gcqx-w48m-w2h4 et https://github.com/advisories/GHSA-mrhx-c7xc-m3w5. Suivre une mise à jour compatible de la chaîne Expo puis relancer `npm audit`.

## Validation encore nécessaire

La compilation native signée EAS et les essais TestFlight sur un iPhone restent à effectuer. Vérifier en particulier l’icône, le splash, le clavier, la vibration, le repos en arrière-plan, l’import depuis Fichiers et une mise à jour contenant déjà des séances. Aucun build n’a été envoyé à Apple pendant cette vérification.
