# Coach GymTracker — rapport d’implémentation

État du code local au 6 novembre 2026.

À la demande de l’utilisateur, le check-in automatique au démarrage est temporairement suspendu, y compris pour les installations qui l’avaient activé. Les séances commencent directement. La saisie manuelle des sensations depuis la séance reste accessible ; les descriptions du parcours automatique ci-dessous documentent sa conception initiale.

Projet : `C:\Users\killa\Downloads\GymtrackerRefonteV2\GymtrackerRefonte`.

## 1. Audit et architecture retenue

L’implémentation conserve les écrans et la base existants. La carte et les dix groupes de `trainingBalance.ts` / `MuscleMap.tsx`, les programmes, les métadonnées de remplacement, les séries/RPE, les unités et les composants d’interface sont réutilisés.

Le moteur est déterministe, local et sans nouvelle dépendance. Aucune API d’IA, aucun serveur, compte ou abonnement n’est ajouté. Les règles et leurs seuils sont des repères de produit explicables, pas un modèle physiologique validé.

L’analyse historique du coach utilise les séries avec des répétitions, jusqu’à 90 jours, en excluant les dates futures et les séances explicitement encore en cours. Les anciennes séances et imports sans marqueur de fin restent exploitables. Les objectifs personnels peuvent consulter tout l’historique.

## 2. Fonctions livrées et parcours

### Avant la séance

Les démarrages depuis l’accueil, les programmes et les modèles du bilan passent par Préparer ma séance. Aucun enregistrement ni avancement du programme n’a lieu avant Commencer. Le check-in est facultatif et peut être désactivé dans le profil.

Le check-in comprend énergie (en forme, normal, fatigué, ou inconnue), courbatures de 0 à 3 pour les dix groupes, et déclaration séparée d’une douleur inhabituelle. La carte face/dos et la liste réutilisent les mêmes groupes. Une valeur absente reste inconnue.

Selon les sensations et le travail récent, l’écran explique les signaux et propose de conserver le choix, sélectionner un autre jour du programme, réorganiser la suite du cycle ou prendre du repos. Réorganiser consiste à choisir le jour à réaliser, puis reprendre au jour suivant dans le cycle lors du démarrage. Un repos ne crée aucune séance vide et ne modifie pas le programme ; il n’ajoute pas artificiellement une séance à l’objectif hebdomadaire.

En mode libre, l’utilisateur compose ensuite ses exercices ; le coach ne génère pas arbitrairement une séance complète.

### Pendant la séance

La première série garde la référence précédente. Après une validation, une carte Coach propose un objectif pour la prochaine série, une explication, Pourquoi ?, Appliquer, Ignorer et un accès aux réglages de l’exercice. Aucun conseil n’interrompt le repos plein écran.

Appliquer préremplit uniquement une série classique à zéro répétition après le travail enregistré, ou crée un nouveau brouillon. La charge/répétitions/RPE du brouillon restent dans les préférences jusqu’à validation : ils ne comptent pas comme volume ni record, y compris après perte de focus ou réouverture. Aucune série avec des répétitions déjà enregistrées n’est remplacée, même sans coche, pour respecter les données des anciennes versions.

Le lien Actualiser mes sensations permet un nouveau relevé horodaté. Le check-in initial reste intact. Une réponse de plus de 12 heures n’est pas traitée comme une sensation actuelle ; ce seuil est un choix de fraîcheur des données, pas une durée de récupération.

Les pyramides gardent leurs paliers ; le coach classique ne les remplace pas.

### Analyse et bilan

L’accueil, les statistiques et les programmes donnent accès au Coach. L’écran regroupe :

- Bilan des quatre dernières semaines : nombre de séances, exercices en progression possible, plateaux possibles.
- Carte musculaire existante et détail par groupe : dernier travail, séances sur 7/28/90 jours, séries principales et secondaires, volume pondéré.
- Analyse par exercice : progression, stabilité, plateau possible, baisse récente ou données insuffisantes.
- Conseils expliqués et accès aux réglages/objectifs.
- Programme proposé avec aperçu, comparaison à l’actuel, adaptations au matériel et confirmation avant activation.

