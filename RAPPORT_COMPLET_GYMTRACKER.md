# GymTracker — rapport complet des fonctionnalités

État du projet au 29 octobre 2026.

Projet : `C:\Users\killa\Downloads\GymtrackerRefonteV2\GymtrackerRefonte`.

GymTracker est une application de suivi de musculation destinée à l’iPhone. Elle fonctionne localement, sans compte utilisateur ni serveur de stockage GymTracker. Ses cinq onglets sont Accueil, Exercices, Historique, Stats et Profil.

## 1. Identité et interface

- Thème sombre avec accent vert GymTracker et choix de couleurs dans le profil.
- Cartes, boutons et écrans harmonisés.
- Logo K néon avec haltère fourni par l’utilisateur : accueil, configuration initiale, tutoriel, icône iOS et écran de lancement.
- Illustrations locales pour les exercices, disponibles sans connexion.
- Unités kg/lbs, avec conservation des charges de référence en kilogrammes.
- Bouton Terminé pour fermer les claviers numériques des saisies concernées ; fermeture du clavier après enregistrement du poids corporel.

L’icône et le splash natifs sont intégrés au build iOS. Leur apparence finale se vérifie sur l’application installée.

## 2. Première ouverture et personnalisation

Le parcours de configuration recueille :

1. Le prénom et les priorités musculaires : biceps, pectoraux, dos, fessiers ou tout le corps.
2. Le choix d’un programme ou du mode libre. Les programmes liés aux priorités sont proposés d’abord. Le bouton Continuer reste fixé sous la liste, avec le nom du programme sélectionné.
3. Le poids corporel en kg ou lbs, renseignable plus tard, et le choix de reprise des données : aucun historique, Excel `.xlsx`/`.xls`, ou sauvegarde GymTracker `.json`.

Le prénom apparaît à côté de Bonjour/Bonsoir sur l’accueil et reste modifiable dans le profil. Le poids, les objectifs et le programme sont conservés localement. Une ancienne installation sans prénom passe par la configuration en conservant son historique et ses informations déjà enregistrées.

La suppression complète des données repropose cette configuration. L’import choisi s’ouvre après la configuration et le tutoriel ; aucune restauration ne s’exécute sans prévisualisation et confirmation.

## 3. Mini tutoriel

- Guide facultatif en quatre étapes : accueil, séance et validation des séries, historique et bilan, puis profil et exercices personnalisés.
- Essai de la coche de validation sans créer une séance réelle.
- Possibilité de passer le guide.
- État vu/passé conservé localement.
- Relecture depuis Profil → Revoir le mini tutoriel.

## 4. Accueil

- Salutation personnalisée et date du jour.
- Prochaine séance du programme, muscles concernés et nombre d’exercices.
- Démarrage direct de la séance prévue ou d’une séance libre.
- Accès au choix des programmes.
- Volume et nombre de séances des sept derniers jours.
- Régularité hebdomadaire et progression vers l’objectif.
- Mise en avant d’un record personnel.
- Trois séances récentes avec accès à leur détail.
- Suggestion d’entraînement à partir de l’historique, avec aperçu avant démarrage.

## 5. Programmes

| Programme | Principe |
| --- | --- |
| Push / Pull / Legs | Répartition par poussée, tirage et jambes. |
| Full Body 3j | Travail du corps entier sur trois jours. |
| Haut/Bas 4j | Alternance haut et bas du corps. |
| Priorité biceps | Accent sur les biceps avec maintien des autres groupes. |
| Priorité pectoraux | Accent sur les pectoraux. |
| Priorité dos | Accent sur le dos. |
| Jambes & fessiers | Accent sur le bas du corps et les fessiers. |
| Entraînement libre | Choix des exercices à chaque séance. |

Les programmes disposent d’un aperçu de leurs séances. Le jour de programme avance lors de son démarrage. Conserver le même programme pendant une configuration ne remet pas automatiquement sa progression à zéro.

## 6. Bibliothèque et fiches d’exercices

