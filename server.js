const WebSocket = require('ws');
// --- POLYFILLS FOR PKG/UNDICI ---
try {
    const { ReadableStream } = require('stream/web');
    if (!global.ReadableStream) {
        global.ReadableStream = ReadableStream;
    }
} catch (e) {
    console.warn('Failed to polyfill ReadableStream:', e.message);
}

try {
    const { Blob } = require('buffer');
    if (!global.Blob) {
        global.Blob = Blob;
    }
} catch (e) {
    console.warn('Failed to polyfill Blob:', e.message);
}

if (!global.File && global.Blob) {
    global.File = class File extends global.Blob {
        constructor(sources, name, options) {
            super(sources, options);
            this.name = name;
            this.lastModified = options?.lastModified || Date.now();
        }
    };
}

if (!global.DOMException) {
    try {
        const { DOMException } = require('node:domain'); // unlikely
        global.DOMException = DOMException || Error;
    } catch (e) {
        global.DOMException = Error;
    }
}
// --------------------------------
const http = require('http');
// const https = require('https'); // Not needing native https anymore
const fs = require('fs');
const path = require('path');
const ip = require('ip');
const axios = require('axios');
const cheerio = require('cheerio');

// Helper to fetch and scrape
const SCRAPER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
};

// Determine paths for persistence
const isPkg = typeof process.pkg !== 'undefined';
const dataRoot = isPkg ? path.dirname(process.execPath) : __dirname;
const lyricsFilePath = path.join(dataRoot, 'lyrics.json');

console.log(`[SYSTEM] Running in ${isPkg ? 'PACKAGED' : 'DEVELOPMENT'} mode`);
console.log(`[SYSTEM] Lyrics file path: ${lyricsFilePath}`);

// Ensure lyrics file exists in the external path if running packaged
if (isPkg && !fs.existsSync(lyricsFilePath)) {
    console.log('[SYSTEM] Creating initial lyrics.json...');
    fs.writeFileSync(lyricsFilePath, '[]', 'utf8');
}

// Configuration
const HTTP_PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Create HTTP Server to serve static files
const server = http.createServer((req, res) => {
    // 1. Clean URL
    const urlParts = new URL(req.url, `http://${req.headers.host}`);
    const cleanUrl = urlParts.pathname;

    // --- SPECIAL ROUTE FOR LYRICS.JSON ---
    // This ensures we always serve the EXTERNAL lyrics file, not the one inside the package (if any)
    if (cleanUrl === '/lyrics.json') {
        fs.readFile(lyricsFilePath, (error, content) => {
            if (error) {
                console.error(`[ERROR] Could not read lyrics.json: ${error.message}`);
                res.writeHead(500);
                res.end('[]'); // Return empty array on error
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(content, 'utf-8');
            }
        });
        return;
    }

    // --- API ENDPOINTS (SCRAPING VIA DUCKDUCKGO -> VAGALUME) ---
    if (cleanUrl === '/api/search') {
        const query = urlParts.searchParams.get('q');
        if (!query) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing query' }));
            return;
        }

        console.log(`[LRCLIB] Searching: ${query}`);
        // Docs: https://lrclib.net/api/search?q={query}
        axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'SystemControl/1.0' }
        })
            .then(response => {
                const data = response.data; // Array of objects directly
                const results = [];

                if (Array.isArray(data)) {
                    data.forEach(item => {
                        // Filter for items with lyrics
                        if (item.plainLyrics || item.syncedLyrics) {
                            results.push({
                                id: item.id, // Keep ID for fetching
                                title: item.name || item.trackName,
                                artist: { name: item.artistName },
                                // We could send lyrics right away, but to keep flow consistent:
                                hasLyrics: true
                            });
                        }
                    });
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ data: results }));
            })
            .catch(err => {
                console.error('[LRCLIB Error]', err.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Search failed' }));
            });
        return;
    }

    if (cleanUrl === '/api/lyrics') {
        // We now expect 'id' parameter mostly, but keep artist/title for legacy fallback if needed (not implementing complex fallback now)
        const id = urlParts.searchParams.get('id');

        if (!id) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing ID' }));
            return;
        }

        console.log(`[LRCLIB] Fetching details for ID: ${id}`);
        // Docs: https://lrclib.net/api/get/{id}
        axios.get(`https://lrclib.net/api/get/${id}`, {
            headers: { 'User-Agent': 'SystemControl/1.0' }
        })
            .then(response => {
                const data = response.data;
                const lyrics = data.plainLyrics || "Letra não disponível em texto plano.";

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ lyrics: lyrics }));
            })
            .catch(err => {
                console.error('[LRCLIB Error]', err.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Lyrics fetch failed' }));
            });
        return;
    }

    // --- STATIC FILES ---

    // 2. Resolve safe path
    let fileName = cleanUrl === '/' ? 'index.html' : cleanUrl;

    // Remove leading slash if present to avoid absolute path issues with path.join
    if (fileName.startsWith('/')) fileName = fileName.slice(1);

    const filePath = path.join(__dirname, fileName);

    // console.log(`[REQUEST] ${req.url} -> Served as: ${filePath}`);

    const extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': contentType = 'image/jpg'; break;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            // console.error(`[ERROR] Not found: ${filePath}`);
            if (error.code == 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            const headers = { 'Content-Type': contentType };
            // Prevent aggressive caching of HTML to ensure updates land
            if (contentType === 'text/html') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                headers['Pragma'] = 'no-cache';
                headers['Expires'] = '0';
            }
            res.writeHead(200, headers);
            res.end(content, 'utf-8');
        }
    });
});

