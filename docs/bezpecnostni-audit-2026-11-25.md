# Adclare.eu – lokální audit a návrh oprav, 25. 11. 2026

Změny jsou připravené pouze v pracovním stromu. Nic nebylo commitnuto, odesláno ani nasazeno. Produkce, databáze, e-mailové služby, Cloudflare a objektová úložiště nebyly kontaktovány. Jediné použité externí rozhraní byl registr npm. Audit provedl jeden posuzovatel bez nezávislé druhé kontroly.

Výchozí revize: `a0eb4bc58f97f9c91b5644fa7851c037834dfe36`. Pracovní strom byl při zahájení čistý.

Podklad: `C:\Dev\Reditel\navrhy\2026-11-18-pravidla-bezpecnosti-formularu.md`, všech 13 pravidel v původním pořadí. Tato zpráva zůstává v tomto repozitáři; do adresáře Ředitele se nezapisovalo.

## Rozsah a hranice důkazů

Jde o Next.js aplikaci s PostgreSQL, přihlášením jednorázovým odkazem, více organizacemi, rolemi, evidencí reklam a soukromými soubory. Veřejné zapisující formuláře jsou registrace, žádost o přihlašovací odkaz a přijetí pozvánky. Nejde o kontaktní poptávkové formuláře. Ostatní zapisující API vyžaduje relaci; veřejný repozitář a oznámení zpřístupňují publikované/archivované záznamy.

Kontrola sledovala vstup přes validaci, Turnstile, omezení požadavků, oprávnění a příslušné zápisy nebo e-mailové funkce. Zkontrolovala také konfigurační hlavičky, aktuální sledované soubory kvůli tajným údajům, veřejné texty, vnitřní odkazy a SEO metadata. Neprověřovala historii Git, skutečná oprávnění bucketu, WAF, doručitelnost e-mailů ani stav nasazené verze.

`Nesplněno – nedoloženo` níže označuje chybějící důkaz o provozní konfiguraci; neznamená zjištění, že produkční ochrana určitě chybí. `Splněno` vychází z lokálního zdrojového kódu a uvedených testů, nikoli z ověření produkce.

## Tabulka pravidel po úpravách

