# Nezávislý přezkum draft PR, 25. 11. 2026

## Verdikt před opravou

**Vyžaduje změny.** Oprava souběhů pozvánek v draftu nepokrývala výměnu tokenu během přijetí ani pořadí, kdy přijetí předběhne rušení. Nové regresní testy oba případy nejprve reprodukovaly. Jde o mezery původního chování, které bezpečnostní změna v PR nedořešila, nikoli o nově zavedené regrese.

Po níže uvedených lokálních opravách tyto testy procházejí. Doporučení ke sloučení však stále podmiňuji plným buildem, kontrolami s instalovanými závislostmi a rozhodnutím o zbývajícím nálezu npm audit.

## Rozsah

- Požadovaný rozdíl: `git diff origin/HEAD...HEAD`.
- `origin/HEAD` i společný předek: `a0eb4bc58f97f9c91b5644fa7851c037834dfe36`.
- Posuzovaný HEAD: `f3368a8227b98473d6bb4e6d20950d8f70438abc`.
- Výchozí pracovní strom byl čistý. Posuzováno všech 44 změněných souborů: 24 obsluh API, 6 knihovních modulů, 7 testovacích souborů, 3 veřejné stránky, Nginx, manifest a lockfile závislostí a původní zpráva.
- Navazující čtení zahrnovalo oprávnění, vytváření a opakování pozvánek, rate limiting, úložiště, validaci vstupů, metadata, CI a Dockerfile. Diff neobsahuje změnu schématu ani migraci.
- Lockfile mění verze 263 záznamů, přidává 64 a odstraňuje 37. Kontrola zahrnovala původ balíčků a audit; kompatibilitu celého stromu bez buildu nepotvrzuji.
- Přezkum byl lokální, bez služeb správy PR a bez spravovaného cloudového bezpečnostního skenu. Vzdálené reference nebyly aktualizovány. Jediným kontaktovaným externím rozhraním byl registr npm.

## Nálezy

| Závažnost | Soubor / místo | Nález a dopad | Verdikt |
| --- | --- | --- | --- |
| P2 – střední | `src/lib/workspace-db.ts`, `acceptInvitation` | `retryAppInvitationEmail` může po prvním načtení pozvánky vyměnit token. Nové atomické převzetí kontrolovalo jen ID, stav a expiraci. Požadavek se starým tokenem tak mohl založit členství, přestože závěrečné načtení oznámení již vrátilo `null`. | **Opraveno:** podmínka atomického převzetí zahrnuje hash skutečně předloženého tokenu. Test před opravou zaznamenal jeden neoprávněný zápis členství, po opravě žádný. |
| P2 – střední | `src/lib/workspace-db.ts`, `revokeAppInvitation` | Pokud přijetí vyhrálo po úvodním čtení rušícího požadavku, rušení přepsalo stav na `REVOKED` a vykázalo úspěch. Aktivní členství zůstalo. Správce tak mohl dostat nepravdivé potvrzení o zrušení přístupu. | **Opraveno:** stav se podmíněně mění uvnitř transakce. Přijatou pozvánku rušení nepřepíše a vrátí existující pokyn pozastavit uživatele. Nezapíše se nepravdivá auditní událost. |
| P2 – střední | `tests/auth-races.test.mjs` | Původní test pozvánky vracel pevné `count: 0`; neověřoval token ani opačné pořadí souběhu. | **Opraveno:** přidáno pět testů skutečných funkcí s databází nahrazenou v paměti: výměna tokenu, přijetí před rušením, běžné rušení, dvojí přijetí a expirace mezi čtením a zápisem. Dva nové testy selhaly před opravou zdroje a prošly po ní. |
| Vysoká podle npm; dosažitelnost aplikací neprokázána | `package-lock.json`, Effect / Prisma | Aktuální audit hlásí `GHSA-7589-6fvf-x4pw` (ReDoS v `Schema.TemplateLiteral`), přenesený na `effect`, `@prisma/config`, `prisma` a `@prisma/client`: celkem 4 vysoká hlášení, 0 ostatních. Totéž s `--omit=dev`. | **Ponecháno:** npm neuvádí dostupnou opravu; neprovádím neověřený přechod hlavní verze ani override. Nejde o důkaz čtyř nezávislých zranitelností ani zneužitelnosti veřejného endpointu. Auditní krok CI zůstává neúspěšný. Původní zpráva uvádí starší výsledek 3 hlášení. |
| K rozhodnutí – dopad na uživatele za společnou IP | `src/app/api/login/request-link/route.ts`, `src/app/api/signup/route.ts`, `src/app/api/invite/[token]/accept/route.ts` | Limity 8/5/10 za hodinu nyní sdílí všichni za jednou IP. Například devátý přihlašující se uživatel kanceláře může dostat 429. | **Ponecháno:** oprava obcházení limitů je opodstatněná; vhodné prahy a pravidla pro sdílené sítě vyžadují provozní rozhodnutí. |
| Informativní – rozsah PR | Veřejné stránky a `package-lock.json` | Jazykové opravy a metadata nápovědy přesahují bezpečnostní opravy; aktualizace závislostí je široká. U těchto změn nebyla zjištěna konkrétní regrese. | **Ponecháno:** nevracím jasné jazykové opravy ani bezpečnostní aktualizace jen kvůli rozsahu. Rozdělení změn a širší ověření kompatibility náleží správci. |

