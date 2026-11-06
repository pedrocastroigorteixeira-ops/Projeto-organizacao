import { parseQuickCapture } from '../parser';
import { INITIAL_AREAS } from '../constants';
import {
  calculateNextRecurrenceDate,
  checkRecurrenceDueStatus,
  createNextRecurrenceItem,
} from '../recurrence';
import { checkScheduleConflict } from '../conflicts';
import {
  saveCalendarAuth,
  getCalendarAuth,
  queueOutboxAction,
  getPendingOutbox,
  updateOutboxStatus,
  clearSyncedOutbox,
} from '../sqlite';
import { generateICalFeed } from '../ical';
import {
  createCompressedBackup,
  listAvailableBackups,
  restoreBackupFromFile,
  exportFullDatabaseAsJson,
  pruneOldBackups,
} from '../backup';
import { Item } from '../../types';

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
  expectedAdvanceWarningDays?: number | null;
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
  {
    description: '9. Ritual de obrigação financeira com lembrete antecipado (:aviso2d)',
    input: 'recolher tributos e DAS #divino todo dia 20 :aviso2d !!',
    expectedTitle: 'recolher tributos e DAS',
    expectedAreaName: 'Divino Pão',
    expectedRecurrence: 'todo dia 20',
    expectedAdvanceWarningDays: 2,
    expectedPriority: 'high',
    expectedType: 'task',
  },
  {
    description: '10. Ritual de folha/pró-labore com aviso antecipado em frase',
    input: 'pagar pro-labore dos socios #bendito todo dia 5 avisar 3 dias antes',
    expectedTitle: 'pagar pro-labore dos socios',
    expectedAreaName: 'Bendito Sabor',
    expectedRecurrence: 'todo dia 5',
    expectedAdvanceWarningDays: 3,
    expectedType: 'task',
  },
  {
    description: '11. Ritual de fechamento de mês com aviso prévio (:aviso2d)',
    input: 'conciliacao bancaria e balancete #proj fechamento de mês :aviso2d',
    expectedTitle: 'conciliacao bancaria e balancete',
    expectedAreaName: 'Projetos',
    expectedRecurrence: 'fechamento de mês',
    expectedAdvanceWarningDays: 2,
    expectedType: 'task',
  },
  {
    description: '12. Fechamento de mês usando a tag :mensal e aviso antecipado',
    input: 'auditoria contabil e fiscal #proj :mensal :aviso2d',
    expectedTitle: 'auditoria contabil e fiscal',
    expectedAreaName: 'Projetos',
    expectedRecurrence: 'mensal',
    expectedAdvanceWarningDays: 2,
    expectedType: 'task',
  },
];

console.log('===============================================================');
console.log('   BATERIA DE TESTES AUTOMATIZADOS: CAPTURA INTELIGENTE & RITUAIS');
console.log('===============================================================\n');

let failedCount = 0;

