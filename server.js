// server.js — Monday Intake Agent
// Ontvangt webhooks van Platform Ondernemen PoC en verwerkt deze in Monday CRM

require('dotenv').config();

const http = require('http');
const { verwerkIntake } = require('./intake');

const PORT = process.env.PORT || 3001;

// Valideer bij opstarten of de vereiste omgevingsvariabelen aanwezig zijn
if (!process.env.MONDAY_API_KEY || !process.env.MONDAY_BOARD_ID) {
    console.error('❌ Fout: MONDAY_API_KEY en MONDAY_BOARD_ID moeten ingesteld zijn in .env');
    process.exit(1);
}

const server = http.createServer((req, res) => {

    // CORS headers zodat de browser de webhook mag aanroepen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Browser stuurt eerst een OPTIONS preflight request
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Health check endpoint — handig om te testen of de server draait
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', agent: 'Monday Intake Agent' }));
        return;
    }

    // Webhook endpoint — ontvangt intake data van Agent 1
    if (req.url === '/intake' && req.method === 'POST') {

        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {

            try {
                const payload = JSON.parse(body);

                console.log(`\n🚀 Nieuwe intake ontvangen — sessie: ${payload.sessionId || 'onbekend'}`);

                const resultaat = await verwerkIntake(payload);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', ...resultaat }));

                console.log(`🎉 Klaar! Actie: ${resultaat.actie} voor ${resultaat.bedrijfsnaam}\n`);

            } catch (error) {
                console.error('❌ Fout bij verwerken intake:', error.message);

                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', bericht: error.message }));
            }
        });

        return;
    }

    // Alle andere routes → 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'not_found' }));
});

server.listen(PORT, () => {
    console.log(`\n🤖 Monday Intake Agent draait op http://localhost:${PORT}`);
    console.log(`📡 Webhook endpoint: http://localhost:${PORT}/intake`);
    console.log(`❤️  Health check:    http://localhost:${PORT}/health\n`);
});
