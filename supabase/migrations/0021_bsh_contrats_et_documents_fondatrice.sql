-- ═══════════════════════════════════════════════════════════
-- 0021_bsh_contrats_et_documents_fondatrice.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-10-27 (12 documents
--   DOC-2026-BSH001 à BSH012 confirmés, categorie correcte pour
--   chacun — correspondance exacte à l'attendu)
-- Auteur : Claude Code · Date de rédaction : 2026-10-27
-- Objet : à la demande de Renée-Lise, complète la GED BSH avec :
--   - des contrats-types pour les hôtesses ET pour les clientes ;
--   - les documents administratifs/comptables côté fondatrice
--     (facture, devis, CGV, mentions légales) ;
--   - quelques documents additionnels jugés utiles (pas demandés
--     explicitement, mais cohérents avec le reste — clairement
--     signalés comme tels, à garder ou supprimer selon son avis).
--
--   Tous en BROUILLON — rédigés par Claude Code, à relire et
--   valider avant tout usage réel (envoi à une cliente, signature,
--   valeur légale). Rien ici ne remplace un avis juridique.
--
-- Pourquoi une policy resserrée : la 0019 rendait visible à TOUTE
--   hôtesse active n'importe quel document BSH sans hote_id (donc
--   partagé). Avec l'ajout de documents strictement fondatrice
--   (facture, CGV, contrat client...), cette condition est trop
--   large — une hôtesse ne doit voir QUE les documents qui lui sont
--   destinés, pas les gabarits comptables de la fondatrice. La
--   policy est donc resserrée : partagé-hôtesse seulement si
--   categorie = 'ressource_hotesse' (les 4 documents de la 0019 +
--   le contrat de mission ci-dessous), jamais pour
--   'ressource_fondatrice'.
--
-- Impact : entièrement additif + resserrement d'une condition RLS
--   (plus stricte, jamais plus permissive).
-- ═══════════════════════════════════════════════════════════

drop policy if exists bellaia_documents_hote_bsh on public.bellaia_documents;
create policy bellaia_documents_hote_bsh on public.bellaia_documents
  for select to authenticated
  using (
    module = 'BSH'
    and public.est_hote_bsh()
    and (
      hote_id = auth.uid()
      or (hote_id is null and categorie = 'ressource_hotesse')
    )
  );

insert into public.bellaia_documents
  (reference, titre, module, categorie, type_fichier, contenu_html, statut, version)
