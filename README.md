# 🧭 Expédition — V4 Production (Next.js + Supabase)

Cette version remplace complètement le prototype local `server.js + db.json + uploads/` par une architecture prête pour hébergement :

- **Next.js / App Router / TypeScript**
- **Supabase Auth** : comptes, confirmation email, reset password, changement d'email/mot de passe
- **Supabase PostgreSQL** : événements, défis, votes, commentaires, classement
- **Supabase Storage** : avatars + preuves privées
- **RLS + RPC sécurisées** : logique de score côté base, pas dans le navigateur
- **Ko-fi** : `https://ko-fi.com/expedition`
- emplacements AdSense déjà prévus
- design Expédition bois / forêt / lianes conservé

## Important — état de TON projet Supabase

Les migrations 01 → 04 ont déjà été exécutées manuellement pendant la configuration :

1. schéma initial ;
2. RLS ;
3. fonctions métier ;
4. Storage.

Avant de lancer V4, exécute encore dans **Supabase → SQL Editor**, dans cet ordre :

1. `migrations/05_production_hardening.sql`
2. `migrations/06_notifications.sql`
3. `migrations/07_final_game_hardening.sql`

Tu dois obtenir à la fin :

- `EXPEDITION PRODUCTION HARDENING OK`
- `EXPEDITION NOTIFICATIONS OK`
- `EXPEDITION FINAL HARDENING OK`

Ces migrations renforcent notamment le mode secret, le classement caché, la concurrence des défis exclusifs, le nombre maximal de membres, la résolution des votes expirés, les notifications et les outils super-admin.

## 1. Installer

Prérequis : Node.js 20+.

```bash
npm install
```

## 2. Variables locales

Le ZIP contient déjà un `.env.local` configuré avec la **Project URL** et la **Publishable Key** que tu as créées. Cette clé est publique par conception ; aucune Secret/Service Role key n'est incluse.

Pour un autre projet, copie :

```bash
cp .env.example .env.local
```

Variables :

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SUPPORT_URL=https://ko-fi.com/expedition
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ADSENSE_CLIENT=
NEXT_PUBLIC_ADSENSE_SLOT_TOP=
NEXT_PUBLIC_ADSENSE_SLOT_RECT=
```

## 3. Lancer en local

```bash
npm run dev
```

Puis ouvre :

`http://localhost:3000`

## 4. Test d'inscription

Supabase doit avoir :

- Email Provider activé ;
- confirmation email activée ;
- `Site URL = http://localhost:3000` ;
- Redirect URL `http://localhost:3000/**`.

Crée un compte avec **l'adresse email de ton compte/équipe Supabase** tant que tu utilises le SMTP de test Supabase. Pour ouvrir les inscriptions à n'importe quelle adresse, il faudra brancher un SMTP de production plus tard (Resend, etc.).

Flux :

1. `/register`
2. réception email
3. clic confirmation
4. `/auth/callback`
5. connexion

Le mot de passe oublié est déjà sur `/forgot-password`.

## 5. Test fonctionnel conseillé

1. Crée un compte et confirme l'email.
2. Crée une expédition avec départ dans quelques jours.
3. Ajoute des défis depuis **Admin**.
4. Vérifie qu'un participant ne voit pas les défis avant le départ.
5. Crée un événement avec départ immédiat pour tester rapidement.
6. Publie une preuve photo/vidéo : le média est envoyé dans le bucket privé `attempt-media`.
7. Avec un deuxième compte, vote 👍/👎 et change le vote.
8. Vérifie classement et commentaires.
9. Modifie avatar, pseudo, bio et mot de passe.
10. Teste un défi exclusif.
11. Teste classement caché et mode secret.

## Médias

Les preuves sont stockées avec :

`eventId/attemptId/userId/fichier`

Le bucket `attempt-media` reste **privé**. Les pages créent des URL signées uniquement pour les membres autorisés.

Les médias utilisent `object-fit: contain` : ils sont affichés en entier sans recadrage.

## Super-admin

Après avoir créé TON compte dans la nouvelle app, passe-le une seule fois en admin depuis le SQL Editor :

```sql
update public.profiles
set role = 'platform_admin'
where id = (
  select id from auth.users where email = 'TON_EMAIL'
);
```

Ne crée jamais une fonction client permettant de modifier `role`.

## GitHub

Le `.gitignore` exclut `.env.local`, donc tes variables locales ne sont pas poussées dans GitHub.

```bash
git init
git add .
git commit -m "Expedition V4 production"
```

Crée ensuite un repository GitHub et pousse le projet.

## Hébergement gratuit

Pour le premier déploiement, connecte ton repository GitHub à un hébergeur Next.js compatible. Ajoute dans son tableau de bord les variables présentes dans `.env.local`.

Après le premier déploiement, tu obtiendras une URL publique. Mets alors cette URL dans Supabase :

- **Authentication → URL Configuration → Site URL**
- ajoute également `https://TON-URL/**` dans Redirect URLs
- garde `http://localhost:3000/**` pour le développement

Change aussi :

```env
NEXT_PUBLIC_SITE_URL=https://TON-URL
```

## Emails de production

Ne branche pas encore Resend tant que tu n'as pas un domaine que tu contrôles. Le SMTP Supabase intégré convient aux tests mais pas à l'ouverture publique.

Quand tu auras un domaine :

1. vérifier le domaine chez Resend ;
2. connecter le SMTP Resend à Supabase Auth ;
3. personnaliser les templates d'email Expédition ;
4. tester confirmation, reset, changement email et changement de mot de passe.

## Publicité

Les emplacements sont déjà présents mais restent des placeholders tant que :

```env
NEXT_PUBLIC_ADSENSE_CLIENT=
NEXT_PUBLIC_ADSENSE_SLOT_TOP=
NEXT_PUBLIC_ADSENSE_SLOT_RECT=
```

sont vides. `/ads.txt` est généré automatiquement lorsque le client AdSense est renseigné.

Avant AdSense en Europe, ajoute une CMP/gestion du consentement conforme aux exigences applicables.

## Ce qui change par rapport à V3.1

- plus de `data/db.json` ;
- plus de `uploads/` local ;
- plus de sessions en mémoire ;
- authentification Supabase ;
- confirmation email ;
- récupération de mot de passe ;
- médias privés Supabase ;
- score et votes sécurisés en PostgreSQL ;
- concurrence renforcée pour limites de membres et défis exclusifs ;
- notifications DB ;
- architecture compatible déploiement serverless.

## À finaliser avant ouverture publique massive

- SMTP de production ;
- domaine officiel ;
- politique de confidentialité / CGU définitives ;
- suppression de compte et export des données ;
- compression/transcodage vidéo à grande échelle ;
- tâche planifiée pour résoudre les votes même sans visite de page (la V4 les résout actuellement lors des accès à l'événement) ;
- CMP avant AdSense ;
- observabilité et sauvegardes ;
- tests E2E.
