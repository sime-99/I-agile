# I-AGILE — Handoff di prodotto e tecnico

> Ultimo aggiornamento: 26 settembre 2026  
> Stato: prima slice dell'MVP realizzata in locale; database e deploy da configurare.

## 1. Visione

**I-AGILE** è un'app personale per organizzare e rendere visibili le mansioni quotidiane con principi ispirati ad Agile.

Non deve applicare Agile in modo rigoroso: deve aiutare l'utente a pianificare una settimana realistica, eseguire le attività e osservare nel tempo dove investe ore ed energie.

Il prodotto prende ispirazione visiva dalle dashboard di Azure DevOps, ma è pensato per una sola persona e per i contesti della vita quotidiana.

## 2. Concetti di dominio concordati

La gerarchia utile è:

```text
Area → Sotto-area → Epica → Routine/template → Istanza settimanale → Attività
```

| Livello | Scopo | Esempio |
| --- | --- | --- |
| Area | Grande ambito della vita | Casa |
| Sotto-area | Contesto più specifico, facoltativo | Cucina |
| Epica | Obiettivo, iniziativa o filone continuativo | Meal prep |
| Routine/template | Modello riutilizzabile di lavoro ricorrente | Meal prep settimanale |
| Istanza settimanale | Esecuzione concreta del template in una settimana | Meal prep — settimana 39 |
| Attività | Azione atomica eseguibile | Fare la spesa |

### Esempio completo

```text
Casa
└─ Cucina
   └─ Epica: Meal prep
      └─ Template: Meal prep settimanale
         └─ Istanza: Preparare 5 pranzi — settimana del 21 settembre
            ├─ Pianificare il menu
            ├─ Controllare la dispensa
            ├─ Fare la spesa
            ├─ Cucinare
            └─ Porzionare
```

Le storie/istanze del meal prep possono avere titoli e attività molto simili ogni settimana: non è un problema, ma il segnale che devono derivare da un **template ricorrente**. A cambiare sono data, durata, punteggio, quantità di pasti e note.

### Evoluzione del modello board (direzione concordata)

La board dovrà separare chiaramente le **storie** dai **task**:

```text
Area → Epica → Storia (stabile) → Task dello sprint (mobili)
```

- Una **storia** resta visibile e ferma nella parte sinistra della griglia finché non viene chiusa esplicitamente.
- I **task** figli della storia sono le sole card che passano tra `To do`, `In progress` e `Done`.
- La chiusura di tutti i task non archivia automaticamente la storia: l'utente decide quando chiuderla.
- Un menu a tendina sulla storia permette di chiuderla/archiviarla; le storie chiuse non appaiono più nella griglia corrente.
- La struttura visiva prevista è una griglia con una colonna sinistra per le storie e tre colonne per i task: `To do`, `In progress`, `Done`.

## 3. Terminologia consigliata nell'interfaccia

Per un'app personale è preferibile usare termini quotidiani invece di terminologia Agile troppo rigida:

| Termine Agile tradizionale | Termine consigliato in I-AGILE |
| --- | --- |
| Component | Area |
| Epic | Epica |
| User story | Attività pianificata / Istanza |
| Story point | Punto calcolato dalle ore stimate |
| Sprint | Settimana |

"Component" non è sbagliato, ma per Casa, Gym e Progetti il concetto più chiaro è **Area**. "Cucina" è normalmente una sotto-area di Casa, non un'epica.

## 4. Aree iniziali concordate

Il primo set deve restare operativo e compatto; non è prevista un'area separata "Vita personale".

- Casa
  - Cucina
  - Pulizie e manutenzione
- Salute e fitness
  - Gym
  - Alimentazione e recupero
- Progetti
  - I-AGILE
- Amministrazione
  - Finanze, documenti e scadenze

L'elenco deve essere completamente modificabile dall'utente; è un punto di partenza, non una tassonomia fissa.

## 5. Tempo e punteggio

Tempo e punteggio hanno ruoli distinti e non vanno confusi.