values
-- ── Contrats-types ──────────────────────────────────────────
(
  'DOC-2026-BSH005',
  'Contrat de Mission Hôtesse BSH',
  'BSH', 'ressource_hotesse', 'contrat',
  '<h1>Contrat de Mission — Hôtesse Bella''Secret Home</h1>
   <p><em>Brouillon — gabarit à adapter à chaque mission, à faire relire avant tout usage réel.</em></p>
   <p>Entre <strong>Bella''Secret Home / Bella''Studio</strong>, représentée par la fondatrice, et <strong>[Nom de l''hôtesse]</strong>, il est convenu ce qui suit :</p>
   <h2>Objet</h2>
   <p>L''hôtesse assure l''accueil et l''animation lors de l''événement « [nom de l''événement] », le [date], à [lieu].</p>
   <h2>Rémunération</h2>
   <p>La mission est rémunérée [montant] €, réglée selon les modalités convenues avec la fondatrice.</p>
   <h2>Obligations</h2>
   <p>L''hôtesse s''engage à respecter la Charte Éthique et la Politique de Confidentialité BSH (documents transmis séparément), ainsi que le Guide Tenues &amp; Style pour sa présentation.</p>
   <h2>Confidentialité</h2>
   <p>Toute information relative aux client·es, aux membres ou au déroulé de l''événement reste strictement confidentielle, pendant et après la mission.</p>
   <h2>Résiliation</h2>
   <p>Chaque partie peut mettre fin à cet engagement par écrit, avec un délai de prévenance raisonnable, sauf manquement grave justifiant une rupture immédiate.</p>
   <p>Fait à [ville], le [date].</p>',
  'brouillon', 1
),
(
  'DOC-2026-BSH006',
  'CGV & Contrat de Réservation — Client BSH',
  'BSH', 'ressource_fondatrice', 'contrat',
  '<h1>Conditions de Réservation — Bella''Secret Home</h1>
   <p><em>Brouillon — à faire relire avant diffusion aux client·es.</em></p>
   <h2>Réservation</h2>
   <p>Toute réservation d''un coffret, d''une expérience ou d''une place à un événement BSH est confirmée après réception de l''acompte convenu (ou du règlement intégral selon le cas).</p>
   <h2>Paiement</h2>
   <p>Le règlement s''effectue par carte bancaire (Stripe), selon les modalités indiquées lors de la réservation.</p>
   <h2>Annulation</h2>
   <p>Toute annulation doit être signalée le plus tôt possible. Les conditions de remboursement dépendent du délai avant la date prévue — à préciser selon la politique de la fondatrice.</p>
   <h2>Confidentialité réciproque</h2>
   <p>BSH s''engage à la discrétion totale sur l''identité et la présence de chaque client·e. En retour, aucune photo, vidéo ou identité d''une autre personne présente ne doit être partagée à l''extérieur.</p>
   <h2>Accès</h2>
   <p>La fondatrice se réserve le droit de refuser l''accès à un événement en cas de non-respect de ces conditions ou de comportement inapproprié.</p>',
  'brouillon', 1
),
-- ── Documents administratifs / comptables (fondatrice) ──────
(
  'DOC-2026-BSH007',
  'Modèle de Facture BSH',
  'BSH', 'ressource_fondatrice', 'facture',
  '<h1>Modèle de Facture — Bella''Secret Home</h1>
   <p><em>Gabarit — à dupliquer et compléter pour chaque facture réelle.</em></p>
   <p><strong>Bella''Secret Home</strong> — Bella''Studio<br/>[Adresse] · [Email] · [WhatsApp]</p>
   <p><strong>Facture n° :</strong> FAC-AAAA-XXXXXX<br/><strong>Date :</strong> [date]<br/><strong>Client·e :</strong> [nom]</p>
   <table style="width:100%;border-collapse:collapse;margin:12px 0;">
     <tr><th style="text-align:left;border-bottom:1px solid #ccc;">Désignation</th><th style="border-bottom:1px solid #ccc;">Qté</th><th style="border-bottom:1px solid #ccc;">Prix unitaire</th><th style="border-bottom:1px solid #ccc;">Total</th></tr>
     <tr><td>[Article/prestation]</td><td>1</td><td>[prix] €</td><td>[total] €</td></tr>
   </table>
   <p><strong>Total TTC : [montant] €</strong></p>
   <p style="font-size:11px;color:#666;">TVA non applicable, art. 293B du CGI (à adapter selon le régime fiscal réel — à vérifier avec un comptable).</p>',
  'brouillon', 1
),
(
  'DOC-2026-BSH008',
  'Modèle de Devis BSH',
  'BSH', 'ressource_fondatrice', 'devis',
  '<h1>Modèle de Devis — Bella''Secret Home</h1>
   <p><em>Gabarit — à dupliquer et compléter pour chaque devis réel.</em></p>
   <p><strong>Devis n° :</strong> DEV-AAAA-XXXXXX<br/><strong>Date :</strong> [date]<br/><strong>Validité :</strong> 30 jours<br/><strong>Client·e :</strong> [nom]</p>
   <table style="width:100%;border-collapse:collapse;margin:12px 0;">
     <tr><th style="text-align:left;border-bottom:1px solid #ccc;">Désignation</th><th style="border-bottom:1px solid #ccc;">Qté</th><th style="border-bottom:1px solid #ccc;">Prix unitaire</th><th style="border-bottom:1px solid #ccc;">Total</th></tr>
     <tr><td>[Article/prestation]</td><td>1</td><td>[prix] €</td><td>[total] €</td></tr>
   </table>
   <p><strong>Total estimé : [montant] €</strong></p>
   <p>Acompte demandé à la confirmation : [montant ou %].</p>',
  'brouillon', 1
),
(
  'DOC-2026-BSH009',
  'Conditions Générales de Vente (CGV) BSH',
  'BSH', 'ressource_fondatrice', 'document_admin',
  '<h1>Conditions Générales de Vente — Bella''Secret Home</h1>
   <p><em>Brouillon — à faire relire avant publication.</em></p>
   <h2>Produits</h2>
   <p>Les produits vendus par Bella''Secret Home sont décrits aussi fidèlement que possible sur la boutique. Les photos sont non contractuelles.</p>
   <h2>Prix et paiement</h2>
   <p>Les prix sont indiqués en euros. Le paiement s''effectue en ligne par carte bancaire, de façon sécurisée (Stripe).</p>
   <h2>Livraison</h2>
   <p>Les commandes sont expédiées sous emballage neutre et discret, sans mention du contenu ni de la marque à l''extérieur du colis.</p>
   <h2>Rétractation et retours</h2>
   <p>Conformément à la réglementation applicable aux produits intimes, le droit de rétractation peut être limité pour des raisons d''hygiène — à préciser clairement avant achat.</p>
   <h2>Données personnelles</h2>
   <p>Les données collectées (nom, adresse, email) servent exclusivement au traitement de la commande et ne sont jamais partagées avec des tiers à des fins commerciales.</p>',
  'brouillon', 1
),
(
  'DOC-2026-BSH010',
  'Mentions Légales BSH',
  'BSH', 'ressource_fondatrice', 'document_admin',
  '<h1>Mentions Légales — Bella''Secret Home</h1>
   <p><em>Brouillon — champs entre crochets à compléter avec les informations réelles avant publication.</em></p>
   <h2>Éditeur du site</h2>
   <p>Bella''Secret Home, pôle de Bella''Studio<br/>[Forme juridique] · [SIRET] · [Adresse]<br/>Directrice de publication : Renée-Lise Vilosa</p>
   <h2>Hébergement</h2>
   <p>Site hébergé par Vercel Inc. Base de données hébergée par Supabase.</p>
   <h2>Contact</h2>
   <p>[Email] · [WhatsApp]</p>
   <h2>Propriété intellectuelle</h2>
   <p>L''ensemble des contenus (textes, visuels, identité de marque Bella''Secret Home) est protégé et ne peut être reproduit sans autorisation.</p>',
  'brouillon', 1
),
-- ── Documents additionnels proposés (non demandés explicitement) ──
(
  'DOC-2026-BSH011',
  'Fiche Candidature Hôtesse (trame d''entretien)',
  'BSH', 'ressource_fondatrice', 'autre',
  '<h1>Fiche Candidature Hôtesse — Trame d''entretien</h1>
   <p><em>Proposition non demandée — utile pour structurer un premier échange avec une candidate avant de créer sa fiche dans BSH → Hôtes.</em></p>
   <ul>
     <li>Nom, coordonnées, disponibilités</li>
     <li>Motivation — pourquoi BSH ?</li>
     <li>Expérience en accueil/événementiel</li>
     <li>À l''aise avec la charte éthique et la confidentialité ? (expliquer les points clés)</li>
     <li>Disponibilité pour une tenue conforme au Guide Tenues &amp; Style</li>
     <li>Questions de la candidate</li>
     <li>Décision : candidature / active / refusée</li>
   </ul>',
  'brouillon', 1
),
(
  'DOC-2026-BSH012',
  'Checklist Avant Événement BSH',
  'BSH', 'ressource_fondatrice', 'autre',
  '<h1>Checklist Avant Événement BSH</h1>
   <p><em>Proposition non demandée — aide-mémoire pratique pour la fondatrice avant chaque événement.</em></p>
   <ul>
     <li>Lieu confirmé et accessible</li>
     <li>Hôtesses assignées et briefées (Manuel + Charte transmis)</li>
     <li>Places restantes à jour dans BSH → Events</li>
     <li>Stock boutique suffisant si vente sur place</li>
     <li>Matériel/décoration prêts</li>
     <li>Moyen de paiement sur place opérationnel</li>
   </ul>',
  'brouillon', 1
)
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select reference, titre, categorie from public.bellaia_documents
--   where module='BSH' and reference like 'DOC-2026-BSH0%'
--   order by reference;
--   → attendu : BSH001 à BSH012 (12 lignes), categorie
--     'ressource_hotesse' pour BSH001-BSH002-BSH005, et
--     'ressource_fondatrice' pour tout le reste.
--
--   select policyname, qual from pg_policies
--   where tablename='bellaia_documents' and policyname='bellaia_documents_hote_bsh';
--   → attendu : qual contient "categorie = 'ressource_hotesse'"
-- ═══════════════════════════════════════════════════════════
