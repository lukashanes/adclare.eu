# Retence podání a výmaz na žádost

Rozhodnutí Lukáše Hanese z 25. 11. 2026: podání a jejich přílohy 3 roky od přijetí (1095 dní), technické záznamy 30–90 dní. Spam a neověřená podání zachycená honeypotem se jako podání neukládají.

## Co tato aplikace ukládá

| Úložiště / údaje | Retence a rozsah úklidu |
| --- | --- |
| PostgreSQL `email_messages` | Obsah komunikace z formulářů 1095 dní od `createdAt`, bez výjimky pro `PENDING_PROVIDER`, `SENT` či `FAILED`. U e-mailů k pozvánce nejpozději podle původního `invitations.createdAt`; opakované odeslání lhůtu neobnovuje. |
| PostgreSQL `invitations` | 1095 dní od `createdAt` ve všech stavech, včetně čekajících, přijatých, vypršelých a odvolaných pozvánek. |
| `email_messages.error`, `providerMessageId` | Diagnostika doručení se vyprázdní po 90 dnech, zatímco samotný obsah komunikace má tříletou lhůtu. |
| PostgreSQL `login_tokens`, `user_sessions` | Tokeny po 90 dnech od vytvoření, relace po vypršení (nyní 30 dní). Platnost přihlašovacího odkazu zůstává 15 minut. |
| PostgreSQL `rate_limit_buckets` | Neaktivní čítače po 30 dnech od posledního použití; běžící limit se nemaže. Identifikátor cíle je hash, ne obsah formuláře nebo e-mail. |
| PostgreSQL `audit_logs` – události registrace, přihlášení, účtu a pozvánek | Technické události uvedené v `TECHNICAL_AUDIT_ACTIONS` po 90 dnech. Migrace povolí jen jejich výmaz po lhůtě; změny a předčasné mazání zůstávají blokované. |
| PostgreSQL `users`, `tenant_memberships`, `tenants` | Živý účet a smluvní vztah, nikoli samostatný archiv přijatého formuláře. Automatický úklid účty neruší. Registrace neukládá další kopii vstupního JSON. |
| PostgreSQL reklamy, verze, schválení, obchodní audit; soubory reklam na lokálním disku / S3 | Samostatný zákaznický archiv. Nynější nastavení `retentionYears` (výchozí 7 let) samo o sobě nezajišťuje mazání. Automatický úklid podání tento archiv nemaže; jeho zahrnutí do tříleté lhůty musí Lukáš výslovně upřesnit. |

Kontaktní/poptávkový formulář, samostatná tabulka podání, přílohy veřejných formulářů, D1, KV, R2, Durable Objects ani Google Sheets v této pracovní kopii nejsou. Veřejné formuláře zajišťují registraci, přihlášení a přijetí pozvánky. Přílohy přijímá pouze přihlášená aplikace pro reklamy. Honeypot není implementován; neúspěšné ověření Turnstile skončí před založením účtu, tokenu, pozvánky či e-mailu. Před ověřením se mohou uložit jen technické čítače limitů, bez obsahu podání.

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
2. Předem vypsat pouze ID a počty dotčených řádků. V řízené databázové transakci odstranit `email_messages` podle `toEmail` **i** podle ID dotčených pozvánek, potom `invitations` podle e-mailu a prostoru a `login_tokens` podle e-mailu. Nefiltrovat stav ani stáří; žádost se týká i čerstvých, čekajících a neúspěšných záznamů. Zrušit relace z `user_sessions` podle `userId`.
3. Pokud se žádost týká i účtu, zrušit příslušné členství. Sdílený účet v `users` odstranit až po vyřešení všech členství a vazeb; jinak provést odsouhlasenou anonymizaci. Prověřit také kontakty v `tenants`, `organization_units` a `candidates`, jména a kontakty v reklamách, snímcích `ad_versions`, schváleních, údajích o nahrání příloh a exportech. Nesmazat jen účet a neponechat kopie v historii.
4. Technické události dohledat podle `actorUserId`, `actor`, zpráv a metadat. Pro oprávněný výmaz před 90 dny je běžné aplikační oprávnění záměrně nedostačující. Databázový správce v jediné transakci použije `LOCK TABLE audit_logs IN ACCESS EXCLUSIVE MODE`, `ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_prevent_update_delete`, provede výmaz/anonymizaci **předem vybraných ID**, poté `ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_prevent_update_delete` a transakci potvrdí. Při chybě celou transakci vrátí; trigger nesmí zůstat vypnutý. Běžný retenční proces trigger nevypíná.
5. U souborů určených k výmazu nejprve zaznamenat jejich neveřejné identifikátory `storageProvider`, `storageBucket`, `storageKey`, smazat skutečný soubor na disku nebo objekt ze správného S3 bucketu včetně uložených verzí a teprve po úspěchu smazat metadata `ad_assets`. Neúspěch souboru musí zůstat dohledatelný pro opakování. Veřejné formuláře nyní takové přílohy nemají.
6. Odstranit související technické čítače podle IP/hashů pouze tam, kde je lze spolehlivě přiřadit žadateli. Vyřešit kopie v e-mailové frontě poskytovatele, správcovských schránkách, exportech a případných veřejných cache; doručený e-mail v cizí schránce aplikace sama vymazat neumí.
7. Ověřit nulový počet zbývajících cílových záznamů a nedostupnost odstraněných souborů. Zapsat jen minimální potvrzení provedení bez původního obsahu. Zálohy nechat doběhnout nejpozději do jejich retenční lhůty; omezený seznam provedených výmazů držet mimo repo jen do zániku poslední zálohy. Při obnově nejprve znovu aplikovat tyto výmazy a retenční úklid, teprve poté obnovit provoz.

## Lokální ověření

`npm test` zahrnuje test hranice 1095 dní ve všech stavech e-mailů a pozvánek, opakovaného odeslání, technických lhůt 30/90 dní, zachování aktivních limitů, idempotence, souběhu a chyb transakce i opakování plánovače po chybě. Databáze a e-mailové služby jsou v těchto testech nahrazené lokálními implementacemi; skutečnou SQL migraci je před vydáním nutné ověřit správcem na oddělené testovací databázi.
