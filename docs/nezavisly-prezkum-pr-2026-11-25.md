# Ověřování ochran formulářů

## Automatické kontroly

Po instalaci závislostí spouští `npm run ci` testy, kontrolu běžných vzorů
tajných údajů, validaci a generování Prisma klienta, lint, typovou kontrolu,
audit produkčních závislostí a sestavení aplikace. `npm run docker:check`
navíc sestavuje cíle Dockerfile. Samotná transpilace testovacího loaderu
nenahrazuje sémantickou typovou kontrolu.

Regresní testy pokrývají zejména:

- velikost a validitu JSON a multipart těl, platné uploady a status 413;
- běžné POSTy bez těla i s prázdným formulářem;
- souběžné registrace se stejným názvem organizace;
- změny tokenu, stavu a expirace pozvánek mezi čtením a zápisem;
- odmítnutí opakování přijaté nebo zrušené pozvánky;
- normalizaci hostname, původní chyby a timeout ověření Turnstile;
- obnovení tokenu a hlášku při 429 ve veřejných formulářích;
- pravidla IP hlaviček v aplikaci a dodaných proxy šablonách;
- limity rozbaleného XLSX obsahu, společný rozpočet XML a řídké sloupce.

## Hranice testů

Testy souběhů používají náhradu databáze v paměti. Je nutné je doplnit
integračním ověřením PostgreSQL zámků, podmíněných aktualizací a rollbacků
v odděleném testovacím prostředí. Testy klientských obsluh nenahrazují
ověření skutečného widgetu Turnstile v prohlížeči. Kontrola proxy šablon
neověřuje běžící proxy ani firewall.

Rozhodnutí z 26. 11. 2026 uzavírá hodnoty IP limitů, kvót i chování
Turnstile a pasti. Aktuální implementace a důkazy jsou v
[ověření PR](overeni-pr-22-2026-11-26.md). Multipart upload je omezený velikostí, ale
nadále se zpracovává v paměti; změna na streamované úložiště by vyžadovala
samostatnou implementaci a zátěžové ověření.