La fréquence du bilan est sur 28 jours. Pour obtenir assez de séances comparables, les tendances peuvent remonter à 90 jours ; cette distinction est affichée.

### Profil et objectifs

Préférences : conseils pendant l’entraînement, check-in automatique et matériel disponible. Aucun matériel coché signifie inconnu, sans restriction inventée.

Chaque exercice a des paramètres indépendants : minimum/maximum de répétitions, RPE cible, incrément et mode double progression, priorité répétitions, priorité charge ou désactivé.

Un objectif de force peut suivre une seule métrique : charge maximale réalisée, charge pour un nombre exact de répétitions ou 1RM estimé. Le suivi affiche valeur compatible, pourcentage vers l’objectif et évolution quand il existe au moins deux points. Changer de métrique ne mélange pas les mesures. L’objectif est rappelé dans les conseils sans imposer de hausse pour l’atteindre.

## 3. Règles exactes

### Progression

Valeurs initiales : 6–10 répétitions, cible RPE 8 ; incrément 1 kg pour les haltères et mouvements d’isolation reconnus, 2,5 kg pour les autres. Ces valeurs sont modifiables. Le poids du corps privilégie les répétitions sans ajout de lest.

Ordre des règles :

1. Mode désactivé, douleur pertinente ou absence de performance exploitable : pas d’objectif à appliquer.
2. Fatigue déclarée, courbatures au moins modérées, ou au moins trois séries à RPE ≥ 9 pour la zone dans les dernières 48 h : réduire d’un incrément et d’une répétition. Au poids du corps, conserver la charge corporelle et réduire les répétitions. Aucun diagnostic de récupération n’est posé.
3. RPE 10 : même réduction prudente.
4. Au moins trois séries déjà validées, RPE ≥ 9 sur une série précédente, perte de répétitions ou RPE qui monte dans la séance : maintenir la référence, sans dépasser la borne haute.
5. Plateau possible : consolider et expliquer les alternatives, sans augmentation automatique du volume.
6. RPE absent : maintenir la charge ; proposer au plus une répétition supplémentaire jusqu’à la borne haute.
7. Double progression : augmenter d’un incrément si la borne haute est atteinte et le RPE ne dépasse pas la cible, puis revenir à la borne basse.
8. Priorité charge : augmenter seulement si le RPE est au moins un point sous la cible ; conserver les répétitions.
9. Sinon, ajouter une répétition dans la fourchette lorsque le RPE le permet, ou maintenir.

Le RPE reste facultatif et subjectif. Les repères 6 ≈ 4 répétitions en réserve jusqu’à 10 ≈ 0 sont présentés comme approximatifs. Les mentions de fiabilité sont limitées/modérées, sans pourcentage inventé.

### Tendances et plateaux

Le moteur regroupe les séries classiques par exercice et séance. Il compare le même numéro de première série disponible, conserve au plus cinq séances et exclut les pyramides. Moins de trois séances, plus d’une série d’écart entre séances, fourchettes variant de plus de 50 % ou séries de plus de 15 répétitions : conclusion insuffisante.

- Charge/répétitions identiques et baisse du RPE d’au moins un point sur au moins trois valeurs : progression possible, sans gain de force chiffré.
- Baisse de plus de 3 % de l’indice de performance face aux séances précédentes, ou RPE en hausse à performance identique : baisse récente, sans conclusion de plateau.
- Hausse de plus de 2 % de l’indice, ou répétitions en hausse à charge au moins égale : progression possible.
- Plateau possible : au moins quatre séances sur au moins 14 jours ; indice dans une plage de 2 % ; RPE présent à chaque séance et variation ≤ 0,5 ; pas de signal de fatigue historique/actuel utilisé pour cette conclusion.
- Sinon : stabilité, avec mention des RPE manquants.

L’indice de comparaison est `charge × (1 + répétitions / 30)` ; pour le poids du corps ou une charge nulle, les répétitions sont comparées. Il ne s’agit pas d’un gain de force mesuré. Une stagnation d’exercice ne devient pas automatiquement une stagnation de tout le muscle.

