# Piano di Implementazione: Web App Auth (Gestione Gilda Metin2)

## Panoramica

Implementazione incrementale dell'applicazione web per la gestione degli account di gioco della gilda. Si parte dalla struttura del progetto e dal database, poi backend (auth, API, crittografia), infine frontend React. Ogni step è autocontenuto e costruisce sul precedente.

## Tasks

- [x] 1. Setup struttura progetto e dipendenze
  - [x] 1.1 Inizializzare il progetto Node.js/Express con TypeScript
    - Creare la struttura directory: `server/` (backend) e `client/` (frontend React+Vite)
    - Configurare `tsconfig.json` per il backend
    - Installare dipendenze backend: express, pg, bcrypt, jsonwebtoken, express-validator, express-rate-limit, cookie-parser, cors, dotenv, uuid
    - Installare dipendenze dev: typescript, ts-node, @types/*, jest, ts-jest, fast-check, supertest
    - Creare file `.env.example` con le variabili richieste: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `REFRESH_TOKEN_SECRET`
    - _Requisiti: 10.1, 10.2_

  - [x] 1.2 Inizializzare il frontend React + Vite con TypeScript
    - Scaffoldare il progetto Vite con template React-TS nella cartella `client/`
    - Installare dipendenze: react-router-dom, axios
    - Configurare il proxy Vite per le chiamate API in sviluppo (`/api` → backend)
    - _Requisiti: 10.1_

  - [x] 1.3 Creare lo schema del database PostgreSQL
    - Creare file di migrazione SQL con le tabelle `users`, `game_accounts`, `refresh_tokens` come da design
    - Includere vincoli, indici (email UNIQUE), valori default e foreign key
    - Creare uno script seed per inserire l'utente admin iniziale (password hashata con bcrypt)
    - _Requisiti: 9.1, 10.2_

- [x] 2. Implementare il servizio di crittografia e il modulo database
  - [x] 2.1 Implementare il servizio CryptoService (AES-256-GCM)
    - Creare `server/src/services/crypto.service.ts`
    - Implementare `encrypt(plaintext): string` e `decrypt(ciphertext): string`
    - Formato output: `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`
    - IV random di 12 byte per ogni operazione, chiave da variabile d'ambiente `ENCRYPTION_KEY`
    - _Requisiti: 3.2, 9.1_

  - [ ]* 2.2 Scrivere property test per CryptoService
    - **Proprietà 16: Round-trip crittografia credenziali di gioco**
    - Generare stringhe random (inclusi caratteri speciali, unicode, emoji, stringa vuota)
    - Verificare che `decrypt(encrypt(x)) === x` per ogni input
    - **Valida: Requisiti 3.2, 9.1**

  - [x] 2.3 Implementare il modulo di connessione al database
    - Creare `server/src/db/pool.ts` con pool di connessione pg
    - Creare `server/src/db/queries/` con query parametrizzate per users, game_accounts, refresh_tokens
    - _Requisiti: 10.2_

- [x] 3. Implementare autenticazione backend (AuthService + endpoints)
  - [x] 3.1 Implementare AuthService
    - Creare `server/src/services/auth.service.ts`
    - Implementare `login`, `refresh`, `logout`, `hashPassword`, `verifyPassword`
    - Access token JWT (15 min) con payload `{id, role}`, refresh token (7 giorni) come cookie httpOnly
    - Refresh token hashato con SHA-256 e salvato nella tabella `refresh_tokens`
    - _Requisiti: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

  - [x] 3.2 Implementare i middleware di autenticazione e autorizzazione
    - Creare `server/src/middleware/auth.middleware.ts` — verifica JWT da header Authorization
    - Creare `server/src/middleware/role.middleware.ts` — verifica ruolo utente (es. 'admin')
    - Creare `server/src/middleware/validate.middleware.ts` — validazione input con express-validator
    - Creare `server/src/middleware/rate-limiter.middleware.ts` — rate limiting su login e creazione utenti
    - _Requisiti: 8.1, 8.2, 9.2_

  - [x] 3.3 Implementare gli endpoint di autenticazione (Auth Controller)
    - Creare `server/src/controllers/auth.controller.ts`
    - `POST /api/auth/login` — login con email e password, restituisce accessToken + cookie refreshToken
    - `POST /api/auth/refresh` — rinnovo access token tramite cookie httpOnly
    - `POST /api/auth/logout` — invalidazione refresh token
    - Applicare rate limiting sull'endpoint di login
    - _Requisiti: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

  - [ ]* 3.4 Scrivere property test per autenticazione
    - **Proprietà 1: Login valido produce sessione valida**
    - **Proprietà 2: Credenziali non valide restituiscono errore generico**
    - **Proprietà 3: Login restituisce il ruolo corretto**
    - **Proprietà 5: Logout invalida la sessione**
    - **Proprietà 6: Token scaduto viene rifiutato**
    - **Proprietà 15: Password memorizzate come hash bcrypt**
    - **Valida: Requisiti 1.1, 1.2, 1.3, 1.4, 2.2, 2.3, 9.1**

- [ ] 4. Checkpoint — Verificare che tutti i test passino
  - Assicurarsi che tutti i test passino, chiedere all'utente in caso di dubbi.

- [x] 5. Implementare API account di gioco (GameAccountService + endpoints)
  - [x] 5.1 Implementare GameAccountService
    - Creare `server/src/services/game-account.service.ts`
    - Implementare `getAll`, `create`, `toggleStatus`, `delete`
    - `getAll` decrittografa username e password prima di restituirli
    - `create` crittografa username e password, imposta status a "offline"
    - `toggleStatus` inverte lo stato online↔offline
    - `delete` rimuove il record dal database
    - Validazione: rifiutare username/password vuoti, nulli o solo spazi
    - _Requisiti: 3.1, 3.2, 3.3, 4.2, 4.3, 5.1, 6.4_

  - [x] 5.2 Implementare gli endpoint Game Accounts (Controller)
    - Creare `server/src/controllers/game-account.controller.ts`
    - `GET /api/game-accounts` — lista tutti (autenticato)
    - `POST /api/game-accounts` — crea nuovo (autenticato)
    - `PATCH /api/game-accounts/:id/status` — toggle stato (autenticato)
    - `DELETE /api/game-accounts/:id` — elimina (solo admin)
    - Applicare middleware auth + role dove necessario
    - _Requisiti: 3.1, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.4, 6.1, 6.2, 6.4, 6.5_

  - [ ]* 5.3 Scrivere property test per account di gioco
    - **Proprietà 7: Utente autenticato riceve tutti gli account con campi completi**
    - **Proprietà 8: Nuovo account di gioco ha stato predefinito offline**
    - **Proprietà 9: Campi obbligatori mancanti vengono rifiutati**
    - **Proprietà 10: Toggle stato è un'involuzione**
    - **Proprietà 12: Eliminazione admin rimuove l'account**
    - **Valida: Requisiti 3.1, 3.2, 3.3, 4.2, 4.3, 5.1, 6.4**

- [x] 6. Implementare API gestione utenti (UserService + endpoints admin)
  - [x] 6.1 Implementare UserService
    - Creare `server/src/services/user.service.ts`
    - Implementare `create`, `update`, `findByEmail`, `getAll`
    - `create` hasha la password con bcrypt (salt rounds: 12), verifica unicità email
    - `update` aggiorna solo i campi forniti, hasha la nuova password se presente, verifica unicità email
    - _Requisiti: 7.2, 7.3, 7.6, 7.7, 9.1_

  - [x] 6.2 Implementare gli endpoint Users (Controller admin)
    - Creare `server/src/controllers/user.controller.ts`
    - `POST /api/users` — crea utente (solo admin)
    - `GET /api/users` — lista utenti (solo admin)
    - `PATCH /api/users/:id` — modifica utente (solo admin)
    - Applicare middleware auth + role('admin') su tutti gli endpoint
    - Validazione input: nome, email formato valido, password lunghezza minima, ruolo in ['admin','user']
    - _Requisiti: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2_

  - [ ]* 6.3 Scrivere property test per gestione utenti
    - **Proprietà 11: Enforcement autorizzazione basata su ruolo**
    - **Proprietà 13: Admin può creare utenti**
    - **Proprietà 14: Email duplicata viene rifiutata**
    - **Proprietà 18: Admin può modificare utenti esistenti (round-trip)**
    - **Proprietà 19: Email duplicata rifiutata anche in modifica**
    - **Valida: Requisiti 6.2, 7.2, 7.3, 7.6, 7.7, 8.1, 8.2**

- [x] 7. Implementare middleware errori e configurare Express app
  - [x] 7.1 Implementare il middleware centralizzato di gestione errori
    - Creare `server/src/middleware/error.middleware.ts`
    - Formato risposta: `{ error: { message, code } }`
    - Mappare tutti gli scenari di errore dalla tabella errori del design
    - Non esporre mai stack trace o dettagli interni al client
    - _Requisiti: 1.2, 4.4, 5.4, 6.5, 7.4, 7.8_

  - [x] 7.2 Configurare Express app e routing
    - Creare `server/src/app.ts` — configurazione Express (cors, cookie-parser, json, routes)
    - Creare `server/src/routes/` con file di routing per auth, game-accounts, users
    - Creare `server/src/index.ts` — entry point che avvia il server e serve i file statici del frontend in produzione
    - _Requisiti: 10.1, 10.3_

- [ ] 8. Checkpoint — Verificare che tutti i test backend passino
  - Assicurarsi che tutti i test passino, chiedere all'utente in caso di dubbi.

- [ ] 9. Implementare frontend — Autenticazione e routing
  - [x] 9.1 Implementare AuthContext e gestione token
    - Creare `client/src/context/AuthContext.tsx`
    - Access token in memoria (variabile di stato), mai in localStorage
    - Funzioni: `login`, `logout`, `refreshToken`
    - Refresh automatico quando access token scade (intercettore axios per 401)
    - Esporre `user` (id, name, role) e `isAuthenticated`
    - _Requisiti: 1.4, 1.5, 2.1, 2.2, 2.3_

  - [x] 9.2 Implementare ProtectedRoute e routing dell'app
    - Creare `client/src/components/ProtectedRoute.tsx` — redirect a `/login` se non autenticato, verifica ruolo per rotte admin
    - Configurare React Router in `client/src/App.tsx`:
      - `/` → redirect a `/login`
      - `/login` → LoginPage (se autenticato, redirect a `/accounts`)
      - `/accounts` → AccountList (protetta)
      - `/admin` → AdminPanel (protetta, solo admin)
    - _Requisiti: 1.1, 8.1_

  - [ ]* 9.3 Scrivere property test per redirect utenti non autenticati
    - **Proprietà 17: Utenti non autenticati vengono reindirizzati al login**
    - **Proprietà 4: Token valido garantisce accesso**
    - **Valida: Requisiti 1.1, 2.1**

- [x] 10. Implementare frontend — Pagina Login
  - [x] 10.1 Implementare LoginPage
    - Creare `client/src/pages/LoginPage.tsx`
    - Form con campi email e password
    - Chiamata a `POST /api/auth/login` tramite AuthContext
    - Mostrare messaggio di errore generico sotto il form in caso di credenziali non valide
    - Redirect a `/accounts` dopo login riuscito
    - Non cancellare i campi in caso di errore
    - _Requisiti: 1.1, 1.2, 1.3_

- [x] 11. Implementare frontend — Lista Account di Gioco
  - [x] 11.1 Implementare AccountList e AddAccountForm
    - Creare `client/src/pages/AccountList.tsx`
    - Tabella con colonne: username, password, stato (toggle), azioni
    - Toggle stato con colore verde (online) / diverso dal verde (offline)
    - Pulsante elimina visibile solo se utente è admin
    - Conferma prima dell'eliminazione (dialog/modale)
    - Creare `client/src/components/AddAccountForm.tsx` — modale/form per aggiungere account
    - Validazione campi obbligatori (username, password) con evidenziazione e messaggio
    - Gestione errori: toast per errori di rete, ripristino toggle in caso di errore stato
    - _Requisiti: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 12. Implementare frontend — Pannello Admin
  - [x] 12.1 Implementare AdminPanel
    - Creare `client/src/pages/AdminPanel.tsx`
    - Form creazione utente: nome, email, password, ruolo (admin/utente)
    - Lista utenti esistenti con pulsante modifica per ciascuno
    - Form/modale di modifica utente: nome, email, password (opzionale), ruolo
    - Gestione errori: "Email già in uso" (409), errori di rete
    - _Requisiti: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 13. Implementare navigazione e layout
  - [x] 13.1 Creare layout con navigazione
    - Creare un componente layout con header/navbar
    - Link a "Account" e "Admin" (quest'ultimo visibile solo ad admin)
    - Pulsante Logout
    - _Requisiti: 2.2, 6.1, 6.2_

- [x] 14. Configurare build di produzione e serving statico
  - [x] 14.1 Configurare il backend per servire il frontend in produzione
    - Configurare lo script di build: `npm run build` compila il frontend e copia i file statici
    - In `server/src/index.ts`, servire i file statici di `client/dist/` con Express
    - Gestire il fallback SPA (tutte le rotte non-API servono `index.html`)
    - Creare `Procfile` o configurazione per Render
    - _Requisiti: 10.1, 10.3_

- [ ] 15. Checkpoint finale — Verificare che tutti i test passino
  - Assicurarsi che tutti i test passino, chiedere all'utente in caso di dubbi.

## Note

- I task contrassegnati con `*` sono opzionali e possono essere saltati per un MVP più rapido
- Ogni task referenzia i requisiti specifici per tracciabilità
- I checkpoint garantiscono validazione incrementale
- I property test validano le proprietà universali di correttezza definite nel design
- Gli unit test validano esempi specifici e casi limite
