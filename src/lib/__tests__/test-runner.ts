import { parseQuickCapture } from '../parser';
import { INITIAL_AREAS } from '../constants';

interface TestCase {
  description: string;
  input: string;
  expectedTitle: string;
  expectedAreaName?: string | null;
  expectedUnrecognizedArea?: string | null;
  expectedDateLabel?: string | null;
  expectedTime?: string | null;
  expectedPriority?: 'normal' | 'high';
  expectedEffort?: 'quick' | 'medium' | 'long' | null;
  expectedType?: 'task' | 'note';
  expectedRecurrence?: string | null;
  expectedInbox?: boolean;
}

const testCases: TestCase[] = [
  {
    description: '1. Relatório com recorrência e urgência na Divino Pão',
    input: 'mandar relatorio de vendas pra contabilidade #divino todo dia 5 !!',
    expectedTitle: 'mandar relatorio de vendas pra contabilidade',
    expectedAreaName: 'Divino Pão',
    expectedRecurrence: 'todo dia 5',
    expectedPriority: 'high',
    expectedType: 'task',
  },
  {
    description: '2. Pagar fornecedor na Bendito Sabor sexta com esforço rápido',
    input: 'pagar fornecedor de embalagens #bendito sex :rapida',
    expectedTitle: 'pagar fornecedor de embalagens',
    expectedAreaName: 'Bendito Sabor',
    expectedEffort: 'quick',
    expectedType: 'task',
  },
  {
    description: '3. Compromisso pessoal com data específica e horário',
    input: 'dentista 25/11 14h #pessoal',
    expectedTitle: 'dentista',
    expectedAreaName: 'Vida Pessoal',
    expectedTime: '14:00',
    expectedDateLabel: '25/11',
    expectedType: 'task',
  },
  {
    description: '4. Ideia rápida para a Divino Pão',
    input: 'testar novo combo #divino :ideia',
    expectedTitle: 'testar novo combo',
    expectedAreaName: 'Divino Pão',
    expectedType: 'note',
  },
  {
    description: '5. Tarefa rápida solta sem frente nem data (direto pro Inbox)',
    input: 'comprar peça do forno',
    expectedTitle: 'comprar peça do forno',
    expectedAreaName: null,
    expectedInbox: true,
    expectedType: 'task',
  },
  {
    description: '6. Frente que não existe: avisa e nunca chuta',
    input: 'reunião com investidor #inexistente 18h',
    expectedTitle: 'reunião com investidor',
    expectedAreaName: null,
    expectedUnrecognizedArea: '#inexistente',
    expectedTime: '18:00',
    expectedInbox: true,
  },
  {
    description: '7. Tarefa em Projetos com esforço médio para amanhã',
    input: 'revisar figma do novo aplicativo #proj amanhã :media',
    expectedTitle: 'revisar figma do novo aplicativo',
    expectedAreaName: 'Projetos',
    expectedEffort: 'medium',
    expectedDateLabel: 'Amanhã',
    expectedType: 'task',
  },
  {
    description: '8. Tarefa com recorrência semanal (toda seg)',
    input: 'reunião de alinhamento com equipe #bendito toda seg 10h',
    expectedTitle: 'reunião de alinhamento com equipe',
    expectedAreaName: 'Bendito Sabor',
    expectedRecurrence: 'toda seg',
    expectedTime: '10:00',
    expectedType: 'task',
  },
];

console.log('===============================================================');
console.log('   BATERIA DE TESTES AUTOMATIZADOS: CAPTURA RÁPIDA INTELIGENTE  ');
console.log('===============================================================\n');

let failedCount = 0;

for (const [index, test] of testCases.entries()) {
  const result = parseQuickCapture(test.input, INITIAL_AREAS);
  const errors: string[] = [];

  if (result.cleanTitle !== test.expectedTitle) {
    errors.push(`Título: esperado "${test.expectedTitle}", obtido "${result.cleanTitle}"`);
  }

  if (test.expectedAreaName !== undefined) {
    const areaName = result.area?.name || null;
    if (areaName !== test.expectedAreaName) {
      errors.push(`Frente: esperada "${test.expectedAreaName}", obtida "${areaName}"`);
    }
  }

  if (test.expectedUnrecognizedArea !== undefined) {
    if (result.unrecognizedArea !== test.expectedUnrecognizedArea) {
      errors.push(
        `Frente desconhecida: esperada "${test.expectedUnrecognizedArea}", obtida "${result.unrecognizedArea}"`
      );
    }
  }

  if (test.expectedTime !== undefined) {
    if (result.scheduledTime !== test.expectedTime) {
      errors.push(`Horário: esperado "${test.expectedTime}", obtido "${result.scheduledTime}"`);
    }
  }

  if (test.expectedPriority !== undefined) {
    if (result.priority !== test.expectedPriority) {
      errors.push(`Prioridade: esperada "${test.expectedPriority}", obtida "${result.priority}"`);
    }
  }

  if (test.expectedEffort !== undefined) {
    if (result.effort !== test.expectedEffort) {
      errors.push(`Esforço: esperado "${test.expectedEffort}", obtido "${result.effort}"`);
    }
  }

  if (test.expectedType !== undefined) {
    if (result.type !== test.expectedType) {
      errors.push(`Tipo: esperado "${test.expectedType}", obtido "${result.type}"`);
    }
  }

  if (test.expectedRecurrence !== undefined) {
    if (result.recurrence !== test.expectedRecurrence) {
      errors.push(
        `Recorrência: esperada "${test.expectedRecurrence}", obtida "${result.recurrence}"`
      );
    }
  }

  if (test.expectedInbox !== undefined) {
    if (result.isInbox !== test.expectedInbox) {
      errors.push(`Inbox: esperado "${test.expectedInbox}", obtido "${result.isInbox}"`);
    }
  }

  if (test.expectedDateLabel !== undefined && test.expectedDateLabel !== null) {
    if (result.dateLabel !== test.expectedDateLabel) {
      errors.push(`Data: esperada "${test.expectedDateLabel}", obtida "${result.dateLabel}"`);
    }
  }

  if (errors.length === 0) {
    console.log(`✅ [PASS] ${test.description}`);
    console.log(`   Entrada : "${test.input}"`);
    console.log(
      `   Entendeu: [${result.area ? result.area.name : 'Sem Frente'}] "${result.cleanTitle}"` +
        (result.scheduledDate ? ` • Data: ${result.dateLabel}` : '') +
        (result.scheduledTime ? ` • Hora: ${result.scheduledTime}` : '') +
        (result.priority === 'high' ? ' • URGÊNCIA (!!)' : '') +
        (result.effort ? ` • Esforço: ${result.effort}` : '') +
        (result.recurrence ? ` • Repete: ${result.recurrence}` : '') +
        (result.type === 'note' ? ' • [Nota/Ideia]' : '') +
        (result.isInbox ? ' • [Destino: Inbox]' : ' • [Destino: Hoje/Agendado]')
    );
  } else {
    failedCount++;
    console.error(`❌ [FAIL] ${test.description}`);
    console.error(`   Entrada : "${test.input}"`);
    for (const err of errors) {
      console.error(`   ⚠️  ${err}`);
    }
  }
  console.log('---------------------------------------------------------------');
}

console.log(`\nRESUMO DOS TESTES: ${testCases.length - failedCount}/${testCases.length} passaram.`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
}
