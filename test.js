// test.js — stuurt een nep-intake naar de agent, zodat je kunt testen
// zonder de hele PoC website + Ollama te hoeven opstarten.
//
// Gebruik: zorg dat server.js draait, en run dan in een 2e terminal:
//   node test.js

const testPayload = {
    sessionId: 'test-' + Date.now(),
    finishedAt: new Date().toISOString(),
    chatHistory: `Vraag: Wat is je voor- en achternaam?
Antwoord: Jan Jansen

Vraag: Wat is de naam van je bedrijf?
Antwoord: Test Bakkerij BV

Vraag: Wat doet je bedrijf precies?
Antwoord: Wij bakken brood en banket voor de regio Hardenberg.

`,
    themeHistories: {
        'Huidige situatie van het bedrijf': 'Vraag: Hoe loopt het bedrijf nu?\nAntwoord: Redelijk goed, maar druk.\n\n',
        'Uitdagingen en ontwikkelpunten': 'Vraag: Waar loop je tegenaan?\nAntwoord: Personeel vinden is lastig.\n\n'
    }
};

async function test() {
    console.log('📤 Test-intake versturen naar agent...\n');

    try {
        const response = await fetch('http://localhost:3001/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testPayload)
        });

        const data = await response.json();

        console.log('📥 Antwoord van agent:');
        console.log(JSON.stringify(data, null, 2));

        if (data.status === 'success') {
            console.log('\n✅ Gelukt! Check je Monday board — er hoort nu een item "Test Bakkerij BV" te staan.');
        } else {
            console.log('\n❌ Er ging iets mis. Lees de foutmelding hierboven.');
        }

    } catch (error) {
        console.error('❌ Kon geen verbinding maken met de agent.');
        console.error('   Draait server.js wel? Start die eerst met: node server.js');
        console.error('   Details:', error.message);
    }
}

test();
