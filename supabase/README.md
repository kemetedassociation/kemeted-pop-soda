# Kemeted Saveur — comptes clients / points / B2B

Backend Supabase pour les comptes clients, le programme de points et les tarifs B2B.
Projet Supabase : `kpsuwkbrovbuudcndaot` (URL déjà branchée dans `project/pop/pop-account.js`).

## 1. Créer les tables (une seule fois)

1. Ouvre ton projet sur [supabase.com](https://supabase.com/dashboard)
2. Va dans **SQL Editor** → **New query**
3. Colle tout le contenu de [`schema.sql`](schema.sql) et clique **Run**

Ça crée les tables `customers`, `orders`, `point_transactions`, les triggers, et les règles de sécurité (RLS) qui garantissent que chaque client ne voit que ses propres données.

## 2. Déployer le webhook Stripe (crédite les points automatiquement)

Le webhook tourne en Supabase Edge Function (`supabase/functions/stripe-webhook`). Depuis un terminal, dans ce dossier `kemeted-pop-soda` :

```bash
npx supabase login
npx supabase link --project-ref kpsuwkbrovbuudcndaot
npx supabase functions deploy stripe-webhook
```

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement par Supabase à la fonction — pas besoin de les configurer. Il reste à ajouter tes clés Stripe :

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

(la clé secrète Stripe se trouve dans ton dashboard Stripe → *Développeurs → Clés API* ; le `whsec_` est généré à l'étape suivante)

## 3. Brancher le webhook dans Stripe

1. Dashboard Stripe → **Développeurs → Webhooks → Ajouter un endpoint**
2. URL de l'endpoint : `https://kpsuwkbrovbuudcndaot.supabase.co/functions/v1/stripe-webhook`
3. Événement à écouter : `checkout.session.completed`
4. Une fois créé, Stripe affiche le **signing secret** (`whsec_...`) → colle-le dans la commande `secrets set` ci-dessus (étape 2)

## 4. Vérifier la confirmation email (optionnel)

Par défaut Supabase demande une confirmation email avant de pouvoir se connecter. Pour un lancement plus fluide, tu peux la désactiver dans **Authentication → Providers → Email → Confirm email** (à réactiver plus tard si besoin).

## 5. Passer un client en tarif pro (B2B)

Un client demande le tarif pro depuis `compte.html` (bouton "Demander le tarif pro"). Pour valider la demande :

1. **Table Editor → customers**
2. Trouve la ligne du client (email visible), vérifie `b2b_requested` et `b2b_company`
3. Change `tier` de `b2c` à `b2b`

Son tableau de bord affichera automatiquement la section tarifs pro à sa prochaine connexion.

## 6. Créer les liens de paiement B2B

Les prix réduits pro ne sont pas automatiques — crée 4 nouveaux **Payment Links** dans Stripe (comme les 4 existants, mais au tarif pro), puis colle leurs URLs dans `project/pop/pop-account.js`, objet `B2B_LINKS` en haut du fichier.

## Comment ça marche, en bref

- Un client connecté qui clique "Commander" sur le site voit son `client_reference_id` (son id de compte) ajouté à l'URL Stripe.
- Stripe déclenche le webhook à la fin du paiement → la fonction retrouve le client (par `client_reference_id`, ou par email en repli), enregistre la commande et crédite 1 point par euro dépensé.
- RLS garantit qu'un client ne peut lire que ses propres commandes/points, et ne peut jamais s'attribuer lui-même le tarif pro ou des points (seul le webhook, avec la clé `service_role`, peut écrire ces valeurs).
