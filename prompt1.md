Analizza questo repository in modalità solo lettura.

Obiettivo:
capire perché l'app usa ancora il database Lovable invece di Supabase.

Regole:
- non modificare nessun file
- non creare commit
- non suggerire refactor automatici
- fai solo analisi

Controlla:

1. dove viene inizializzato il client Supabase
2. quali file fanno query al database
3. se esistono adapter o provider Lovable ancora attivi
4. se il toggle Lovable/Supabase cambia davvero il data provider
5. se le variabili ambiente Supabase vengono lette
6. se esistono fallback verso Lovable

Output richiesto:

- elenco file che interrogano il database
- dove viene scelto tra Lovable e Supabase
- perché Supabase non viene usato
- soluzione minima per far usare Supabase