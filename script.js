// ==========================================
// FORCE UPDATE: UNREGISTER SERVICE WORKER
// ==========================================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('Service Worker Unregistered');
        }
    });
}

// WebSocket Connection
let ws;
let reconnectInterval = 2000;
let clockInterval = null;

// Use the same host and port as the current page
const hostname = window.location.hostname || 'localhost';
const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WS_URL = `${protocol}//${hostname}:${port}`;

// App State
let songs = [];
let currentSong = null;
let currentVerseIndex = -1;
let isBlackout = false;
let role = null; // 'display', 'control', or 'bible'
let editingSongIndex = null; // Track which song is being edited

// --- Initialization ---

// Check URL Hash for role
function checkHash() {
    const hash = window.location.hash;
    if (hash === '#display') {
        selectRole('display');
    } else if (hash === '#control') {
        selectRole('control');
    } else if (hash === '#bible') {
        selectRole('bible');
    } else if (hash === '#video') {
        selectRole('video');
    }
}

window.onload = () => {
    checkHash();
    loadLibrary();

    // Generate bubbles
    createBubbles();
};

function selectRole(selectedRole) {
    role = selectedRole;
    document.getElementById('start-screen').style.display = 'none';

    if (role === 'display') {
        document.getElementById('display-view').style.display = 'flex';
        document.getElementById('control-view').style.display = 'none';
        connectWS();
        goFullScreen();
    } else if (role === 'control') {
        document.getElementById('display-view').style.display = 'none';
        document.getElementById('control-view').style.display = 'block';
        connectWS();

        // Generate QR Code for sharing (using simple API)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`;
        const img = document.getElementById('qr-code');
        img.src = qrUrl;
        img.style.display = 'inline-block';
    } else if (role === 'bible') {
        document.getElementById('display-view').style.display = 'none';
        document.getElementById('control-view').style.display = 'none';
        document.getElementById('bible-view').style.display = 'block';
        connectWS();
    } else if (role === 'video') {
        document.getElementById('display-view').style.display = 'none';
        document.getElementById('control-view').style.display = 'none';
        document.getElementById('bible-view').style.display = 'none';
        document.getElementById('video-control-view').style.display = 'block';
        connectWS();
    }
}

function showStartScreen() {
    role = null;
    document.getElementById('start-screen').style.display = 'flex';
    document.getElementById('display-view').style.display = 'none';
    document.getElementById('control-view').style.display = 'none';
    document.getElementById('control-view').style.display = 'none';
    document.getElementById('bible-view').style.display = 'none';
    document.getElementById('video-control-view').style.display = 'none';

    // Clear hash without reloading

    // Clear hash without reloading
    history.pushState("", document.title, window.location.pathname + window.location.search);
}

function connectWS() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('Connected to WS');
        if (role === 'control' || role === 'bible') {
            updateConnectionStatus(true);
        }
    };

    ws.onclose = () => {
        console.log('Disconnected. Reconnecting...');
        if (role === 'control' || role === 'bible') {
            updateConnectionStatus(false);
        }
        setTimeout(connectWS, reconnectInterval);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'STATE_UPDATE') {
            handleStateUpdate(data.payload);
        } else if (data.type === 'LIBRARY_UPDATED') {
            console.log('Library updated on server, reloading...');
            loadLibrary();
        }
    };
}

// --- Display Logic ---

