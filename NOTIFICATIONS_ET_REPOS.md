# Repos, Live Activity et rappels — 4 novembre 2026

## Pendant la séance

Après validation d’une série, un bouton reste visible en bas de l’écran : **Démarrer le repos · 90 s**, avec le nom de l’exercice et le numéro de série. Il est inutile de remonter la liste. Si un repos est déjà actif, ce bouton propose **Reprendre le chrono** et affiche le temps restant ; il ne crée pas un deuxième timer. La durée se règle avec les présélections existantes ou depuis l’écran de repos.

Le réglage d’ouverture automatique après validation reste disponible dans Profil → Mon entraînement. L’autorisation iOS des notifications est demandée au démarrage d’un repos si elle n’a pas encore été choisie ; refuser cette autorisation n’empêche pas le chronomètre interne de fonctionner.

## Sans programme

Le choix **Sans programme · Mode libre** apparaît avant les programmes pendant la configuration initiale et dans l’écran Programmes. Le profil propose aussi **Programme ou mode libre**. Passer en mode libre conserve les anciennes séances et le profil. Un ancien réglage de programme ne peut plus annuler un choix explicite du mode libre au prochain chargement.

## Chrono hors de l’application

Le repos dispose d’une Live Activity iOS avec affichage sur l’écran verrouillé et dans les présentations compacte, minimale et étendue de la Dynamic Island des iPhone compatibles. Elle utilise un intervalle natif SwiftUI, avec une date de fin réelle : le texte du chrono se met à jour sans intervalle JavaScript en arrière-plan.

Une seule Live Activity de repos est conservée. Changer la durée met à jour cette activité ; passer le repos, terminer la séance ou réinitialiser les données l’arrête. Les activités existantes peuvent être retrouvées après relancement. Quand l’échéance est dépassée, le compteur est borné à zéro et l’activité est marquée périmée ; sa suppression est synchronisée au retour ou à l’exécution suivante de l’app. Si iOS suspend complètement l’app, aucune exécution JavaScript exacte à l’échéance n’est supposée.

Une notification locale **Repos terminé** est programmée à l’heure de fin. Les ajustements remplacent sa programmation ; l’arrêt du repos annule l’alerte en attente. Appuyer dessus ouvre l’écran de repos. La livraison et les présentations effectives dépendent des autorisations et réglages iOS, notamment des modes de concentration.

Aucun serveur, jeton push distant ou service de suivi n’est ajouté. La Live Activity utilise la cible Expo Widgets existante ; aucune fausse entrée de widget supplémentaire n’est créée pour elle.

## Rappel créatine

Dans **Profil → Mes rappels** :

- Rappel désactivé par défaut, avec heure initiale proposée à 09:00.
- Choix de l’heure et des minutes ; activation soumise à l’autorisation iOS.
- Bouton pour enregistrer une nouvelle heure et interrupteur pour désactiver le rappel.
- Un seul rappel récurrent quotidien, y compris les jours sans séance, selon l’heure locale.
- Accès aux réglages système si les notifications sont refusées.
- Texte neutre de rappel, sans quantité ou recommandation de dosage.

Le changement d’heure remplace le même identifiant de notification. La préférence est incluse dans la sauvegarde complète. La restauration resynchronise les alertes avec les autorisations du téléphone ; elle ne demande pas silencieusement une permission. La suppression complète des données désactive le rappel et annule les programmations propres à GymTracker.

## Vérification

53 tests de régression SQLite/logique, 6 tests du sélecteur et 8 tests système : **67 tests**. Les nouveaux cas couvrent les limites d’heure, les préférences invalides, sauvegarde/restauration du rappel, passage en mode libre sans perte d’historique, alertes concurrentes, arrêt après programmation native en cours, reprise de Live Activity, changement d’échéance, expiration et erreurs natives.

Les tests utilisent des adaptateurs pour les API système ; ils ne simulent pas l’interface de l’iPhone. Vérifier sur appareil :

1. Valider une série au milieu d’une longue séance et lancer le repos depuis le bouton inférieur.
2. Revenir à l’accueil de l’iPhone puis verrouiller : vérifier le compteur, les présentations de la Dynamic Island et l’alerte de fin.
3. Tester +30 s, présélections, Passer et fin de séance : aucune alerte ancienne ne doit rester programmée.
4. Activer le rappel créatine à une heure proche, modifier l’heure puis le désactiver ; vérifier qu’il ne se duplique pas.
5. Refuser puis autoriser les notifications dans les réglages ; le timer interne reste utilisable.
6. Passer en mode libre puis relancer l’app ; vérifier l’absence de programme et la conservation de l’historique.

Les fonctions natives nécessitent un **nouveau build iOS** avec `expo-notifications` et la configuration Live Activities. La Live Activity ne se teste pas dans Expo Go. Un build de développement ou TestFlight est nécessaire pour sa validation complète.

```powershell
cd "C:\Users\killa\Downloads\GymtrackerRefonteV2\GymtrackerRefonte"
npx.cmd eas-cli@latest build --platform ios --profile production
```

Après réussite du build :

```powershell
npx.cmd eas-cli@latest submit --platform ios --profile production --latest
```

Faire une mise à jour de l’app existante pour conserver les données. Aucun build signé ni envoi à Apple n’a été lancé ici.

Documentation officielle : [Expo Widgets et Live Activities](https://docs.expo.dev/versions/v58.0.0/sdk/widgets/), [Expo Notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/).
