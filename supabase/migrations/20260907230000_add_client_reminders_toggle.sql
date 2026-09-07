-- Automazioni — interruttore per pensione per i promemoria email (Blocco 13).
--
-- L'invio automatico dei promemoria (check-in, check-out, documenti
-- mancanti, saldo scaduto) introdotto in questo blocco va reso
-- configurabile per singola pensione dal pannello super admin, non
-- attivo di default per tutte: un test manuale della funzione ha
-- inviato un'email reale a una cliente senza che la pensione lo
-- sapesse o l'avesse approvato — da qui la necessità di un controllo
-- esplicito, con default OFF finché il titolare non lo attiva
-- consapevolmente.
--
-- Impatto: additivo, singola colonna nullable-con-default su una tabella
-- già esistente; nessun record esistente cambia comportamento (restano
-- tutti disattivati finché non si attivano da pannello admin).

ALTER TABLE public.tenants
  ADD COLUMN client_reminders_enabled BOOLEAN NOT NULL DEFAULT false;