function handleStateUpdate(state) {
    currentSong = state.song;
    currentVerseIndex = state.verseIndex;
    isBlackout = !state.show;
    const isRestScreen = state.restScreen || false;

    if (role === 'display') {
        renderDisplay(isRestScreen);
    } else if (role === 'control') {
        renderControl();
        // Toggle Blackout Button Class
        const btnBlackout = document.querySelector('.blackout-btn');
        if (btnBlackout) {
            if (isBlackout) {
                btnBlackout.classList.add('active');
                btnBlackout.querySelector('.action-label').textContent = 'Em Blackout';
            } else {
                btnBlackout.classList.remove('active');
                btnBlackout.querySelector('.action-label').textContent = 'Blackout';
            }
        }

        // Toggle Rest Screen Button Class (ALL buttons)
        const btnRestAll = document.querySelectorAll('.rest-btn');
        btnRestAll.forEach(btnRest => {
            if (isRestScreen) {
                btnRest.classList.add('active');
                const label = btnRest.querySelector('.action-label');
                if (label) label.textContent = 'ATIVO';
            } else {
                btnRest.classList.remove('active');
                const label = btnRest.querySelector('.action-label');
                if (label) label.textContent = 'Descanso';
            }
        });
    } else if (role === 'bible') {
        renderBibleControl();
    } else if (role === 'video') {
        renderVideoControl(state.media);
    }

    // Handle Media State globally for Display
    if (role === 'display') {
        const videoContainer = document.getElementById('video-container');
        const imageContainer = document.getElementById('media-image-container');
        const announcementContainer = document.getElementById('media-announcement-container');
        const tithesContainer = document.getElementById('media-tithes-container');

        const iframe = document.getElementById('youtube-player');
        const img = document.getElementById('media-image');
        const announcementText = document.getElementById('announcement-text');

        // Reset all first
        videoContainer.style.display = 'none';
        imageContainer.style.display = 'none';
        announcementContainer.style.display = 'none';
        tithesContainer.style.display = 'none';
        document.getElementById('media-clock-container').style.display = 'none';
        stopClockDisplay();

        if (state.media && state.media.type !== 'NONE') {
            if (state.media.type === 'VIDEO') {
                videoContainer.style.display = 'block';
                const newSrc = `https://www.youtube.com/embed/${state.media.payload.id}?autoplay=1&controls=0&rel=0`;
                if (iframe.src !== newSrc) iframe.src = newSrc;

            } else if (state.media.type === 'IMAGE') {
                imageContainer.style.display = 'flex';
                // Stop video audio if switching
                iframe.src = '';
                img.src = state.media.payload.url;
                stopClockDisplay();

            } else if (state.media.type === 'CLOCK') {
                // Show clock
                stopClockDisplay();
                const clockContainer = document.getElementById('media-clock-container');
                clockContainer.style.display = 'flex';
                iframe.src = '';
                startClockDisplay();

            } else if (state.media.type === 'TITHES') {
                tithesContainer.style.display = 'flex';
                iframe.src = '';
                stopClockDisplay();

            } else if (state.media.type === 'ANNOUNCEMENT') {
                announcementContainer.style.display = 'flex';
                // Stop video audio if switching
                iframe.src = '';
                announcementText.textContent = state.media.payload.text;
            }
        } else {
            // No media active
            iframe.src = '';
        }
    }
}

function loadLibrary() {
    fetch('lyrics.json?t=' + new Date().getTime()) // Cache busting
        .then(res => res.json())
        .then(data => {
            songs = normalizeSongs(data);
            populateSongSelect();
            if (role === 'control') {
                renderFullPlaylist();
            }
        });
}

function normalizeSongs(data) {
    return data.map(song => {
        let newEstrofes = [];
        song.estrofes.forEach(verso => {
            const lines = verso.split('\n');
            if (lines.length > 2) {
                for (let i = 0; i < lines.length; i += 2) {
                    newEstrofes.push(lines.slice(i, i + 2).join('\n'));
                }
            } else {
                newEstrofes.push(verso);
            }
        });
        song.estrofes = newEstrofes;
        return song;
    });
}

function persistSongs() {
    if (checkConnection()) {
        ws.send(JSON.stringify({
            type: 'SAVE_SONGS',
            payload: songs
        }));
    }
}