### Muscles et récupération

Le recrutement est celui du bilan existant : série principale créditée 1, secondaire 0,5. Les séances sont comptées une seule fois par muscle. Les exercices personnalisés utilisent leur catégorie lorsque le muscle peut être identifié ; les zones inconnues ne sont pas attribuées arbitrairement.

Fréquence attendue : objectif hebdomadaire multiplié par la proportion de jours du programme sollicitant le groupe ; une priorité choisie a un repère minimal d’une fois/semaine. En mode libre, repère de deux fois/semaine pour une priorité, une fois pour les autres, limité par l’objectif global.

Après au moins trois séances exploitables sur 28 jours, une fréquence peut être signalée basse si elle est inférieure à la moitié du repère sur quatre semaines, ou si le dernier travail dépasse `max(7, ceil(7 / max(0,5, fréquence attendue)) + 3)` jours. Une priorité recevant moins de 35 % des séries pondérées du groupe le plus sollicité est également signalée, selon les seuils déjà utilisés dans le bilan.

48 heures sans entraîner un muscle ne suffisent jamais à le déclarer négligé. Les signaux de récupération associent sensations, séries récentes et RPE, sans score physiologique. Absence de courbatures et absence de données ne garantissent pas la récupération.

### Programmes

Sélection parmi les sept programmes existants, sans génération de volumes arbitraires. Le classement privilégie la couverture des groupes sous leurs repères et des priorités, la proximité avec le nombre de séances souhaité et les programmes ciblés. Un exercice impossible à adapter au matériel reçoit une pénalité pour favoriser une solution compatible.

Les exercices existants sont réordonnés en faveur des priorités. Si le matériel est connu, des alternatives compatibles avec un score d’au moins 4 sont proposées via le moteur existant ; les doublons sont évités. Aucune série n’est ajoutée. Si un mouvement reste sans solution, l’activation est bloquée et la raison est affichée.

L’activation explicite conserve l’historique, enregistre la variante pour les prochaines séances et conserve l’index du cycle courant lorsque le programme est le même. Les index connus des programmes parcourus via le coach sont mémorisés pour les retrouver lors d’un retour.

### Objectifs de force

- Charge maximale : meilleure charge d’une série classique réalisée.
- Charge à répétitions : seulement les séries avec le nombre exact demandé.
- 1RM estimé : Epley, sur séries classiques chargées de 1 à 12 répétitions.
- Pourcentage = meilleure valeur compatible / objectif, borné à 100 % à l’affichage. Aucune comparaison entre métriques différentes.

## 4. Exemples concrets

| Données | Proposition ou résultat |
| --- | --- |
| 80 kg × 8, RPE 7, double progression 6–10 | 80 kg × 9 si aucun signal de fatigue. |
| 80 kg × 10, RPE 8, incrément 2,5 | 82,5 kg × 6 : retour au bas de la fourchette. |
| 80 kg × 8, RPE 7, priorité charge | 82,5 kg × 8, si les sensations et séries précédentes le permettent. |
| 80 kg × 8, RPE 9 | Maintien, pas de hausse systématique. |
| 80 kg × 8, RPE 10 | 77,5 kg × 7 avec l’incrément de cet exemple. |
| 80 kg × 8 puis 80 kg × 7, RPE qui augmente | Maintien de la dernière référence au lieu d’une nouvelle hausse. |
| 80 kg × 8 avec RPE 9, puis 8, puis 7 | Performance possiblement plus facile, sans la qualifier de plateau. |
| Objectif 100 kg à 8 répétitions, meilleures séries 80 × 8 et 100 × 1 | 80 % : la série à une répétition ne remplace pas la métrique à huit répétitions. |

Une proposition n’est jamais enregistrée comme performance tant que l’utilisateur ne valide pas le brouillon.

## 5. Stockage, sauvegardes et migrations

**Aucune nouvelle table ni migration structurelle nécessaire.** La version SQLite reste 4 : les informations manquantes tiennent dans les préférences `user_settings`, déjà incluses dans les sauvegardes. Les migrations existantes sont conservées.

Nouvelles clés :

