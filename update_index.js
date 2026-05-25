const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// The new unified panel wrapper
const unifiedStart = `
    <!-- UNIFIED PANEL VIEW (v4.0) -->
    <div id="unified-panel" style="display: none;" class="shell">
        <!-- SIDEBAR -->
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="app-logo">
                    <div class="logo-icon">✝️</div>
                    <div>
                        <div class="logo-text">CANAÃ</div>
                        <div class="logo-sub">Projeção</div>
                    </div>
                </div>
                <div class="conn-badge">
                    <span class="dot-g" id="unified-connection-dot"></span>
                    <span id="unified-connection-status">Desconectado</span>
                </div>
            </div>

            <div class="nav-section">
                <div class="nav-section-label">Controle</div>

                <div class="nav-item active" onclick="switchPanelTab('tab-louvor')">
                    <span class="nav-icon">🎵</span>
                    <span class="nav-label">Louvor</span>
                </div>

                <div class="nav-item" onclick="switchPanelTab('tab-biblia')">
                    <span class="nav-icon">📖</span>
                    <span class="nav-label">Bíblia</span>
                </div>

                <div class="nav-item" onclick="switchPanelTab('tab-midia')">
                    <span class="nav-icon">🎬</span>
                    <span class="nav-label">Mídia</span>
                </div>
            </div>

            <div class="sidebar-footer">
                <div class="nav-item" onclick="showStartScreen()">
                    <span class="nav-icon">🏠</span>
                    <span class="nav-label">Sair / Menu</span>
                </div>
            </div>
        </div>

        <!-- MAIN AREA -->
        <div class="main">
            <!-- Louvor Tab -->
            <div id="tab-louvor" class="panel-tab active">
`;

const tabBibliaStart = `
            </div>
            <!-- Bíblia Tab -->
            <div id="tab-biblia" class="panel-tab" style="display: none;">
`;

const tabMidiaStart = `
            </div>
            <!-- Mídia Tab -->
            <div id="tab-midia" class="panel-tab" style="display: none;">
`;

const unifiedEnd = `
            </div>
        </div>
    </div>
`;

// Replace start screen buttons to use unified panel
html = html.replace(
    /<div class="role-btn" onclick="selectRole\('control'\)">📱 Controle<\/div>/,
    `<div class="role-btn" onclick="selectRole('panel', 'tab-louvor')">📱 Controle Unificado</div>`
);
html = html.replace(
    /<div class="role-btn" onclick="selectRole\('bible'\)">📖 Bíblia<\/div>/,
    `<!-- Bíblia (Agora no painel unificado) -->`
);
html = html.replace(
    /<div class="role-btn" onclick="selectRole\('video'\)">🎬 Mídia \/ Extras<\/div>/,
    `<!-- Mídia (Agora no painel unificado) -->`
);

// We need to extract the inner contents of control-view, bible-view, and video-control-view
const extractContent = (htmlStr, divId) => {
    const regex = new RegExp(\`<div id="\${divId}"[^>]*>([\\\\s\\\\S]*?)(?=<!-- [A-Za-z]+ View|<!-- Add Song Modal|<div id="add-song-modal")\`);
    const match = htmlStr.match(regex);
    if(match) {
        // Find the matching closing div of the container
        let content = match[1];
        // It's safer to just extract everything up to the next major section comment
        return content;
    }
    return "";
};

// Simple string replacement strategy
// 1. Find <!-- Controller View (Mobile) --> up to <!-- Add Song Modal -->
const parts = html.split(/<!-- Controller View \(Mobile\) -->|<!-- Add Song Modal -->/);

if(parts.length >= 3) {
    const beforeControl = parts[0];
    const afterControl = "<!-- Add Song Modal -->" + parts.slice(2).join("<!-- Add Song Modal -->");
    
    const controlSection = parts[1];
    
    // Split control section into the three views based on their comments
    const subParts = controlSection.split(/<!-- Bible View \(Dedicated\) -->|<!-- Media Control View \(v3\.8\) -->/);
    
    let louvorContent = subParts[0];
    let bibliaContent = subParts[1];
    let midiaContent = subParts[2];
    
    // Remove the wrapper <div id="control-view"> ... </div> from louvorContent
    louvorContent = louvorContent.replace(/<div id="control-view">/, '');
    louvorContent = louvorContent.replace(/<\/div>\s*<!-- End of control-view -->/, '');
    
    // Remove wrapper <div id="bible-view"... from bibliaContent
    bibliaContent = bibliaContent.replace(/<div id="bible-view"[^>]*>/, '');
    bibliaContent = bibliaContent.replace(/<\/div>\s*$/, ''); // rough removal of last div
    
    // Remove wrapper <div id="video-control-view"... from midiaContent
    midiaContent = midiaContent.replace(/<div id="video-control-view"[^>]*>([\s\S]*?)<\/div>\s*$/, '$1'); // rough removal
    
    const newHtml = beforeControl + unifiedStart + louvorContent + tabBibliaStart + bibliaContent + tabMidiaStart + midiaContent + unifiedEnd + afterControl;
    
    fs.writeFileSync('index.html', newHtml);
    console.log('index.html successfully updated with unified panel structure.');
} else {
    console.log('Failed to parse index.html sections.');
}