| # | Pravidlo | Stav | Důkaz a omezení |
| --- | --- | --- | --- |
| 1 | Poptávka se neztratí při výpadku antispamu. | **Nesplněno podle doslovného požadavku; rozhodnutí** | Všechny tři veřejné formuláře při neúspěšném `verifyTurnstileToken` vracejí 403 ještě před hlavní operací. Neexistuje příjem označeného podání a navazující doručovací fronta. U autentizace je to záměrná ochrana, kterou jsem neuvolnil. `tests/public-endpoints.test.mjs` ověřuje, že neúspěšný antispam nepošle přihlašovací e-mail. |
| 2 | Jen povolená pole příloh; typ podle signatury. | **Splněno v existujících cestách** | Veřejné autentizační formuláře přijímají jen JSON. Soubory mají pouze přihlášené endpointy `ads/[code]/assets` a `ads/import`, oba čtou pole `file`; jiné souborové položky nepoužijí. `src/lib/object-storage.ts` ověřuje signatury. `tests/asset-uploads.test.mjs` prokazuje přijetí `%PDF-` a odmítnutí HTML vydávaného za PDF bez zápisu. XLSX ověřuje ZIP a strukturu sešitu. |
| 3 | Neověřené podání nikdy neodešle přílohu. | **Splněno** | `src/lib/app-auth.ts:deliverLoginEmail` a `src/lib/workspace-db.ts:sendInvitationEmail` sestavují textové/HTML e-maily bez příloh. Soubory se nahrávají samostatně až po ověření relace a oprávnění; nejsou součástí e-mailového podání. |
| 4 | Denní limity neověřených e-mailů pro tým i návštěvníka, `held` a jedno upozornění. | **Nesplněno** | Existují hodinové limity a omezení přihlašovacích odkazů, ale nikoli denní globální rozpočty, stav `held` a denní výstraha. Produkční výchozí konfigurace neověřenou žádost odmítá, nicméně nastavení umožňuje vynechat Turnstile. Případný režim příjmu při výpadku musí doplnit tento bod současně. |
| 5 | Náhradní cesta neobchází antispam bez limitu. | **Splněno pro výchozí produkční konfiguraci** | Tři veřejné zápisové cesty volají `verifyTurnstileToken`; `production.env.example` a `docker-compose.prod.yml` vyžadují Turnstile. Není veřejný záložní příjem, import, webhook ani obnovovací cron. XLSX import a opakování pozvánky vyžadují relaci a oprávnění. Vypnutí ochrany provozovatelem naráží na nesplněný bod 4. |
| 6 | Tvrdý limit těla včetně streamu bez `Content-Length`. | **Splněno po opravě** | `src/lib/request-limits.ts` počítá skutečné bajty a ruší čtení po limitu. JSON a těla nepotřebná pro operaci: 64 KiB. Import: 8 MiB + 64 KiB obálka. Podklady reklamy: nastavený limit, standardně 50 MiB + 64 KiB obálka. Původní limit samotného souboru zůstává. Testy všech 24 POST/PATCH obsluh ověřují 413 před obchodní operací, samostatný test také včasné zastavení streamu bez délky. U GET se tělo nezpracovává. Nejde o živý test HTTP chunked přes proxy. |
| 7 | Denní kvóta před každým veřejným zápisem. | **Nesplněno** | `src/lib/rate-limit.ts:checkRateLimit` zapisuje čítače do PostgreSQL; hodinový limit není globální denní kvóta. Chybí denní rozpočet veřejných zápisů i omezení počtu nových identit čítačů. Samostatné veřejné endpointy diagnostiky či záloh zde nejsou. |
| 8 | Obnovy/fronty používají kurzor a odkládají trvale chybné záznamy. | **Netýká se** | Není implementován automatický průchod frontou ani obnovovací úloha. `EmailStatus.PENDING_PROVIDER` je stav záznamu, nikoli zpracovávaná fronta. Ruční opakování konkrétní pozvánky není stránkovaný proces. |
| 9 | Koncepty jen v `sessionStorage`, nejvýše 24 h; odstranit staré lokální koncepty. | **Splněno bez perzistence konceptů** | V klientském kódu není ukládání formulářů do `localStorage` ani `sessionStorage`; stav polí je pouze v Reactu. Nejsou identifikovány staré klíče konceptů k migraci. Název `localStorageProvider` v úložišti souborů označuje serverový disk, nikoli úložiště prohlížeče. Starší nasazená verze ani její úložiště nebyly ověřovány. |
| 10 | Neveřejné úložiště a předepsaná retence. | **Nesplněno / provozně nedoloženo** | Lokální soubory jsou mimo `public` a stahování kontroluje organizaci i oprávnění (`getAppAdAssetDownload`). Skutečné nastavení S3 nebylo ověřeno. `Tenant.retentionYears` je konfigurační hodnota, nikoli úloha pro mazání; chybí doložení požadované retence podání, čítačů a stavů e-mailů. Politický archiv navíc nelze bez rozhodnutí zkrátit podle pravidel pro běžné poptávky. |
| 11 | Cloudflare rate limiting: 20 požadavků / 10 s / IP, blokace 10 s. | **Nesplněno – nedoloženo** | V prohlédnuté konfiguraci ani automatizaci není toto pravidlo WAF. Cloudflare zóna a dev host nebyly kontaktovány. Aplikační hodinový limit tuto podmínku nenahrazuje. |
| 12 | Žádné kritické/vysoké závislosti, případně zdůvodněné výjimky. | **Nesplněno, zbývá posouzení výjimky** | Před úpravou: 30 hlášení (1 kritické, 15 vysokých, 11 středních, 3 nízká). Po aktualizaci: 3 vysoká, 0 ostatních. Jde o jediný problém Effect přenesený na `@prisma/config` a Prisma CLI; odůvodnění níže. Stejná trojice se objeví i s `--omit=dev`, nelze tedy tvrdit čistý audit produkčních balíčků. |
| 13 | Testy pouze dev a `TEST-…`, následný úklid. | **Splněno** | Testy volají funkce lokálně s náhradami databáze, antispamu a odesílání. Používají `TEST-…` a domény `.invalid`/`.test`. Žádný formulář, e-mail ani síťový požadavek na aplikaci nebyl odeslán. Jediný testovací souborový adresář v `%TEMP%` se odstraní v úklidu testu. Nebyl potřeba úklid databáze. |

## Provedené opravy