function renderDisplay(isRestScreen) {
    const container = document.getElementById('lyrics-container');
    const restOverlay = document.getElementById('rest-screen-overlay');

    if (isRestScreen) {
        // Show Rest Screen, Hide Lyrics
        restOverlay.style.display = 'flex';
        container.style.display = 'none'; // Completely hide to prevent overlap
    } else {
        // Hide Rest Screen, Show Lyrics
        restOverlay.style.display = 'none';
        container.style.display = 'flex'; // Restore inline-block or whatever calls for it

        // Render Lyrics Logic
        // Fade out first
        container.classList.remove('fade-in');
        container.classList.add('fade-out');

        setTimeout(() => {
            // Update content
            if (!currentSong || isBlackout || currentVerseIndex < 0) {
                container.innerHTML = '';
            } else {
                const verseLines = currentSong.estrofes[currentVerseIndex].split('\n');
                container.innerHTML = verseLines.map(line => `<div class="lyric-line">${line}</div>`).join('');
            }

            // Fade in
            container.classList.remove('fade-out');
            container.classList.add('fade-in');
        }, 300);
    }
}

function createBubbles() {
    const container = document.getElementById('bubbles-container');
    const bubbleCount = 25; // More bubbles for bokeh effect

    // Vibrant neon colors
    const colors = [
        'rgba(255, 0, 110, ',   // Pink
        'rgba(58, 134, 255, ',  // Blue
        'rgba(131, 56, 236, ',  // Purple
        'rgba(251, 86, 7, ',    // Orange/Red
        'rgba(255, 190, 11, '   // Yellow
    ];

    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.classList.add('bubble');

        // Random properties
        const size = Math.random() * 120 + 40; // 40px to 160px
        const left = Math.random() * 100;
        const delay = Math.random() * 20;
        const duration = Math.random() * 20 + 20; // 20s-40s slow

        // Random Color with variable opacity
        const colorBase = colors[Math.floor(Math.random() * colors.length)];
        const opacity = (Math.random() * 0.4) + 0.3; // 0.3 to 0.7

        // Set background color via JS
        bubble.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), ${colorBase}${opacity}))`;

        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${left}%`;
        bubble.style.animationDelay = `${-delay}s`;
        bubble.style.animationDuration = `${duration}s`;

        container.appendChild(bubble);
    }
}

function goFullScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.log(err));
    }
}

// --- Controller Logic ---

function updateConnectionStatus(connected) {
    // Update status text
    const statusEl = document.getElementById('connection-status');
    const dotEl = document.getElementById('connection-dot');
    const bibleStatusEl = document.getElementById('bible-connection-status');

    if (statusEl) {
        statusEl.textContent = connected ? 'Conectado' : 'Desconectado';
    }

    if (dotEl) {
        if (connected) {
            dotEl.classList.add('connected');
        } else {
            dotEl.classList.remove('connected');
        }
    }

    if (bibleStatusEl) {
        bibleStatusEl.textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
        if (connected) {
            bibleStatusEl.classList.add('connected');
        } else {
            bibleStatusEl.classList.remove('connected');
        }
    }

    const videoStatusEl = document.getElementById('video-connection-status');
    if (videoStatusEl) {
        videoStatusEl.textContent = connected ? '🟢 Conectado' : '🔴 Desconectado';
        if (connected) {
            videoStatusEl.classList.add('connected');
        } else {
            videoStatusEl.classList.remove('connected');
        }
    }
}

let filteredSongs = [];

function populateSongSelect() {
    const select = document.getElementById('song-select');
    select.innerHTML = '<option value="">Selecione uma música...</option>';
    songs.forEach((song, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = song.titulo;
        select.appendChild(option);
    });
    filteredSongs = [...songs];
}

