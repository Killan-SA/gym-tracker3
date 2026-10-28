# GymTracker — Refonte

Application Expo / React Native reprise du dossier original `C:\Users\killa\.gemini\antigravity\scratch\gymtracker2`. Le dossier original et le prototype voisin `GymtrackerRefonteV2` sont conservés séparément.

Le logo K néon fourni est intégré dans l’interface, l’icône et le splash iOS. Le détail des contrôles, corrections et alertes de dépendances restantes se trouve dans [VERIFICATION.md](./VERIFICATION.md). L’icône native sera mise à jour au prochain build iOS.

## Lancer l’application

Depuis ce dossier :

```powershell
npm start
```

La cible de développement est **iPhone / iOS**. Ouvrir le projet sur iPhone avec un client Expo compatible avec le SDK 58 du projet. Sur Mac, `npm run ios` permet de lancer le simulateur iOS. Les dépendances locales ont été copiées depuis le projet original ; sur une autre machine, exécuter d’abord `npm ci`.

Le démarrage comporte trois étapes : prénom et muscles prioritaires (biceps, pectoraux, dos, fessiers ou tout le corps), choix du programme, puis poids corporel en kg/lbs (report possible) et import Excel facultatif. Les programmes correspondant aux priorités sont proposés d’abord. Push/Pull/Legs, Full Body et Haut/Bas restent disponibles, ainsi que quatre programmes avec priorité biceps, pectoraux, dos et jambes/fessiers et le mode libre. Une installation existante sans prénom passe également par cette configuration, avec son programme et son poids préremplis ; les séances restent intactes et le jour du programme est conservé si le programme ne change pas.

Le prénom est conservé localement et affiché à côté de Bonjour/Bonsoir sur l’accueil. Il peut être modifié dans Profil. Les objectifs sont modifiables dans Profil et Programmes sans changer automatiquement le programme actif. Une configuration interrompue reprend au lancement suivant.

Le clavier numérique iOS dispose d’un bouton **Terminé** dans le profil, le démarrage et la saisie des séries. Enregistrer le poids ferme également le clavier ; les virgules décimales sont acceptées.

## Interface

- Accueil : prochaine séance du programme, démarrage direct, séance libre, volume sur 7 jours, records, historique récent et suggestion issue de l’historique.
- Séance : cartes illustrées, dernière performance hors séance courante, objectif indicatif de double progression, poids/répétitions/RPE, validation avec vibration, appui long sur la validation pour supprimer une série. Les saisies restent enregistrées à la sortie du champ, comme dans l’original ; la coche sert à suivre visuellement les séries réalisées.
- Repos : déclenchement manuel, durée initiale 90 s, choix 60/90/120/180 s, barre flottante, +30 s et Passer. L’ajout et la validation d’une série ne déclenchent pas le repos. Le décompte utilise une échéance réelle et se recale au retour de l’app. La vibration nécessite que JavaScript puisse s’exécuter ; aucune notification en arrière-plan n’a été ajoutée.
- Exercices : bibliothèque complète dès la première ouverture, recherche sans accents, catégories, favoris SQLite et bouton Ajouter un exercice. Le formulaire permet de choisir le nom et le groupe musculaire, vérifie les doublons sans tenir compte des accents/casse et enregistre l’exercice pour les prochaines séances.
- Fiche exercice : illustration, muscles, favoris, records et graphiques existants, périodes et métriques, consignes et erreurs fréquentes pour les exercices prédéfinis.
- Historique : liste et calendrier conservés, noms des nouvelles séances de programme, nombre de séries, volume, durée des nouvelles séances terminées, détail avec RPE.
- Stats : totaux réels, activité sur 12 semaines, volume par groupe, records et courbe par exercice. **Stats → Mon bilan musculaire détaillé** ouvre le nouveau bilan avec carte corporelle interactive de face et de dos, périodes de 7/28/90 jours, points forts et groupes moins sollicités, aperçu de programme et activation explicite. L’ancien tableau de bord n’est plus utilisé comme bilan.
- Profil : cartes communes aux autres écrans, prénom, poids corporel, unités, objectifs, programme actif, ajout d’exercice, thèmes, import XLSX et réinitialisation complète.

