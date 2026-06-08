# Monday Intake Agent

Een zelfstandige Node.js agent die intake-data van het **Platform Ondernemen PoC** ontvangt via een webhook en automatisch verwerkt in **Monday CRM**.

---

## Hoe het werkt

```
Platform Ondernemen PoC (Agent 1)
    → POST /intake (webhook)
        → Monday Intake Agent (Agent 2)
            → Monday CRM
```

- **Nieuw bedrijf** → nieuw item aangemaakt in Monday
- **Bestaand bedrijf** → subitem toegevoegd onder het bestaande item

---

## Vereisten

- Node.js → https://nodejs.org/
- Een Monday account met een API key
- Een aangemaakt Monday board met de juiste kolommen

---

## Installatie

### 1. Clone de repository
```bash
git clone https://github.com/jouw-gebruikersnaam/monday-intake-agent.git
cd monday-intake-agent
```

### 2. Installeer dependencies
```bash
npm install
```

### 3. Maak een .env bestand aan
```bash
cp .env.example .env
```

Open `.env` en vul in:
```
MONDAY_API_KEY=jouw_monday_api_key
MONDAY_BOARD_ID=jouw_board_id
PORT=3001
```

**Monday API key vinden:**
1. Ga naar Monday → klik op je profielfoto rechtsonder
2. Klik op **Developers**
3. Klik op **My Access Tokens**

**Board ID vinden:**
Open je board in Monday. Het ID staat in de URL:
`monday.com/boards/`**`123456789`**

### 4. Pas de kolom-ID's aan in `intake.js`

Open `intake.js` en vervang de kolom-ID's (`tekst__1`, `lange_tekst__1` etc.) met de echte ID's van jouw Monday board.

**Kolom-ID vinden:**
Klik op een kolomnaam in Monday → Instellingen → kopieer het ID onderaan.

---

## Opstarten

```bash
node server.js
```

De agent draait nu op `http://localhost:3001`

---

## Koppelen aan Platform Ondernemen PoC

Open `intake.js` in de **PoC repository** en verander de webhook URL naar:

```javascript
await fetch('http://localhost:3001/intake', {
```

---

## Endpoints

| Endpoint | Methode | Beschrijving |
|---|---|---|
| `/intake` | POST | Ontvangt webhook data van Agent 1 |
| `/health` | GET | Controleert of de agent draait |

---

## Monday board opzetten

Maak een board aan met de volgende kolommen:

| Kolomnaam | Type | Gebruik |
|---|---|---|
| Naam | Item naam | Bedrijfsnaam |
| Contactpersoon | Tekst | Voor- en achternaam |
| Bedrijfsbeschrijving | Lange tekst | Wat doet het bedrijf |
| Intake samenvatting | Lange tekst | Alle thema-antwoorden |
| Status | Status | Nieuw / Nieuwe activiteit / In behandeling |
| Datum | Datum | Datum van de intake |

---

## Opstarten met Platform Ondernemen PoC

Je hebt drie terminals nodig:

| Terminal | Command | Beschrijving |
|---|---|---|
| Terminal 1 | `node server.js` | Platform Ondernemen PoC |
| Terminal 2 | `ollama run llama3.2` | AI model |
| Terminal 3 | `node server.js` (in deze map) | Monday Intake Agent |