function filterSongs() {
    const searchInput = document.getElementById('song-search');
    const resultsContainer = document.getElementById('search-results');
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        resultsContainer.style.display = 'none';
        filteredSongs = [...songs];
        return;
    }

    filteredSongs = songs.filter(song =>
        song.titulo.toLowerCase().includes(query)
    );

    // Update results list
    resultsContainer.innerHTML = '';

    if (filteredSongs.length > 0) {
        filteredSongs.forEach((song) => {
            const originalIndex = songs.indexOf(song);
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = song.titulo;
            div.onclick = () => {
                selectSong(originalIndex);
                resultsContainer.style.display = 'none';
                searchInput.value = ''; // Clear search
            };
            resultsContainer.appendChild(div);
        });
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.innerHTML = '<div class="search-result-item">Nenhuma música encontrada</div>';
        resultsContainer.style.display = 'block';
    }

    // Update hidden select
    const select = document.getElementById('song-select');
    select.innerHTML = '<option value="">Selecione uma música...</option>';
    filteredSongs.forEach((song) => {
        const originalIndex = songs.indexOf(song);
        const option = document.createElement('option');
        option.value = originalIndex;
        option.textContent = song.titulo;
        select.appendChild(option);
    });
}

function showResults() {
    const searchInput = document.getElementById('song-search');
    if (searchInput.value.trim().length > 0) {
        document.getElementById('search-results').style.display = 'block';
    }
}

function selectSong(index) {
    const select = document.getElementById('song-select');
    select.value = index;
    loadSelectedSong();
}

// Close results when clicking outside
document.addEventListener('click', (e) => {
    const searchWrapper = document.querySelector('.search-wrapper');
    if (searchWrapper && !searchWrapper.contains(e.target)) {
        const results = document.getElementById('search-results');
        if (results) results.style.display = 'none';
    }
});

function openPlaylist() {
    document.getElementById('playlist-modal').style.display = 'block';
    renderFullPlaylist();
}

function closePlaylist() {
    document.getElementById('playlist-modal').style.display = 'none';
}

function renderFullPlaylist() {
    const list = document.getElementById('full-song-list');
    list.innerHTML = '';

    songs.forEach((song, index) => {
        const div = document.createElement('div');
        div.className = 'verse-item'; // Reuse styling
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.gap = '10px';

        const contentDiv = document.createElement('div');
        contentDiv.style.flex = '1';
        contentDiv.style.cursor = 'pointer';

        const titleSpan = document.createElement('span');
        titleSpan.textContent = song.titulo;
        titleSpan.style.fontWeight = '600';

        contentDiv.appendChild(titleSpan);
        contentDiv.onclick = () => {
            selectSong(index);
            closePlaylist();
        };

        const editBtn = document.createElement('button');
        editBtn.className = 'icon-btn';
        editBtn.innerHTML = '✏️';
        editBtn.style.padding = '8px';
        editBtn.style.fontSize = '16px';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            closePlaylist();
            openEditModal(index);
        };

        div.appendChild(contentDiv);
        div.appendChild(editBtn);
        list.appendChild(div);
    });
}



function loadSelectedSong() {
    const select = document.getElementById('song-select');
    const index = select.value;

    if (index === "") {
        alert('Por favor, busque e selecione uma música primeiro.');
        return;
    }

    const selectedSong = songs[index];

    // Send to server
    ws.send(JSON.stringify({
        type: 'SET_SONG',
        payload: selectedSong
    }));
}

function loadSong() {
    loadSelectedSong();
}

function checkConnection() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('[DEBUG] WebSocket desconectado! ReadyState:', ws?.readyState);
        alert("⚠️ ERRO: Desconectado do Servidor!\n\nCertifique-se de que o terminal com 'node server.js' está aberto.\n\nStatus: " + (ws ? `ReadyState ${ws.readyState}` : 'WebSocket não inicializado'));
        return false;
    }
    console.log('[DEBUG] WebSocket conectado OK');
    return true;
}

function prevVerse() {
    if (checkConnection()) ws.send(JSON.stringify({ type: 'PREV_VERSE' }));
}

function nextVerse() {
    if (checkConnection()) ws.send(JSON.stringify({ type: 'NEXT_VERSE' }));
}

