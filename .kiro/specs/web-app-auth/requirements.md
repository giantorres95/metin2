# Documento dei Requisiti

## Introduzione

Applicazione web gestionale per una gilda di Metin2, pensata per condividere e organizzare le credenziali di accesso (username e password) degli account di gioco tra i membri della gilda. L'app consente a tutti gli utenti autenticati di visualizzare la lista completa degli account condivisi, aggiungerne di nuovi e segnalare tramite un toggle se un account è attualmente online o offline nel gioco. L'admin ha privilegi aggiuntivi per eliminare account dalla lista, creare le utenze di accesso al sistema e modificare gli account utente esistenti (nome, email, password, ruolo). Non è prevista una pagina di registrazione pubblica: l'admin crea manualmente gli account utente e comunica le credenziali. La pagina di login è la prima pagina mostrata agli utenti non autenticati (landing page). Il sistema prevede due ruoli: admin e utente semplice.

## Glossario

- **WebApp**: L'applicazione web principale che gestisce l'interfaccia utente e la logica applicativa
- **Database**: Il database online utilizzato per memorizzare gli account condivisi e le credenziali degli utenti
- **Admin**: Profilo con privilegi elevati, responsabile della creazione degli utenti e dell'eliminazione degli account condivisi
- **Utente**: Profilo con privilegi base, può visualizzare tutti gli account condivisi, aggiungerne di nuovi e cambiarne lo stato
- **Sistema_di_Autenticazione**: Il modulo responsabile della verifica delle credenziali e della gestione delle sessioni
- **Pannello_Admin**: L'interfaccia dedicata all'admin per la gestione degli utenti del sistema
- **Lista_Account**: La lista condivisa di tutti gli account di gioco Metin2 della gilda, visibile a tutti gli utenti autenticati
- **Account_Condiviso**: Un record contenente username, password e stato (online/offline nel gioco) di un account Metin2 della gilda
- **Sessione**: Il periodo di tempo durante il quale un utente autenticato può interagire con la WebApp senza dover effettuare nuovamente il login
- **Toggle_Stato**: Il pulsante di commutazione che permette di segnalare se un Account_Condiviso è attualmente online o offline nel gioco Metin2

## Requisiti

### Requisito 1: Login utente

**User Story:** Come utente (admin o utente semplice), voglio effettuare il login con le mie credenziali, in modo da accedere alle funzionalità della WebApp.

#### Criteri di Accettazione

1. WHEN un utente non autenticato visita la WebApp, THE WebApp SHALL mostrare la pagina di login come prima pagina (landing page)
2. WHEN un utente inserisce credenziali valide (email e password), THE Sistema_di_Autenticazione SHALL autenticare l'utente e reindirizzarlo alla pagina principale con la Lista_Account
3. WHEN un utente inserisce credenziali non valide, THE Sistema_di_Autenticazione SHALL mostrare un messaggio di errore generico "Credenziali non valide"
4. THE Sistema_di_Autenticazione SHALL distinguere tra profilo Admin e profilo Utente al momento del login
5. WHEN un utente effettua il login con successo, THE Sistema_di_Autenticazione SHALL creare una Sessione autenticata

### Requisito 2: Gestione sessione

**User Story:** Come utente autenticato, voglio che la mia sessione rimanga attiva durante l'utilizzo, in modo da non dover ripetere il login ad ogni operazione.

#### Criteri di Accettazione

1. WHILE un utente è autenticato, THE WebApp SHALL mantenere la Sessione attiva
2. WHEN un utente clicca su "Logout", THE Sistema_di_Autenticazione SHALL terminare la Sessione e reindirizzare l'utente alla pagina di login
3. IF una Sessione scade per inattività, THEN THE Sistema_di_Autenticazione SHALL reindirizzare l'utente alla pagina di login

### Requisito 3: Visualizzazione lista account condivisi

**User Story:** Come utente autenticato (admin o utente semplice), voglio visualizzare la lista di tutti gli account condivisi della gilda, in modo da consultare le credenziali disponibili.

#### Criteri di Accettazione

1. WHILE un utente è autenticato, THE WebApp SHALL mostrare la Lista_Account contenente tutti gli Account_Condiviso creati da tutti gli utenti
2. THE WebApp SHALL mostrare per ogni riga della Lista_Account lo username e la password dell'Account_Condiviso
3. THE WebApp SHALL mostrare per ogni riga della Lista_Account lo stato corrente (online/offline) dell'Account_Condiviso
4. THE WebApp SHALL mostrare per ogni riga della Lista_Account un Toggle_Stato per cambiare lo stato dell'Account_Condiviso

### Requisito 4: Aggiunta account condiviso

**User Story:** Come utente autenticato (admin o utente semplice), voglio aggiungere un nuovo account condiviso alla lista, in modo da rendere disponibili nuove credenziali ai membri della gilda.

#### Criteri di Accettazione

1. WHILE un utente è autenticato, THE WebApp SHALL mostrare un'opzione per aggiungere un nuovo Account_Condiviso
2. WHEN un utente compila il modulo con username e password e conferma, THE WebApp SHALL salvare il nuovo Account_Condiviso nel Database con stato predefinito "offline"
3. WHEN un utente inserisce un modulo con campi obbligatori mancanti (username o password), THE WebApp SHALL evidenziare i campi mancanti e mostrare un messaggio di validazione
4. IF il salvataggio nel Database fallisce, THEN THE WebApp SHALL mostrare un messaggio di errore e consentire all'utente di riprovare