- Catalogue prédéfini organisé par groupe musculaire.
- Recherche insensible aux accents et aux majuscules dans la bibliothèque.
- Favoris conservés localement.
- Création d’exercices personnalisés avec nom et catégorie.
- Vérification des doublons de noms lors de la création depuis la bibliothèque.
- 35 illustrations raster embarquées, utilisées dans la bibliothèque, les séances et les fiches.
- Rendu de secours pour les exercices personnalisés.
- Consignes et erreurs fréquentes pour les exercices prédéfinis documentés.
- Records et graphiques de progression, avec choix de période et de métrique : charge, volume ou répétitions.

## 7. Suivi d’une séance

- Séance préremplie depuis un programme ou créée librement.
- Titre, durée écoulée, nombre d’exercices et de séries.
- Ajout d’exercices depuis les récents, la recherche ou les catégories ; création d’une machine personnalisée depuis le sélecteur.
- Saisie des charges, répétitions et RPE facultatif entre 1 et 10.
- Préremplissage à partir d’une série précédente ou de la dernière performance disponible.
- Poids corporel utilisé comme charge par défaut pour les exercices concernés.
- Dernière performance affichée sans prendre la séance courante comme référence.
- Objectif indicatif de progression.
- Validation visuelle des séries et vibration.
- Signalement d’un nouveau record.
- Suppression d’une série par appui long sur sa validation, avec confirmation.
- Suppression d’un exercice et de ses séries, avec confirmation.
- Fin de séance confirmée et durée enregistrée sans écraser une durée déjà existante.

Les champs sont sauvegardés à la sortie de la saisie, comme dans l’application initiale. La coche sert à suivre la réalisation ; une série enregistrée peut donc exister sans coche. Les séries à zéro répétition n’ajoutent ni volume, ni record, ni point de progression.

## 8. Réorganisation par glisser-déposer

- Maintien sur la poignée ☰, puis déplacement vers le haut ou le bas.
- Retour visuel et vibration au début du déplacement.
- Ligne verte indiquant la destination.
- Défilement automatique près des bords.
- Prise en compte des cartes de hauteurs différentes.
- Sauvegarde de l’ordre via `order_index`, dans une transaction SQLite.
- Refus des listes incomplètes, doublons ou identifiants appartenant à une autre séance.

La poignée prend directement le contrôle du toucher. La séance utilise une présentation normale avec fermeture gestuelle désactivée, pour éviter le conflit avec le geste iOS de fermeture. Le bouton Retour reste disponible. Réorganiser les exercices ne supprime ni séance, ni série, ni note.

## 9. Remplacement intelligent d’un exercice

Le menu ⋯ d’une carte permet de consulter la fiche, modifier une note, remplacer ou supprimer l’exercice.

Les alternatives sont calculées localement à partir du mouvement, des muscles, de la catégorie et de l’équipement renseignés. Aucune IA distante n’est utilisée.

| Critère commun | Points |
| --- | --- |
| Même type de mouvement | +5 |
| Muscle principal commun | +4 |
| Même catégorie | +2 |
| Muscle secondaire commun | +1 |

Chaque alternative affiche un score sur 12 et les critères obtenus. Les suggestions les plus proches apparaissent d’abord ; toute la bibliothèque reste accessible. Les exercices personnalisés disposant seulement d’une catégorie reçoivent un score limité à ces informations. Un exercice source inconnu affiche Score indisponible.

Sans répétition enregistrée, l’exercice peut être remplacé sur place et ses brouillons spécifiques sont retirés. Dès qu’une série contient des répétitions, l’exercice d’origine et ses séries restent conservés. Le remplacement est ajouté juste après, avec deux choix : garder les brouillons sur l’ancien exercice, ou déplacer uniquement les séries à zéro répétition vers le nouveau sans reprendre la charge ni les métadonnées de pyramide de l’ancienne machine.

## 10. Notes

Deux types de notes sont disponibles :

- **Note machine persistante** : siège, poignée, inclinaison, réglage de poulie, consigne personnelle. Elle réapparaît aux prochaines séances et peut être masquée pendant l’entraînement sans être supprimée.
- **Note de séance** : fatigue ou observation du jour, attachée uniquement à cet exercice dans cette séance.