function toggleBlackout() {
    if (checkConnection()) ws.send(JSON.stringify({ type: 'BLACKOUT' }));
}

function toggleRestScreen() {
    if (checkConnection()) ws.send(JSON.stringify({ type: 'TOGGLE_REST_SCREEN' }));
}

function setVerse(index) {
    if (checkConnection()) {
        ws.send(JSON.stringify({
            type: 'SET_VERSE',
            payload: index
        }));
    }
}

function requestFullScreenDisplay() {
    alert("Para ativar fullscreen na TV, clique no botão 'TV / Telão' na própria TV.");
}

function renderControl() {
    if (!currentSong) return;

    document.getElementById('active-song-title').textContent = currentSong.titulo;

    const list = document.getElementById('verse-list');
    list.innerHTML = '';

    currentSong.estrofes.forEach((verse, index) => {
        const div = document.createElement('div');
        div.className = `verse-item ${index === currentVerseIndex ? 'active' : ''}`;

        // Check if verse has a tag like [Refrão] or [Verso 1] (case insensitive)
        const tagMatch = verse.match(/^\[(.*?)\]/i);
        if (tagMatch) {
            const tag = document.createElement('div');
            tag.className = 'verse-tag';
            tag.textContent = tagMatch[1].toUpperCase();
            div.appendChild(tag);

            // Remove tag from verse text
            const verseText = verse.replace(/^\[[^\]]+\]\n?/, '');
            const textNode = document.createTextNode(verseText.replace(/\n/g, ' / '));
            div.appendChild(textNode);
        } else {
            div.textContent = verse.replace(/\n/g, ' / ');
        }

        div.onclick = () => setVerse(index);
        list.appendChild(div);
    });
}

// --- Add Song Logic ---

// --- Add Song Logic ---

function openAddModal() {
    console.log("DEBUG: Botão + clicado!");
    editingSongIndex = null;
    const modal = document.getElementById('add-song-modal');

    if (!modal) {
        console.error("ERRO: O elemento '#add-song-modal' não existe no DOM!");
        alert("Erro ao abrir modal: elemento não encontrado.");
        return;
    }

    const header = modal.querySelector('h2');
    if (header) header.textContent = 'Adicionar Nova Música';

    console.log("DEBUG: Alterando display para block...");
    modal.style.display = 'block';

    // Reset to manual tab
    switchTab('manual-add');
    const searchInput = document.getElementById('online-search-input');
    if (searchInput) searchInput.value = '';
    const resultsList = document.getElementById('online-results-list');
    if (resultsList) resultsList.innerHTML = '';
}

function switchTab(tabId) {
    // Content
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const content = document.getElementById(tabId);
    if (content) content.classList.add('active');

    // Buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        // Simple check to highlight the correct button
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

// --- Online Search Logic ---
function searchOnlineSong() {
    const query = document.getElementById('online-search-input').value.trim();
    if (!query) return;

    const resultsList = document.getElementById('online-results-list');
    const loading = document.getElementById('online-loading');

    resultsList.innerHTML = '';
    loading.style.display = 'block';

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
            loading.style.display = 'none';
            if (data.error) {
                resultsList.innerHTML = `<div style="text-align:center; padding:10px;">Erro ao buscar: ${data.error}</div>`;
                return;
            }
            displayOnlineResults(data.data); // lyrics.ovh structure
        })
        .catch(err => {
            loading.style.display = 'none';
            resultsList.innerHTML = '<div style="text-align:center; padding:10px;">Erro de conexão.</div>';
            console.error(err);
        });
}

function displayOnlineResults(results) {
    const list = document.getElementById('online-results-list');
    list.innerHTML = '';

    if (!results || results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:10px;">Nenhuma música encontrada.</div>';
        return;
    }

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'online-result-item';
        div.innerHTML = `
            <div class="online-song-title">${item.title}</div>
            <div class="online-artist-name">${item.artist.name}</div>
        `;
        // Pass the Lrclib ID to the selection function
        div.onclick = () => selectOnlineSong(item.id, item.artist.name, item.title);
        list.appendChild(div);
    });
}