for (const test of testCases) {
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

  if (test.expectedAdvanceWarningDays !== undefined) {
    if (result.advanceWarningDays !== test.expectedAdvanceWarningDays) {
      errors.push(
        `Aviso antecipado: esperado ${test.expectedAdvanceWarningDays} dias, obtido ${result.advanceWarningDays}`
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
        (result.advanceWarningDays ? ` • Aviso antecipado: ${result.advanceWarningDays}d antes` : '') +
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

// ===============================================================
// TESTES ESPECÍFICOS DE RECORRÊNCIA E LEMBRETES ANTECIPADOS
// ===============================================================
console.log('\n===============================================================');
console.log('   TESTES DO MOTOR DE RECORRÊNCIA & RITUAIS OPERACIONAIS');
console.log('===============================================================\n');

// 1. Cálculo da próxima data: todo dia 5
const nextDia5 = calculateNextRecurrenceDate('2026-11-05', 'todo dia 5');
if (nextDia5 === '2026-12-05') {
  console.log('✅ [PASS] Próxima data de "todo dia 5" a partir de 2026-11-05 -> 2026-12-05');
} else {
  failedCount++;
  console.error(`❌ [FAIL] "todo dia 5": esperado 2026-12-05, obtido ${nextDia5}`);
}

// 2. Cálculo da próxima data: todo dia 20
const nextDia20 = calculateNextRecurrenceDate('2026-11-20', 'todo dia 20');
if (nextDia20 === '2026-12-20') {
  console.log('✅ [PASS] Próxima data de "todo dia 20" a partir de 2026-11-20 -> 2026-12-20');
} else {
  failedCount++;
  console.error(`❌ [FAIL] "todo dia 20": esperado 2026-12-20, obtido ${nextDia20}`);
}

// 3. Cálculo da próxima data: toda seg a partir de 2026-11-09 (segunda) -> 2026-11-16 (próxima segunda)
const nextSeg = calculateNextRecurrenceDate('2026-11-09', 'toda seg');
if (nextSeg === '2026-11-16') {
  console.log('✅ [PASS] Próxima data de "toda seg" a partir de 2026-11-09 -> 2026-11-16 (+7 dias)');
} else {
  failedCount++;
  console.error(`❌ [FAIL] "toda seg": esperado 2026-11-16, obtido ${nextSeg}`);
}

// 4. Conclusão não remove próxima ocorrência e gera checklist limpo
const sampleCompletedItem: Item = {
  id: 'item-ritual-trib',
  title: 'Recolher tributos e DAS',
  type: 'task',
  area_id: 'divino-pao',
  scheduled_date: '2026-11-20',
  scheduled_time: '14:00',
  priority: 'high',
  effort: 'medium',
  recurrence: 'todo dia 20',
  advance_warning_days: 2,
  is_recurring: true,
  status: 'completed',
  created_at: '2026-11-01T10:00:00Z',
  completed_at: '2026-11-20T15:00:00Z',
  subtasks: [
    { id: 'st-1', title: 'Acessar portal', completed: true },
    { id: 'st-2', title: 'Emitir guia', completed: true },
  ],
};

const nextOccurrence = createNextRecurrenceItem(sampleCompletedItem);
if (
  nextOccurrence.scheduled_date === '2026-12-20' &&
  nextOccurrence.status === 'pending' &&
  nextOccurrence.completed_at === null &&
  nextOccurrence.subtasks?.[0].completed === false &&
  nextOccurrence.subtasks?.[1].completed === false
) {
  console.log('✅ [PASS] createNextRecurrenceItem gerou próxima ocorrência com status pending, data 2026-12-20 e checklist reiniciado');
} else {
  failedCount++;
  console.error('❌ [FAIL] createNextRecurrenceItem falhou nos parâmetros esperados');
}

// 5. Lembrete antecipado ativa apenas dentro da janela de dias
// Se hoje é dia 18 e o vencimento é dia 20 com aviso de 2 dias -> deve avisar!
const statusWarning = checkRecurrenceDueStatus(
  { ...sampleCompletedItem, scheduled_date: '2026-11-20', status: 'pending' },
  '2026-11-18'
);

if (statusWarning.isWarning && statusWarning.daysRemaining === 2 && !statusWarning.isDueToday) {
  console.log('✅ [PASS] checkRecurrenceDueStatus ativou aviso antecipado (vence em 2 dias)');
} else {
  failedCount++;
  console.error('❌ [FAIL] Aviso antecipado deveria estar ativo para 2 dias antes');
}

// Se hoje é dia 05 e o vencimento é dia 20 com aviso de 2 dias -> NÃO deve aparecer na tela Hoje!
const statusFarAway = checkRecurrenceDueStatus(
  { ...sampleCompletedItem, scheduled_date: '2026-11-20', status: 'pending' },
  '2026-11-05'
);

if (!statusFarAway.isDueToday && !statusFarAway.isWarning) {
  console.log('✅ [PASS] Tarefa futura além da janela de aviso NÃO surge na tela Hoje (anti-ansiedade TDAH)');
} else {
  failedCount++;
  console.error('❌ [FAIL] Tarefa futura não deveria surgir na tela Hoje antes da janela de aviso');
}

// ===============================================================
// TESTES DO BLOQUEIO INTELIGENTE DE CHOQUE DE HORÁRIO
// ===============================================================
console.log(`\n===============================================================`);
console.log(`   TESTES DE BLOQUEIO INTELIGENTE: CHOQUE DE HORÁRIO`);
console.log(`===============================================================`);

const mockExistingItems: Item[] = [
  {
    id: 'item-100',
    title: 'Reunião com Contador',
    type: 'task',
    area_id: 'divino-pao',
    scheduled_date: '2026-11-10',
    scheduled_time: '14:00', // das 14:00 às 15:00 (duração 60min)
    effort: 'medium',
    priority: 'normal',
    status: 'pending',
    recurrence: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  },
  {
    id: 'item-101',
    title: 'Dentista',
    type: 'task',
    area_id: 'vida-pessoal',
    scheduled_date: '2026-11-10',
    scheduled_time: '16:00', // das 16:00 às 16:30 (duração 30min)
    effort: 'quick',
    priority: 'normal',
    status: 'pending',
    recurrence: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  },
];

// 1. Choque detectado quando tenta marcar no mesmo horário exato (14:00)
const conflictExact = checkScheduleConflict(
  '2026-11-10',
  '14:00',
  60,
  null,
  mockExistingItems,
  INITIAL_AREAS
);

if (conflictExact.hasConflict && conflictExact.conflictingItem?.id === 'item-100' && conflictExact.suggestedSlot === '15:00') {
  console.log('✅ [PASS] Choque exato detectado às 14:00 e sugeriu horário livre às 15:00');
} else {
  failedCount++;
  console.error('❌ [FAIL] Deveria detectar choque de horário com item-100');
}

// 2. Choque detectado por sobreposição parcial (ex: 14:30 a 15:30)
const conflictOverlap = checkScheduleConflict(
  '2026-11-10',
  '14:30',
  60,
  null,
  mockExistingItems,
  INITIAL_AREAS
);

if (conflictOverlap.hasConflict && conflictOverlap.conflictingItem?.id === 'item-100') {
  console.log('✅ [PASS] Choque por sobreposição parcial detectado às 14:30');
} else {
  failedCount++;
  console.error('❌ [FAIL] Deveria detectar sobreposição parcial às 14:30');
}

// 3. Sem choque em horário livre (15:00)
const noConflict = checkScheduleConflict(
  '2026-11-10',
  '15:00',
  60,
  null,
  mockExistingItems,
  INITIAL_AREAS
);

if (!noConflict.hasConflict) {
  console.log('✅ [PASS] Horário livre (15:00) aceito sem conflito');
} else {
  failedCount++;
  console.error('❌ [FAIL] Não deveria haver conflito às 15:00');
}

// 4. Edição do próprio compromisso não conflita consigo mesmo (excludeItemId)
const editSelf = checkScheduleConflict(
  '2026-11-10',
  '14:00',
  60,
  'item-100', // Excluindo o próprio item
  mockExistingItems,
  INITIAL_AREAS
);

if (!editSelf.hasConflict) {
  console.log('✅ [PASS] Edição do próprio compromisso ignorou conflito consigo mesmo');
} else {
  failedCount++;
  console.error('❌ [FAIL] Não deveria conflitar com ele mesmo ao editar');
}

// ===============================================================
// TESTES DO BANCO DE DADOS SQLITE LOCAL & OFFLINE OUTBOX
// ===============================================================
console.log(`\n===============================================================`);
console.log(`   TESTES DE SQLITE LOCAL & SINCRONIZAÇÃO OFFLINE`);
console.log(`===============================================================`);

// 1. Salva credenciais OAuth com segurança no SQLite local
saveCalendarAuth({
  provider: 'google',
  client_id: 'test-client-id-12345.apps.googleusercontent.com',
  client_secret: 'test-secret-gocspx',
  access_token: 'mock-access-token-xyz',
  refresh_token: 'mock-refresh-token-abc',
  expires_at: Date.now() + 3600000,
  account_email: 'usuario.teste@gmail.com',
  is_active: 1,
});

const retrievedAuth = getCalendarAuth('google');
if (
  retrievedAuth &&
  retrievedAuth.client_id === 'test-client-id-12345.apps.googleusercontent.com' &&
  retrievedAuth.access_token === 'mock-access-token-xyz' &&
  retrievedAuth.account_email === 'usuario.teste@gmail.com'
) {
  console.log('✅ [PASS] Credenciais OAuth gravadas e recuperadas com sucesso do SQLite local');
} else {
  failedCount++;
  console.error('❌ [FAIL] Falha ao gravar/recuperar credenciais do SQLite');
}

// 2. Fila do Outbox para sincronização offline
queueOutboxAction('task-offline-1', 'insert', {
  title: 'Comprar embalagens offline',
  scheduled_date: '2026-11-10',
  scheduled_time: '11:00',
});

const pending = getPendingOutbox();
const outboxFound = pending.find((p) => p.item_id === 'task-offline-1');

if (outboxFound && outboxFound.action === 'insert' && outboxFound.status === 'pending') {
  console.log('✅ [PASS] Ação enfileirada no Outbox do SQLite para sincronização offline');
  // Simula sincronização com sucesso e limpeza
  updateOutboxStatus(outboxFound.id, 'synced');
  clearSyncedOutbox();
} else {
  failedCount++;
  console.error('❌ [FAIL] Ação deveria estar pendente no Outbox do SQLite');
}

// 3. Geração de Feed iCal RFC 5545 compatível com Apple Calendar
const icalFeed = generateICalFeed(mockExistingItems, INITIAL_AREAS);
if (
  icalFeed.includes('BEGIN:VCALENDAR') &&
  icalFeed.includes('PRODID:-//Antigravity//Sistema Organizacao 2026//PT') &&
  icalFeed.includes('SUMMARY:Reunião com Contador [Divino Pão]') &&
  icalFeed.includes('CATEGORIES:Divino Pão') &&
  icalFeed.includes('END:VCALENDAR')
) {
  console.log('✅ [PASS] Feed iCalendar RFC 5545 gerado com frentes e horários para Apple/Google');
} else {
  failedCount++;
  console.error('❌ [FAIL] Falha na estrutura do feed iCalendar');
}

// ===============================================================
// TESTES DE BACKUP DIÁRIO AUTOMÁTICO, TRAVA DE SEGURANÇA E RESTAURAÇÃO
// ===============================================================
console.log(`\n===============================================================`);
console.log(`   TESTES DE BACKUP DIÁRIO AUTOMÁTICO & TRAVA DE SEGURANÇA`);
console.log(`===============================================================`);

// 1. Criação de backup diário compactado .db.gz
const dailyBackup = createCompressedBackup('daily');
if (
  dailyBackup &&
  dailyBackup.filename.startsWith('backup_daily_') &&
  dailyBackup.filename.endsWith('.db.gz') &&
  dailyBackup.sizeBytes > 0
) {
  console.log(`✅ [PASS] Backup diário compactado criado com sucesso: ${dailyBackup.filename} (${dailyBackup.sizeFormatted})`);
} else {
  failedCount++;
  console.error('❌ [FAIL] Falha ao criar backup diário compactado');
}

// 2. Histórico de backups dos últimos 30 dias disponível
const availableBackups = listAvailableBackups();
if (availableBackups.length > 0 && availableBackups.some((b) => b.filename === dailyBackup.filename)) {
  console.log(`✅ [PASS] Histórico local lista ${availableBackups.length} ponto(s) de backup retidos`);
} else {
  failedCount++;
  console.error('❌ [FAIL] Backup recém criado não apareceu na lista de histórico');
}

// 3. Trava de segurança obrigatória antes de qualquer restauração
const restoreResult = restoreBackupFromFile(dailyBackup.filename);
if (
  restoreResult.success &&
  restoreResult.safetyBackup &&
  restoreResult.safetyBackup.filename.startsWith('backup_pre_restore_') &&
  restoreResult.safetyBackup.isSafetyBackup === true
) {
  console.log(`✅ [PASS] Trava de segurança acionada: cópia preventiva (${restoreResult.safetyBackup.filename}) gerada antes da restauração`);
} else {
  failedCount++;
  console.error('❌ [FAIL] Trava de segurança não gerou a cópia preventiva antes de restaurar');
}

// 4. Exportação completa da base como JSON
const exportedJson = exportFullDatabaseAsJson();
if (
  exportedJson &&
  exportedJson.version === 1 &&
  exportedJson.tables &&
  Array.isArray(exportedJson.tables.app_items) &&
  Array.isArray(exportedJson.tables.calendar_auth)
) {
  console.log(`✅ [PASS] Exportação completa em JSON gerada com ${exportedJson.tables.app_items.length} itens estruturados`);
} else {
  failedCount++;
  console.error('❌ [FAIL] Falha na estrutura do JSON exportado');
}

// 5. Política de retenção de 30 dias
const retentionResult = pruneOldBackups(30);
if (typeof retentionResult.kept === 'number' && typeof retentionResult.deleted === 'number') {
  console.log(`✅ [PASS] Política de retenção de 30 dias executada (${retentionResult.kept} mantidos, ${retentionResult.deleted} limpos)`);
} else {
  failedCount++;
  console.error('❌ [FAIL] Falha ao executar rotação de 30 dias');
}

const totalTests = testCases.length + 5 + 7 + 5;
console.log(`\n===============================================================`);
console.log(`RESUMO GERAL: ${totalTests - failedCount}/${totalTests} testes passaram.`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!\n');
}
