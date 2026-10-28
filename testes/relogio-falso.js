'use strict';
/*
 * Relogio falso para os testes (Linux, macOS e Windows; nao depende de faketime nem de TZ).
 * Ativado por ADVOGADO_TESTE_AGORA=<ISO com fuso>, ex. 2026-10-27T23:30:00-03:00:
 *   - new Date() e Date.now() partem desse instante e seguem andando (timeouts continuam valendo);
 *   - rodar-testes.js carrega este arquivo nele mesmo e, via NODE_OPTIONS=--require, em todo processo filho,
 *     entao teste e scripts enxergam o mesmo "agora".
 * O fuso (TZ) e outra coisa: no CI o job de fuso define TZ=America/Sao_Paulo.
 */
const v = process.env.ADVOGADO_TESTE_AGORA;
if (v && !global.__relogioFalso) {
  const alvo = Date.parse(v);
  if (isNaN(alvo)) throw new Error('ADVOGADO_TESTE_AGORA invalido: ' + v);
  const Real = Date; const desvio = alvo - Real.now();
  const agoraMs = () => Real.now() + desvio;
  const Falso = new Proxy(Real, {
    construct(T, args, novo) { return Reflect.construct(T, args.length ? args : [agoraMs()], novo); },
    apply() { return new Real(agoraMs()).toString(); },
    get(T, k, r) { return k === 'now' ? agoraMs : Reflect.get(T, k, r); },
  });
  global.Date = Falso;
  global.__relogioFalso = { inicio: v, desvio };
}