- `coach:preferences` : activation, check-in automatique, matériel.
- `coach:progression:<nom normalisé>` : paramètres par exercice.
- `coach:goal:<nom normalisé>` : objectif et métrique.
- `coach:checkin:<sessionId>` : check-in initial, passage volontaire et actualisations horodatées.
- `coach:pending:<setId>` : brouillon accepté, séparé de la performance réelle.
- `coach:program:<programId>` : variante des exercices par jour, versionnée.
- `coach:program_day:<programId>` : index connu à retrouver.

Ces préférences suivent le format JSON GymTracker version 1 existant. Les anciennes sauvegardes n’ayant aucune clé coach restent restaurables ; des valeurs initiales sont alors utilisées. Les données mal formées sont ignorées ou refusées selon l’opération. L’import/export Excel ne change pas de structure. Réinitialiser efface aussi les informations du coach.

## 6. Fichiers créés et modifiés pour le coach

Créés :

- `lib/coachTypes.ts` : types.
- `lib/coachStorage.ts` : validation, préférences, check-ins, configurations et lecture de l’historique.
- `lib/coachEngine.ts` : règles pures de progression, tendances, muscles, récupération, classement et objectifs.
- `lib/coach.ts` : intégration SQLite et mutations protégées.
- `components/CoachCheckIn.tsx`, `CoachAdvice.tsx`, `CoachSummary.tsx` : interface réutilisable.
- `app/prepare.tsx`, `app/coach.tsx`, `app/coach-settings.tsx` : nouveaux écrans.
- `tests/coach.cjs` et ce rapport.

Modifiés :

- `app/_layout.tsx` : routes.
- `app/(tabs)/index.tsx`, `stats.tsx`, `settings.tsx` : accès au coach et préparation.
- `app/programs.tsx`, `app/report.tsx` : préparation avant création des séances.
- `app/session/[id].tsx` : conseils, actualisation des sensations et brouillons.
- `components/MuscleMap.tsx` : réutilisation en mode check-in, sans légende d’entraînement trompeuse.
- `lib/programs.ts` : lecture des variantes locales avec retour au programme original si invalide.
- `lib/sessionFeatures.ts` : retrait des objectifs de l’ancien exercice lors du déplacement de brouillons vers un remplacement.
- `package.json` : commande `test:coach`.
- README, rapport général et vérifications : documentation.

Les changements de reprise de séance et de Dynamic Island réalisés avant cette mission restent présents ; ils ne sont pas des ajouts du moteur Coach.

## 7. Vérifications

- 59 tests Coach : RPE 6 à 10 et absent, double progression, fatigue accumulée, stabilité et RPE en baisse, plateaux, données insuffisantes, courbatures 0–3/inconnues, douleur, check-in ignoré/modifié/ancien, musculature inconnue/personnalisée, brouillons sans faux volume, remplacement, pyramides, kg/lbs, objectifs, matériel, activation confirmée, reprise des index et rollback au démarrage.
- 56 tests de régression existants.
- 6 tests du sélecteur de fichiers.
- 8 tests des fonctions système.
- Total : **129 tests**.
- TypeScript.
- Expo Doctor : 20/20.
- Export du bundle iOS ; distinct d’une compilation native signée.

Commandes :

```powershell
npm.cmd run typecheck
npm.cmd run test:regression
npm.cmd run test:coach
npm.cmd run test:import-picker
npm.cmd run test:system-features
npx.cmd expo-doctor
npm.cmd run check:ios
```

Les tests utilisent exclusivement une base SQLite en mémoire. Ils ne touchent pas à la base du téléphone. Les rendus natifs et les gestes ne sont pas prouvés par ces tests.

## 8. Fonctions préservées et limites

L’historique, calendrier, programmes d’origine, notes, RPE facultatif, pyramides, remplacement, ordre des exercices, repos, notifications, Live Activities, widget, reprise, statistiques, Excel et sauvegardes restent en place. Les tests existants sont maintenus.

Limites explicites :