- **Velikost požadavků:** společné omezené čtení všech 24 zapisujících obsluh. Neplatný JSON vrací 400, velké tělo 413. Kontrola funguje i při chybějící či podhodnocené délce a před parsováním multipart obsahu.
- **Obcházení IP limitu:** limity registrace, přihlášení a přijetí pozvánky nyní používají samostatnou IP identitu. Dříve nový e-mail/token zakládal nový limit téže IP. Hodnoty 5/8/10 požadavků za hodinu zůstaly; nyní platí souhrnně na IP příslušné operace. Další omezení odkazů na e-mail v `app-auth.ts` zůstalo.
- **Souběžná registrace:** rozhodnutí o prvním prostoru a roli superadmina je pod transakčním PostgreSQL advisory zámkem. Kontrola `first-run` se opakuje uvnitř transakce. Testy v paměti prokazují opravu původního dvojího udělení role; skutečný PostgreSQL nebyl použit.
- **Souběžné přijetí pozvánky:** nejdříve atomické převzetí platné pozvánky ve stavu `PENDING`, potom změna členství ve stejné transakci. Již zrušená, přijatá nebo právě expirovaná pozvánka nemůže projít přes zastaralý počáteční výsledek čtení.
- **Turnstile:** odpověď musí obsahovat povolený hostname; dříve se úspěch bez hostname přijímal. Ověřovací požadavek má časový limit 10 sekund. Síť je v testu nahrazena funkcí v paměti.
- **XLSX:** počítají se skutečně rozbalené bajty (16 MiB na XML a 32 MiB dohromady), omezí se načtení řádků podle stávajícího limitu 500 řádků + nejvýše 20 kandidátů na hlavičku a odmítnou se sloupce mimo rozsah Excelu. Regrese prokázala, že malý ZIP dříve bez odmítnutí rozbalil nadlimitní obsah a neplatný sloupec vytvářel obrovské pole.
- **Hlavičky:** vzor Nginx nyní používá `X-Frame-Options: DENY`, shodně s Next.js a `frame-ancestors 'none'`.
- **Závislosti:** Next.js a `eslint-config-next` 16.2.7 → 16.4.6; ostatní balíčky obnoveny v povolených rozsazích lockfilu, bez vynuceného přechodu na další hlavní verzi. Například Sharp je 0.35.5, PostCSS 8.5.33 a Prisma balíčky 7.10.1.
- **Texty a SEO:** česká interpunkce na úvodní stránce, anglické `availabilitys` a přivlastňovací tvar u `organization`. Nápověda má canonical a jazykové alternativy; odstraněno druhé připojení názvu Adclare k titulku zděděnému z layoutu.

## Ostatní výsledky a záměrně neprovedené zásahy

- **CSP a hlavičky:** `next.config.ts` obsahuje CSP, `nosniff`, HSTS, zákaz rámování, Referrer/Permissions Policy, COOP/CORP a `no-store` u soukromých částí. Produkce nepovoluje `unsafe-eval`. Turnstile má vyhrazený zdroj pro skripty, připojení a rámce. Hodnoty byly ověřeny v konfiguraci, nikoli na HTTP odpovědích nasazeného serveru.
- **CSP zůstává s `unsafe-inline`:** přechod na nonce vyžaduje provázání s vykreslováním Next.js a ověření v prohlížeči. Nejde o bezpečnou izolovanou změnu samotné hlavičky.
- **Tajné údaje:** `security:scan` nenašel běžné vzory tajných údajů v aktuálních sledovaných souborech. Doplňková kontrola přiřazení konfiguračních klíčů nezjistila potvrzené produkční přihlašovací údaje; ukázkové a CI hodnoty nejsou dokladem produkčních tajných údajů. Historie ani externí prostředí nebyly skenovány. Žádná nalezená hodnota nebyla použita k přihlášení nebo ověřování služby.
- **Odkazy:** všech pět vnitřních kotev marketingové stránky má cíl. Relativní odkazy na nápovědu a právní stránky odpovídají existujícím routám v obou jazycích. Externí odkazy a existence kontaktních schránek nebyly síťově ověřeny.
- **SEO k rozhodnutí:** kořenový layout stále uvádí `lang="cs"` také pro anglické routy; sitemap používá pevné datum 27. 5. 2026 a Open Graph dědí české výchozí údaje. Oprava jazykového layoutu vyžaduje samostatné rozhodnutí o lokalizaci a ověření výsledného HTML. Datum jsem nepřepsal plošně na dnešek bez podkladů k jednotlivým stránkám.
- **Texty k rozhodnutí:** marketing slibuje úsporu stovek hodin a ukazuje 320 hodin ročně; v repu není podklad k výpočtu. Právní texty obsahují provozní a retenční tvrzení. Tyto sliby ani právní význam jsem bez podkladů nepřepisoval. Plošný stylistický přepis kvůli dojmu „AI textu“ by byl subjektivní.
- **Proxy/IP k ověření provozovatelem:** kód důvěřuje `cf-connecting-ip`, `x-real-ip` a `x-forwarded-for`. Je nutné doložit přístup k originu pouze přes důvěryhodnou proxy a očištění klientem dodaných hlaviček. Bez tohoto ověření nelze garantovat odolnost IP limitů proti podvržení.
- **Retence a globální rozpočty:** nezaváděl jsem automatické mazání politického archivu ani svévolné globální limity, které by mohly zablokovat legitimní registrace nebo pozvánky. Vyžadují stanovení rozsahu dat a kapacit. Autentizaci jsem nepřevedl do režimu přijímání neověřených žádostí při výpadku antispamu.