## Bilan musculaire et volumes

La carte représente dix groupes musculaires. Elle compare les séries enregistrées avec des répétitions, inclut les exercices au poids du corps même à charge nulle et compte les muscles secondaires avec un poids moindre. Les exercices non identifiables (dont le cardio et certaines catégories trop générales) ne sont pas attribués arbitrairement à un muscle. Trois séances de musculation classées sur la période sont nécessaires avant de colorer les points forts et groupes moins sollicités. Ce bilan décrit la répartition de l’entraînement ; il ne mesure pas la force ni le développement réel des muscles. Une suggestion couvre autant que possible les groupes moins entraînés, avec aperçu des séances et confirmation avant de remplacer le programme actif.

Le volume total des Stats et du bilan s’affiche en tonnes à partir de 1 000 kg : `1 250 kg → 1,25 t`. Les charges des séries et les records restent en kg/lbs. L’unité lbs continue d’être respectée. Dans le bilan, le total depuis les débuts est comparé à des masses illustratives : pack de 6 L d’eau (6 kg), vélo (15 kg), lave-linge (70 kg), petite voiture (1 000 kg). Ces références sont affichées et décrivent une charge cumulée, jamais une charge soulevée en une seule fois.

## Pyramides au poids du corps

Dans les cartes de **Pompes, Traction et Pistol squat**, le sélecteur Classique/Pyramide permet de configurer une pyramide de répétitions. La base, le pas et le nombre de paliers sont réglables, avec montée, descente ou aller-retour. Par défaut : `2 → 4 → 6 → 4 → 2`.

Appliquer la configuration ne crée pas de séries : le bouton Ajouter le palier crée une série à la fois, à la charge du poids corporel enregistré en kg. Les répétitions prévues sont des objectifs, et la série commence à zéro répétition en base. La coche valide le nombre prévu si le champ est vide ; sinon elle enregistre le nombre réellement saisi. Le palier suivant devient disponible après validation. Le RPE reste facultatif et le repos reste manuel.

Le plan et l’avancement sont persistés localement ; revenir au mode classique puis à la pyramide reprend le même cycle. Recommencer une pyramide conserve les anciennes séries et demande confirmation. Les pyramides sont signalées dans le détail de l’historique. Les objectifs non réalisés n’ajoutent aucun volume aux statistiques. Sans poids corporel configuré, les répétitions restent utilisables à charge nulle.

## Mini tutoriel

Après la configuration, le premier lancement propose un guide facultatif en quatre écrans : accueil et séance, saisie et validation des séries avec essai de la coche, historique et bilan, puis profil et exercices personnalisés. Il peut être passé, ne réapparaît pas automatiquement après avoir été vu ou passé, et reste disponible dans **Profil → Revoir le mini tutoriel**. La suppression complète des données efface également son état. Si l’import Excel a été coché pendant la configuration, il s’ouvre après le guide ou son passage.

## Données et compatibilité

La logique des séances, statistiques et import reste issue de l’original. La base s’appelle toujours `gymtracker.db` et les migrations sont inchangées. Les nouvelles préférences (prénom, objectifs, favoris, titres, durées, coches et état du premier démarrage) sont ajoutées dans la table `user_settings` existante. Le catalogue de programmes est enrichi. Aucun serveur, compte, tracker ou chargement d’image distante n’est ajouté.

**Profil → Effacer toutes mes données** supprime en une transaction les séances, exercices, séries, exercices personnalisés, préférences, profil, poids, objectifs et favoris. Les stores en mémoire sont remis aux valeurs initiales et la configuration s’ouvre immédiatement, sans redémarrer l’app. Cette action reste protégée par une confirmation et n’est jamais exécutée automatiquement. Les tests de suppression utilisent exclusivement SQLite en mémoire.

