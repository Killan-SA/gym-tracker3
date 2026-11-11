# Reprendre une séance — 6 novembre 2026

Dans la séance, le bouton « Revenir à l’accueil » et l’icône maison permettent d’accéder aux autres pages sans terminer l’entraînement. Les champs sont sauvegardés à la perte de focus. Le chrono de repos conserve son fonctionnement en arrière-plan.

L’accueil affiche les séances commencées et non terminées avec « Reprendre la séance ». La reprise ouvre le même enregistrement, sans créer de doublon ni avancer de nouveau le programme. Ces séances restent accessibles après fermeture de l’application et après minuit. Le bouton principal privilégie la reprise tant qu’une séance reste en cours.

Depuis le détail dans l’historique, une séance du jour peut être modifiée, y compris après l’avoir terminée. Sa durée initialement enregistrée est conservée. Une séance explicitement marquée en cours peut également être reprise un autre jour.

Le suivi utilise une préférence locale par séance, incluse dans les sauvegardes complètes. Les imports Excel ne sont pas automatiquement considérés comme des séances en cours. Les données et tables d’entraînement existantes sont conservées. Une ancienne séance sans ce marqueur peut être ouverte depuis l’historique le jour même ; l’éditeur la marque alors en cours si elle n’avait pas été terminée.

Le compteur de durée représente toujours le temps écoulé depuis la création de la séance, y compris le temps passé hors de cet écran.

Vérification : TypeScript et tests de régression SQLite, dont reprise avec conservation des séries, exclusion des imports/séances supprimées et modification selon le jour local. À vérifier sur iPhone : quitter avec un champ en cours de saisie, utiliser les autres onglets, fermer puis rouvrir l’application, reprendre et terminer, puis modifier depuis l’historique.
