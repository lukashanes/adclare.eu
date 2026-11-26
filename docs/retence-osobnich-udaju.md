# Retence podání a výmaz na žádost

Rozhodnutí Lukáše Hanese z 26. 11. 2026: podání a jejich přílohy 3 roky od přijetí (1095 dní), podezřelá podání 30 dní, technické záznamy nejvýš 90 dní. Turnstile je signál; neověřená i podezřelá podání se ukládají. Vlastník kontroly zadržených a podezřelých podání je admin@aenze.com.

## Co tato aplikace ukládá

| Úložiště / údaje | Retence a rozsah úklidu |
| --- | --- |
| PostgreSQL `public_submissions` | Ověřená i neověřená podání 1095 dní, podezřelá 30 dní od `createdAt`, bez prodloužení změnou stavu. Ukládá se druh, vybraná vstupní pole, stav ověření/zpracování a týmového oznámení. U pozvánky jen hash tokenu, žádný přístupový token ani obsah pasti. |
| PostgreSQL `email_daily_quotas` | Denní součty pokusů a stav jediného upozornění, bez obsahu podání, po 90 dnech od poslední změny. |
| PostgreSQL `email_messages` | Obsah komunikace z formulářů 1095 dní od `createdAt`, bez výjimky pro `PENDING_PROVIDER`, `SENT` či `FAILED`. U e-mailů k pozvánce nejpozději podle původního `invitations.createdAt`; opakované odeslání lhůtu neobnovuje. |
| PostgreSQL `invitations` | 1095 dní od `createdAt` ve všech stavech, včetně čekajících, přijatých, vypršelých a odvolaných pozvánek. |
| `email_messages.error`, `providerMessageId` | Diagnostika doručení se vyprázdní po 90 dnech, zatímco samotný obsah komunikace má tříletou lhůtu. |
| PostgreSQL `login_tokens`, `user_sessions` | Tokeny po 90 dnech od vytvoření, relace po vypršení (nyní 30 dní). Platnost přihlašovacího odkazu zůstává 15 minut. |
| PostgreSQL `rate_limit_buckets` | Neaktivní čítače po 30 dnech od posledního použití; běžící limit se nemaže. Identifikátor cíle je hash, ne obsah formuláře nebo e-mail. |
| PostgreSQL `audit_logs` – události registrace, přihlášení, účtu a pozvánek | Technické události uvedené v `TECHNICAL_AUDIT_ACTIONS` po 90 dnech. Migrace povolí jen jejich výmaz po lhůtě; změny a předčasné mazání zůstávají blokované. |
| PostgreSQL `users`, `tenant_memberships`, `tenants` | Živý účet a smluvní vztah. Automatický úklid účty neruší. Samostatná archivní kopie vybraných polí registrace je v `public_submissions`; celý vstupní JSON se nekopíruje. |
| PostgreSQL reklamy, verze, schválení, obchodní audit; soubory reklam na lokálním disku / S3 | Samostatný zákaznický archiv. Nynější nastavení `retentionYears` (výchozí 7 let) samo o sobě nezajišťuje mazání. Automatický úklid podání tento archiv nemaže; jeho zahrnutí do tříleté lhůty musí Lukáš výslovně upřesnit. |

Kontaktní/poptávkový formulář ani přílohy veřejných formulářů zde nejsou. Veřejné formuláře zajišťují registraci, přihlášení a přijetí pozvánky; archivují se v PostgreSQL. Přílohy přijímá pouze přihlášená aplikace pro reklamy. Vyplněná past `adclare_guard` ukládá podání jako podezřelé bez e-mailu. Neúspěšné ověření Turnstile ukládá podání jako neověřené, tým dostane `[Neověřeno]` bez příloh v rámci denních kvót. Návštěvníkovi se e-mail neposílá. Neověřené a podezřelé žádosti o přístup čekají na kontrolu; automaticky nevytvářejí účet, přihlašovací token ani členství.

