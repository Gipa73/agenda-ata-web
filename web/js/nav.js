import { oggi } from './util.js';
export const N = {
  view: 'home', pila: [], y: oggi().getFullYear(), m: oggi().getMonth() + 1, render: () => { },
  vai(v, push = false) { if (push) N.pila.push(N.view); else N.pila = []; N.view = v; N.render(); window.scrollTo(0, 0); },
  indietro() { N.view = N.pila.pop() || 'profilo'; N.render(); window.scrollTo(0, 0); }
};