server.listen(HTTP_PORT, () => {
    console.log(`HTTP Server running at http://${ip.address()}:${HTTP_PORT}/`);
    console.log(`Display URL: http://${ip.address()}:${HTTP_PORT}/#display`);
    console.log(`Controller URL: http://${ip.address()}:${HTTP_PORT}/#control`);
}).on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n❌ ERRO FATAL: A porta ${HTTP_PORT} está em uso!`);
        console.error(`Provavelmente o servidor já está rodando em outra janela.`);
        console.error(`Feche as outras janelas do 'node' ou 'cmd' e tente novamente.\n`);
        process.exit(1);
    } else {
        console.error(e);
    }
});

// WebSocket Server - runs on the same server as HTTP
const wss = new WebSocket.Server({ server });

console.log(`WebSocket Server running on the same port as HTTP (${HTTP_PORT})`);

let currentSong = null;
let currentVerseIndex = -1;
let currentShow = false;
let currentRestScreen = false;
let currentMedia = { type: 'NONE', payload: {} }; // Types: NONE, VIDEO, IMAGE, ANNOUNCEMENT

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send current state to new client
    ws.send(JSON.stringify({
        type: 'STATE_UPDATE',
        payload: {
            song: currentSong,
            verseIndex: currentVerseIndex,
            show: currentShow,
            restScreen: currentRestScreen,
            media: currentMedia
        }
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // console.log('Received:', data);

            switch (data.type) {
                case 'SET_SONG':
                    currentSong = data.payload;
                    currentVerseIndex = 0; // Reset to start
                    currentShow = true;
                    // Reset media when song starts
                    currentMedia = { type: 'NONE', payload: {} };
                    currentShow = true;
                    // Auto-disable rest screen when a new song is set, if desired?
                    // Let's keep it manual for now or auto-hide.
                    // User probably wants to show lyrics immediately.
                    currentRestScreen = false;
                    broadcastState();
                    break;
                case 'SET_VERSE':
                    currentVerseIndex = data.payload;
                    currentRestScreen = false; // ensure lyrics are verified
                    broadcastState();
                    break;
                case 'TOGGLE_SHOW':
                    currentShow = data.payload;
                    broadcastState();
                    break;
                case 'TOGGLE_REST_SCREEN':
                    currentRestScreen = !currentRestScreen;
                    broadcastState();
                    break;
                case 'NEXT_VERSE':
                    if (currentSong && currentVerseIndex < currentSong.estrofes.length - 1) {
                        currentVerseIndex++;
                        currentRestScreen = false;
                        broadcastState();
                    }
                    break;
                case 'PREV_VERSE':
                    if (currentSong && currentVerseIndex > 0) {
                        currentVerseIndex--;
                        currentRestScreen = false;
                        broadcastState();
                    }
                    break;
                case 'SAVE_SONGS':
                    const songsData = JSON.stringify(data.payload, null, 4);
                    // SAVE TO THE CORRECT EXTERNAL PATH
                    fs.writeFile(lyricsFilePath, songsData, (err) => {
                        if (err) {
                            console.error('Error saving songs:', err);
                            ws.send(JSON.stringify({ type: 'ERROR', payload: 'Erro ao salvar no servidor' }));
                        } else {
                            console.log('Songs library updated on disk at:', lyricsFilePath);
                            // Notify everyone that they should reload their song list
                            broadcast({ type: 'LIBRARY_UPDATED' });
                        }
                    });
                    break;
                case 'BLACKOUT': // Hide lyrics but keep state
                    currentShow = !currentShow;
                    broadcastState();
                    currentShow = !currentShow;
                    broadcastState();
                    break;
                case 'SET_MEDIA': // Generic Media Handler
                    currentMedia = data.payload; // { type: '...', payload: ... }
                    currentShow = false; // Hide lyrics
                    broadcastState();
                    break;
                case 'STOP_MEDIA': // Stop any media
                    currentMedia = { type: 'NONE', payload: {} };
                    currentShow = true; // Restore lyrics
                    broadcastState();
                    break;
                // KEEPING LEGACY VIDEO COMMANDS FOR SAFETY (Mapped to new state)
                case 'SET_VIDEO':
                    currentMedia = { type: 'VIDEO', payload: { id: data.payload.id } };
                    currentShow = false;
                    broadcastState();
                    break;
                case 'STOP_VIDEO':
                    currentMedia = { type: 'NONE', payload: {} };
                    currentShow = true;
                    broadcastState();
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });
});

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

function broadcastState() {
    broadcast({
        type: 'STATE_UPDATE',
        payload: {
            song: currentSong,
            verseIndex: currentVerseIndex,
            show: currentShow,
            verseIndex: currentVerseIndex,
            show: currentShow,
            restScreen: currentRestScreen,
            media: currentMedia
        }
    });
}
