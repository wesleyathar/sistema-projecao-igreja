// ARQUIVO DE TESTE MINIMO - sem dependencias externas
// Objetivo: confirmar que o Phusion Passenger consegue iniciar Node.js
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h1>✅ Node.js está funcionando na HostGator!</h1>
        <p>Porta: ${PORT}</p>
        <p>Hora: ${new Date().toISOString()}</p>
        <p>Versão Node: ${process.version}</p>
    `);
});

server.listen(PORT, () => {
    // Grava log de sucesso para confirmar que subiu
    fs.writeFileSync(__dirname + '/inicio_ok.txt', 'Servidor iniciou na porta ' + PORT + ' em ' + new Date().toISOString());
});
