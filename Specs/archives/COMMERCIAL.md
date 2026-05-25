# Argos Commercial Layer -- Brouillon (TECH-DEBT-018)

> Auteur : Alexandre Thibaud -- atconseil.info
> Date : 2026-05-15 (brouillon -- finalisation Sprint 7.1)
> Status : DRAFT
> Refs : Specs/spec.md US-7.X, Specs/tasks.md Phase 7, TECH-DEBT-017 (Azure deploy)

---

## Pricing model (Option C -- hybride validee 2026-05-15)

| Tier | Flat price | Active users included | Extra user/month | Features |
|------|-----------|----------------------|------------------|----------|
| **Free** | $0 | 3 | N/A (hard cap) | Base CRUD + Run + Evidence + Reports Coverage (no AI, no Cloud-Plus) |
| **Pro** | $99/month | 10 | $9 | Full features (Snapshots, Traceability, Import/Export, CI integrations) -- no AI, no Cloud-Plus |
| **Team** | $199/month | 25 | $7 | Full Pro + AI BYOK + Cloud-Plus features (Flakiness, Quotas, Webhooks, BDD sync) |
| **Enterprise** | Custom | Unlimited | Custom | SSO + dedicated support + custom SLA + audit/compliance reports |

### Justification du modele

- **Predictibilite revenue** : flat pricing baseline
- **Alignement valeur** : extras factures sur usage reel
- **Tier free genereux** : 3 users actifs pour adoption virale en equipe pilote
- **Differenciation Team via AI** : justifie le delta Pro -> Team
- **Modele GitHub-like** : familier pour le marche developer

## Definition "user actif"

Un **user actif** est un utilisateur qui a **execute au moins 1 Test Run** dans la fenetre du mois calendaire (entre le 1er du mois 00:00 UTC et la fin du mois 23:59 UTC).

### Pourquoi "Test Run" et pas "open extension" ?

- **Aligne valeur** : un Test Run = production reelle de tests, pas juste ouvrir l'extension
- **Anti-fantome** : exclut les comptes inactifs qui ont juste l'extension installee
- **Mesurable** : action discrete trackable (audit log entry)
- **Difficilement gaming** : pas de way de "fake" un Test Run sans valeur reelle

### Cas particuliers a clarifier (Sprint 7.1)

- **CI automation runs** (via argos-action, argos-cli, azure-pipelines-task) : NE comptent PAS comme user actif (action machine != humain)
- **Multi-tenant user** : un user dans 2 tenants different = 2 active users separes (un par tenant)
- **Plafond mensuel** : cap par tier pour eviter pic facturation surprise ($1000/mois max pour Pro ?)

## Architecture technique requise

### Backend `apps/argos-functions` (modules nouveaux a creer)

```
apps/argos-functions/src/
+- users/                          
|  +- user-tracker.ts            -- log activity (Test Run, edit work item)
|  +- active-user-counter.ts     -- compute MAU par tenant (cron mensuel)
|  +- user-roster-handler.ts     -- admin add/remove user d'un tenant
+- billing/                        
|  +- stripe-checkout.ts         -- create Stripe Checkout session
|  +- stripe-customer-portal.ts  -- magic link vers portail Stripe
|  +- usage-reporter.ts          -- report MAU > palier flat a Stripe metered
|  +- invoice-handler.ts         -- recevoir Stripe invoice events
+- tenant/                         
|  +- tenant-config.ts           -- settings tenant (plan, limits, custom rules)
|  +- seat-allocator.ts          -- qui est admin, qui est user, droits
|  +- feature-gates.ts           -- check si feature dispo selon tier
+- notifications/                  
   +- welcome-email.ts           -- onboarding nouveau client
   +- trial-ending.ts            -- T-3 jours fin trial
   +- billing-alert.ts           -- payment failed, limit reached
   +- monthly-summary.ts         -- email recap usage du mois
```

### Extension UI (sections SettingsView nouvelles, Sprint 7.5)

```
apps/argos-extension/src/hub/
+- AccountSettings.tsx             -- plan actuel, usage current, factures recentes
+- UserRoster.tsx                  -- admin : liste users, retirer acces, redefinir roles
+- BillingPortalLink.tsx           -- bouton "Manage billing" -> Stripe portal
+- UsageHistory.tsx                -- graphe MAU sur 12 derniers mois
+- PlanComparison.tsx              -- upgrade flow (Free -> Pro -> Team)
```