- **Ore stimate**: previsione per pianificare una settimana sostenibile.
- **Ore effettive**: tempo davvero investito, inserito a fine attività o durante l'esecuzione.
- **Punti della storia**: calcolo automatico delle ore stimate delle sue task; 1 punto ogni 30 minuti. Sono ammessi decimali, ad esempio 45 minuti = 1,5 punti.

L'app deve mostrare sia la capacità oraria settimanale sia i punti completati. I punti non sono "story point" Agile in senso stretto: esprimono il tempo pianificato della storia e sono collegati direttamente alla capacità disponibile.

## 6. Dashboard MVP

La schermata iniziale è una board settimanale in stile DevOps con solo tre colonne:

```text
To do | In progress | Done
```

Non è prevista una colonna `Verify`.

La griglia deve mostrare una riga per storia aperta: la storia è fissa a sinistra e i suoi task figli occupano le tre colonne di stato.

Ogni storia mostra almeno:

- titolo della storia;
- area e, se presente, epica;
- punti personali;

Ogni task mostra almeno:

- titolo dell'attività;
- tempo stimato e/o effettivo;
- eventuale data obiettivo.

I task devono poter essere spostati tra colonne con drag & drop. La storia ha un menu di azioni separato, incluso `Chiudi storia`.

Nella testata della dashboard:

```text
Settimana 21–27 settembre
Capacità: 12 h | Completato: 8,5 h | 14 punti
```

## 7. Ambito dell'MVP

### Incluso

1. Autenticazione personale.
2. Creazione, modifica e archiviazione di aree.
3. Creazione di epiche.
4. Backlog essenziale per creare storie e assegnarle a uno sprint ISO.
5. Creazione dei relativi task per una settimana/sprint.
6. Board con storie fisse a sinistra e task in `To do` / `In progress` / `Done` con drag & drop.
7. Stima ore e ore effettive sulle task; punti della storia calcolati automaticamente dalle stime.
8. Descrizione / note facoltative per ogni storia, visibili nella board e nel backlog.
9. Riepilogo della settimana: capacità, ore completate e punti completati.
10. Chiusura/archiviazione esplicita delle storie e cancellazione dal Backlog con conferma.
11. Capacity settimanale: conto a scalare delle 168 ore, con voci modificabili per sonno, lavoro, viaggi, visite e uscite sociali.

### Esplicitamente fuori dall'MVP

- notifiche, promemoria e integrazioni con calendario;
- automazioni cron per creare attività in automatico;
- condivisione, collaborazione e gestione team;
- applicazione mobile nativa;
- sezione Analisi con statistiche e dashboard;
- ordinamento, priorità e pianificazione avanzata del backlog;
- IA e suggerimenti automatici;
- colonne aggiuntive o workflow configurabili.

## 8. Stack tecnologico suggerito

| Responsabilità | Tecnologia | Motivo |
| --- | --- | --- |
| Web app e API | Next.js + TypeScript | Un'unica codebase moderna per interfaccia e backend leggero. |
| Hosting e deploy | Vercel | Deploy automatici, preview e gestione semplice per un'app personale. |
| Database e autenticazione | Supabase (PostgreSQL + Auth) | Dati relazionali, login e policy di accesso senza costruire un backend dedicato. |
| Stile e componenti | Tailwind CSS + shadcn/ui | Interfaccia sobria e adattabile allo stile dashboard. |
| Drag & drop | dnd-kit | Board accessibile e robusta. |
| Grafici, fase successiva | Recharts | Grafici su ore e punti quando saranno utili. |

### Vercel

È possibile creare un secondo progetto nello stesso account Vercel. Il piano Hobby consente fino a 200 progetti; ogni progetto può avere un repository, dominio, variabili d'ambiente e deploy separati.

Per l'app va creato un nuovo repository Git e poi un nuovo progetto Vercel collegato a quel repository. Non è necessario creare un altro account Vercel.

## 9. Automazioni ricorrenti

Per la prima versione, un'istanza di routine va creata con un'azione esplicita, ad esempio:

```text
Crea il meal prep per la settimana corrente
```

Questo rende il comportamento trasparente e consente di modificare o saltare una settimana senza dati inattesi.

In futuro si potrà aggiungere la creazione automatica via job pianificato. Sul piano Vercel Hobby le esecuzioni cron sono limitate a una volta al giorno e la precisione oraria non è garantita; ciò è comunque sufficiente per una creazione settimanale.

## 10. Modello dati iniziale

Entità minime da prevedere:

```text
users
areas
sub_areas
epics
routine_templates
routine_template_tasks
weekly_items
weekly_item_tasks
time_entries (opzionale nell'MVP; utile per più registrazioni di tempo)
```

Campi chiave:

- `areas`: `id`, `user_id`, `name`, `color`, `archived_at`;
- `epics`: `id`, `user_id`, `area_id`, `sub_area_id`, `title`, `description`, `archived_at`;
- `routine_templates`: `id`, `epic_id`, `title`, `default_estimated_minutes`;
- `weekly_items`: `id`, `user_id`, `epic_id`, `routine_template_id`, `week_start`, `title`, `status`, `estimated_minutes`, `actual_minutes`, `due_date`, `notes`, `sort_order`;
- `weekly_item_tasks`: `id`, `weekly_item_id`, `title`, `completed_at`, `sort_order`.

Gli stati ammessi all'inizio sono esclusivamente:

```text
todo | in_progress | done
```

## 11. Prossime decisioni prima dello sviluppo

1. Scegliere il nome definitivo e il look della dashboard.
2. Decidere se una card rappresenta sempre un'attività singola oppure se può contenere sotto-attività completabili.
3. Stabilire la scala dei punti personali e il suo significato: impatto, fatica o priorità.
4. Definire la regola della capacità settimanale: una sola quantità di ore o capacità giornaliera.
5. Disegnare le schermate MVP: board, gestione aree/epiche, creazione/modifica card, routine/template.
6. Creare repository, progetto Supabase e nuovo progetto Vercel.

## 12. Decisione tecnica corrente

Procedere con **Next.js su Vercel + Supabase**. È la soluzione più semplice per costruire e distribuire un MVP personale, senza introdurre un backend separato o un'infrastruttura troppo complessa.

## 13. Stato sviluppo — 26 settembre 2026

È stata completata la prima slice funzionante dell'MVP in locale:

- applicazione Next.js + TypeScript inizializzata;
- dashboard responsiva in stile DevOps, senza sidebar: navigazione e filtro Area sono nella barra superiore;
- taskboard con una user story fissa a sinistra per ogni riga e colonne `To do`, `In progress` e `Done`;
- task figli spostabili con drag & drop soltanto tra le colonne della rispettiva user story;
- chiusura esplicita della user story dal suo menu: la riga viene nascosta dalla griglia;
- creazione di nuove task e dettaglio con stato e tempo effettivo;
- sezione Backlog per creare le storie e assegnarle, o rimuoverle, dagli sprint ISO 1–53;
- eliminazione definitiva di una storia dal Backlog, insieme alle sue task, dopo una conferma esplicita;
- selettore dello sprint nella taskboard, con il relativo intervallo di date;
- contatore dei punti totali e rimanenti dello sprint; il tetto è calcolato dalla Capacity a 1 punto ogni 30 minuti;
- punti lineari, anche decimali, calcolati dalle ore stimate delle task e attribuiti alla relativa user story;
- una storia porta punti completati quando tutte le sue task sono in `Done`;
- sezione Capacity: 168 ore settimanali meno sonno, lavoro, viaggi, visite e uscite sociali; i valori sono modificabili e il saldo aggiorna la capacità della taskboard;
- riepiloghi aggiornati automaticamente;
- persistenza temporanea nel browser tramite `localStorage`.

Supabase, autenticazione e deploy Vercel non sono ancora configurati: sono il prossimo blocco di lavoro, quando saranno disponibili le credenziali e il progetto Supabase.