Les notes peuvent être créées, modifiées, consultées et supprimées. La recherche d’une note persistante tolère les différences d’accents et de casse dans le nom de l’exercice. Les notes sont incluses dans les sauvegardes.

## 11. Pyramides au poids du corps

- Disponibles pour Pompes, Traction et Pistol squat.
- Choix entre mode classique et pyramide.
- Réglage du départ, du pas et du nombre de paliers.
- Montée, descente ou aller-retour ; exemple : `2 → 4 → 6 → 4 → 2`.
- Ajout des paliers un à un et validation avant progression au suivant.
- Répétitions prévues présentées comme objectifs ; enregistrement des répétitions réellement saisies.
- Configuration et avancement persistés localement.
- Redémarrage d’un cycle avec confirmation, en conservant les séries précédentes.
- Signalement des séries de pyramide dans l’historique.

Les paliers non réalisés restent à zéro répétition et ne créent aucun faux volume ou record. Le RPE reste facultatif et le comportement du repos suit le réglage du profil.

## 12. Repos plein écran

- Écran dédié avec grand chronomètre, fond sombre, accent vert et barre de progression.
- Durée initiale de 90 secondes ; choix 60, 90, 120 ou 180 secondes.
- Actions −15 secondes, +30 secondes et Passer.
- Nom de l’exercice, numéro de la série terminée et charge × répétitions.
- Déclenchement manuel ou ouverture automatique après validation, selon la préférence du profil.
- Retour à la séance sans arrêter le repos, avec accès pour le reprendre.
- Affichage Repos terminé et bouton de retour à zéro.
- Arrêt du repos à la fin de la séance.

Le décompte repose sur une heure de fin réelle, persistée avec son contexte. Il se recale après un passage en arrière-plan ou une réouverture. Un seul repos est actif à la fois. La vibration est délivrée quand l’app est active, ou au retour si iOS a suspendu JavaScript ; aucune alarme garantie pendant le verrouillage n’est activée.

## 13. Historique

- Liste des séances et calendrier mensuel.
- Repérage des jours avec entraînement et consultation des séances d’un jour.
- Titre, date, durée disponible, nombre de séries et volume.
- Détail des exercices, charges, répétitions, RPE et pyramides.
- Suppression d’une séance avec confirmation.

Le bouton Importer mon historique Excel a été retiré de cet onglet. L’import est regroupé dans Profil → Mes données et reste proposé au démarrage.

## 14. Statistiques et bilan musculaire

Le tableau de bord présente les séances et le volume total, l’activité sur douze semaines, le volume par groupe, les records et les courbes de progression par exercice.

Le bilan détaillé ajoute :

- Carte corporelle interactive de face et de dos, avec dix groupes musculaires.
- Analyse sur 7, 28 ou 90 jours.
- Répartition des séries avec répétitions, y compris au poids du corps.
- Pondération des muscles secondaires.
- Groupes les plus sollicités et groupes moins entraînés.
- Suggestion d’un programme de rééquilibrage, avec aperçu et confirmation avant activation.
- Affichage en tonnes à partir de 1 000 kg lorsque l’unité choisie est le kilogramme.
- Comparaisons du volume cumulé avec un pack d’eau de 6 kg, un vélo de 15 kg, un lave-linge de 70 kg ou une petite voiture de 1 000 kg.

Trois séances de musculation classées sur la période sont nécessaires avant de colorer les points forts et groupes moins sollicités. Les exercices non identifiables ne sont pas affectés arbitrairement à un muscle. Ce bilan décrit la répartition de l’entraînement, pas une mesure du développement physique ou de la force réelle. Les comparaisons d’objets représentent une charge cumulée.

## 15. Régularité hebdomadaire

