// intake.js — verwerkt de webhook data en stuurt het naar Monday

const { zoekBedrijf, maakNieuwItem, maakSubitem, updateItem } = require('./monday');

// === ECHTE KOLOM-ID'S VAN HET MONDAY BOARD ===
const KOLOM = {
    bedrijfsbeschrijving: 'long_text_mm4jq87p',
    intakeSamenvatting:   'long_text_mm4ja634',
    status:               'color_mm4jxbts',
    datum:                'date_mm4jh814'
};

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
    const samenvatting = maakSamenvatting(themeHistories || {});
    const datum        = new Date(finishedAt || Date.now()).toISOString().split('T')[0];
    const datumLeesbaar = new Date(finishedAt || Date.now()).toLocaleDateString('nl-NL');

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

        // Zet contactpersoon bovenaan de samenvatting zodat het zichtbaar is
        const volledigeSamenvatting = `Contactpersoon: ${naam}\n\n${samenvatting}`;

        const kolomWaarden = {
            [KOLOM.bedrijfsbeschrijving]: { text: beschrijving },
            [KOLOM.intakeSamenvatting]:   { text: volledigeSamenvatting },
            [KOLOM.status]:               { label: 'Ermee bezig' },
            [KOLOM.datum]:                { date: datum }
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
