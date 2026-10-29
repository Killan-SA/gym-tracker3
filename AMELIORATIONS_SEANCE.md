# Améliorations pour les séances en salle

## Ajustements après les premiers essais

- La poignée de déplacement prend le contrôle du toucher dès le début de l’appui. Le déplacement ne passe plus par une capture tardive de toute la liste. La séance utilise une présentation normale avec fermeture gestuelle désactivée ; le bouton Retour reste disponible.
- Toutes les actions de Mes données utilisent la même ligne avec icône, description et chevron, dans une carte commune.
- Le démarrage propose trois choix : aucun historique, fichier Excel, ancienne sauvegarde GymTracker. Le dernier choix ouvre l’écran de restauration après la configuration et le tutoriel, avec aperçu et confirmation avant remplacement.
- Lors du choix du programme, le bouton Continuer et le nom du programme sélectionné restent fixés sous la liste ; aucune descente en bas de page n’est nécessaire.
- Les remplacements affichent leur score sur 12 et les critères qui le composent. Les exercices inconnus affichent Score indisponible ; un exercice personnalisé sans autres métadonnées ne reçoit que les points de catégorie.

Les tests de déplacement couvrent aussi des cartes de tailles différentes, les déplacements dans les deux sens et la conservation des séries et notes après relecture de SQLite. Le geste natif corrigé reste à confirmer sur iPhone.

| Fonction | Utilisation |
| --- | --- |
| Notes machine | Carte exercice → Ajouter une note machine ou menu ⋯. Réutilisées aux prochaines séances, avec option de visibilité. |
| Notes de séance | Même éditeur, onglet Cette séance. Attachées uniquement à cette occurrence de l’exercice. |
| Déplacement | Maintenir la poignée ☰, déplacer puis relâcher. Ligne verte à la destination, défilement près des bords. |
| Remplacement | Menu ⋯ → Remplacer l’exercice. Suggestions locales selon mouvement, muscles et catégorie ; accès à toute la bibliothèque. |
| Régularité | Accueil : semaines régulières et progression hebdomadaire. Profil → Mon entraînement : objectif de 2, 3, 4 ou 5 séances. |
| Repos plein écran | Bouton en haut de la séance, ou ouverture automatique après validation si activée dans le profil. |
| Sauvegarde complète | Profil → Mes données : export JSON versionné et partage choisi par l’utilisateur. |
| Restauration | Choisir un JSON GymTracker, consulter le résumé puis confirmer le remplacement complet. |
| Export Excel | Profil → Mes données : historique en kilogrammes avec RPE. |
| Widget iPhone | Petites et moyennes tailles : prochaine séance et objectif hebdomadaire. La taille moyenne ajoute muscles et semaines régulières. Appui pour ouvrir l’accueil. |

## Conservation des données

La migration SQLite 3 → 4 ajoute uniquement `exercise_notes` avec une préférence de visibilité. Les anciennes migrations et les identifiants existants sont conservés.

L’ordre utilise `order_index`, en transaction. La fonction refuse les identifiants étrangers, doublons et listes incomplètes.

Un exercice contenant des répétitions enregistrées n’est jamais renommé par le remplacement : le nouveau est inséré juste après. L’utilisateur choisit de conserver les brouillons sur l’ancien exercice ou de déplacer uniquement les séries à zéro répétition vers le nouveau, sans reprendre la charge de l’ancienne machine ni son plan de pyramide. Les séries réalisées restent intactes, même sauvegardées sans coche par une ancienne version.

La sauvegarde conserve les huit tables applicatives : séances, exercices, séries, catalogue personnalisé, autocomplete, préférences historiques, préférences utilisateur et notes machine. Favoris, programme actif, prénom, objectifs, unités, tutoriel et plans de pyramide figurent dans ces préférences. Le repos en cours, temporaire, est exclu.

Avant restauration : contrôle du format, de la version, des tables, types, dates, doublons et références ; création d’une copie de récupération privée ; remplacement dans une transaction. Une erreur d’écriture déclenche un rollback. La dernière copie de récupération reste exportable depuis le profil. La réinitialisation complète efface aussi ces copies privées ; les fichiers déjà enregistrés dans Fichiers restent disponibles.

La fusion est absente de cette première version. Aucun serveur, compte ou envoi automatique n’a été ajouté.

## Règles de calcul

La semaine va du lundi au dimanche, dans le fuseau local. Une séance compte si elle comporte au moins une série avec des répétitions : les séances importées et anciennes restent éligibles sans nouveau marqueur de fin. Les séances vides et dates futures sont exclues. Plusieurs séances distinctes le même jour comptent séparément.

Le streak est recalculé depuis SQLite et l’objectif actuel. Une semaine en cours encore sous l’objectif ne casse pas les semaines précédentes ; une semaine passée manquée interrompt la série. Changer l’objectif recalcule aussi l’historique.

Le timer utilise une échéance absolue et un store unique persisté. −15 s, +30 s et les présélections modifient cette même échéance. Quitter l’écran ne l’arrête pas ; terminer la séance ou passer le repos l’arrête. À zéro : affichage Repos terminé et bouton de retour. La vibration est délivrée dans l’app active ou au retour si iOS a suspendu JavaScript. Aucune alarme garantie pendant le verrouillage n’est annoncée.

Le widget reçoit un résumé calculé par l’app et un calendrier pour les prochaines semaines. Il n’accède pas à SQLite. Synchronisation au lancement, retour dans l’app, changements de réglages, fins de séances, imports et restaurations. iOS décide de l’heure effective d’actualisation.

## Vérification

53 tests : 47 tests SQLite/logique et 6 tests du sélecteur de fichiers. Couverture des anciennes migrations, notes et accents, déplacement 5 → 1, refus de listes invalides, suggestions, protection des séries, régularité, échéance du repos, sauvegarde complète, documents invalides et rollback après une panne SQLite simulée.

Le projet utilise Expo SDK 58 et React Native 0.88.1. Le widget utilise `com.killan.gymtracker.widgets` et le groupe `group.com.killan.gymtracker`. Documentation : https://docs.expo.dev/versions/v58.0.0/sdk/widgets/.

Préparer le build natif de développement depuis ce dossier :

```powershell
npx.cmd eas-cli@latest build --platform ios --profile development
```

Après installation sur l’iPhone :

```powershell
npx.cmd expo start --dev-client
```

La signature Apple doit autoriser l’app, l’extension et le groupe partagé. Expo Go ne permet pas de valider le widget. Aucun build signé ni envoi à Apple n’a été lancé ici.

## Parcours à tester sur iPhone

1. Mettre à jour une installation contenant des séances, sans désinstaller, puis contrôler l’historique.
2. Retrouver une note machine dans une nouvelle séance et tester sa visibilité.
3. Déplacer une carte courte puis longue, défiler près du bord, quitter et rouvrir pour contrôler l’ordre.
4. Remplacer un exercice vide puis avec des séries ; tester les deux choix de conservation.
5. Tester repos manuel et automatique, −15 s, +30 s, présélections, retour, arrière-plan, expiration et Passer.
6. Exporter JSON et Excel vers Fichiers ; restaurer le JSON et comparer données, notes, préférences et programme ; exporter la copie de récupération.
7. Ajouter les deux tailles de widget, changer programme et objectif, terminer une séance et vérifier le résumé ainsi que l’ouverture de l’app par appui.

## Étape suivante : Live Activity

La Live Activity et la Dynamic Island restent une étape ultérieure, conformément à l’ordre demandé : valider d’abord le timer plein écran sur un vrai iPhone. Aucun affichage du repos sur écran verrouillé n’est activé dans cette version.