### Requisito 5: Cambio stato online/offline

**User Story:** Come utente autenticato (admin o utente semplice), voglio cambiare lo stato di un account condiviso tra online e offline, in modo da indicare agli altri membri della gilda se l'account è attualmente connesso al gioco Metin2.

#### Criteri di Accettazione

1. WHEN un utente clicca sul Toggle_Stato di un Account_Condiviso, THE WebApp SHALL invertire lo stato dell'Account_Condiviso (da online a offline o viceversa) nel Database
2. WHEN lo stato di un Account_Condiviso è "online", THE WebApp SHALL mostrare il Toggle_Stato con colore verde
3. WHEN lo stato di un Account_Condiviso è "offline", THE WebApp SHALL mostrare il Toggle_Stato con colore diverso dal verde (indicando stato inattivo)
4. IF l'aggiornamento dello stato nel Database fallisce, THEN THE WebApp SHALL mostrare un messaggio di errore e ripristinare il Toggle_Stato allo stato precedente

### Requisito 6: Eliminazione account condiviso (solo admin)

**User Story:** Come admin, voglio eliminare un account condiviso dalla lista, in modo da rimuovere credenziali non più valide o necessarie.

#### Criteri di Accettazione

1. WHILE l'Admin è autenticato, THE WebApp SHALL mostrare un pulsante di eliminazione accanto a ogni riga della Lista_Account
2. WHILE l'Utente (non admin) è autenticato, THE WebApp SHALL nascondere il pulsante di eliminazione dalla Lista_Account
3. WHEN l'Admin clicca sul pulsante di eliminazione di un Account_Condiviso, THE WebApp SHALL richiedere una conferma prima di procedere
4. WHEN l'Admin conferma l'eliminazione, THE WebApp SHALL rimuovere l'Account_Condiviso dal Database e aggiornare la Lista_Account
5. IF l'eliminazione dal Database fallisce, THEN THE WebApp SHALL mostrare un messaggio di errore e mantenere l'Account_Condiviso nella Lista_Account

### Requisito 7: Gestione account utente da parte dell'admin (creazione e modifica)

**User Story:** Come admin, voglio creare e modificare manualmente gli account utente del sistema, in modo da controllare chi può accedere alla WebApp e aggiornare le informazioni degli utenti esistenti.

#### Criteri di Accettazione

1. WHILE l'Admin è autenticato, THE Pannello_Admin SHALL mostrare l'opzione per creare un nuovo account utente
2. WHEN l'Admin compila il modulo di creazione utente con nome, email, password e ruolo (admin o utente), THE Pannello_Admin SHALL creare un nuovo account nel Database
3. WHEN l'Admin tenta di creare un account con un'email già esistente, THE Pannello_Admin SHALL mostrare un messaggio di errore "Email già in uso"
4. IF il salvataggio nel Database fallisce, THEN THE Pannello_Admin SHALL mostrare un messaggio di errore e consentire all'Admin di riprovare
5. WHILE l'Admin è autenticato, THE Pannello_Admin SHALL mostrare la lista degli utenti esistenti con un'opzione di modifica per ciascuno
6. WHEN l'Admin modifica il nome, l'email, la password o il ruolo di un utente esistente e conferma, THE Pannello_Admin SHALL aggiornare i dati dell'utente nel Database
7. WHEN l'Admin modifica l'email di un utente con un'email già in uso da un altro utente, THE Pannello_Admin SHALL mostrare un messaggio di errore "Email già in uso"
8. IF l'aggiornamento nel Database fallisce, THEN THE Pannello_Admin SHALL mostrare un messaggio di errore e consentire all'Admin di riprovare

### Requisito 8: Nessuna registrazione pubblica

**User Story:** Come admin, voglio che non esista una pagina di registrazione pubblica, in modo da mantenere il controllo completo sugli accessi.

#### Criteri di Accettazione

1. THE WebApp SHALL presentare solo la pagina di login come punto di accesso pubblico
2. THE WebApp SHALL impedire la creazione di account utente tramite qualsiasi endpoint pubblico

### Requisito 9: Sicurezza delle credenziali utente

**User Story:** Come admin, voglio che le password degli utenti del sistema siano memorizzate in modo sicuro, in modo da proteggere gli account.

#### Criteri di Accettazione

1. THE Sistema_di_Autenticazione SHALL memorizzare le password degli utenti nel Database in formato hash (non in chiaro)
2. WHEN un utente effettua il login, THE Sistema_di_Autenticazione SHALL confrontare l'hash della password inserita con l'hash memorizzato nel Database
3. THE WebApp SHALL trasmettere le credenziali tramite connessione HTTPS

### Requisito 10: Hosting e database

**User Story:** Come admin, voglio che la WebApp sia ospitata su un server gratuito con un database online, in modo da ridurre i costi di gestione.

#### Criteri di Accettazione

1. THE WebApp SHALL essere compatibile con piattaforme di hosting gratuite (ad esempio Render, Railway, Vercel)
2. THE Database SHALL essere un servizio online gratuito compatibile con la piattaforma di hosting scelta
3. THE WebApp SHALL funzionare correttamente entro i limiti delle risorse offerte dai piani gratuiti
