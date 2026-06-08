// intake.js — verwerkt de webhook data en stuurt het naar Monday

const { zoekBedrijf, maakNieuwItem, maakSubitem, updateItem } = require('./monday');

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
        .slice(0, 1000); // Monday heeft een limiet op lange tekstvelden
}

// Hoofdfunctie: verwerk de intake en sla op in Monday
async function verwerkIntake(payload) {
    const { chatHistory, themeHistories, sessionId, finishedAt } = payload;

    // Haal basisgegevens op uit de chatgeschiedenis van Agent 1
    const naam         = haalAntwoord(chatHistory, 'voor- en achternaam');
    const bedrijfsnaam = haalAntwoord(chatHistory, 'naam van je bedrijf');
    const beschrijving = haalAntwoord(chatHistory, 'doet je bedrijf');
    const samenvatting = maakSamenvatting(themeHistories);
    const datum        = new Date(finishedAt).toISOString().split('T')[0];
    const datumLeesbaar = new Date(finishedAt).toLocaleDateString('nl-NL');

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
            tekst__1:       naam,           // Contactpersoon — pas kolom-ID aan!
            lange_tekst__1: beschrijving,   // Bedrijfsbeschrijving — pas kolom-ID aan!
            lange_tekst__2: samenvatting,   // Volledige intake samenvatting — pas kolom-ID aan!
            status__1:      { label: 'Nieuw' },
            datum__1:       { date: datum }
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

        // Update status van het hoofditem zodat adviseurs het zien
        await updateItem(parentId, 'status__1', { label: 'Nieuwe activiteit' });

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
