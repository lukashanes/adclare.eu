import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

const locales = ["cs", "en"] as const;
type Locale = (typeof locales)[number];

const legalNavOrder = ["privacy", "cookies", "terms", "dpa", "subprocessors", "security"] as const;
export type LegalKind = (typeof legalNavOrder)[number];

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageContent = {
  title: string;
  intro: string;
  sections: LegalSection[];
};

type LegalLocaleContent = {
  back: string;
  updated: string;
  contact: string;
  controller: string;
  operator: string;
  address: string;
  ids: string;
  register: string;
  dataBox: string;
  email: string;
  note: string;
  nav: Record<LegalKind, string>;
  pages: Record<LegalKind, LegalPageContent>;
};

const updated = {
  cs: "27. května 2026",
  en: "27 May 2026",
} as const;

const legal = {
  cs: {
    back: "Zpět na web",
    updated: "Poslední aktualizace",
    contact: "Kontakt",
    controller: "Provozovatel a kontakt",
    operator: "Aenze s.r.o.",
    address: "Moskevská 1842, 272 04 Kladno, Česká republika",
    ids: "IČO 28534395, DIČ CZ28534395",
    register: "Společnost je zapsána v obchodním rejstříku vedeném Městským soudem v Praze, oddíl C, vložka 148584.",
    dataBox: "Datová schránka: iq9jf9h",
    email: "hello@adclare.eu",
    note:
      "Žádosti týkající se ochrany osobních údajů a smluvních dokumentů lze zasílat na hello@adclare.eu. Bezpečnostní oznámení směřujte na security@adclare.eu.",
    nav: {
      privacy: "Osobní údaje",
      cookies: "Cookies",
      terms: "Podmínky",
      dpa: "Zpracování údajů",
      subprocessors: "Subdodavatelé",
      security: "Bezpečnost",
    },
    pages: {
      privacy: {
        title: "Zásady ochrany osobních údajů",
        intro:
          "Tyto zásady obsahují informace o zpracování osobních údajů při používání webu adclare.eu, aplikace Adclare, obchodní komunikaci, fakturaci, podpoře, přihlášení, pozvánkách, veřejných transparentních výstupech a bezpečnostním provozu služby.",
        sections: [
          {
            title: "Postavení Aenze s.r.o.",
            body: [
              "Aenze s.r.o. vystupuje jako správce osobních údajů při provozu webu, obchodní komunikaci, uzavírání a plnění smluv, fakturaci, správě účtů, bezpečnosti služby, vlastním marketingu vůči zákazníkům a ochraně svých právních nároků.",
              "U osobních údajů vložených zákazníkem do kampaní, reklam, transparentních oznámení, souborů, schvalování, auditních záznamů a exportů vystupuje Aenze s.r.o. jako zpracovatel, pokud zákazník určuje účely a prostředky zpracování. Toto zpracování se řídí smlouvou se zákazníkem a zpracovatelskou přílohou podle čl. 28 GDPR.",
              "Zákazník zůstává odpovědný za zákonnost, správnost, úplnost a zveřejnění údajů, které do Adclare vloží nebo prostřednictvím služby publikuje.",
            ],
          },
          {
            title: "Kategorie údajů",
            body: [
              "Kontaktní a identifikační údaje: jméno, příjmení, e-mail, telefon, organizace, role, pracovní zařazení, obsah komunikace a údaje potřebné k vyřízení poptávky nebo podpory.",
              "Účetní a smluvní údaje: objednávka, tarif, sleva, platební metoda, fakturační údaje, stav předplatného, historie plateb, komunikace k fakturaci a údaje nezbytné pro účetní a daňové povinnosti.",
              "Údaje uživatelů aplikace: e-mail, jméno, role, oprávnění, pobočka nebo organizační jednotka, pozvánky, přihlášení, relace, auditní události a nastavení účtu.",
              "Zákaznický obsah: údaje o politických reklamách, kampaních, kandidátech, pobočkách, zadavatelích, plátcích, nákladech, dodavatelích, cílení, QR kódech, transparentních oznámeních, souborech a veřejných archivech.",
              "Technické a bezpečnostní údaje: IP adresa, čas přístupu, identifikátory relace, typ zařízení a prohlížeče, bezpečnostní logy, chybové záznamy, informace o doručení e-mailu a údaje potřebné k ochraně služby.",
            ],
          },
          {
            title: "Účely a právní základy",
            body: [
              "Jednání o smlouvě a plnění smlouvy zahrnuje vyřízení poptávky, zřízení a správu účtu, poskytování služby, pozvánky uživatelům, podporu, fakturaci, platby, zákaznickou komunikaci a zpřístupnění funkcí aplikace.",
              "Právní povinnosti zahrnují vedení účetnictví, daňové doklady, plnění povinností podle právních předpisů a vyřizování oprávněných požadavků orgánů veřejné moci.",
              "Oprávněný zájem zahrnuje zabezpečení webu a aplikace, prevenci zneužití, provozní a bezpečnostní logy, ochranu právních nároků, správu zákaznického vztahu a přiměřenou přímou komunikaci se stávajícími zákazníky.",
              "Souhlas se použije u volitelných analytických, marketingových nebo obdobných technologií a u komunikace, která souhlas vyžaduje. Souhlas lze kdykoli odvolat.",
            ],
          },
          {
            title: "Politická reklama a veřejné výstupy",
            body: [
              "Adclare je určen pro evidenci a koordinaci údajů k politické reklamě podle nařízení (EU) 2024/900. Některé údaje mohou souviset s politickou stranou, kandidátem, kampaní nebo cílením politické reklamy a mohou být citlivé z hlediska důvěrnosti i ochrany osobních údajů.",
              "Pokud zákazník zveřejní transparentní oznámení, QR stránku, veřejný repozitář, JSON endpoint nebo export, určuje rozsah zveřejnění zákazník. Aenze s.r.o. zajišťuje technické zpřístupnění podle nastavení služby a smluvních pokynů zákazníka.",
              "Zákazník odpovídá za to, že má právní důvod pro zpracování a zveřejnění údajů o kandidátech, dodavatelích, plátcích, cílení, nákladech a dalších osobách uvedených v reklamních záznamech.",
            ],
          },
          {
            title: "Příjemci, dodavatelé a předávání",
            body: [
              "Osobní údaje mohou být zpřístupněny pouze v nezbytném rozsahu poskytovatelům infrastruktury, bezpečnostních služeb, e-mailových služeb, platebních služeb, účetnictví, právních služeb, technické podpory, úložišť, monitoringu a dalším dodavatelům uvedeným v přehledu subdodavatelů.",
              "Někteří dodavatelé mohou zpracovávat údaje jako samostatní správci, zejména poskytovatel platebních služeb v rozsahu vyžadovaném právními předpisy a pravidly platebních sítí.",
              "Předání osobních údajů mimo EU/EHP probíhá pouze při splnění podmínek GDPR, zejména na základě rozhodnutí o odpovídající ochraně, standardních smluvních doložek nebo jiné použitelné záruky.",
            ],
          },
          {
            title: "Doba uchování",
            body: [
              "Poptávky a obchodní komunikace jsou uchovávány po dobu vyřízení a následně po dobu potřebnou k ochraně právních nároků.",
              "Údaje v zákaznických účtech jsou uchovávány po dobu trvání smluvního vztahu a následně podle smlouvy, právních předpisů, nastavení archivu nebo oprávněného zájmu na ochraně práv.",
              "Účetní a daňové doklady jsou uchovávány po dobu stanovenou příslušnými právními předpisy.",
              "Veřejně publikované transparentní záznamy a auditní stopa mohou zůstat dostupné po dobu vyžadovanou právními předpisy, smlouvou se zákazníkem nebo nastavením veřejného archivu.",
              "Bezpečnostní a provozní logy jsou uchovávány po dobu přiměřenou účelu zabezpečení, vyšetření incidentů, prevence zneužití a ochrany právních nároků.",
            ],
          },
          {
            title: "Práva subjektů údajů",
            body: [
              "Subjekt údajů má za podmínek GDPR právo na přístup k osobním údajům, opravu, výmaz, omezení zpracování, přenositelnost údajů, námitku proti zpracování založenému na oprávněném zájmu a právo odvolat souhlas, pokud je zpracování založeno na souhlasu.",
              "Žádosti lze zasílat na hello@adclare.eu. Pokud se žádost týká údajů spravovaných zákazníkem ve službě Adclare, Aenze s.r.o. může žádost předat nebo koordinovat se zákazníkem jako správcem těchto údajů.",
              "Subjekt údajů má právo podat stížnost u Úřadu pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz.",
            ],
          },
          {
            title: "Automatizované zpracování",
            body: [
              "Adclare může automaticky označovat chybějící údaje, stav schválení, termíny zveřejnění, blokace QR balíčku nebo rizikové mezery v evidenci. Toto zpracování slouží k řízení pracovního postupu zákazníka a nepředstavuje automatizované individuální rozhodování s právními nebo obdobně významnými účinky vůči fyzické osobě.",
            ],
          },
        ],
      },
      cookies: {
        title: "Cookies a podobné technologie",
        intro:
          "Tyto zásady popisují nezbytné cookies, bezpečnostní tokeny, relace a podobné technologie používané na webu adclare.eu a v aplikaci Adclare. Marketingové ani reklamní cookies nejsou používány bez souhlasu.",
        sections: [
          {
            title: "Právní rámec",
            body: [
              "Ukládání údajů do koncového zařízení a přístup k nim se řídí zejména § 89 odst. 3 zákona č. 127/2005 Sb., o elektronických komunikacích. Nezbytné technologie lze používat bez souhlasu, pokud jsou nutné pro přenos sdělení nebo poskytnutí služby vyžádané uživatelem.",
              "Volitelné analytické, marketingové nebo obdobné technologie budou použity pouze na základě souhlasu, pokud budou v budoucnu nasazeny.",
            ],
          },
          {
            title: "Technologie používané službou",
            body: [
              "adclare_user_session - nezbytná session cookie aplikace Adclare, provozovatel Aenze s.r.o., účel přihlášení a správa relace uživatele, expirace 30 dní.",
              "adclare_admin_session - nezbytná session cookie administrace, provozovatel Aenze s.r.o., účel ověření administrátorského přístupu, expirace 12 hodin.",
              "Přihlašovací a pozvánkové tokeny nejsou ukládány jako čitelné cookies v prohlížeči. Tokeny jsou posílány e-mailem, jejich otisky jsou uloženy na serveru a mají omezenou platnost.",
              "Cloudflare může být použit pro DNS, ochranu před útoky, proxy, WAF, e-mailové služby a případně Turnstile. Tyto technologie slouží k bezpečnosti, doručení služby a ochraně formulářů.",
              "Stripe může být použit při platbě kartou, správě předplatného a zákaznickém portálu. Při přesměrování na Stripe se použijí technologie Stripe podle jeho vlastních podmínek a zásad ochrany osobních údajů.",
            ],
          },
          {
            title: "Veřejný web",
            body: [
              "Veřejný web používá nezbytné technické a bezpečnostní technologie pro doručení stránek, ochranu proti zneužití, zabezpečení komunikace a základní provoz webu.",
              "Na veřejném webu nejsou bez souhlasu používány marketingové cookies, reklamní cookies třetích stran ani behaviorální profilování.",
            ],
          },
          {
            title: "Aplikace Adclare",
            body: [
              "V aplikaci jsou nezbytné technologie používány pro přihlášení, správu relace, zabezpečení účtu, ochranu formulářů, prevenci zneužití, oprávnění uživatelů a zachování základní funkčnosti.",
              "Blokace nezbytných technologií může způsobit nefunkčnost přihlášení, plateb, bezpečnostního ověření, QR balíčků nebo dalších částí služby.",
            ],
          },
          {
            title: "Správa nastavení",
            body: [
              "Uživatel může cookies mazat nebo blokovat v nastavení prohlížeče. Pokud budou nasazeny volitelné cookies, bude možné souhlas udělit, odmítnout nebo změnit ve srovnatelně dostupném nastavení.",
              "Pokud uživatel neudělí souhlas s volitelnými cookies, nebudou tyto cookies aktivovány.",
            ],
          },
        ],
      },
      terms: {
        title: "Podmínky používání služby",
        intro:
          "Tyto podmínky upravují používání webu adclare.eu a aplikace Adclare. Konkrétní cena, tarif, rozsah přístupů, platební režim, SLA, bezpečnostní režim a zpracování osobních údajů mohou být dále sjednány objednávkou, smlouvou nebo samostatnou přílohou.",
        sections: [
          {
            title: "Provozovatel a určení služby",
            body: [
              "Web adclare.eu a aplikaci Adclare provozuje Aenze s.r.o., Moskevská 1842, 272 04 Kladno, Česká republika, IČO 28534395, DIČ CZ28534395.",
              "Služba je určena zákazníkům jednajícím v rámci podnikatelské, profesní, politické, volební nebo organizační činnosti. Není určena pro spotřebitelské použití.",
              "Službu mohou používat politické strany, politická hnutí, kandidáti, volební týmy, pobočky, agentury, grafická studia, schvalovatelé a další osoby zapojené do přípravy nebo správy politické reklamy.",
            ],
          },
          {
            title: "Charakter služby",
            body: [
              "Adclare slouží k evidenci politické reklamy, doplňování povinných údajů, koordinaci schvalování, generování QR kódů a transparentních oznámení, vedení veřejného repozitáře, auditní stopy a exportů.",
              "Služba podporuje práci s požadavky na transparentnost politické reklamy podle nařízení (EU) 2024/900. Adclare poskytuje organizační, technické a evidenční nástroje; neposkytuje právní, daňové ani volební poradenství a nenahrazuje posouzení konkrétní kampaně právním poradcem zákazníka.",
              "Aenze s.r.o. negarantuje, že konkrétní reklama, kampaň, cílení, rozpočet, označení nebo zveřejněný obsah splňuje všechny právní požadavky. Správnost a zákonnost vstupních údajů vždy zajišťuje zákazník.",
            ],
          },
          {
            title: "Účty, role a přístupy",
            body: [
              "Zákazník může v rámci sjednaného tarifu vytvářet uživatele, pobočky, regiony, oblasti, kampaně a pracovní role. Zákazník odpovídá za to, že přístupy mají pouze oprávněné osoby a že jejich oprávnění odpovídá jejich úloze.",
              "Pozvaní uživatelé, externí grafici, agentury a kandidáti mohou pracovat pouze v rozsahu oprávnění nastaveném zákazníkem.",
              "Uživatel je povinen chránit přístup k e-mailu, přihlašovacím odkazům a svému zařízení. Podezření na zneužití přístupu musí být bez zbytečného odkladu oznámeno zákazníkovi nebo Aenze s.r.o.",
            ],
          },
          {
            title: "Odpovědnost zákazníka",
            body: [
              "Zákazník odpovídá za správnost, úplnost, aktuálnost a zákonnost údajů vložených do služby, zejména údajů o reklamě, zadavateli, sponzorovi, plátci, částkách, zdroji financování, kampani, období zveřejnění, cílení, dodavatelích a veřejně publikovaném obsahu.",
              "Zákazník odpovídá za interní schválení materiálů před zveřejněním a za to, že reklama nebude vyvěšena, spuštěna nebo šířena bez doplnění údajů, které jsou pro daný typ reklamy povinné.",
              "Zákazník nesmí službu používat způsobem, který porušuje právní předpisy, práva třetích osob, bezpečnost služby nebo oprávněné zájmy Aenze s.r.o. či ostatních zákazníků.",
            ],
          },
          {
            title: "Zkušební přístup, platby a fakturace",
            body: [
              "Pokud není sjednáno jinak, nový zákaznický účet může být zpřístupněn na 14 dní bez platby. Po skončení zkušebního období mohou být pracovní přístupy uzamčeny, dokud není účet aktivován zaplacením předplatného nebo ručním schválením fakturace.",
              "Přístup ke službě může být poskytován formou měsíčního nebo ročního předplatného, individuální nabídky nebo fakturace na základě ručního schválení. Konkrétní tarif, cena, sleva, měna, DPH, limity a platební podmínky jsou určeny objednávkou, administrací účtu nebo smlouvou.",
              "Platba může probíhat platební kartou prostřednictvím Stripe nebo na fakturu. Pokud není sjednáno jinak, předplatné se obnovuje na další období podle zvoleného tarifu.",
              "Při prodlení s platbou, neúspěšné platbě, zneužití služby nebo podstatném porušení podmínek může Aenze s.r.o. přístup omezit, pozastavit nebo ukončit v rozsahu povoleném smlouvou a právními předpisy.",
            ],
          },
          {
            title: "Veřejné výstupy, QR kódy a exporty",
            body: [
              "QR kódy, transparentní oznámení, veřejné stránky, repozitáře, JSON endpointy a exporty mohou zpřístupňovat údaje třetím osobám. Zákazník odpovídá za to, že obsah určený ke zveřejnění je správný, zákonný a určený ke zveřejnění.",
              "Po publikaci může být změna záznamu vedena jako nová verze nebo auditní událost. Služba může uchovávat historii změn pro účely kontroly, dohledatelnosti a ochrany práv.",
              "Aenze s.r.o. může technicky omezit generování QR balíčku nebo publikaci výstupu, pokud záznam neobsahuje povinné údaje nebo je ve stavu, který podle nastavení služby publikaci neumožňuje.",
            ],
          },
          {
            title: "Data, obsah a duševní vlastnictví",
            body: [
              "Software, rozhraní, design, databázová struktura, texty, ochranné prvky, název Adclare a další prvky služby jsou chráněny právy Aenze s.r.o. nebo jejích dodavatelů.",
              "Zákazníkovi zůstávají práva k obsahu, který do služby vloží. Zákazník uděluje Aenze s.r.o. oprávnění tento obsah zpracovat, ukládat, zobrazit, kopírovat, převést, publikovat, zálohovat a exportovat v rozsahu nezbytném pro poskytování služby, zabezpečení, podporu, auditní stopu, veřejné výstupy a plnění smluvních nebo zákonných povinností.",
              "Zákazník nesmí do služby vkládat obsah, k němuž nemá potřebná práva nebo právní důvod zpracování.",
            ],
          },
          {
            title: "Dostupnost, změny a ukončení",
            body: [
              "Aenze s.r.o. usiluje o dostupnost a obnovitelnost služby. Nepřetržitý provoz, konkrétní dostupnost, reakční doby podpory nebo zvláštní zálohovací režim jsou závazné pouze tehdy, pokud jsou výslovně sjednány.",
              "Funkce, uživatelské rozhraní, ceny, exporty, integrace a rozsah repozitáře se mohou měnit. Změny nesmí nepřiměřeně zhoršit již sjednané podstatné parametry služby bez odpovídajícího smluvního důvodu.",
              "Po ukončení smlouvy může zákazník požádat o export dat v dostupném formátu. Pokud není sjednáno jinak, Aenze s.r.o. může po uplynutí přiměřené lhůty účet a neveřejná data odstranit; veřejné transparentní záznamy mohou zůstat dostupné po dobu vyžadovanou právními předpisy, smlouvou nebo nastavením archivu.",
            ],
          },
          {
            title: "Omezení odpovědnosti",
            body: [
              "Informace na webu a ve službě mají produktový a obecný charakter. Nejsou právním, daňovým ani volebním poradenstvím.",
              "V rozsahu povoleném právními předpisy odpovídá Aenze s.r.o. pouze za přímou škodu způsobenou porušením svých smluvních povinností. Aenze s.r.o. neodpovídá za nepřímé škody, ušlý zisk, ztrátu reputace, nesprávné údaje vložené zákazníkem, rozhodnutí zákazníka při vedení kampaně ani za nedostupnost služeb třetích stran.",
              "Konkrétní limit odpovědnosti, výše náhrady škody a výjimky z omezení odpovědnosti mohou být sjednány individuální smlouvou. Omezení odpovědnosti se neuplatní v rozsahu, ve kterém by bylo vyloučeno právními předpisy.",
            ],
          },
          {
            title: "Pořadí dokumentů a rozhodné právo",
            body: [
              "Pokud je mezi zákazníkem a Aenze s.r.o. uzavřena individuální smlouva, objednávka, bezpečnostní příloha nebo zpracovatelská příloha, mají tato ujednání přednost před obecnými informacemi na webu v rozsahu, ve kterém se od nich liší.",
              "Není-li sjednáno jinak, právní vztahy související s webem a službou Adclare se řídí právem České republiky. Spory budou řešeny před věcně a místně příslušnými soudy České republiky.",
            ],
          },
        ],
      },
      dpa: {
        title: "Zpracovatelská příloha",
        intro:
          "Tato zpracovatelská příloha upravuje zpracování osobních údajů zákaznického obsahu, pokud Aenze s.r.o. zpracovává osobní údaje pro zákazníka jako zpracovatel podle čl. 28 GDPR.",
        sections: [
          {
            title: "Použití přílohy",
            body: [
              "Příloha se použije na osobní údaje vložené zákazníkem nebo jeho uživateli do aplikace Adclare, zejména do kampaní, reklam, transparentních oznámení, souborů, schvalování, auditní stopy, veřejných repozitářů a exportů.",
              "Pokud má zákazník s Aenze s.r.o. uzavřenou samostatnou písemnou zpracovatelskou smlouvu, má přednost před touto obecnou přílohou v rozsahu odlišné úpravy.",
            ],
          },
          {
            title: "Předmět, doba a účel zpracování",
            body: [
              "Předmětem zpracování je poskytování aplikace Adclare, správa politických reklam, generování QR kódů a transparentních oznámení, vedení repozitáře, auditní stopy, exportů, podpory, zabezpečení a související provoz služby.",
              "Zpracování trvá po dobu smluvního vztahu a následně po dobu nezbytnou pro export, výmaz, archivaci, ochranu právních nároků nebo splnění právních povinností.",
              "Účelem zpracování je umožnit zákazníkovi evidovat, kontrolovat, schvalovat, publikovat, archivovat a exportovat údaje o politické reklamě a souvisejících pracovních postupech.",
            ],
          },
          {
            title: "Kategorie údajů a subjektů",
            body: [
              "Zpracovávané údaje mohou zahrnovat identifikační a kontaktní údaje uživatelů, kandidátů, členů týmů, dodavatelů, grafiků, schvalovatelů a dalších osob uvedených zákazníkem.",
              "Zpracování může zahrnovat údaje o politické straně, kandidatuře, kampani, reklamě, cílení, nákladech, plátci, zadavateli, dodavateli, veřejném oznámení, souborech a auditních událostech.",
              "Vzhledem k povaze politické reklamy mohou některé údaje přímo nebo nepřímo souviset s politickými názory, politickou příslušností nebo veřejnou politickou činností. Zákazník odpovídá za právní základ a přiměřenost takového zpracování.",
            ],
          },
          {
            title: "Pokyny zákazníka",
            body: [
              "Aenze s.r.o. zpracovává zákaznický obsah pouze na základě smlouvy, nastavení služby, pokynů zákazníka a právních povinností, které se na Aenze s.r.o. vztahují.",
              "Pokud by podle názoru Aenze s.r.o. pokyn zákazníka porušoval GDPR nebo jiné předpisy o ochraně osobních údajů, Aenze s.r.o. zákazníka přiměřeně upozorní, ledaže tomu brání právní předpis.",
            ],
          },
          {
            title: "Bezpečnost zpracování",
            body: [
              "Aenze s.r.o. přijímá technická a organizační opatření odpovídající povaze služby, zejména řízení přístupů, oddělení zákaznických účtů, šifrovaný přenos, auditní logy, zálohy, omezení administrátorských přístupů a bezpečnostní monitoring.",
              "Zákazník odpovídá za správné nastavení rolí, poboček, oprávnění, pozvánek, schvalování a za ochranu přístupů svých uživatelů.",
            ],
          },
          {
            title: "Subdodavatelé",
            body: [
              "Zákazník uděluje obecný souhlas se zapojením subdodavatelů uvedených v přehledu subdodavatelů. Aenze s.r.o. zajistí, aby subdodavatelé byli vázáni přiměřenými povinnostmi ochrany osobních údajů.",
              "Aenze s.r.o. informuje o podstatných změnách subdodavatelů prostřednictvím aktualizace přehledu nebo jiným přiměřeným způsobem. Zákazník může vznést odůvodněnou námitku, pokud má změna podstatný dopad na ochranu údajů.",
            ],
          },
          {
            title: "Pomoc zákazníkovi",
            body: [
              "Aenze s.r.o. poskytne zákazníkovi přiměřenou součinnost při vyřizování práv subjektů údajů, bezpečnostních incidentů, posouzení vlivu na ochranu osobních údajů a komunikaci s dozorovým úřadem, pokud se požadavek týká zpracování v Adclare.",
              "Pokud žádost subjektu údajů směřuje přímo na Aenze s.r.o. a týká se zákaznického obsahu, Aenze s.r.o. ji může předat zákazníkovi nebo s ním její vyřízení koordinovat.",
            ],
          },
          {
            title: "Incidenty",
            body: [
              "Aenze s.r.o. oznámí zákazníkovi porušení zabezpečení osobních údajů týkající se zákaznického obsahu bez zbytečného odkladu poté, co se o něm dozví a ověří jeho povahu.",
              "Oznámení bude obsahovat dostupné informace potřebné k posouzení incidentu, jeho dopadu a navržených nebo přijatých opatření.",
            ],
          },
          {
            title: "Výmaz, export a audit",
            body: [
              "Po ukončení poskytování služby Aenze s.r.o. podle pokynu zákazníka umožní export nebo odstranění zákaznického obsahu, pokud dalšímu uchování nebrání právní povinnost, veřejný archiv, auditní účel nebo ochrana právních nároků.",
              "Aenze s.r.o. poskytne informace nezbytné k doložení souladu se zpracovatelskou přílohou. Audity a inspekce musí být předem dohodnuty tak, aby neohrozily bezpečnost služby, důvěrnost ostatních zákazníků ani provozní stabilitu.",
            ],
          },
        ],
      },
      subprocessors: {
        title: "Subdodavatelé a příjemci",
        intro:
          "Tento přehled uvádí hlavní dodavatele a příjemce, kteří se mohou podílet na provozu Adclare, zabezpečení, platbách, e-mailové komunikaci, infrastruktuře a podpoře.",
        sections: [
          {
            title: "Jak přehled používat",
            body: [
              "Přehled se vztahuje k běžnému provozu webu adclare.eu a aplikace Adclare. Konkrétní zapojení se může lišit podle tarifu, nastavení zákazníka, platební metody a zapnutých funkcí.",
              "Někteří poskytovatelé jednají jako zpracovatelé Aenze s.r.o.; někteří mohou v omezeném rozsahu jednat jako samostatní správci, zejména pokud jim tuto roli ukládají právní předpisy nebo pravidla jejich regulovaného odvětví.",
            ],
          },
          {
            title: "Hlavní subdodavatelé",
            body: [
              "Hetzner - hosting, VPS, databázová infrastruktura, zálohy nebo objektové úložiště podle provozního nastavení. Účel: provoz aplikace, databáze, souborů, záloh a dostupnosti. Lokalita: EU/EHP podle zvoleného datacentra.",
              "Cloudflare - DNS, proxy, DDoS ochrana, WAF, bezpečnostní služby, případně Turnstile, Email Routing a e-mailové odesílání. Účel: dostupnost, zabezpečení, ochrana formulářů a doručování e-mailové komunikace. Lokalita: globální síť, možné předání mimo EU/EHP při použití smluvních záruk.",
              "Stripe - platební brána, předplatné, zákaznický portál, platební doklady, prevence podvodů a zpracování platebních údajů. Účel: platby kartou a správa fakturace. Lokalita: EU/EHP a globální zpracování podle podmínek Stripe.",
              "Účetní, daňoví a právní poradci - zpracování faktur, účetnictví, daňových povinností, smluvní dokumentace a právních nároků. Účel: zákonné a smluvní povinnosti Aenze s.r.o.",
            ],
          },
          {
            title: "Služby, které nejsou standardně používány",
            body: [
              "Adclare standardně nepoužívá reklamní cookies, behaviorální marketingové profily ani třetí strany pro cílení reklamy návštěvníkům webu bez souhlasu.",
              "Pokud budou v budoucnu přidány analytické, marketingové, monitoringové nebo jiné volitelné nástroje, budou doplněny do tohoto přehledu a případně do cookie nastavení.",
            ],
          },
          {
            title: "Změny subdodavatelů",
            body: [
              "Aenze s.r.o. může subdodavatele změnit, doplnit nebo nahradit, pokud je to potřebné pro provoz, bezpečnost, dostupnost, platby nebo vývoj služby.",
              "Podstatná změna bude promítnuta aktualizací této stránky nebo oznámena zákazníkovi jiným přiměřeným způsobem. Zákazník může vznést odůvodněnou námitku podle zpracovatelské přílohy nebo smlouvy.",
            ],
          },
        ],
      },
      security: {
        title: "Bezpečnost služby",
        intro:
          "Adclare pracuje s kampaněmi, reklamami, QR kódy, veřejnými oznámeními, rolemi uživatelů a auditní stopou. Bezpečnostní opatření proto míří na oddělení zákazníků, kontrolu přístupů, dohledatelnost změn a obnovitelnost služby.",
        sections: [
          {
            title: "Organizační opatření",
            body: [
              "Přístup k produkčnímu prostředí je omezen na osoby, které jej potřebují pro provoz, podporu, bezpečnost nebo vývoj služby.",
              "Administrátorské zásahy jsou omezeny, logovány a prováděny v rozsahu potřebném pro provoz služby, podporu zákazníka, bezpečnostní řešení nebo smluvní povinnost.",
              "Bezpečnostní oznámení, podezření na zneužití účtu nebo incidenty lze hlásit na security@adclare.eu.",
            ],
          },
          {
            title: "Přístupy a oddělení zákazníků",
            body: [
              "Data zákazníků jsou oddělena tenantem. Role a oprávnění určují, zda uživatel vidí centrálu, pobočku, kampaň, kandidáta, reklamu, schvalování, fakturaci nebo audit.",
              "Zákazník může přidávat pobočky, regiony, oblasti, externí grafiky, kandidáty a schvalovatele. Za správné nastavení jejich rozsahu odpovídá zákazník.",
              "Po skončení trialu, neuhrazené platbě nebo ručním pozastavení může být pracovní přístup uzamčen, aby do služby nemohly přibývat nové změny mimo aktivní smluvní režim.",
            ],
          },
          {
            title: "Přihlášení a relace",
            body: [
              "Aplikace používá přihlášení e-mailem pomocí časově omezeného odkazu. Přihlašovací tokeny jsou ukládány jako otisky, nikoli jako čitelné hodnoty.",
              "Uživatelská session cookie je nastavena jako HttpOnly, SameSite Strict a v produkci Secure. Administrátorská session má kratší platnost.",
              "Tam, kde je to sjednáno nebo vyžadováno provozním nastavením, mohou být administrátorské a citlivé přístupy doplněny o další ověření.",
            ],
          },
          {
            title: "Síť, infrastruktura a e-mail",
            body: [
              "Produkční provoz je navržen pro nasazení za Cloudflare DNS, proxy, DDoS ochranou a WAF. Aplikace běží na infrastruktuře Hetzner.",
              "E-mailové pozvánky, přihlašovací odkazy a fakturační oznámení jsou odesílány přes Cloudflare Email Service, pokud je služba v prostředí nakonfigurována.",
              "Platební údaje karet nezpracovává Adclare přímo. Platby probíhají přes Stripe Checkout nebo zákaznický portál Stripe.",
            ],
          },
          {
            title: "Auditní stopa a změny reklam",
            body: [
              "Důležité změny v reklamách, schválení, publikaci, fakturaci, pozvánkách a přihlášení jsou zapisovány do auditní stopy.",
              "Po publikaci reklamy může být další změna vedena jako nová verze nebo auditní událost, aby bylo možné zpětně doložit, kdo a kdy údaje upravil.",
              "QR balíček nebo publikace mohou být zablokovány, pokud záznam neobsahuje údaje požadované nastavením služby.",
            ],
          },
          {
            title: "Zálohy, obnova a export",
            body: [
              "Produkční prostředí je navrženo s pravidelným zálohováním databáze a možností exportu dat pro zákazníka.",
              "Exporty mohou sloužit pro kontrolu, archivaci, migraci do jiného úložiště nebo předání veřejnému webu zákazníka.",
              "Konkrétní retenční doba, frekvence záloh, RPO, RTO a zvláštní archivní režim jsou závazné pouze tehdy, pokud jsou sjednány ve smlouvě nebo tarifu.",
            ],
          },
          {
            title: "Omezení",
            body: [
              "Žádné technické opatření nenahrazuje právní kontrolu kampaně, správné nastavení rolí zákazníkem ani správnost údajů vložených zákazníkem.",
              "Zákazník odpovídá za interní proces, včasné doplnění údajů před vyvěšením nebo spuštěním reklamy, správu svých uživatelů a reakci na upozornění v aplikaci.",
            ],
          },
        ],
      },
    },
  },
  en: {
    back: "Back to website",
    updated: "Last updated",
    contact: "Contact",
    controller: "Operator and contact",
    operator: "Aenze s.r.o.",
    address: "Moskevská 1842, 272 04 Kladno, Czech Republic",
    ids: "Company ID 28534395, VAT CZ28534395",
    register: "The company is registered in the Commercial Register maintained by the Municipal Court in Prague, section C, file 148584.",
    dataBox: "Data box: iq9jf9h",
    email: "hello@adclare.eu",
    note:
      "Personal data and contract document requests may be sent to hello@adclare.eu. Security notices should be sent to security@adclare.eu.",
    nav: {
      privacy: "Privacy",
      cookies: "Cookies",
      terms: "Terms",
      dpa: "Data Processing",
      subprocessors: "Subprocessors",
      security: "Security",
    },
    pages: {
      privacy: {
        title: "Privacy Policy",
        intro:
          "This Privacy Policy describes the processing of personal data on adclare.eu, in Adclare, business communication, billing, support, login, invitations, public transparency outputs and service security operations.",
        sections: [
          {
            title: "Role of Aenze s.r.o.",
            body: [
              "Aenze s.r.o. acts as controller for website operation, business communication, contract conclusion and performance, billing, account administration, service security, its own customer marketing and protection of its legal claims.",
              "For personal data entered by the customer into campaigns, ads, transparency notices, files, approval workflows, audit records and exports, Aenze s.r.o. acts as processor where the customer determines the purposes and means of processing. This processing is governed by the customer agreement and the data processing addendum under Article 28 GDPR.",
              "The customer remains responsible for the lawfulness, accuracy, completeness and publication of data entered into or published through Adclare.",
            ],
          },
          {
            title: "Data categories",
            body: [
              "Contact and identification data: name, email, phone number, organization, role, job function, message content and data needed to handle an inquiry or support request.",
              "Account and contract data: order, plan, discount, payment method, billing data, subscription status, payment history, billing communication and data needed for accounting and tax duties.",
              "Application user data: email, name, role, permissions, branch or organizational unit, invitations, logins, sessions, audit events and account settings.",
              "Customer content: political ads, campaigns, candidates, branches, sponsors, payers, costs, suppliers, targeting, QR codes, transparency notices, files and public repositories.",
              "Technical and security data: IP address, access time, session identifiers, device and browser data, security logs, error records, email delivery data and information needed to protect the service.",
            ],
          },
          {
            title: "Purposes and legal bases",
            body: [
              "Pre-contract steps and contract performance cover inquiries, account setup and administration, service provision, user invitations, support, billing, payments, customer communication and application functionality.",
              "Legal obligations cover accounting, tax records, compliance with applicable laws and handling lawful requests from public authorities.",
              "Legitimate interests include website and service security, abuse prevention, operational and security logs, protection of legal claims, customer relationship administration and proportionate direct communication with existing customers.",
              "Consent applies to optional analytics, marketing or similar technologies and to communications that require consent. Consent may be withdrawn at any time.",
            ],
          },
          {
            title: "Political advertising and public outputs",
            body: [
              "Adclare is used to manage data for political advertising under Regulation (EU) 2024/900. Some data may relate to a political party, candidate, campaign or political advertising targeting and may be sensitive from a confidentiality and data protection perspective.",
              "If the customer publishes a transparency notice, QR page, public repository, JSON endpoint or export, the customer determines the scope of publication. Aenze s.r.o. provides technical access according to service settings and the customer's contractual instructions.",
              "The customer is responsible for having a legal basis for processing and publishing data about candidates, suppliers, payers, targeting, costs and other persons listed in ad records.",
            ],
          },
          {
            title: "Recipients, suppliers and transfers",
            body: [
              "Personal data may be disclosed only to the extent necessary to infrastructure, security, email, payment, accounting, legal, technical support, storage, monitoring and other suppliers listed in the subprocessors overview.",
              "Some suppliers may process data as independent controllers, especially payment service providers to the extent required by law and payment network rules.",
              "Transfers outside the EU/EEA are made only in compliance with GDPR, in particular based on an adequacy decision, standard contractual clauses or another applicable safeguard.",
            ],
          },
          {
            title: "Retention",
            body: [
              "Inquiries and business communication are retained for handling and then for the period necessary to protect legal claims.",
              "Customer account data is retained for the term of the contract and subsequently as required by the contract, law, archive settings or legitimate interest in protecting rights.",
              "Accounting and tax records are retained for the period required by applicable law.",
              "Published transparency records and audit trails may remain available for the period required by law, customer agreement or public archive settings.",
              "Security and operational logs are retained for a period proportionate to service security, incident investigation, abuse prevention and protection of legal claims.",
            ],
          },
          {
            title: "Data subject rights",
            body: [
              "Under GDPR, data subjects have the right of access, rectification, erasure, restriction of processing, data portability, objection to processing based on legitimate interest and withdrawal of consent where processing is based on consent.",
              "Requests may be sent to hello@adclare.eu. If a request concerns data controlled by a customer within Adclare, Aenze s.r.o. may forward it to or coordinate it with the customer as controller.",
              "Data subjects may lodge a complaint with the Czech Data Protection Authority, Pplk. Sochora 27, 170 00 Prague 7, www.uoou.gov.cz.",
            ],
          },
          {
            title: "Automated processing",
            body: [
              "Adclare may automatically mark missing data, approval status, publication deadlines, QR package blocking or gaps in records. This processing supports the customer's workflow and does not constitute automated individual decision-making with legal or similarly significant effects on an individual.",
            ],
          },
        ],
      },
      cookies: {
        title: "Cookies and Similar Technologies",
        intro:
          "This Cookie Policy describes necessary cookies, security tokens, sessions and similar technologies used on adclare.eu and in Adclare. Marketing or advertising cookies are not used without consent.",
        sections: [
          {
            title: "Legal framework",
            body: [
              "Storing information on a user's device and accessing it is governed in Czech law mainly by Section 89(3) of Act No. 127/2005 Coll., on Electronic Communications. Strictly necessary technologies may be used without consent where they are necessary to transmit a communication or provide a service requested by the user.",
              "Optional analytics, marketing or similar technologies will be used only with consent if enabled in the future.",
            ],
          },
          {
            title: "Technologies used by the service",
            body: [
              "adclare_user_session - necessary application session cookie, provider Aenze s.r.o., purpose login and user session management, expiry 30 days.",
              "adclare_admin_session - necessary admin session cookie, provider Aenze s.r.o., purpose administrator access verification, expiry 12 hours.",
              "Login and invitation tokens are not stored as readable browser cookies. Tokens are sent by email, their hashes are stored server-side and their validity is limited.",
              "Cloudflare may be used for DNS, attack protection, proxy, WAF, email services and, where enabled, Turnstile. These technologies support security, service delivery and form protection.",
              "Stripe may be used for card payments, subscription management and the customer portal. When redirected to Stripe, Stripe technologies apply under Stripe's own terms and privacy notices.",
            ],
          },
          {
            title: "Public website",
            body: [
              "The public website uses necessary technical and security technologies to deliver pages, prevent abuse, secure communication and operate the website.",
              "Marketing cookies, third-party advertising cookies and behavioural profiling are not used on the public website without consent.",
            ],
          },
          {
            title: "Adclare application",
            body: [
              "In the application, necessary technologies are used for login, session management, account security, form protection, abuse prevention, user permissions and core functionality.",
              "Blocking necessary technologies may prevent login, payments, security verification, QR packages or other parts of the service from working correctly.",
            ],
          },
          {
            title: "Managing settings",
            body: [
              "Users can delete or block cookies in their browser settings. If optional cookies are enabled, consent can be given, refused or changed through comparably accessible settings.",
              "If the user does not consent to optional cookies, those cookies will not be activated.",
            ],
          },
        ],
      },
      terms: {
        title: "Terms of Service",
        intro:
          "These terms govern the use of adclare.eu and Adclare. Specific pricing, plan scope, payment mode, SLA, security terms and data processing terms may be further set by an order, agreement or separate addendum.",
        sections: [
          {
            title: "Operator and intended use",
            body: [
              "adclare.eu and Adclare are operated by Aenze s.r.o., Moskevská 1842, 272 04 Kladno, Czech Republic, Company ID 28534395, VAT CZ28534395.",
              "The service is intended for customers acting in a business, professional, political, electoral or organizational capacity. It is not intended for consumer use.",
              "The service may be used by political parties, political movements, candidates, campaign teams, branches, agencies, design studios, reviewers and other persons involved in preparing or managing political advertising.",
            ],
          },
          {
            title: "Nature of the service",
            body: [
              "Adclare is used to record political advertising, complete required data, coordinate approvals, generate QR codes and transparency notices, operate public repositories, maintain audit trails and create exports.",
              "The service supports work with transparency requirements for political advertising under Regulation (EU) 2024/900. Adclare provides organizational, technical and record-keeping tools; it does not provide legal, tax or election-law advice and does not replace review of a specific campaign by the customer's legal counsel.",
              "Aenze s.r.o. does not guarantee that a specific ad, campaign, targeting, budget, label or published content complies with all legal requirements. The customer is always responsible for the accuracy and lawfulness of input data.",
            ],
          },
          {
            title: "Accounts, roles and access",
            body: [
              "Within the agreed plan, the customer may create users, branches, regions, areas, campaigns and working roles. The customer is responsible for ensuring that access is granted only to authorized persons and matches their duties.",
              "Invited users, external designers, agencies and candidates may work only within the permissions set by the customer.",
              "Users must protect access to their email, login links and devices. Suspected misuse must be reported without undue delay to the customer or Aenze s.r.o.",
            ],
          },
          {
            title: "Customer responsibility",
            body: [
              "The customer is responsible for the accuracy, completeness, current status and lawfulness of data entered into the service, especially data about ads, sponsors, payers, amounts, funding source, campaigns, publication periods, targeting, suppliers and publicly available content.",
              "The customer is responsible for internal approval of materials before publication and for ensuring that an ad is not displayed, launched or disseminated without completion of data required for the relevant ad type.",
              "The customer must not use the service in a manner that breaches law, third-party rights, service security or the legitimate interests of Aenze s.r.o. or other customers.",
            ],
          },
          {
            title: "Trial, payments and invoicing",
            body: [
              "Unless agreed otherwise, a new customer account may be made available for 14 days without payment. After the trial ends, working access may be locked until the account is activated by paid subscription or manual invoice approval.",
              "Access may be provided as a monthly or annual subscription, individual offer or invoiced arrangement subject to manual approval. The specific plan, price, discount, currency, VAT, limits and payment terms are set by the order, account administration or agreement.",
              "Payment may be made by card through Stripe or by invoice. Unless agreed otherwise, subscriptions renew for the next period according to the selected plan.",
              "In case of overdue payment, failed payment, misuse of the service or material breach of the terms, Aenze s.r.o. may restrict, suspend or terminate access to the extent permitted by contract and law.",
            ],
          },
          {
            title: "Public outputs, QR codes and exports",
            body: [
              "QR codes, transparency notices, public pages, repositories, JSON endpoints and exports may make data available to third parties. The customer is responsible for ensuring that content intended for publication is accurate, lawful and intended to be published.",
              "After publication, a record change may be handled as a new version or audit event. The service may retain change history for inspection, traceability and protection of rights.",
              "Aenze s.r.o. may technically restrict QR package generation or publication where a record lacks data required by service settings or is in a state that does not allow publication.",
            ],
          },
          {
            title: "Data, content and intellectual property",
            body: [
              "The software, interface, design, database structure, texts, protection elements, Adclare name and other parts of the service are protected by rights of Aenze s.r.o. or its suppliers.",
              "The customer retains rights to content entered into the service. The customer grants Aenze s.r.o. the right to process, store, display, copy, convert, publish, back up and export that content to the extent necessary to provide the service, security, support, audit trail, public outputs and compliance with contractual or legal obligations.",
              "The customer must not enter content into the service without the necessary rights or legal basis for processing.",
            ],
          },
          {
            title: "Availability, changes and termination",
            body: [
              "Aenze s.r.o. makes reasonable efforts to keep the service available and recoverable. Continuous operation, specific availability, support response times or special backup arrangements are binding only if expressly agreed.",
              "Features, user interface, prices, exports, integrations and repository scope may change. Changes must not unreasonably impair already agreed material service parameters without an appropriate contractual basis.",
              "After termination, the customer may request an export of data in an available format. Unless agreed otherwise, Aenze s.r.o. may delete the account and non-public data after a reasonable period; public transparency records may remain available for the period required by law, agreement or archive settings.",
            ],
          },
          {
            title: "Limitation of liability",
            body: [
              "Information on the website and in the service is product and general information. It is not legal, tax or election-law advice.",
              "To the extent permitted by law, Aenze s.r.o. is liable only for direct damage caused by breach of its contractual obligations. Aenze s.r.o. is not liable for indirect damage, loss of profit, loss of reputation, inaccurate data entered by the customer, decisions made by the customer in running a campaign or unavailability of third-party services.",
              "A specific liability cap, amount of damages and exceptions may be agreed in an individual agreement. Liability limitations do not apply to the extent excluded by applicable law.",
            ],
          },
          {
            title: "Order of documents and governing law",
            body: [
              "If the customer and Aenze s.r.o. enter into an individual agreement, order, security addendum or data processing addendum, those terms prevail over general website information to the extent they differ.",
              "Unless agreed otherwise, legal relationships related to adclare.eu and Adclare are governed by the laws of the Czech Republic. Disputes will be resolved by the competent courts of the Czech Republic.",
            ],
          },
        ],
      },
      dpa: {
        title: "Data Processing Addendum",
        intro:
          "This Data Processing Addendum governs the processing of customer content personal data where Aenze s.r.o. processes personal data for the customer as processor under Article 28 GDPR.",
        sections: [
          {
            title: "Scope",
            body: [
              "This addendum applies to personal data entered by the customer or its users into Adclare, in particular campaigns, ads, transparency notices, files, approvals, audit trails, public repositories and exports.",
              "If the customer has entered into a separate written data processing agreement with Aenze s.r.o., that agreement prevails over this general addendum to the extent it differs.",
            ],
          },
          {
            title: "Subject matter, duration and purpose",
            body: [
              "The subject matter is the provision of Adclare, management of political ads, generation of QR codes and transparency notices, repository operation, audit trails, exports, support, security and related service operations.",
              "Processing lasts for the term of the contractual relationship and thereafter for the period necessary for export, deletion, archiving, protection of legal claims or compliance with legal obligations.",
              "The purpose is to enable the customer to record, check, approve, publish, archive and export political advertising data and related workflows.",
            ],
          },
          {
            title: "Data and data subjects",
            body: [
              "Processed data may include identification and contact details of users, candidates, team members, suppliers, designers, approvers and other persons specified by the customer.",
              "Processing may include data about political party, candidacy, campaign, ad, targeting, costs, payer, sponsor, supplier, public notice, files and audit events.",
              "Due to the nature of political advertising, some data may directly or indirectly relate to political opinions, political affiliation or public political activity. The customer is responsible for the legal basis and proportionality of such processing.",
            ],
          },
          {
            title: "Customer instructions",
            body: [
              "Aenze s.r.o. processes customer content only based on the agreement, service settings, customer instructions and legal obligations applicable to Aenze s.r.o.",
              "If Aenze s.r.o. believes that an instruction infringes GDPR or other data protection laws, it will reasonably inform the customer unless prohibited by law.",
            ],
          },
          {
            title: "Security",
            body: [
              "Aenze s.r.o. maintains technical and organizational measures appropriate to the nature of the service, including access controls, separation of customer accounts, encrypted transmission, audit logs, backups, restricted administrator access and security monitoring.",
              "The customer is responsible for proper role, branch, permission, invitation and approval settings and for protecting its users' access.",
            ],
          },
          {
            title: "Subprocessors",
            body: [
              "The customer grants general authorization to engage subprocessors listed in the subprocessors overview. Aenze s.r.o. will ensure that subprocessors are bound by appropriate personal data protection obligations.",
              "Aenze s.r.o. informs about material subprocessor changes by updating the overview or by another reasonable method. The customer may object on reasonable grounds if the change materially affects data protection.",
            ],
          },
          {
            title: "Assistance",
            body: [
              "Aenze s.r.o. will provide reasonable assistance with data subject rights, security incidents, data protection impact assessments and supervisory authority communications where the request concerns processing in Adclare.",
              "If a data subject request is sent directly to Aenze s.r.o. and concerns customer content, Aenze s.r.o. may forward it to or coordinate it with the customer.",
            ],
          },
          {
            title: "Incidents",
            body: [
              "Aenze s.r.o. will notify the customer of a personal data breach concerning customer content without undue delay after becoming aware of it and assessing its nature.",
              "The notice will include available information necessary to assess the incident, its impact and proposed or adopted measures.",
            ],
          },
          {
            title: "Deletion, export and audit",
            body: [
              "After the end of the service, Aenze s.r.o. will, according to customer instructions, enable export or deletion of customer content unless further retention is required by law, public archive, audit purpose or protection of legal claims.",
              "Aenze s.r.o. will provide information necessary to demonstrate compliance with this addendum. Audits and inspections must be agreed in advance so that they do not compromise service security, confidentiality of other customers or operational stability.",
            ],
          },
        ],
      },
      subprocessors: {
        title: "Subprocessors and Recipients",
        intro:
          "This overview lists the main suppliers and recipients that may support Adclare operations, security, payments, email communication, infrastructure and support.",
        sections: [
          {
            title: "How to read this overview",
            body: [
              "This overview applies to regular operation of adclare.eu and Adclare. Specific involvement may differ depending on the plan, customer settings, payment method and enabled features.",
              "Some providers act as processors of Aenze s.r.o.; some may act as independent controllers in a limited scope, especially where required by law or regulated industry rules.",
            ],
          },
          {
            title: "Main subprocessors",
            body: [
              "Hetzner - hosting, VPS, database infrastructure, backups or object storage depending on operational setup. Purpose: operation of application, database, files, backups and availability. Location: EU/EEA depending on selected data centre.",
              "Cloudflare - DNS, proxy, DDoS protection, WAF, security services, where enabled Turnstile, Email Routing and email sending. Purpose: availability, security, form protection and email delivery. Location: global network, possible transfers outside EU/EEA under contractual safeguards.",
              "Stripe - payment gateway, subscriptions, customer portal, payment records, fraud prevention and processing of payment data. Purpose: card payments and billing management. Location: EU/EEA and global processing under Stripe terms.",
              "Accounting, tax and legal advisers - invoices, accounting, tax duties, contract documentation and legal claims. Purpose: legal and contractual duties of Aenze s.r.o.",
            ],
          },
          {
            title: "Services not used by default",
            body: [
              "Adclare does not use advertising cookies, behavioural marketing profiles or third parties for targeting ads to website visitors without consent by default.",
              "If analytics, marketing, monitoring or other optional tools are added in the future, they will be added to this overview and, where applicable, cookie settings.",
            ],
          },
          {
            title: "Subprocessor changes",
            body: [
              "Aenze s.r.o. may change, add or replace subprocessors where needed for operation, security, availability, payments or development of the service.",
              "A material change will be reflected by updating this page or notifying the customer by another reasonable method. The customer may object on reasonable grounds under the data processing addendum or agreement.",
            ],
          },
        ],
      },
      security: {
        title: "Service Security",
        intro:
          "Adclare handles campaigns, ads, QR codes, public notices, user roles and audit trails. Security measures therefore focus on customer separation, access control, traceability of changes and service recoverability.",
        sections: [
          {
            title: "Organizational measures",
            body: [
              "Access to the production environment is limited to persons who need it for operations, support, security or development of the service.",
              "Administrator actions are restricted, logged and performed only as needed for service operation, customer support, security response or contractual duties.",
              "Security notices, suspected account misuse or incidents can be reported to security@adclare.eu.",
            ],
          },
          {
            title: "Access and customer separation",
            body: [
              "Customer data is separated by tenant. Roles and permissions determine whether a user can see headquarters, branch, campaign, candidate, ad, approvals, billing or audit.",
              "The customer may add branches, regions, areas, external designers, candidates and approvers. The customer is responsible for setting their scope correctly.",
              "After trial expiry, overdue payment or manual suspension, working access may be locked to prevent new changes outside an active contractual mode.",
            ],
          },
          {
            title: "Login and sessions",
            body: [
              "The application uses email login through time-limited links. Login tokens are stored as hashes, not readable values.",
              "The user session cookie is set as HttpOnly, SameSite Strict and Secure in production. The administrator session has a shorter lifetime.",
              "Where agreed or required by operational setup, administrator and sensitive access may be supplemented by additional verification.",
            ],
          },
          {
            title: "Network, infrastructure and email",
            body: [
              "Production operation is designed for deployment behind Cloudflare DNS, proxy, DDoS protection and WAF. The application runs on Hetzner infrastructure.",
              "Email invitations, login links and billing notices are sent through Cloudflare Email Service when configured in the environment.",
              "Adclare does not directly process card data. Payments run through Stripe Checkout or the Stripe customer portal.",
            ],
          },
          {
            title: "Audit trail and ad changes",
            body: [
              "Important changes in ads, approvals, publication, billing, invitations and login are written to the audit trail.",
              "After an ad is published, further changes may be recorded as a new version or audit event so it is possible to show who changed data and when.",
              "QR package generation or publication may be blocked where a record does not contain data required by service settings.",
            ],
          },
          {
            title: "Backups, recovery and export",
            body: [
              "The production environment is designed with regular database backups and customer data export capability.",
              "Exports may be used for inspections, archiving, migration to another storage or publication on the customer's website.",
              "Specific retention, backup frequency, RPO, RTO and special archive mode are binding only if agreed in the contract or plan.",
            ],
          },
          {
            title: "Limitations",
            body: [
              "No technical measure replaces legal campaign review, correct role setup by the customer or the accuracy of data entered by the customer.",
              "The customer is responsible for its internal process, timely completion of data before displaying or launching an ad, managing its users and responding to application warnings.",
            ],
          },
        ],
      },
    },
  },
} satisfies Record<Locale, LegalLocaleContent>;