### Portail ATConseil (app SEPARE, hors repo Argos)

```
admin.atconseil.io (Next.js / autre stack, non Argos repo)
+- Dashboard MRR / churn / DAU / MAU / signups
+- Liste tenants (search, filter, sort)
+- Logs Stripe / facturation
+- Support tickets viewer
+- Beta privee whitelist management
+- Customer health score
```

## Roadmap (9 sub-sprints, ~25-30h)

### Sprint 7.1 -- Pricing strategy finalisee (~2h)
- Validation interne du modele Option C (deja faite 2026-05-15)
- Edge cases (CI runs, multi-tenant, plafonds) decides
- `Specs/PRICING.md` officiel (cleanup du brouillon COMMERCIAL.md)
- `Specs/spec.md` US-7.X ajoutees

### Sprint 7.2 -- User tracking backend (~3h)
- `user-tracker.ts` (logger Test Run events)
- `active-user-counter.ts` (compute MAU par tenant)
- Storage : Azure Table Storage `tenant_active_users`
- Job cron mensuel reset compteur le 1er

### Sprint 7.3 -- Stripe setup + integration backend (~4h)
- Configurer products/prices Stripe Dashboard
- `stripe-checkout.ts` + `stripe-customer-portal.ts`
- Webhook events handling (deja partiel)
- `usage-reporter.ts` (metered billing delta)

### Sprint 7.4 -- License engine connection a Stripe events (~2h)
- Connecter `license-engine.ts` aux Stripe events
- Mode degrade licence expiree

### Sprint 7.5 -- Admin UI extension (~3h)
- AccountSettings + UserRoster + BillingPortalLink + UsageHistory + PlanComparison
- Wire dans Settings hub

### Sprint 7.6 -- Portail ATConseil (~6-8h, app separe)
- Dashboard admin Next.js
- Connexion Stripe + Azure (read-only views)

### Sprint 7.7 -- Email transactionnel + onboarding flow (~3h)
- Provider : SendGrid / Postmark / Azure Communication Email
- Templates : welcome, trial-ending, billing-alert, monthly-summary

### Sprint 7.8 -- Beta privee (~3h)
- Recrutement 5-10 tenants test
- Onboarding manuel + feedback collection

### Sprint 7.9 -- GA preparation (~2h)
- Pricing page publique
- Documentation utilisateur finale

## Dependances

| Dependance | Bloque | Status actuel |
|------------|--------|---------------|
| TECH-DEBT-017 (Azure deploy) | Sprint 7.2-7.7 | NOT-DONE |
| TECH-DEBT-035 (Marketplace publish) | Beta utilisateurs Sprint 7.8 | NOT-DONE |
| TECH-DEBT-019 NEW (E2E reel) | Beta privee Sprint 7.8 | NOT-DONE |
| Audit Phase 2-6 E2E | Beta privee | NOT-DONE |

## Concurrence (etat 2026-05)

| Outil | Pricing | Modele | Forces | Faiblesses |
|-------|---------|--------|--------|------------|
| Xray Cloud | $10/user/mois | Per seat | Mature, plugin Jira | Per seat strict, pas BYOK AI |
| Tricentis qTest | $30+/user/mois | Per seat enterprise | Enterprise features | Prix eleve |
| ADO Test Plans | Inclus access level "Basic + Test Plans" ($52/user/mois MSFT) | Bundled | Natif ADO | Cher Microsoft |
| TestRail | $37/user/mois | Per seat | UI moderne | Pas natif ADO |
| **Argos** | **$99-199 flat + $7-9/extra active** | **Hybride** | **Natif ADO, BYOK AI, prix flat predictable** | **Beta inconnue** |

Positionnement Argos : entre Xray et Tricentis en prix, native ADO comme MSFT Test Plans mais 10x moins cher, AI BYOK = differenciateur unique pour le marche IA-friendly.

## Open questions (a decider Sprint 7.1)

- [ ] Trial duration : 14 ou 30 jours ?
- [ ] Annual discount : -10% ou -20% si paiement annuel ?
- [ ] Refund policy : 30 jours moneyback ?
- [ ] Multi-currency : USD only ou EUR/USD/GBP ?
- [ ] Affiliate / partner program ?
- [ ] Self-serve vs sales-led conversion ?

---

Brouillon -- a faire valider et completer dans Sprint 7.1 apres TECH-DEBT-017 deploy reussi.
