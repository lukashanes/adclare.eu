import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

const locales = ["cs", "en"] as const;
type Locale = (typeof locales)[number];
export type LegalKind = "privacy" | "cookies" | "terms";

const updated = {
  cs: "26. května 2026",
  en: "26 May 2026",
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
    email: "hello@adclare.eu",
    note:
      "Žádosti týkající se ochrany osobních údajů lze zasílat na uvedený kontakt. Bezpečnostní oznámení směřujte na security@adclare.eu.",
    nav: {
      privacy: "Ochrana osobních údajů",
      cookies: "Cookies",
      terms: "Podmínky",
    },
    pages: {
      privacy: {
        title: "Zásady ochrany osobních údajů",
        intro:
          "Aenze s.r.o. zpracovává osobní údaje v souvislosti s provozem webu adclare.eu, komunikací se zájemci a zákazníky, uzavíráním a plněním smluv, fakturací, podporou a provozem služby Adclare. Tyto zásady poskytují informace podle obecného nařízení o ochraně osobních údajů (GDPR).",
        sections: [
          {
            title: "Postavení Aenze s.r.o.",
            body: [
              "Při provozu webu, obchodní komunikaci, správě zákaznického vztahu, fakturaci, bezpečnosti služby a vlastním marketingu vystupuje Aenze s.r.o. jako správce osobních údajů.",
              "U osobních údajů obsažených v zákaznickém obsahu, zejména v kampaních, reklamách, transparentních oznámeních, souborech, schvalovacích procesech a auditních záznamech, vystupuje Aenze s.r.o. jako zpracovatel v rozsahu, ve kterém zákazník určuje účely a prostředky zpracování. Pravidla tohoto zpracování upravuje smlouva se zákazníkem včetně smlouvy o zpracování osobních údajů podle čl. 28 GDPR.",
            ],
          },
          {
            title: "Rozsah údajů",
            body: [
              "Zpracovávány mohou být identifikační a kontaktní údaje, zejména jméno, příjmení, e-mail, telefon, organizace, pracovní role, obsah komunikace a údaje potřebné pro vyřízení poptávky nebo podpory.",
              "U zákazníků a jejich uživatelů mohou být zpracovávány údaje o účtu, oprávněních, přihlášení, pozvánkách, tarifu, objednávce, slevě, platbě, fakturaci a obchodní historii.",
              "V zákaznickém obsahu mohou být uloženy údaje o pobočkách, kandidátech, dodavatelích, kampaních, reklamách, nákladech, plátcích, cílení, schvalování, QR kódech, transparentních oznámeních, souborech a auditní stopě.",
              "Technické údaje zahrnují IP adresu, čas přístupu, identifikátory relace, údaje o zařízení a prohlížeči, bezpečnostní logy, chybové záznamy a údaje nezbytné k ochraně webu a služby.",
            ],
          },
          {
            title: "Účely a právní základy",
            body: [
              "Jednání o smlouvě a plnění smlouvy zahrnuje vyřízení poptávky, zřízení účtu, poskytování služby, podporu, správu uživatelů, fakturační nastavení a komunikaci se zákazníkem.",
              "Právní povinnost se uplatní zejména u účetních a daňových dokladů, plnění povinností podle právních předpisů a vyřízení oprávněných požadavků orgánů veřejné moci.",
              "Oprávněný zájem Aenze s.r.o. zahrnuje zabezpečení webu a služby, prevenci zneužití, provozní logy, ochranu právních nároků, administraci zákaznického vztahu a přímou komunikaci se stávajícími zákazníky v přiměřeném rozsahu.",
              "Souhlas se použije u volitelných analytických, marketingových nebo obdobných technologií a u komunikace, která souhlas vyžaduje. Udělený souhlas lze kdykoli odvolat.",
            ],
          },
          {
            title: "Zákaznický obsah a zveřejnění údajů",
            body: [
              "Zákazník odpovídá za zákonnost, správnost a úplnost údajů vložených do služby Adclare a za to, že má právní důvod pro jejich zpracování a případné zveřejnění.",
              "Pokud zákazník prostřednictvím služby zveřejní transparentní oznámení, veřejný repozitář, QR stránku nebo export, určuje rozsah zveřejnění zákazník. Aenze s.r.o. zajišťuje technické zpřístupnění podle nastavení služby a smluvních pokynů zákazníka.",
            ],
          },
          {
            title: "Příjemci a dodavatelé",
            body: [
              "Osobní údaje mohou být zpřístupněny pouze v nezbytném rozsahu osobám, které se podílejí na provozu webu a služby, zejména poskytovatelům infrastruktury, bezpečnostních služeb, e-mailových služeb, platební brány, účetnictví, právních služeb, úložišť, monitoringu a technické podpory.",
              "Dodavatelé zpracovávají osobní údaje na základě smluvních závazků, pokynů Aenze s.r.o. nebo vlastních zákonných povinností. Osobní údaje mohou být dále zpřístupněny orgánům veřejné moci, pokud to vyžaduje právní předpis nebo oprávněný požadavek.",
            ],
          },
          {
            title: "Předávání mimo EU/EHP",
            body: [
              "Pokud dochází k předání osobních údajů mimo Evropskou unii nebo Evropský hospodářský prostor, probíhá tak pouze při splnění podmínek GDPR, zejména na základě rozhodnutí o odpovídající ochraně, standardních smluvních doložek nebo jiné použitelné záruky.",
            ],
          },
          {
            title: "Doba uchování",
            body: [
              "Osobní údaje jsou uchovávány pouze po dobu nezbytnou pro daný účel. Poptávky a obchodní komunikace jsou uchovávány po dobu vyřízení a následně po dobu potřebnou k ochraně právních nároků.",
              "Údaje v zákaznických účtech jsou uchovávány po dobu trvání smluvního vztahu a následně po dobu stanovenou smlouvou, právními předpisy, nastavením archivu nebo oprávněným zájmem na ochraně práv. Účetní a daňové doklady jsou uchovávány po dobu stanovenou příslušnými právními předpisy.",
              "Veřejně publikované transparentní záznamy mohou zůstat dostupné po dobu vyžadovanou právními předpisy, smlouvou se zákazníkem nebo nastavením veřejného archivu.",
            ],
          },
          {
            title: "Vaše práva",
            body: [
              "Subjekt údajů má za podmínek GDPR právo na přístup k osobním údajům, opravu, výmaz, omezení zpracování, přenositelnost údajů, námitku proti zpracování založenému na oprávněném zájmu a právo odvolat souhlas, pokud je zpracování založeno na souhlasu.",
              "Žádosti lze zasílat na hello@adclare.eu. Pokud se žádost týká údajů spravovaných zákazníkem ve službě Adclare, může být vyřízení žádosti koordinováno se zákazníkem jako správcem těchto údajů.",
              "Subjekt údajů má právo podat stížnost u Úřadu pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, www.uoou.gov.cz.",
            ],
          },
          {
            title: "Automatizované zpracování",
            body: [
              "Adclare může automaticky označovat chybějící údaje, stav schválení, termíny publikace nebo rizikové mezery v evidenci. Toto zpracování slouží k řízení workflow zákazníka a nepředstavuje automatizované individuální rozhodování s právními nebo obdobně významnými účinky vůči fyzické osobě.",
            ],
          },
        ],
      },
      cookies: {
        title: "Cookies a podobné technologie",
        intro:
          "Tyto zásady informují o používání cookies, lokálního úložiště, bezpečnostních tokenů a obdobných technologií na webu adclare.eu a ve službě Adclare. Pokud tyto technologie vedou ke zpracování osobních údajů, použijí se zároveň zásady ochrany osobních údajů.",
        sections: [
          {
            title: "Právní rámec",
            body: [
              "Ukládání údajů do koncového zařízení a přístup k nim se řídí zejména § 89 odst. 3 zákona č. 127/2005 Sb., o elektronických komunikacích. Nezbytné technologie lze používat bez souhlasu, pokud jsou nutné pro přenos sdělení nebo poskytnutí služby vyžádané uživatelem.",
              "Volitelné analytické, marketingové nebo obdobné technologie jsou používány pouze na základě souhlasu, pokud budou nasazeny.",
            ],
          },
          {
            title: "Veřejný web",
            body: [
              "Veřejný web adclare.eu používá nezbytné technické a bezpečnostní technologie pro doručení stránek, ochranu proti zneužití, zabezpečení komunikace a základní provoz webu.",
              "Na veřejném webu nejsou bez souhlasu používány marketingové cookies ani reklamní cookies třetích stran.",
            ],
          },
          {
            title: "Aplikace Adclare",
            body: [
              "V aplikaci Adclare mohou být nezbytné technologie používány pro přihlášení, správu relace, zabezpečení účtu, ochranu formulářů, prevenci zneužití, jazykové nastavení, oprávnění uživatelů a zachování základních preferencí.",
              "Při objednávce, platbě nebo bezpečnostním ověření mohou být použity technologie příslušného poskytovatele platební nebo bezpečnostní služby v rozsahu nezbytném pro dokončení daného kroku.",
            ],
          },
          {
            title: "Kategorie technologií",
            body: [
              "Nezbytné technologie slouží k bezpečnosti, přihlášení, správě relace, doručení webu a ochraně služby. Bez nich nemusí web nebo aplikace fungovat správně.",
              "Preferenční technologie mohou ukládat volby uživatele, například jazyk nebo základní nastavení rozhraní. Analytické technologie by sloužily k měření používání webu nebo služby. Marketingové technologie by sloužily k personalizaci a měření reklamy.",
              "Analytické a marketingové technologie nejsou používány bez předchozího souhlasu, pokud právní předpis neumožňuje jiný postup.",
            ],
          },
          {
            title: "Správa nastavení",
            body: [
              "Uživatel může cookies mazat nebo blokovat v nastavení prohlížeče. Blokace nezbytných technologií může způsobit nefunkčnost přihlášení, plateb, bezpečnostního ověření nebo dalších částí služby.",
              "Pokud budou na webu nebo ve službě používány volitelné cookies, bude možné souhlas udělit, odmítnout nebo změnit prostřednictvím příslušného nastavení souhlasu.",
            ],
          },
        ],
      },
      terms: {
        title: "Podmínky a právní informace",
        intro:
          "Tyto podmínky stanoví základní pravidla používání webu adclare.eu a služby Adclare. Konkrétní obchodní, cenové, platební, bezpečnostní a zpracovatelské podmínky mohou být dále upraveny objednávkou, rámcovou smlouvou, smlouvou o zpracování osobních údajů nebo jiným ujednáním se zákazníkem.",
        sections: [
          {
            title: "Provozovatel",
            body: [
              "Web adclare.eu a službu Adclare provozuje Aenze s.r.o., Moskevská 1842, 272 04 Kladno, Česká republika, IČO 28534395, DIČ CZ28534395. Kontaktní adresa: hello@adclare.eu.",
            ],
          },
          {
            title: "Charakter služby",
            body: [
              "Adclare slouží k evidenci politické reklamy, doplňování povinných údajů, koordinaci schvalování, generování QR kódů a transparentních oznámení, vedení repozitáře, auditní stopy a exportů.",
              "Služba podporuje plnění požadavků na transparentnost politické reklamy podle nařízení (EU) 2024/900. Adclare poskytuje organizační, technické a evidenční nástroje; neposkytuje právní poradenství a nenahrazuje posouzení konkrétní kampaně právním poradcem zákazníka.",
              "Služba je určena zejména politickým stranám, politickým hnutím, kandidátům, volebním týmům, pobočkám, agenturám, grafickým studiím a dalším osobám zapojeným do přípravy nebo správy politické reklamy.",
            ],
          },
          {
            title: "Odpovědnost zákazníka",
            body: [
              "Zákazník odpovídá za správnost, úplnost, aktuálnost a zákonnost údajů vložených do služby, zejména údajů o reklamě, zadavateli, plátci, částkách, kampani, období zveřejnění, cílení, dodavatelích a veřejně publikovaném obsahu.",
              "Zákazník odpovídá za nastavení svých uživatelů, poboček, kandidátů, agentur, grafiků a schvalovatelů, za oprávněnost jejich přístupu a za interní schválení materiálů před zveřejněním.",
              "Zákazník nesmí službu používat způsobem, který porušuje právní předpisy, práva třetích osob, bezpečnost služby nebo oprávněné zájmy Aenze s.r.o. či ostatních zákazníků.",
            ],
          },
          {
            title: "Účty, platby a fakturace",
            body: [
              "Přístup ke službě může být poskytován formou měsíčního nebo ročního předplatného, individuální nabídky nebo fakturace na základě ručního schválení. Konkrétní tarif, rozsah přístupů, sleva, měna, DPH, zkušební období a platební podmínky jsou určeny objednávkou nebo smlouvou.",
              "Platba může probíhat platební kartou prostřednictvím platební brány nebo na fakturu. Pokud není sjednáno jinak, předplatné se obnovuje na další období podle zvoleného tarifu.",
              "Při prodlení s platbou, zneužití služby nebo podstatném porušení podmínek může Aenze s.r.o. přístup omezit, pozastavit nebo ukončit v rozsahu povoleném smlouvou a právními předpisy.",
            ],
          },
          {
            title: "Veřejné výstupy, QR kódy a exporty",
            body: [
              "Zákazník bere na vědomí, že QR kódy, transparentní oznámení, veřejné stránky, repozitáře a exporty mohou zpřístupňovat údaje třetím osobám. Zákazník odpovídá za to, že obsah určený ke zveřejnění je správný, zákonný a určený ke zveřejnění.",
              "Po publikaci může být změna záznamu vedena jako nová verze nebo auditní událost. Služba může uchovávat historii změn pro účely kontroly, dohledatelnosti a ochrany práv.",
            ],
          },
          {
            title: "Dostupnost, bezpečnost a změny služby",
            body: [
              "Aenze s.r.o. přijímá přiměřená technická a organizační opatření k ochraně služby, účtů a dat. Zákazník je povinen chránit přístupové údaje, používat přidělené účty pouze oprávněnými osobami a bez zbytečného odkladu oznámit podezření na zneužití.",
              "Aenze s.r.o. usiluje o dostupnost a obnovitelnost služby. Nepřetržitý provoz, konkrétní dostupnost, reakční doby podpory nebo zvláštní zálohovací režim jsou závazné pouze tehdy, pokud jsou výslovně sjednány.",
              "Funkce, uživatelské rozhraní, ceny, exporty, integrace a rozsah repozitáře se mohou měnit. Změny nesmí nepřiměřeně zhoršit již sjednané podstatné parametry služby bez odpovídajícího smluvního důvodu.",
            ],
          },
          {
            title: "Duševní vlastnictví",
            body: [
              "Software, rozhraní, design, databázová struktura, texty, ochranné prvky, název Adclare a další prvky služby jsou chráněny právy Aenze s.r.o. nebo jejích dodavatelů.",
              "Zákazníkovi zůstávají práva k obsahu, který do služby vloží. Aenze s.r.o. je oprávněna tento obsah zpracovávat v rozsahu nezbytném pro poskytování služby, zabezpečení, podporu, auditní stopu a plnění smluvních nebo zákonných povinností.",
            ],
          },
          {
            title: "Omezení odpovědnosti",
            body: [
              "Informace na webu mají produktový a obecný charakter. Nejsou právním, daňovým ani volebním poradenstvím.",
              "V rozsahu povoleném právními předpisy odpovídá Aenze s.r.o. pouze za přímou škodu způsobenou porušením svých smluvních povinností. Aenze s.r.o. neodpovídá za nepřímé škody, ztrátu zisku, ztrátu reputace, nesprávné údaje vložené zákazníkem ani za rozhodnutí zákazníka při vedení kampaně.",
              "Případné smluvní omezení odpovědnosti, výše náhrady škody a výjimky z omezení odpovědnosti mohou být upraveny individuální smlouvou.",
            ],
          },
          {
            title: "Rozhodné právo",
            body: [
              "Není-li sjednáno jinak, právní vztahy související s webem a službou Adclare se řídí právem České republiky. Spory budou řešeny před věcně a místně příslušnými soudy České republiky.",
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
    address: "Moskevska 1842, 272 04 Kladno, Czech Republic",
    ids: "Company ID 28534395, VAT CZ28534395",
    email: "hello@adclare.eu",
    note:
      "Personal data requests may be sent to the contact above. Security notices should be sent to security@adclare.eu.",
    nav: {
      privacy: "Privacy",
      cookies: "Cookies",
      terms: "Terms",
    },
    pages: {
      privacy: {
        title: "Privacy Policy",
        intro:
          "Aenze s.r.o. processes personal data in connection with the operation of adclare.eu, communication with prospects and customers, contract conclusion and performance, billing, support and operation of Adclare. This Privacy Policy provides information under the General Data Protection Regulation (GDPR).",
        sections: [
          {
            title: "Role of Aenze s.r.o.",
            body: [
              "Aenze s.r.o. acts as controller for the operation of the website, business communication, customer relationship management, billing, service security and its own marketing.",
              "For personal data contained in customer content, in particular campaigns, ads, transparency notices, files, approval workflows and audit records, Aenze s.r.o. acts as processor to the extent that the customer determines the purposes and means of processing. This processing is governed by the customer agreement, including a data processing agreement under Article 28 GDPR.",
            ],
          },
          {
            title: "Data categories",
            body: [
              "Processed data may include identification and contact details, especially name, surname, email, phone number, organization, role, message content and data needed to handle an inquiry or support request.",
              "For customers and their users, data may include account details, permissions, login events, invitations, plan, order, discount, payment, billing and commercial history.",
              "Customer content may include data about branches, candidates, suppliers, campaigns, ads, costs, payers, targeting, approvals, QR codes, transparency notices, files and audit trails.",
              "Technical data includes IP address, access time, session identifiers, device and browser data, security logs, error records and data necessary to protect the website and service.",
            ],
          },
          {
            title: "Purposes and legal bases",
            body: [
              "Pre-contract steps and contract performance cover inquiries, account setup, service provision, support, user administration, billing settings and customer communication.",
              "Legal obligation covers accounting and tax records, compliance with applicable laws and handling lawful requests from public authorities.",
              "Legitimate interests of Aenze s.r.o. include website and service security, abuse prevention, operational logs, protection of legal claims, customer relationship administration and proportionate direct communication with existing customers.",
              "Consent applies to optional analytics, marketing or similar technologies and to communications that require consent. Consent may be withdrawn at any time.",
            ],
          },
          {
            title: "Customer content and publication",
            body: [
              "The customer is responsible for the lawfulness, accuracy and completeness of data entered into Adclare and for having a legal basis for its processing and, where applicable, publication.",
              "If the customer publishes a transparency notice, public repository, QR page or export through the service, the customer determines the scope of publication. Aenze s.r.o. provides technical access according to the service settings and the customer's contractual instructions.",
            ],
          },
          {
            title: "Recipients and suppliers",
            body: [
              "Personal data may be disclosed only to the extent necessary to persons involved in website and service operation, including infrastructure, security, email, payment gateway, accounting, legal, storage, monitoring and technical support providers.",
              "Suppliers process personal data based on contractual obligations, instructions of Aenze s.r.o. or their own legal duties. Personal data may also be disclosed to public authorities where required by law or a lawful request.",
            ],
          },
          {
            title: "Transfers outside the EU/EEA",
            body: [
              "Where personal data is transferred outside the European Union or the European Economic Area, this is done only in compliance with GDPR, in particular based on an adequacy decision, standard contractual clauses or another applicable safeguard.",
            ],
          },
          {
            title: "Retention",
            body: [
              "Personal data is retained only for as long as necessary for the relevant purpose. Inquiries and business communication are retained for handling and then for the period necessary to protect legal claims.",
              "Customer account data is retained for the term of the contract and subsequently as required by the contract, law, archive settings or legitimate interest in protecting rights. Accounting and tax records are retained for the period required by applicable law.",
              "Published transparency records may remain available for the period required by law, the customer agreement or the public archive settings.",
            ],
          },
          {
            title: "Your rights",
            body: [
              "Under GDPR, data subjects have the right of access, rectification, erasure, restriction of processing, data portability, objection to processing based on legitimate interest and withdrawal of consent where processing is based on consent.",
              "Requests may be sent to hello@adclare.eu. If a request concerns data controlled by a customer within Adclare, handling of the request may be coordinated with that customer as controller.",
              "Data subjects may lodge a complaint with the Czech Data Protection Authority, Pplk. Sochora 27, 170 00 Prague 7, www.uoou.gov.cz.",
            ],
          },
          {
            title: "Automated processing",
            body: [
              "Adclare may automatically mark missing data, approval status, publication deadlines or gaps in records. This processing supports customer workflow and does not constitute automated individual decision-making with legal or similarly significant effects on an individual.",
            ],
          },
        ],
      },
      cookies: {
        title: "Cookies and Similar Technologies",
        intro:
          "This Cookie Policy explains the use of cookies, local storage, security tokens and similar technologies on adclare.eu and in Adclare. Where these technologies involve personal data, the Privacy Policy also applies.",
        sections: [
          {
            title: "Legal framework",
            body: [
              "Storing information on a user's device and accessing it is governed in Czech law mainly by Section 89(3) of Act No. 127/2005 Coll., on Electronic Communications. Strictly necessary technologies may be used without consent where they are necessary to transmit a communication or provide a service requested by the user.",
              "Optional analytics, marketing or similar technologies are used only with consent if enabled.",
            ],
          },
          {
            title: "Public website",
            body: [
              "The public website adclare.eu uses necessary technical and security technologies to deliver pages, prevent abuse, secure communication and operate the website.",
              "Marketing cookies and third-party advertising cookies are not used on the public website without consent.",
            ],
          },
          {
            title: "Adclare application",
            body: [
              "In Adclare, necessary technologies may be used for login, session management, account security, form protection, abuse prevention, language settings, user permissions and basic preferences.",
              "Ordering, payment or security verification may use technologies of the relevant payment or security provider to the extent necessary to complete the respective step.",
            ],
          },
          {
            title: "Technology categories",
            body: [
              "Necessary technologies support security, login, session management, website delivery and service protection. Without them, the website or application may not work correctly.",
              "Preference technologies may store user choices, such as language or basic interface settings. Analytics technologies would measure website or service use. Marketing technologies would support advertising personalization and measurement.",
              "Analytics and marketing technologies are not used without prior consent unless applicable law allows otherwise.",
            ],
          },
          {
            title: "Managing settings",
            body: [
              "Users can delete or block cookies in their browser settings. Blocking necessary technologies may prevent login, payments, security verification or other parts of the service from working correctly.",
              "If optional cookies are used on the website or in the service, consent can be given, refused or changed through the relevant consent settings.",
            ],
          },
        ],
      },
      terms: {
        title: "Terms and Legal Notice",
        intro:
          "These terms set out the basic rules for using adclare.eu and Adclare. Specific commercial, pricing, payment, security and data processing terms may be further governed by an order, master agreement, data processing agreement or other agreement with the customer.",
        sections: [
          {
            title: "Operator",
            body: [
              "The adclare.eu website and Adclare service are operated by Aenze s.r.o., Moskevská 1842, 272 04 Kladno, Czech Republic, Company ID 28534395, VAT CZ28534395. Contact: hello@adclare.eu.",
            ],
          },
          {
            title: "Nature of the service",
            body: [
              "Adclare is used to record political advertising, complete required data, coordinate approvals, generate QR codes and transparency notices, operate repositories, maintain audit trails and create exports.",
              "The service supports transparency requirements for political advertising under Regulation (EU) 2024/900. Adclare provides organizational, technical and record-keeping tools; it does not provide legal advice and does not replace review of a specific campaign by the customer's legal counsel.",
              "The service is intended mainly for political parties, political movements, candidates, campaign teams, branches, agencies, design studios and other persons involved in preparing or managing political advertising.",
            ],
          },
          {
            title: "Customer responsibility",
            body: [
              "The customer is responsible for the accuracy, completeness, current status and lawfulness of data entered into the service, especially data about ads, sponsors, payers, amounts, campaigns, publication periods, targeting, suppliers and publicly available content.",
              "The customer is responsible for managing its users, branches, candidates, agencies, designers and approvers, for their access rights and for internal approval of materials before publication.",
              "The customer must not use the service in a manner that breaches law, third-party rights, service security or the legitimate interests of Aenze s.r.o. or other customers.",
            ],
          },
          {
            title: "Accounts, payments and invoicing",
            body: [
              "Access to the service may be provided as a monthly or annual subscription, individual offer or invoiced arrangement subject to manual approval. The specific plan, access scope, discount, currency, VAT, trial period and payment terms are set by the order or contract.",
              "Payment may be made by payment card through a payment gateway or by invoice. Unless agreed otherwise, subscriptions renew for the next period according to the selected plan.",
              "In case of overdue payment, misuse of the service or material breach of the terms, Aenze s.r.o. may restrict, suspend or terminate access to the extent permitted by contract and law.",
            ],
          },
          {
            title: "Public outputs, QR codes and exports",
            body: [
              "The customer acknowledges that QR codes, transparency notices, public pages, repositories and exports may make data available to third parties. The customer is responsible for ensuring that content intended for publication is accurate, lawful and intended to be published.",
              "After publication, a record change may be handled as a new version or audit event. The service may retain change history for inspection, traceability and protection of rights.",
            ],
          },
          {
            title: "Availability, security and changes",
            body: [
              "Aenze s.r.o. implements reasonable technical and organizational measures to protect the service, accounts and data. The customer must protect access credentials, ensure that assigned accounts are used only by authorized persons and promptly report suspected misuse.",
              "Aenze s.r.o. makes reasonable efforts to keep the service available and recoverable. Continuous operation, specific availability, support response times or special backup arrangements are binding only if expressly agreed.",
              "Features, user interface, prices, exports, integrations and repository scope may change. Changes must not unreasonably impair already agreed material service parameters without an appropriate contractual basis.",
            ],
          },
          {
            title: "Intellectual property",
            body: [
              "The software, interface, design, database structure, texts, protection elements, Adclare name and other parts of the service are protected by rights of Aenze s.r.o. or its suppliers.",
              "The customer retains rights to content entered into the service. Aenze s.r.o. may process that content to the extent necessary to provide the service, security, support, audit trail and compliance with contractual or legal obligations.",
            ],
          },
          {
            title: "Limitation of liability",
            body: [
              "Information on the website is product and general information. It is not legal, tax or election-law advice.",
              "To the extent permitted by law, Aenze s.r.o. is liable only for direct damage caused by breach of its contractual obligations. Aenze s.r.o. is not liable for indirect damage, loss of profit, loss of reputation, inaccurate data entered by the customer or decisions made by the customer in running a campaign.",
              "Any contractual limitation of liability, damage cap and exceptions may be set out in an individual agreement.",
            ],
          },
          {
            title: "Governing law",
            body: [
              "Unless agreed otherwise, legal relationships related to the website and Adclare are governed by the laws of the Czech Republic. Disputes will be resolved by the competent courts of the Czech Republic.",
            ],
          },
        ],
      },
    },
  },
} as const;

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
            <Link
              href={`/${locale}/privacy`}
              className={`rounded-md border px-3 py-1.5 ${
                kind === "privacy" ? "border-[#f45d1f] bg-white text-[#d94410]" : "border-black/10 text-[#59616b]"
              }`}
            >
              {t.nav.privacy}
            </Link>
            <Link
              href={`/${locale}/cookies`}
              className={`rounded-md border px-3 py-1.5 ${
                kind === "cookies" ? "border-[#f45d1f] bg-white text-[#d94410]" : "border-black/10 text-[#59616b]"
              }`}
            >
              {t.nav.cookies}
            </Link>
            <Link
              href={`/${locale}/terms`}
              className={`rounded-md border px-3 py-1.5 ${
                kind === "terms" ? "border-[#f45d1f] bg-white text-[#d94410]" : "border-black/10 text-[#59616b]"
              }`}
            >
              {t.nav.terms}
            </Link>
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
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
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
