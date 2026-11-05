import { parseQuickCapture } from '../parser';
import { INITIAL_AREAS } from '../constants';

const tests = [
  {
    input: "mandar relatorio de vendas pra contabilidade #divino todo dia 5 !!",
    expectedArea: "Divino Pão",
    expectedPriority: "high",
    expectedRecurrence: "todo dia 5",
  },
  {
    input: "pagar fornecedor de embalagens #bendito sex :rapida",
    expectedArea: "Bendito Sabor",
    expectedEffort: "quick",
  },
  {
    input: "dentista 25/11 14h #pessoal",
    expectedArea: "Vida Pessoal",
    expectedTime: "14:00",
  },
  {
    input: "testar novo combo de lanche da tarde #divino :ideia",
    expectedArea: "Divino Pão",
    expectedType: "note",
  },
  {
    input: "comprar peça do forno",
    expectedInbox: true,
  },
];

console.log("=== EXECUTANDO TESTES DO PRD ===");
let passed = 0;
for (const [idx, t] of tests.entries()) {
  const result = parseQuickCapture(t.input, INITIAL_AREAS);
  console.log(`\nTeste ${idx + 1}: "${t.input}"`);
  console.log(`  -> Título limpo: "${result.cleanTitle}"`);
  console.log(`  -> Frente: ${result.area?.name || 'Nenhuma'}`);
  console.log(`  -> Data: ${result.scheduledDate} (${result.dateLabel})`);
  console.log(`  -> Hora: ${result.scheduledTime}`);
  console.log(`  -> Prioridade: ${result.priority}`);
  console.log(`  -> Esforço: ${result.effort}`);
  console.log(`  -> Tipo: ${result.type}`);
  console.log(`  -> Recorrência: ${result.recurrence}`);
  console.log(`  -> Vai pro Inbox: ${result.isInbox}`);

  let ok = true;
  if (t.expectedArea && result.area?.name !== t.expectedArea) ok = false;
  if (t.expectedPriority && result.priority !== t.expectedPriority) ok = false;
  if (t.expectedRecurrence && result.recurrence !== t.expectedRecurrence) ok = false;
  if (t.expectedEffort && result.effort !== t.expectedEffort) ok = false;
  if (t.expectedTime && result.scheduledTime !== t.expectedTime) ok = false;
  if (t.expectedType && result.type !== t.expectedType) ok = false;
  if (t.expectedInbox !== undefined && result.isInbox !== t.expectedInbox) ok = false;

  if (ok) {
    console.log("  [PASS]");
    passed++;
  } else {
    console.log("  [FAIL]");
  }
}

console.log(`\nResultado: ${passed}/${tests.length} passaram.`);
