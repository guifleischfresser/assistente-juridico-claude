#!/usr/bin/env node
'use strict';
// Ollama FALSO para os testes da --ia-local (nada de modelo real). Sobe em 127.0.0.1:0 (porta livre),
// grava {"porta":N} em <arquivo-porta> e atende POST /api/generate conforme o modo.
// Uso: node ollama-falso.js <modo> <arquivo-porta> <arquivo-log> [<arquivo-achados.json>] [<porta-destino>]
//  modos: ok (responde os achados do JSON) | quebrado (resposta que nao e JSON) | lento (nunca responde)
//         | cortada (resposta com done_reason "length") | vazio-no-1o (1o pedido sem achados, os seguintes com) | lento-depois-do-1o (1o pedido ok, os seguintes nunca respondem) | semmodelo (404, como modelo nao baixado) | redireciona (302 para 127.0.0.1:<porta-destino>) | sentinela (so conta)
// Cada pedido recebido vira uma linha no log: {"modo","prompt"} (o teste confere o que foi enviado).
const http = require('http');
const fs = require('fs');
const [modo, arqPorta, arqLog, arqAchados, destino] = process.argv.slice(2);
const achados = arqAchados && fs.existsSync(arqAchados) ? JSON.parse(fs.readFileSync(arqAchados, 'utf8')) : [];
const srv = http.createServer((req, res) => {
  const partes = [];
  req.on('data', (b) => partes.push(b));
  req.on('end', () => {
    let prompt = ''; try { prompt = JSON.parse(Buffer.concat(partes).toString('utf8')).prompt || ''; } catch (e) { /* */ }
    fs.appendFileSync(arqLog, JSON.stringify({ modo, metodo: req.method, url: req.url, prompt }) + '\n');
    if (modo === 'lento') return; // segura a conexao
    if (modo === 'lento-depois-do-1o' && fs.readFileSync(arqLog, 'utf8').split('\n').filter(Boolean).length > 1) return;
    if (modo === 'semmodelo') { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"error":"model not found"}'); }
    if (modo === 'redireciona') { res.writeHead(302, { Location: 'http://127.0.0.1:' + destino + '/api/generate' }); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const n = fs.readFileSync(arqLog, 'utf8').split('\n').filter(Boolean).length;
    if (modo === 'cortada') return res.end(JSON.stringify({ model: 'falso', done: true, done_reason: 'length', response: JSON.stringify({ achados }) }));
    if (modo === 'vazio-no-1o' && n === 1) return res.end(JSON.stringify({ model: 'falso', done: true, response: '{"achados":[]}' }));
    if (modo === 'quebrado') return res.end(JSON.stringify({ response: '{"achados": [ {"tipo": "nome", "texto": ' }));
    res.end(JSON.stringify({ model: 'falso', done: true, response: JSON.stringify({ achados }) }));
  });
});
srv.listen(0, '127.0.0.1', () => fs.writeFileSync(arqPorta, JSON.stringify({ porta: srv.address().port })));