### Zbývající závislost

`effect@3.20.0` → `@prisma/config@7.10.1` → `prisma@7.10.1`: `GHSA-7589-6fvf-x4pw`, ReDoS v `Schema.TemplateLiteral`. Tři vysoká hlášení npm odpovídají tomuto jednomu řetězci.

Prisma CLI zpracovává místní schema a konfiguraci. Veřejné obsluhy nepředávají vstup do této validační funkce; aplikace používá generovaného Prisma klienta a adaptér PostgreSQL. Docker runner kopíruje Next.js standalone výstup, samostatný migrátor však CLI obsahuje. Proto se problém podle prohlédnutých volání netýká zpracování veřejného formuláře, ale nepovažuji jej za odstraněný z balíčků ani za ověřeně vyloučený z výsledného image.

`npm audit` navrhuje sestup na Prisma 6.12.0, nejnovější Effect v registru má jinou hlavní verzi (4.1.5). Takovou změnu/override jsem nevynutil. Lukáš má rozhodnout o doložené výjimce pro CLI, nebo naplánovat kompatibilní aktualizaci. Současné `npm run ci` by kvůli auditu stále neprošlo.

## Build a ověření

Prostředí: Windows, Node 24.21.0, npm 11.19.0. CI používá Node 22; ten zde nebyl zvlášť spuštěn. Instalace byla nutná, protože pracovní kopie neměla závislosti. Použito `npm ci --ignore-scripts`, následně potřebné aktualizace přes npm s `--ignore-scripts`. Cache a pomocné konfigurační soubory jsou v `%TEMP%`; nejsou přidány do repozitáře.

| Kontrola | Výsledek |
| --- | --- |
| `npm test` | **Prošlo:** původní launch smoke a 43 bezpečnostních testů. |
| `npm run lint` | **Prošlo bez chyb**, jedno upozornění na původní použití `window.location.href` v `AppWorkspaceClient.tsx:3104`. Navigace nebyla přepisována kvůli samotnému upozornění. |
| Typová kontrola bezpečnostních modulů | **Prošla** pro `request-limits`, `request-validation`, `xlsx-ad-import`, `object-storage`, `turnstile` a jejich závislosti, přes dočasný tsconfig odvozený z projektového. |
| `npm run typecheck -- --incremental false` | **Neprošlo:** chybí generovaný `src/generated/prisma/client`; následují navazující chyby typů databázových výsledků. |
| `npm run build` | **Zablokováno při `db:generate`:** Prisma chce stáhnout binárku mimo registr npm; místní síťová pojistka požadavek odmítla před odesláním. Next.js build se proto nespustil. |
| `prisma validate` | Stejná překážka s binárkou; bez úspěšného ověření. |
| `npm audit --package-lock-only` | **Neprošlo:** 3 vysoká, 0 kritických/středních/nízkých. Totéž s `--omit=dev`; viz řetězec Effect výše. |
| `npm run security:scan` | **Prošlo:** bez běžných vzorů tajných údajů ve sledovaných souborech. |
| `git diff --check` | **Prošlo.** |

Build a Prisma byly spuštěny se syntetickým `DATABASE_URL` a pojistkou proti spojení na databázi a externí síť. Náhradní databáze se nespouštěla. Nebyly spuštěny migrace, seed, cloudové/provozní skripty ani Docker build, který by stahoval externí obrazy. Root layout dále používá `next/font/google`; následné plné ověření buildu bude potřebovat dostupné buildové fonty. Stahování Google Fonts nebylo provedeno ani samostatně testováno.

Testy používaly jen data `TEST-…` v paměti a dočasné lokální soubory. Databázové transakce/zámky byly ověřeny proti náhradám služeb, nikoli integračně na PostgreSQL. Nebyl ověřen prohlížeč, skutečná SMTP/API dodávka, provozní WAF ani S3 lifecycle. Tato omezení je třeba uzavřít před případným nasazením.

## Navržené commity

Commity vytvoří správce. `package.json` obsahuje změny skriptů i verzí, které je třeba rozdělit po částech mezi návrhy 1 a 4. Návrhy 2 a 3 používají testovací pomocník z návrhu 1.

### 1. Omezit těla API, posílit antispam a IP limity

