# Ochrany autentizace a importu

Aktualizováno podle rozhodnutí Lukáše Hanese z 26. 11. 2026.

Tento dokument popisuje ochrany ve zdrojovém kódu. Nepotvrzuje konfiguraci
nasazené instance ani úspěšné dokončení sestavení a integračních testů.

- Zapisující API omezuje skutečně přečtené bajty před zpracováním JSON a
  multipart obsahu. Chybné tělo vrací 400, překročený limit 413.
- Veřejná API mají společný limit 20 požadavků za 10 sekund na IP.
  Důvěryhodná proxy musí přepsat klientské IP hlavičky; postup je v
  [návodu pro vlastní instalaci](self-hosting.md#client-ip-forwarding).
- Registrace vybírá jedinečný slug, ověřuje možnost vytvořit první organizaci
  a přiděluje první administrátorskou roli pod stejným transakčním zámkem.
- Přijetí, zrušení a výměna tokenu pozvánky podmíněně kontrolují stav při
  zápisu. Opakování e-mailu je možné jen pro čekající pozvánku; stávající
  obnova expirované čekající pozvánky zůstává dostupná.
- Turnstile je signál; ověření vyžaduje povolený hostname a má časový limit
  deset sekund. Neúspěch vede k uložení neověřeného podání ke kontrole,
  nikoli k odmítnutí; vyplněná past ukládá podezřelé podání bez e-mailu.
  Po neúspěšném odeslání formulář obnoví jednorázový token.
- XLSX import omezuje rozbalené XML na 16 MiB na soubor a 32 MiB celkem,
  nejvýše 20 kandidátů na hlavičku a 500 datových řádků. Prázdné buňky se
  nealokují jako husté pole; platný rozsah sloupců Excelu zůstává zachován.

Počty zranitelností se mění s databází npm. Rozhodující je nový výsledek
`npm audit --omit=dev` a ověření použitých verzí, nikoli historický počet
hlášení. Změny lockfilu zahrnují více závislostí než samotný Next.js; jejich
kompatibilitu musí ověřit celé CI.

Samostatné provozní ověření vyžadují skutečné PostgreSQL zámky a rollbacky,
doručení e-mailů, objektové úložiště, proxy a chování v prohlížeči.