function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function legalStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function legalMetadata({
  params,
  kind,
}: {
  params: Promise<{ locale: string }>;
  kind: LegalKind;
}): Promise<Metadata> {
  const { locale } = await params;
  const safeLocale = isLocale(locale) ? locale : "cs";
  const page = legal[safeLocale].pages[kind];

  return {
    title: page.title,
    description: page.intro,
    alternates: {
      canonical: `/${safeLocale}/${kind}`,
      languages: {
        cs: `/cs/${kind}`,
        en: `/en/${kind}`,
      },
    },
  };
}

export async function LegalPage({
  params,
  kind,
}: {
  params: Promise<{ locale: string }>;
  kind: LegalKind;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const t = legal[locale];
  const page = t.pages[kind];

  return (
    <main className="min-h-screen bg-white text-[#11161c]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <Link href={`/${locale}`} className="flex items-center gap-3" aria-label="Adclare">
            <span className="grid size-9 place-items-center rounded-md bg-[#f45d1f] text-white">
              <ShieldCheck size={21} />
            </span>
            <span className="text-2xl font-semibold">Adclare</span>
          </Link>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm font-semibold text-[#25282d] transition hover:border-[#f45d1f]/50 hover:bg-orange-50"
          >
            <ArrowLeft size={16} />
            {t.back}
          </Link>
        </div>
      </header>

      <section className="border-b border-black/10 bg-[#f7f7f8]">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:py-14">
          <div className="mb-5 flex flex-wrap gap-2 text-sm font-semibold">
            {legalNavOrder.map((navKind) => (
              <Link
                key={navKind}
                href={`/${locale}/${navKind}`}
                className={`rounded-md border px-3 py-1.5 ${
                  kind === navKind ? "border-[#f45d1f] bg-white text-[#d94410]" : "border-black/10 text-[#59616b]"
                }`}
              >
                {t.nav[navKind]}
              </Link>
            ))}
          </div>
          <p className="text-sm font-semibold text-[#d94410]">
            {t.updated}: {updated[locale]}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-black sm:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#3f444b]">{page.intro}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-10 sm:px-6 lg:grid-cols-[1fr_280px] lg:py-14">
        <article className="grid gap-8">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-black/10 bg-white p-6">
              <h2 className="text-2xl font-semibold text-black">{section.title}</h2>
              <div className="mt-4 grid gap-4 text-base leading-7 text-[#3f444b]">
                {section.body.map((paragraph, index) => (
                  <p key={`${section.title}-paragraph-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <aside className="h-fit rounded-lg border border-black/10 bg-[#f7f7f8] p-5">
          <h2 className="text-base font-semibold text-black">{t.controller}</h2>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-[#59616b]">
            <strong className="text-base text-[#11161c]">{t.operator}</strong>
            <span>{t.ids}</span>
            <span>{t.address}</span>
            <span>{t.register}</span>
            <span>{t.dataBox}</span>
            <a className="inline-flex items-center gap-2 pt-2 text-[#25282d] hover:text-[#d94410]" href="mailto:hello@adclare.eu">
              <Mail size={16} className="text-[#f45d1f]" />
              {t.email}
            </a>
          </div>
          <p className="mt-5 border-t border-black/10 pt-5 text-sm leading-6 text-[#59616b]">{t.note}</p>
        </aside>
      </div>
    </main>
  );
}
