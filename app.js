// TESTE MINIMO - Node.js puro, sem pacotes externos
const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <h1>Node.js funcionando na HostGator!</h1>
        <p>Porta ENV: ${process.env.PORT || '(nao definida, usando 3000)'}</p>
        <p>Versao Node: ${process.version}</p>
        <p>Hora: ${new Date().toLocaleString('pt-BR')}</p>
    `);
});

server.listen(PORT);