Les poids restent enregistrés en kg. La saisie en lbs est reconvertie avant écriture ; un champ lbs inchangé conserve la valeur kg exacte. Les choix de thème existants sont conservés ; le thème par défaut des nouvelles installations est vert. Le programme avance une seule fois au démarrage du jour, conformément à la fonction existante `createSessionFromProgramDay`.

La conservation des données sur téléphone nécessite une mise à jour de l’application existante, avec le même identifiant et une signature compatible. Ce dossier ne copie aucune base personnelle depuis un téléphone. Ne pas désinstaller l’application pour faire cette mise à jour.

## Illustrations

Les images raster originales sont embarquées dans `assets/exercises/*.png`, associées aux exercices par `assets/exercises/images.ts`. Elles sont utilisées dans la bibliothèque, la séance et les fiches. Elles ont été créées avec l’outil intégré imagegen ; les prompts sont conservés dans `assets/exercises/generation.json`. Les exercices personnalisés conservent le rendu vectoriel de secours dans `artwork.ts`. Les consignes sont stockées dans `constants/exerciseGuides.ts`.

## Import Excel

Disponible dans **Historique → Importer mon historique Excel**, **Profil → Données** et pendant le premier démarrage. Sur iPhone, le fichier peut être choisi dans Fichiers, y compris iCloud lorsqu’il est disponible. L’app copie le fichier dans son cache et le lit localement avec l’API `File` du SDK Expo 58.

Formats : `.xlsx` et `.xls`. Colonnes : Date, Machine, Série (facultative), Poids (kg), Rep. Une prévisualisation précède l’enregistrement ; les dates déjà présentes sont signalées comme doublons. Exemple prêt à remplir : `examples/historique-exemple.xlsx`. Le script `node scripts/create-excel-example.cjs` le régénère.

## Préparer la version Apple après validation du développement

La vérification JavaScript iOS est `npm run check:ios`. Elle ne compile ni ne signe une application native. Aucun envoi à Apple n’est effectué par cette commande.

La configuration EAS existante conserve l’identifiant `com.killan.gymtracker` et le projet Expo d’origine. Le profil `preview` prépare les tests sur iPhone ; `ios-simulator` cible le simulateur sur Mac ; `production` prépare ensuite la distribution Apple. Après validation sur appareil et connexion aux comptes Expo/Apple autorisés :

```powershell
npx eas-cli build --platform ios --profile preview
# Plus tard, après validation :
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --profile production
```

Une compilation iOS signée et l’envoi TestFlight/App Store nécessitent les accès Apple appropriés. Ils n’ont pas été lancés ici. Documentation officielle : https://docs.expo.dev/build/setup/ et https://docs.expo.dev/submit/ios/.

## Vérification

```powershell
npm run typecheck
npm run test:regression
npm run check:ios
```

Les 25 tests de régression utilisent SQLite en mémoire avec Node 22 : conservation d’une base ancienne, migration RPE, CRUD, historique, exclusion de la séance courante, favoris, durée, programme, préférences existantes, conversions, statistiques, import XLSX, images embarquées, premier démarrage, poids, prénom et objectifs, classement des programmes, création d’exercices, réinitialisation complète, conversion en tonnes, carte musculaire et périodes, équivalences d’objets, tutoriel, pyramides PDC et exclusion des séries non réalisées des records et courbes. L’export vérifie le bundling iOS ; il ne produit pas un fichier IPA.

À valider sur iPhone : bouton Terminé et clavier kg/reps/RPE, premier démarrage vierge et reprise après fermeture, vibration, repos après verrouillage, cadrage des images, appui long de suppression, import depuis Fichiers et mise à jour sur une installation contenant déjà des données. Aucun simulateur iOS ou iPhone n’était connecté pendant cette réalisation.