- Objectif réglable à 2, 3, 4 ou 5 séances par semaine ; valeur initiale 3.
- Nombre de semaines régulières, progression chiffrée et pastilles sur l’accueil.
- Calcul depuis l’historique SQLite ; seul l’objectif est stocké.
- Semaine locale du lundi au dimanche.
- Une séance compte si elle contient au moins une série avec des répétitions enregistrées, y compris une ancienne séance ou un import.
- Une séance vide ou une date future ne compte pas.
- La semaine en cours encore sous l’objectif ne casse pas les semaines précédentes ; une semaine passée manquée interrompt la série.
- Un changement d’objectif recalcule aussi les semaines passées avec ce nouvel objectif.

## 16. Profil et préférences

- Prénom, poids corporel, kg/lbs et priorités musculaires.
- Programme actif et accès aux programmes.
- Objectif hebdomadaire et repos automatique.
- Création d’exercices personnalisés.
- Choix de couleur.
- Actions de données harmonisées : sauvegarder, restaurer, exporter Excel, exporter la copie de récupération lorsqu’elle existe, importer Excel et réinitialiser.
- Relecture du tutoriel.

La réinitialisation confirmée efface les données personnelles locales, les notes, les préférences et les copies privées de sauvegarde, puis rouvre la configuration. Les fichiers déjà exportés par l’utilisateur dans Fichiers ne sont pas supprimés par cette action.

## 17. Import et export Excel

**Import** : fichiers `.xlsx` et `.xls`, sélection dans Fichiers, copie en cache puis lecture locale. Colonnes attendues : Date, Machine, Série facultative, Poids en kg et Rep. Prévisualisation, avertissements sur les lignes non exploitables et détection des dates déjà présentes avant enregistrement. Un modèle est fourni dans `examples/historique-exemple.xlsx`.

**Export** : fichier `.xlsx` avec date, machine, numéro de série, charge en kg, répétitions et RPE, partagé vers la destination choisie.

Le sélecteur est protégé contre les doubles ouvertures, y compris entre écrans. Le bouton est désactivé pendant la sélection et la lecture. Les erreurs de sélection et de lecture sont distinguées. L’erreur iOS Different document picking in progress dispose d’une indication de récupération sans désinstallation de l’application.

## 18. Sauvegarde et restauration complète

- Format JSON GymTracker avec marqueur de format, version 1 et date de création.
- Conservation des séances, exercices, séries, catalogue personnalisé, autocomplete, préférences historiques, préférences utilisateur et notes persistantes.
- Inclusion des favoris, du prénom, du programme actif, des objectifs, des unités, du tutoriel, des durées et des plans de pyramide via leurs préférences.
- Exclusion du repos en cours, considéré comme état temporaire.
- Export manuel via la feuille de partage ; aucun transfert automatique.
- Résumé du fichier sélectionné avec date et nombres de séances, exercices et séries.
- Vérification de la structure, de la version, des types, dates, doublons et références avant modification.
- Copie de récupération de l’état actuel avant restauration.
- Remplacement complet dans une transaction SQLite, avec rollback si une écriture échoue.
- Dernière copie de récupération exportable depuis le profil.

La fusion de deux sauvegardes n’est pas implémentée. Excel ne remplace pas ce format complet : il ne contient pas toutes les préférences et métadonnées.

## 19. Widget iPhone

- Tailles petite et moyenne.
- Prochaine séance et objectif hebdomadaire.
- Muscles concernés et semaines régulières en taille moyenne.
- Appui pour ouvrir l’accueil de GymTracker.
- Résumé calculé par l’application, sans accès direct du widget à SQLite.
- Synchronisation au lancement, au retour dans l’app et après les modifications de données concernées.
- Calendrier d’actualisation pour les semaines suivantes ; iOS contrôle le rafraîchissement effectif.