Soubory:

- `src/lib/request-limits.ts`, `src/lib/request-validation.ts`, `src/lib/turnstile.ts`
- `deploy/nginx/adclare.conf.example`
- `tests/load-source.mjs`, `tests/public-endpoints.test.mjs`, `tests/request-limits.test.mjs`, `tests/asset-uploads.test.mjs`, `tests/turnstile.test.mjs`
- `package.json` – pouze skripty `test` a `test:security`
- `src/app/api/signup/route.ts`
- `src/app/api/login/request-link/route.ts`
- `src/app/api/invite/[token]/accept/route.ts`
- `src/app/api/logout/route.ts`
- `src/app/api/app/ads/route.ts`
- `src/app/api/app/ads/[code]/route.ts`
- `src/app/api/app/ads/[code]/assets/route.ts`
- `src/app/api/app/ads/[code]/approve/route.ts`
- `src/app/api/app/ads/[code]/publish/route.ts`
- `src/app/api/app/ads/[code]/request-changes/route.ts`
- `src/app/api/app/ads/[code]/audit-export/route.ts`
- `src/app/api/app/ads/import/route.ts`
- `src/app/api/app/branches/route.ts`, `src/app/api/app/branches/[id]/route.ts`
- `src/app/api/app/campaigns/route.ts`, `src/app/api/app/campaigns/[id]/route.ts`
- `src/app/api/app/candidates/route.ts`, `src/app/api/app/candidates/[id]/route.ts`
- `src/app/api/app/profile/route.ts`, `src/app/api/app/settings/route.ts`
- `src/app/api/app/users/route.ts`, `src/app/api/app/users/[id]/route.ts`
- `src/app/api/app/users/[id]/retry-email/route.ts`, `src/app/api/app/users/[id]/revoke-invitation/route.ts`

Proč: odstranit neomezené čtení před validací a obcházení IP limitu, odmítnout vadné ověření Turnstile a sjednotit zákaz rámování. Podrobné chování ověřují testy bez externích služeb.

### 2. Zabránit zneužití souběžných registrací a pozvánek

Soubory: `src/lib/signup.ts`, `src/lib/workspace-db.ts`, `tests/auth-races.test.mjs`.

Proč: superadmin se přidělí pouze první organizaci a změnu přístupu nelze provést přes zastaralý stav pozvánky.

### 3. Omezit rozbalování a paměťovou náročnost XLSX importu

Soubory: `src/lib/xlsx-ad-import.ts`, `tests/xlsx-limits.test.mjs`.

Proč: limit komprimovaného uploadu nestačí na ZIP bombu a neplatná čísla sloupců. Běžný import zůstává pokryt testem.

### 4. Aktualizovat zranitelné závislosti v kompatibilních rozsazích

Soubory: `package.json` – pouze verze Next.js / ESLint konfigurace, `package-lock.json`.

Proč: odstranit kritické hlášení Next.js a další opravitelné nálezy. Zbývající Prisma/Effect je zdokumentovaná otevřená položka, nikoli čistý audit.

### 5. Opravit jazykové chyby a metadata nápovědy

Soubory: `src/app/[locale]/page.tsx`, `src/app/[locale]/legal-pages.tsx`, `src/app/[locale]/help/page.tsx`.

Proč: opravit jednoznačné jazykové chyby a duplicitní titulek, doplnit canonical/hreflang nápovědy bez změny obchodních slibů.

### 6. Zaznamenat audit a zbývající rozhodnutí

Soubor: `docs/bezpecnostni-audit-2026-11-25.md`.

Proč: zachovat tabulku pravidel, přesný rozsah změn, ověření a provozní mezery pro kontrolu správce.

## Co má rozhodnout Lukáš

1. Potvrdit výjimku pravidla 1 pro autentizaci, nebo zadat zvlášť navržený režim s denními limity, odděleným uložením a bezpečným následným zpracováním.
2. Stanovit globální denní rozpočty a retenční politiku pro autentizační záznamy, čítače a politický archiv; následně nechat ověřit úložiště, proxy a WAF na povoleném dev prostředí.
3. Přijmout doloženou dočasnou výjimku Prisma/Effect pro CLI, nebo naplánovat kompatibilní opravu hlavní verze; bez toho auditní krok CI zůstává červený.
4. Zajistit povolené prostředí se staženými Prisma binárkami a buildovými fonty pro celý build, plný typecheck a PostgreSQL integrační test souběhu. Potom ověřit hlavičky a UI v prohlížeči.
5. Rozhodnout o dokončení anglické lokalizace metadat/HTML a doložení marketingových časových úspor.