## Ověření po opravách

Prostředí: Windows, Node `24.21.0`, npm `11.19.0`. CI používá Node 22, který zde ověřen nebyl.

Pracovní kopie nemá `node_modules`. Zápis do požadované složky `C:/Dev/_codex-kredity/_cache` byl odmítnut oprávněními. Závislosti jsem neinstaloval do repa, nevytvořil náhradní cache ani dočasné soubory v `%TEMP%`. Pro příkazy npm byly nastaveny požadovaná cache, `TEMP` a `TMP` na sdílenou složku a vypnuto ukládání npm logů a upozornění na aktualizace.

Pro funkční testy byl použit jednorázový spouštěč ze standardního vstupu, celý v paměti: načetl TypeScript 6.0.3, JSZip 3.10.2 a jejich potřebné závislosti (14 balíčků celkem) pouze z registru npm. Každý archiv byl ověřen proti integritě v lockfilu. Moduly byly zpřístupněny testům přes Node loader; `tests/load-source.mjs` i testovaný zdrojový kód zůstaly skutečné. Před testy byly síťové funkce zablokovány; test Turnstile použil vlastní náhradu `fetch`. Nebyla spuštěna instalace ani instalační skripty. Tento postup nenahrazuje instalaci kompletního stromu a běžný CI běh.

| Kontrola | Výsledek |
| --- | --- |
| Původní testy dostupné bez souborového úložiště, spouštěč v paměti | **42/42 prošlo** před přidáním regresí. |
| Nové regrese před opravou zdroje | **2 selhání:** zápis členství po výměně tokenu; chybějící odmítnutí rušení přijaté pozvánky. Další 3 nové testy prošly. |
| Pět testovacích souborů po opravě, spouštěč v paměti | **47/47 prošlo**: `request-limits`, `auth-races`, `turnstile`, `xlsx-limits`, `public-endpoints`. |
| `tests/asset-uploads.test.mjs` | **Neprovedeno:** potřebuje skutečný dočasný adresář v zapisovatelné sdílené cache. Výsledek z předchozího běhu nepřebírám jako aktuální důkaz. |
| `npm run test:launch` | **Prošlo.** Jde převážně o statické smoke kontroly. |
| `npm run security:scan` | **Prošlo**, bez běžných vzorů tajných údajů ve sledovaných souborech. |
| `npm test` | **Neprošlo:** launch smoke prošel, následné testy nemají instalovaný `typescript`. Výše je samostatně uveden výsledek spouštěče v paměti. |
| `npm run build` | **Neprošlo při `db:generate`:** příkaz `prisma` není dostupný. Next.js build se nespustil. |
| `npm run lint` | **Neprovedena vlastní lint kontrola:** příkaz `eslint` není dostupný, návratový kód 1. |
| `npm run typecheck -- --incremental false` | **Neprovedena vlastní typová kontrola:** příkaz `tsc` není dostupný, návratový kód 1. |
| Syntaktická transpilace všech 33 změněných `.ts` / `.tsx` souborů v paměti; `node --check tests/auth-races.test.mjs` | **Prošlo.** Nenahrazuje sémantickou typovou kontrolu ani lint. |
| `npm audit --package-lock-only`, také s `--omit=dev` | **Neprošlo:** 4 vysoká hlášení popsaná výše. |
| `git diff --check` | **Prošlo.** |

Databáze, PostgreSQL zámky a skutečné transakční rollbacky nebyly integračně testovány. Nebyly odeslány e-maily, zprávy ani formuláře, spuštěny migrace, služby ani servery, kontaktována produkce nebo změněn stav PR. Nebylo nic commitnuto, pushnuto, mergováno či nasazeno.

## Navržené dodatečné commity

1. **Doplnit atomické kontroly souběhů pozvánek.** Soubory: `src/lib/workspace-db.ts`, `tests/auth-races.test.mjs`. Kontrola platnosti předloženého tokenu a přijatého stavu při rušení; pět regresních testů. Obě opravy tvoří jeden logický celek se společnými testy.
2. **Zaznamenat nezávislý přezkum draft PR.** Soubor: `docs/nezavisly-prezkum-pr-2026-11-25.md`. Rozsah, reprodukované nálezy, výsledky kontrol a zbývající rozhodnutí. Původní zpráva zůstává historickým záznamem předchozího běhu.

## Co má rozhodnout Lukáš Hanes

1. Přijmout doloženou dočasnou výjimku pro Effect / Prisma, nebo vyžádat samostatně ověřenou kompatibilní opravu. Bez rozhodnutí a úspěšných kontrol PR nedoporučuji ke sloučení.
2. Stanovit vhodné limity přihlášení, registrace a pozvánek pro více uživatelů za společnou IP.
3. Případně oddělit textové/SEO změny od bezpečnostních změn. Vynucené přepisování závislostí ani změny obchodních pravidel tento přezkum neprovádí.

Správce dále potřebuje zajistit zapisovatelnou sdílenou cache a prostředí s potřebnými závislostmi pro plný build, lint, typecheck a souborový test. Integrační test souběhů PostgreSQL patří do zvlášť povoleného testovacího prostředí. Tyto provozní kontroly nebyly v tomto běhu provedeny.