Extension configurée : `com.killan.gymtracker.widgets`. Groupe partagé : `group.com.killan.gymtracker`. Ce widget nécessite un build natif et reste à valider sur iPhone/TestFlight. Il ne se teste pas dans Expo Go, conformément à la [documentation Expo Widgets](https://docs.expo.dev/versions/v58.0.0/sdk/widgets/).

## 20. Architecture et conservation des anciennes données

- Expo SDK 58, React Native 0.88.1 et Expo Router.
- SQLite local, base `gymtracker.db`, stores Zustand.
- Anciennes migrations conservées ; migration 4 additive pour les notes machine.
- Charges stockées en kg ; conversions à l’affichage et à la saisie.
- Pas de compte, de backend GymTracker ou de chargement distant des illustrations.
- Identifiant iOS conservé : `com.killan.gymtracker`.

Les mises à jour sur l’iPhone doivent conserver cet identifiant et une signature compatible. Ne pas désinstaller l’app pour installer le prochain build : les séances sont locales. Une sauvegarde exportée permet de préparer un changement de téléphone.

## 21. Contrôles et limites actuelles

- 47 tests de régression réussis, avec SQLite isolé en mémoire et tests de logique.
- 6 tests du sélecteur de fichiers réussis : 53 au total.
- TypeScript : valide après la suppression du bouton de l’Historique.
- Dernier export iOS : réussi ; cet export ne produit pas un IPA signé.
- Dernier Expo Doctor : 20/20 contrôles réussis.
- Restauration testée avec une panne SQLite simulée pour vérifier le rollback.
- Préservation des séries et notes testée après réorganisation et remplacement.

Les essais physiques restent nécessaires pour le widget, les gestes iOS, le partage, les fichiers iCloud et les comportements en arrière-plan. Les alertes connues de dépendances de la chaîne Expo et leur analyse figurent dans [VERIFICATION.md](./VERIFICATION.md).

La Live Activity du repos et la Dynamic Island sont une étape ultérieure. Aucun affichage actif du repos sur écran verrouillé, aucune synchronisation cloud automatique et aucune publication publique sur l’App Store ne sont activés par ce rapport.

## 22. Envoyer le prochain build sur TestFlight

La configuration existante utilise le profil `production`, les numéros de build distants et `autoIncrement: true`. Le numéro de build iOS augmente donc automatiquement, conformément à la [gestion des versions EAS](https://docs.expo.dev/build-reference/app-versions/).

### Ouvrir le bon dossier

```powershell
cd "C:\Users\killa\Downloads\GymtrackerRefonteV2\GymtrackerRefonte"
```

Si EAS demande une connexion à Expo :

```powershell
npx.cmd eas-cli@latest login
```

### Compiler pour la distribution Apple

```powershell
npx.cmd eas-cli@latest build --platform ios --profile production
```

Attendre la réussite du build. Utiliser les comptes Expo et Apple associés à GymTracker et la même équipe Apple que les builds existants. L’ajout du widget peut demander la configuration des identifiants et profils de signature de l’extension et du groupe partagé. Ne pas choisir le profil development ou preview pour un envoi TestFlight.

### Envoyer le build terminé

```powershell
npx.cmd eas-cli@latest submit --platform ios --profile production --latest
```

`--latest` sélectionne le dernier build iOS du projet. Lancer cette commande après la réussite du build production ci-dessus. S’il faut sélectionner précisément un autre build, remplacer `--latest` par `--id IDENTIFIANT_DU_BUILD`. Ces options sont documentées dans la [référence EAS CLI](https://docs.expo.dev/eas/cli/#eas-submit).

Si EAS demande l’Apple ID de l’application dans App Store Connect, il s’agit de son identifiant numérique, disponible dans les informations de l’app ; ce n’est pas le bundle identifier `com.killan.gymtracker`. Le profil de soumission est interactif pour permettre de renseigner les informations manquantes.

### Installer dans TestFlight

Après l’envoi, attendre le traitement Apple puis ouvrir App Store Connect → GymTracker → TestFlight. Vérifier les éventuelles informations demandées et l’accès du groupe de testeurs. Mettre à jour GymTracker depuis TestFlight, sans désinstallation, puis vérifier notamment l’historique conservé, l’import, la sauvegarde/restauration et les deux tailles du widget.

L’envoi rend le build disponible dans le parcours TestFlight après traitement ; une publication publique demande une soumission distincte à App Review. Voir le [guide officiel EAS Submit pour iOS](https://docs.expo.dev/submit/ios/).

Aucune compilation signée ni soumission à Apple n’a été lancée pendant cette intervention : les commandes ci-dessus sont prêtes à être exécutées par l’utilisateur.