function selectOnlineSong(id, artist, title) {
    const loading = document.getElementById('online-loading');
    loading.style.display = 'block';
    loading.textContent = '⌛ Baixando letra...';

    // Send ID (Lrclib)
    let apiUrl = `/api/lyrics?id=${id}`;

    fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
            loading.style.display = 'none';
            loading.textContent = '⌛ Buscando...'; // Reset text

            if (data.error || !data.lyrics) {
                alert('Erro: Letra não encontrada na biblioteca.');
                return;
            }

            // Fill Manual Form
            document.getElementById('new-song-title').value = title;
            document.getElementById('new-song-lyrics').value = data.lyrics;

            // Switch to Manual Tab
            switchTab('manual-add');
        })
        .catch(err => {
            loading.style.display = 'none';
            alert('Erro ao baixar letra.');
            console.error(err);
        });
}

function openEditModal(index) {
    editingSongIndex = index;
    const song = songs[index];

    document.querySelector('#add-song-modal h2').textContent = 'Editar Música';
    document.getElementById('new-song-title').value = song.titulo;
    // Reconstruct lyrics from verses
    document.getElementById('new-song-lyrics').value = song.estrofes.join('\n\n');

    document.getElementById('add-song-modal').style.display = 'block';
    switchTab('manual-add'); // Always start editing in manual
}

function closeAddModal() {
    editingSongIndex = null;
    document.getElementById('add-song-modal').style.display = 'none';
    document.getElementById('new-song-title').value = '';
    document.getElementById('new-song-lyrics').value = '';
}

function saveNewSong() {
    const title = document.getElementById('new-song-title').value.trim();
    const lyricsRaw = document.getElementById('new-song-lyrics').value.trim();

    if (!title || !lyricsRaw) {
        alert('Por favor, preencha o título e a letra.');
        return;
    }

    // SMART VERSE DETECTION (Hybrid: Blank lines + Max 4 lines per slide)
    let verses = [];
    const MAX_LINES = 4;

    // 1. Split by user-defined blank lines first (preserving user intent)
    const blocks = lyricsRaw.split(/\n\s*\n/).map(v => v.trim()).filter(v => v.length > 0);

    blocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // 2. If a block is too long (e.g. pasted a whole chorus without spacing), sub-split it
        if (lines.length > MAX_LINES) {
            for (let i = 0; i < lines.length; i += MAX_LINES) {
                const chunk = lines.slice(i, i + MAX_LINES);
                verses.push(chunk.join('\n'));
            }
        } else {
            verses.push(block);
        }
    });

    if (verses.length === 0) {
        alert('Letra vazia ou inválida.');
        return;
    }

    const isEditing = editingSongIndex !== null;
    const confirmed = confirm(
        `📋 ${isEditing ? 'Atualizar' : 'Salvar'} música?\n\n` +
        `Título: ${title}\n` +
        `Total de estrofes detectadas: ${verses.length}\n\n` +
        `Clique OK para ${isEditing ? 'atualizar' : 'salvar'} ou Cancelar para revisar.`
    );

    if (!confirmed) return;

    const updatedSong = {
        titulo: title,
        estrofes: verses
    };

    if (isEditing) {
        songs[editingSongIndex] = updatedSong;
    } else {
        songs.push(updatedSong);
    }

    populateSongSelect();

    // Select the song automatically
    const select = document.getElementById('song-select');
    select.value = isEditing ? editingSongIndex : songs.length - 1;

    closeAddModal();

    if (checkConnection()) {
        persistSongs();
        loadSong();
    } else {
        alert('Música salva localmente, mas sistema está desconectado.');
    }
}

// --- Bible Logic ---

