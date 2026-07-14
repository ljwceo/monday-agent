// intake.js — verwerkt de webhook data en stuurt het naar Monday

const { zoekBedrijf, maakNieuwItem, maakSubitem, updateItem } = require('./monday');

// === ECHTE KOLOM-ID'S VAN HET MONDAY BOARD ===
const KOLOM = {
    contactpersoon: 'text_mm3rw5et',      // Conactpersoon
    // emailTelefoon: 'text_mm3rbtt9',    // E-mail/telefoon — nog niet gevraagd in de flow, bewust leeg voor demo
    // adviesgebied:  'dropdown_mm3rzv70',// Adviesgebied — nog niet gevraagd in de flow, bewust leeg voor demo
    samenvatting: 'long_text_mm3rfda5',   // Samenvatting hulpvraag
    status:       'color_mm3re3ac',       // Status
    datum:        'date_mm3rb2kx'         // Datum intake
};

// Nieuw-item krijgt deze status bij aanmaak — MOET exact overeenkomen met een
// bestaand label in de "Status" kolom in Monday (hoofdlettergevoelig!)
const STATUS_NIEUW = 'nieuw';

// Haal een specifiek antwoord op uit de chatgeschiedenis van Agent 1
function haalAntwoord(chatHistory, zoekterm) {
    const regels = chatHistory.split('\n');

    for (let i = 0; i < regels.length; i++) {
        if (regels[i].toLowerCase().includes(zoekterm.toLowerCase())) {
            const antwoordRegel = regels[i + 1] || '';
            return antwoordRegel.replace('Antwoord: ', '').trim();
        }
    }

    return '';
}

// Maak een leesbare samenvatting van alle thema-antwoorden
function maakSamenvatting(themeHistories) {
    return Object.entries(themeHistories)
        .map(([thema, inhoud]) => `=== ${thema} ===\n${inhoud}`)
        .join('\n')
        .slice(0, 1500);
}

// Hoofdfunctie: verwerk de intake en sla op in Monday
async function verwerkIntake(payload) {
    const { chatHistory, themeHistories, finishedAt } = payload;

    // Haal basisgegevens op uit de chatgeschiedenis van Agent 1
    const naam         = haalAntwoord(chatHistory, 'voor- en achternaam');
    const bedrijfsnaam = haalAntwoord(chatHistory, 'naam van je bedrijf');
    const beschrijving = haalAntwoord(chatHistory, 'doet je bedrijf');
    const themaSamenvatting = maakSamenvatting(themeHistories || {});
    const datum        = new Date(finishedAt || Date.now()).toISOString().split('T')[0];
    const datumLeesbaar = new Date(finishedAt || Date.now()).toLocaleDateString('nl-NL');

    // Bedrijfsbeschrijving heeft geen eigen kolom op dit board -> vooraan
    // in de samenvatting-tekst zetten zodat de info niet verloren gaat
    const samenvatting = `Wat doet het bedrijf: ${beschrijving}\n\n${themaSamenvatting}`;

    // Valideer dat de minimale gegevens aanwezig zijn
    if (!bedrijfsnaam) {
        throw new Error('Bedrijfsnaam ontbreekt in de intake data');
    }
    if (!naam) {
        throw new Error('Contactpersoon ontbreekt in de intake data');
    }

    console.log(`📥 Intake ontvangen voor: ${bedrijfsnaam} (${naam})`);
    console.log(`🔍 Zoeken in Monday...`);

    // Check of het bedrijf al bestaat in Monday
    const bestaand = await zoekBedrijf(bedrijfsnaam);

    if (bestaand.length === 0) {

        // Nieuw bedrijf → maak een nieuw item aan
        console.log(`✨ Nieuw bedrijf — item aanmaken in Monday...`);

        const kolomWaarden = {
            [KOLOM.contactpersoon]: { text: naam },
            [KOLOM.samenvatting]:   { text: samenvatting },
            [KOLOM.status]:         { label: STATUS_NIEUW },
            [KOLOM.datum]:          { date: datum }
        };

        const item = await maakNieuwItem(bedrijfsnaam, kolomWaarden);

        console.log(`✅ Nieuw Monday-item aangemaakt — ID: ${item.id}`);

        return {
            actie: 'nieuwe_klant',
            monday_id: item.id,
            bedrijfsnaam,
            contactpersoon: naam
        };

    } else {

        // Bestaand bedrijf → voeg subitem toe
        console.log(`🔄 Bestaand bedrijf gevonden — subitem aanmaken...`);

        const parentId  = bestaand[0].id;
        const subitemnaam = `Hulpvraag – ${datumLeesbaar}`;
        const subitem   = await maakSubitem(parentId, subitemnaam);

        console.log(`✅ Subitem aangemaakt onder ${bedrijfsnaam} — ID: ${subitem.id}`);

        return {
            actie: 'bestaande_klant',
            monday_id: subitem.id,
            bedrijfsnaam,
            contactpersoon: naam
        };
    }
}

module.exports = { verwerkIntake };
