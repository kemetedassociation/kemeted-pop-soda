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

## 6. Panier + paiement dynamique

Depuis la mise à jour panier, les prix (B2C/B2B, -15%) sont calculés automatiquement côté serveur par `create-checkout-session` — plus besoin de créer des Payment Links séparés pour le B2B. Le catalogue (prix, noms) vit à deux endroits qui doivent rester synchronisés :
- `project/pop/pop-products.js` (affichage côté site)
- `supabase/functions/create-checkout-session/index.ts`, objet `CATALOG` (source de vérité pour le paiement)

## 7. Newsletter, panier abandonné, demande d'avis (emailing automatique)

Ça tourne sur [Resend](https://resend.com) — crée un compte, récupère une clé API (*API Keys → Create*), puis :

```bash
npx supabase secrets set RESEND_API_KEY=re_xxx
```

Par défaut les emails partent de `onboarding@resend.dev` (fonctionne pour tester). Pour envoyer aux vrais clients avec ton propre nom de domaine, vérifie un domaine dans Resend (*Domains*) puis :

```bash
npx supabase secrets set RESEND_FROM="Kemeted Saveur <hello@tondomaine.fr>"
```

Trois fonctions tournent automatiquement (déjà planifiées via `pg_cron`, voir `migration-4-cron-schedule.sql`) :
- **`send-abandoned-cart-reminders`** — toutes les 15 min, relance les paniers inactifs depuis 2h (uniquement pour les clients connectés — voir note plus bas)
- **`send-review-requests`** — tous les jours à 9h, demande un avis 14 jours après une commande

Une quatrième est à déclencher **manuellement** pour annoncer un lancement/nouveauté :

```bash
curl -X POST https://kpsuwkbrovbuudcndaot.supabase.co/functions/v1/send-newsletter-campaign \
  -H "x-admin-secret: <ADMIN_SECRET — demande-le à Claude ou regarde Edge Functions → Secrets>" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Nouvelle saveur chez Kemeted !","message":"<p>Le texte de ton email en HTML simple...</p>"}'
```

Elle envoie à tous les abonnés de la table `subscribers` (alimentée par le formulaire newsletter du site) qui ne se sont pas désinscrits.

**Note importante sur le panier abandonné** : le panier "public" du site vit dans le `localStorage` du navigateur — invisible au serveur. Un client doit donc être **connecté** (`compte.html`) pour que son panier soit synchronisé côté Supabase (table `carts`) et puisse déclencher une relance. Un visiteur non connecté qui abandonne son panier ne reçoit pas d'email (on n'a pas son adresse).

## Comment ça marche, en bref

- Un client connecté qui commande via le panier voit son `client_reference_id` (son id de compte) attaché à la session Stripe créée dynamiquement.
- Stripe déclenche le webhook à la fin du paiement → la fonction retrouve le client (par `client_reference_id`, ou par email en repli), enregistre la commande, crédite 1 point par euro dépensé, et décrémente le stock des articles limités (coffret de lancement).
- RLS garantit qu'un client ne peut lire/modifier que ses propres données (panier, commandes, points), et ne peut jamais s'attribuer lui-même le tarif pro ou des points (seuls le webhook et les fonctions planifiées, via `service_role`, peuvent écrire ces valeurs).