const bibleBooks = [
    "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio",
    "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis",
    "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos",
    "Provérbios", "Eclesiastes", "Cânticos", "Isaías", "Jeremias", "Lamentações",
    "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias",
    "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias",
    "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios",
    "2 Coríntios", "Gálatas", "Efésios", "Filipenses", "Colossenses",
    "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo",
    "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro",
    "1 João", "2 João", "3 João", "Judas", "Apocalipse"
];

function populateBibleBooks() {
    const select = document.getElementById('bible-book');
    bibleBooks.forEach(book => {
        const option = document.createElement('option');
        option.value = book;
        option.textContent = book;
        select.appendChild(option);
    });
    // Set default to Salmos
    select.value = "Salmos";
    document.getElementById('bible-chapter').value = 23;
}

function renderBibleControl() {
    if (!currentSong) return;

    document.getElementById('active-bible-ref').textContent = currentSong.titulo;

    const list = document.getElementById('bible-verse-list');
    list.innerHTML = '';

    currentSong.estrofes.forEach((verse, index) => {
        const div = document.createElement('div');
        div.className = `verse-item ${index === currentVerseIndex ? 'active' : ''}`;
        div.textContent = verse;
        div.onclick = () => setVerse(index);
        list.appendChild(div);
    });
}

function loadBibleChapter() {
    const bookIndex = document.getElementById('bible-book').selectedIndex;
    const bookName = document.getElementById('bible-book').value;
    const chapterInput = document.getElementById('bible-chapter');
    const chapter = parseInt(chapterInput.value);

    // Validate
    if (!bibleData) {
        alert('A Bíblia offline ainda está carregando. Tente novamente em alguns segundos.');
        return;
    }

    if (isNaN(chapter) || chapter < 1) {
        alert('Capítulo inválido');
        return;
    }

    const btn = document.querySelector('#bible-view button.primary');
    if (btn) {
        btn.textContent = 'Carregando...';
        btn.disabled = true;
    }

    try {
        const bookData = bibleData[bookIndex];
        if (!bookData) throw new Error('Livro não encontrado');

        const chapterData = bookData.chapters[chapter - 1];
        if (!chapterData) throw new Error('Capítulo não encontrado');

        // Verse list for Bible View
        const verseList = document.getElementById('bible-verse-list');
        verseList.innerHTML = '';

        // Update active ref
        document.getElementById('active-bible-ref').textContent = `${bookName} ${chapter}`;

        // Send to server (Initial State)
        if (checkConnection()) {
            ws.send(JSON.stringify({
                type: 'SET_SONG',
                payload: {
                    titulo: `${bookName} ${chapter}`,
                    estrofes: chapterData.map((text, i) => `${i + 1}. ${text}`)
                }
            }));
        }

        // Create verse preview cards
        chapterData.forEach((text, i) => {
            const verseNum = i + 1;
            const div = document.createElement('div');
            div.className = 'verse-card';
            div.innerHTML = `<strong>${verseNum}</strong> ${text}`;
            div.onclick = () => {
                document.querySelectorAll('.verse-card').forEach(c => c.classList.remove('active'));
                div.classList.add('active');
            };
            verseList.appendChild(div);
        });

    } catch (err) {
        alert('Erro: ' + err.message);
        console.error(err);
    } finally {
        if (btn) {
            btn.textContent = 'Carregar';
            btn.disabled = false;
        }
    }
}

// Global variable for Bible Data
let bibleData = null;

async function loadBibleOffline() {
    try {
        const title = document.getElementById('active-bible-ref');
        if (title) title.textContent = 'Carregando Bíblia NVI...';

        const res = await fetch('bible-nvi.json');
        if (!res.ok) throw new Error('Falha ao carregar arquivo da Bíblia');
        bibleData = await res.json();

        if (title) title.textContent = 'Bíblia NVI Offline Pronta';
        console.log('Bíblia NVI carregada com sucesso via JSON local.');
    } catch (err) {
        console.error('Erro ao carregar Bíblia offline:', err);
        const title = document.getElementById('active-bible-ref');
        if (title) title.textContent = 'Erro ao carregar NVI';
    }
}