Veřejná API sdílejí 20 požadavků / 10 sekund / IP a limit těla 64 KiB. Tým má nejvýš 200 e-mailů denně, z toho 20 neověřených; návštěvnické zprávy jen ověřeným, nejvýš 100 denně společně pro login i pozvánky. Jeden týmový slot je rezervovaný pro jediné upozornění na denní limit na stávající `SUPPORT_EMAIL` (výchozí support@adclare.eu). Nad limit se podání i připravené návštěvnické zprávy uchovávají bez odeslání. Pokusy se počítají i při chybě poskytovatele a nevracejí se při nejistém výsledku; den se řídí Europe/Prague. Pozvánky vzniklé v přihlášené aplikaci zadává ověřený správce.

## Dohledání zadržených podání

Kontrolu zajišťuje **admin@aenze.com** přes stávající oprávněný přístup k databázi. Nevzniká nový veřejný admin ani automatické přehrávání neověřených žádostí. Před převodem na společnou formulářovou bránu je autoritativní místní tabulka `public_submissions`.

Příklad čtecího dotazu pro vlastníka kontroly (v této úloze nebyl spouštěn):

```sql
SELECT id, kind, verification, state, "teamEmailStatus", "createdAt"
FROM public_submissions
WHERE state <> 'PROCESSED'
   OR verification = 'SUSPICIOUS'
   OR "teamEmailStatus" <> 'SENT'
ORDER BY "createdAt" ASC
LIMIT 100;
```

Konkrétní podání lze dohledat podle `id` z týmového oznámení nebo normalizovaného `email`. Přijetí pozvánky je dohledatelné spojením `public_submissions.invitationTokenHash = invitations.tokenHash`; neposílat ani nevypisovat skutečné tokeny. Při rotaci/expiraci pozvánky vyřešit novou pozvánku původním oprávněným postupem. Při přezkumu přednostně kontrolovat čerstvá podezřelá podání kvůli 30denní retenci. Stav upozornění na limit je v `email_daily_quotas.alertStatus`, nedoručená návštěvnická korespondence v `email_messages` se stavem `PENDING_PROVIDER` nebo `FAILED`. Samotný uložený záznam není důkazem doručení.

Veřejná zásada pro případné přílohy podání je stejná jako pro podání: 1095 dní od přijetí původního podání, bez prodlužování novou přílohou či změnou stavu. Přidání takového formuláře musí zahrnout i skutečné mazání souborů; pouhé smazání databázové vazby nestačí. Soubory reklam do této kategorie nyní nezařazujeme.

## Automatický provoz

Jedno místo pro nastavení lhůt je `src/lib/retention-policy.ts` (`FORM_RETENTION_DAYS = 1095`). Výběr se řídí okamžikem přijetí/vytvoření, ne změnou stavu nebo posledním opakováním odeslání. Úklid není podmíněn návštěvností webu.

Oba soubory `docker-compose.yml` a `docker-compose.prod.yml` spouštějí samostatnou službu `retention`, která provede úklid hned po startu a dále každou hodinu. Nevyžaduje přístup k úložišti souborů ani e-mailovému API. Chyba nezastaví další pokusy; do logu jde pouze výsledek bez osobních údajů a textu databázové chyby. Databázový transakční zámek brání souběžným úklidům. Při chybě se databázová transakce vrátí celá.

Správce při schváleném vydání nejprve aplikuje migrace a spustí službu spolu s aplikací. U instalací bez Compose je nutné plánovat `npm run retention:cleanup` například hodinovým cronem s pracovním adresářem aplikace a jejími existujícími databázovými údaji. Jednorázové spuštění při chybě vrací nenulový návratový kód. Nesměrovat tento příkaz při vývoji na produkční databázi.

Kontrola správce po vydání: ověřit běh služby, poslední úspěšný průchod a stáří nejstaršího záznamu v jednotlivých kategoriích. Hodinový plán znamená fyzický výmaz při následujícím průchodu; výpadky nebo neprovedená migrace vyžadují zásah správce.

Logy mimo databázi (Docker/stdout, reverzní proxy, Cloudflare, e-mailový poskytovatel, monitoring) tento proces nespravuje. Provozovatel musí ověřit jejich časovou rotaci nejvýše do 90 dnů, u odmítnutého spamu do 30 dnů, a zákaz logování obsahů formulářů, tokenů a příloh. Pouhý objemový limit logů časovou retenci nezaručuje. Současný skript databázových záloh má výchozí retenci 30 dní; zvlášť je nutné pokrýt zálohy souborů a případné verze objektů. V této úloze nebylo nic na serveru ani u poskytovatelů ověřováno nebo měněno.