- Le coach propose des règles locales et des modèles existants, pas un entraînement médicalement personnalisé ou une garantie de progression.
- Les échauffements ne disposent pas d’un marqueur dans le modèle actuel ; le coach compare le même numéro de série et ne peut pas savoir qu’une série a servi d’échauffement.
- Le matériel précis des exercices personnalisés est inconnu ; des contraintes strictes peuvent empêcher l’activation d’un programme faute de substitution identifiée.
- Le check-in initial sert à contextualiser les séances passées ; les actualisations restent conservées, sans reconstruction artificielle de l’heure exacte de chaque série.
- Une fréquence hebdomadaire peut différer du nombre de jours des sept modèles ; l’écart est expliqué dans la proposition.
- Les données d’entraînement à zéro répétition n’influencent pas le coach ; une ancienne série positive reste préservée même sans coche.
- Les jours de repos ne sont ni des séances fictives ni des notifications culpabilisantes. Le calcul de régularité hebdomadaire existant reste un décompte de séances réalisées.
- La durée de séance et les politiques iOS de notifications/Live Activities gardent leurs limites précédentes.
- Aucun appareil iOS n’a été utilisé pour valider visuellement ces nouveaux écrans et interactions pendant cette intervention.

Le message distinguant douleur et courbatures reste prudent et ne pose aucun diagnostic ; voir les [conseils NHS sur la reprise d’activité et les douleurs inhabituelles](https://leedscommunityhealthcare.nhs.uk/our-services-a-z/musculoskeletal-msk/return-to-activity-or-sport-after-injury/). Le fonctionnement de l’application n’accède pas à cette page.

## 9. Essais à réaliser sur iPhone

1. Depuis chaque entrée de séance, ouvrir puis annuler la préparation : aucune séance créée ni programme avancé.
2. Passer le check-in puis le modifier en cours de séance ; vérifier l’énergie inconnue et les courbatures non renseignées.
3. Utiliser la carte face/dos et la liste, déclarer une douleur et vérifier l’absence de conseil de hausse pour la zone.
4. Choisir repos, conserver la séance, sélectionner un autre jour puis vérifier le cycle réellement démarré.
5. Valider une première série, accepter/ignorer le conseil ; vérifier le brouillon et le volume avant/après validation.
6. Modifier le brouillon, fermer l’app, reprendre et vérifier les unités kg/lbs et le RPE.
7. Reprendre une ancienne séance : ancien check-in conservé, actualisation horodatée, sensations anciennes non utilisées comme actuelles.
8. Remplacer un exercice avec un brouillon Coach : aucun objectif de l’ancienne machine ne doit suivre le brouillon déplacé.
9. Tester les pyramides, le glisser-déposer, le chrono plein écran, le retour à l’accueil et la Live Activity.
10. Consulter le Coach avec un historique vierge, incomplet et importé, puis un historique avec plusieurs séances comparables.
11. Comparer/annuler/activer un programme, contrôler le matériel et la conservation des anciens exercices/séries.
12. Exporter/restaurer une sauvegarde avec check-ins et objectifs ; restaurer aussi une ancienne sauvegarde sans Coach.
13. Vérifier les graphiques d’objectifs, l’accessibilité, les claviers et les grandes tailles de texte.

## 10. Prochain build TestFlight

Tester l’interface avec Expo Go compatible SDK 58. Les fonctions natives existantes se vérifient dans un build de développement ou TestFlight. Aucun module natif supplémentaire n’a été ajouté pour le coach.

```powershell
cd "C:\Users\killa\Downloads\GymtrackerRefonteV2\GymtrackerRefonte"
npx.cmd expo start --go --clear
```

Pour livrer la version complète à Apple :

```powershell
cd "C:\Users\killa\Downloads\GymtrackerRefonteV2\GymtrackerRefonte"
npx.cmd eas-cli@latest build --platform ios --profile production
```

Après réussite du build :

```powershell
npx.cmd eas-cli@latest submit --platform ios --profile production --latest
```

Le numéro de build est incrémenté à distance par la configuration EAS existante. Installer la mise à jour TestFlight sans désinstaller l’app pour préserver les données locales. Aucun build signé ni envoi à Apple n’a été lancé ici.