// Call init
populateBibleBooks();

// --- Video Logic ---

// --- Media Logic (Generalized) ---

function showTithes() {
    console.log('[DEBUG] showTithes() chamado');
    // Envia o comando para exibir o painel customizado de HTML
    if (checkConnection()) {
        console.log('[DEBUG] Enviando comando SET_MEDIA para Dízimos (HTML personalisado)');
        ws.send(JSON.stringify({
            type: 'SET_MEDIA',
            payload: {
                type: 'TITHES',
                payload: {}
            }
        }));
    }
}

function showClock() {
    console.log('[DEBUG] showClock() chamado');
    if (checkConnection()) {
        ws.send(JSON.stringify({
            type: 'SET_MEDIA',
            payload: {
                type: 'CLOCK',
                payload: {}
            }
        }));
    }
}

function startClockDisplay() {
    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
        const clockTimeEl = document.getElementById('clock-time');
        const clockDateEl = document.getElementById('clock-date');
        if (clockTimeEl) clockTimeEl.textContent = timeStr;
        if (clockDateEl) clockDateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

function stopClockDisplay() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
}

function showAnnouncement() {
    console.log('[DEBUG] showAnnouncement() chamado');
    const text = document.getElementById('announcement-input').value;
    console.log('[DEBUG] Texto do aviso:', text);

    if (!text) {
        console.warn('[DEBUG] Aviso vazio, exibindo alerta');
        return alert('Digite um aviso!');
    }

    if (checkConnection()) {
        console.log('[DEBUG] Enviando comando SET_MEDIA para Aviso');
        ws.send(JSON.stringify({
            type: 'SET_MEDIA',
            payload: {
                type: 'ANNOUNCEMENT',
                payload: { text: text }
            }
        }));
    }
}

function playCustomVideo() {
    console.log('[DEBUG] playCustomVideo() chamado');
    const input = document.getElementById('video-url-input');
    const url = input.value.trim();
    console.log('[DEBUG] URL do vídeo:', url);

    if (!url) {
        console.warn('[DEBUG] URL vazia, exibindo alerta');
        alert('Por favor, cole um link do YouTube.');
        return;
    }

    const id = extractYouTubeID(url);
    console.log('[DEBUG] ID extraído:', id);

    if (!id) {
        console.warn('[DEBUG] ID inválido, exibindo alerta');
        alert('Link inválido ou não reconhecido.');
        return;
    }

    sendMediaCommand('VIDEO', { id: id });
}

function playPresetVideo() {
    console.log('[DEBUG] playPresetVideo() chamado');
    const presetID = 's8Gkn3kFLGE';
    console.log('[DEBUG] Reproduzindo vídeo preset:', presetID);
    sendMediaCommand('VIDEO', { id: presetID });
}

function stopMedia() {
    console.log('[DEBUG] stopMedia() chamado');
    if (checkConnection()) {
        console.log('[DEBUG] Enviando comando STOP_MEDIA');
        ws.send(JSON.stringify({ type: 'STOP_MEDIA' }));
    }
}

// Deprecated separate stopVideo, but keeping alias just in case
function stopVideo() { stopMedia(); }

function sendMediaCommand(type, payload) {
    console.log('[DEBUG] sendMediaCommand() chamado com tipo:', type, 'payload:', payload);
    if (checkConnection()) {
        console.log('[DEBUG] Enviando comando SET_MEDIA');
        ws.send(JSON.stringify({
            type: 'SET_MEDIA',
            payload: {
                type: type,
                payload: payload
            }
        }));
    }
}

function extractYouTubeID(url) {
    // Regex for various YouTube formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function renderVideoControl(mediaState) {
    // Optional status update
}
loadBibleOffline();