## Výmaz na žádost subjektu

Provádí správce s oprávněním k danému pracovnímu prostoru a databázový správce; v této úloze se žádný výmaz nespouští.

1. Ověřit totožnost žadatele a rozsah požadavku. Dohledat přesný normalizovaný e-mail, `users.id`, dotčené `tenantId`, ID pozvánek a případné reklamní záznamy. Prohledat všechny oprávněné pracovní prostory; účet může být sdílený mezi více zákazníky. Právní/smluvní důvod případného ponechání zákaznického archivu posuzuje jeho správce.
2. Předem vypsat pouze ID a počty dotčených řádků. V řízené databázové transakci odstranit také `public_submissions` podle normalizovaného e-mailu a hashů dotčených pozvánek, `email_messages` podle `toEmail` **i** podle ID dotčených pozvánek, potom `invitations` podle e-mailu a prostoru a `login_tokens` podle e-mailu. Nefiltrovat stav ani stáří; žádost se týká i čerstvých, čekajících a neúspěšných záznamů. Zrušit relace z `user_sessions` podle `userId`.
3. Pokud se žádost týká i účtu, zrušit příslušné členství. Sdílený účet v `users` odstranit až po vyřešení všech členství a vazeb; jinak provést odsouhlasenou anonymizaci. Prověřit také kontakty v `tenants`, `organization_units` a `candidates`, jména a kontakty v reklamách, snímcích `ad_versions`, schváleních, údajích o nahrání příloh a exportech. Nesmazat jen účet a neponechat kopie v historii.
4. Technické události dohledat podle `actorUserId`, `actor`, zpráv a metadat. Pro oprávněný výmaz před 90 dny je běžné aplikační oprávnění záměrně nedostačující. Databázový správce v jediné transakci použije `LOCK TABLE audit_logs IN ACCESS EXCLUSIVE MODE`, `ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_prevent_update_delete`, provede výmaz/anonymizaci **předem vybraných ID**, poté `ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_prevent_update_delete` a transakci potvrdí. Při chybě celou transakci vrátí; trigger nesmí zůstat vypnutý. Běžný retenční proces trigger nevypíná.
5. U souborů určených k výmazu nejprve zaznamenat jejich neveřejné identifikátory `storageProvider`, `storageBucket`, `storageKey`, smazat skutečný soubor na disku nebo objekt ze správného S3 bucketu včetně uložených verzí a teprve po úspěchu smazat metadata `ad_assets`. Neúspěch souboru musí zůstat dohledatelný pro opakování. Veřejné formuláře nyní takové přílohy nemají.
6. Odstranit související technické čítače podle IP/hashů pouze tam, kde je lze spolehlivě přiřadit žadateli. Vyřešit kopie v e-mailové frontě poskytovatele, správcovských schránkách, exportech a případných veřejných cache; doručený e-mail v cizí schránce aplikace sama vymazat neumí.
7. Ověřit nulový počet zbývajících cílových záznamů a nedostupnost odstraněných souborů. Zapsat jen minimální potvrzení provedení bez původního obsahu. Zálohy nechat doběhnout nejpozději do jejich retenční lhůty; omezený seznam provedených výmazů držet mimo repo jen do zániku poslední zálohy. Při obnově nejprve znovu aplikovat tyto výmazy a retenční úklid, teprve poté obnovit provoz.

## Lokální ověření

`npm test` zahrnuje hranice 1095 dní pro ověřená/neověřená podání, e-maily a pozvánky, 30 dní pro podezřelá, technické lhůty 30/90 dní, opakované odeslání, zachování aktivních limitů, idempotenci, souběhy a chyby transakce i opakování plánovače po chybě. Databáze a e-mailové služby jsou nahrazené lokálními implementacemi; skutečné SQL migrace je před vydáním nutné ověřit správcem na oddělené testovací databázi.
