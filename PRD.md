# PRD · Sistema de organização pra cabeça de empreendedor que esquece tudo

O documento base para construir o meu sistema no Antigravity / Claude Code, adaptado para a minha rotina de dono de empresas com TDAH.

Coloca este arquivo numa pasta vazia, abre a pasta no Antigravity e segue os pedidos do arquivo [PROMPTS.md](PROMPTS.md), uma fase por vez. O passo a passo está no [README](README.md).

---

## 1. Para quem e qual o problema

- **Para:** empreendedor com TDAH que toca múltiplas empresas (**Divino Pão** e **Bendito Sabor**), novos projetos e vida pessoal ao mesmo tempo. Cabeça que muda de foco rápido e esquece o operacional do dia a dia.
- **Problema:** as tarefas e ideias moram no "conversa comigo mesmo" do WhatsApp, nos Lembretes do iPhone e na cabeça. Contabilidade esquecida, fornecedor pra pagar no dia certo, consulta no dentista que passa batido e tarefas grandes que travam na hora de começar. Apps prontos (como o Notion) exigem configuração demais — até aprender e preencher tudo, o foco já mudou.
- **Objetivo:** tirar a tarefa ou ideia da cabeça em 2 segundos (no iPhone na rua ou no PC em casa), abrir o dia vendo só o que é de hoje e quebrar tarefas chatas/grandes em micro-passos sem abrir outras abas.

## 2. As 6 regras

1. **Tirar da cabeça na hora.** Anotar uma tarefa ou ideia leva no máximo 2 ações: atalho (⌘K no PC ou botão fixo no iPhone) e Enter.
2. **Só o hoje.** A tela que abre é o Hoje. Sem montanha de tarefa acumulada dando preguiça.
3. **Uma coisa por vez (anti-travamento).** O Modo Foco mostra uma tarefa só, quebrada em micro-passos curtos e com os links diretos ali na mão pra não abrir outras abas.
4. **Cor antes de texto.** Cada frente/empresa tem uma cor própria (**Divino Pão**, **Bendito Sabor**, **Projetos**, **Pessoal**). O resto da interface é todo em modo escuro neutro, pra cor da frente ser a única coisa que chama atenção.
5. **O que repete, o sistema lembra.** Rotina de empresa (mandar relatório pra contabilidade, pagar fornecedor, fechar caixa) aparece sozinha no dia certo.
6. **Na rua e em casa.** Capturo rápido pelo celular durante a correria na rua e analiso/executo com calma no PC quando chego em casa, sincronizado em tempo real.

E três princípios de produto:

- **Status simples.** Tarefa: a fazer → feito. Ideia/Nota: capturada → em andamento → arquivada.
- **Sem curva de aprendizado.** Nada de criar tabelas, propriedades ou páginas complexas estilo Notion. Abriu, digitou, salvou.
- **Meus dados sincronizados e seguros.** Banco privado no Supabase (pra funcionar no PC e no iPhone sem atrito) + backup automático diário no computador e exportação em 1 clique.

## 3. O que o sistema NÃO é

Não é Trello, Asana nem Notion. Não tem equipe, comentário, atribuição, chat nem blocos infinitos de edição. E não trata TDAH: tira o atrito da frente pra organizar as empresas e a rotina.

## 4. As telas, da mais importante pra menos

| # | Tela | O que faz |
|---|---|---|
| 1 | **Captura rápida** (⌘K ou botão `+` no celular) | Campo único que abre de qualquer tela. Eu escrevo do jeito que falo e o sistema entende (gramática na seção 5). Enquanto digito, mostra embaixo, em etiquetas, o que entendeu. Enter salva, Esc fecha. |
| 2 | **Hoje** | Só as tarefas de hoje, separadas por frente (**Divino Pão**, **Bendito Sabor**, **Projetos**, **Pessoal**). Sobrou tarefa de ontem? Aviso no topo com "trazer tudo pra hoje". No hover/toque de cada tarefa: +1 dia, +1 semana, voltar pro Inbox, sem janela de confirmação. Entre 22h e meia-noite, um aviso discreto: "momento de revisar o dia". |
| 3 | **Inbox** | Tudo que anotei rápido na rua (sem frente definida ou sem data) cai aqui para eu analisar em casa com calma, com contador na barra lateral. Triagem no teclado no PC: J e K descem e sobem, Enter abre, e dali escolho a frente e o dia. |
| 4 | **Modo Foco** | Tecla F: uma tarefa grande na tela, com micro-etapas (pra destravar tarefas grandes), links úteis engatilhados (pra não se distrair abrindo abas) e barra de progresso. O resto vira uma fila pequena e apagada embaixo. Ao concluir, uma animação curta (som opcional). |
| 5 | **Ideias & Notas Rápidas** | O substituto do "WhatsApp pra mim mesmo". Mural limpo de cartões rápidos de texto/links separados por empresa ou projeto. Sem formatação complexa: digitei a ideia, ficou salva na cor da frente, e com 1 clique transformo uma nota em tarefa. |
| 6 | **Board** | Uma coluna por frente (**Divino Pão**, **Bendito Sabor**, **Projetos**, **Pessoal**), arrastando o card entre colunas. Filtro por etiqueta e por esforço. |
| 7 | **Semana** | Grade com cada frente/empresa nas linhas e os dias da semana nas colunas. |
| 8 | **Página da Frente / Empresa** | Abas Tarefas, Ideias & Notas, e Rotinas Fixas (ex.: dados rápidos, links de sistemas, combinados com contador/fornecedores). |
| 9 | **Rotinas & Vencimentos** | Calendário do mês focado no que não pode esquecer: envio de relatórios de vendas pra contabilidade, pagamento de fornecedores, impostos e compromissos pessoais (ex.: dentista). Mostra o que vence na semana em destaque no topo. |
| 10 | **Configurações** | Gerenciar frentes e cores, conexão com Supabase, backup automático local, exportar e importar dados, atalhos. |

Esforço: cada tarefa pode ser rapidinha (`~5min`), média (`~30min`) ou longa (`+1h`), com um ícone. No Hoje, a palavra aparece junto do ícone, pra eu escolher pela energia do momento e não travar.

## 5. Captura rápida: a gramática

| Escrevo | O sistema entende |
|---|---|
| `#frente` | liga à empresa ou área (aceita o começo do nome: `#divino` = Divino Pão, `#bendito` = Bendito Sabor, `#proj` = Projetos, `#pessoal` = Vida Pessoal) |
| `hoje`, `amanhã`, `sex`, `próxima qua`, `25/11` | data |
| `14h`, `18h` | horário (útil para consultas como dentista ou reuniões) |
| `!!` | prioridade alta / urgente |
| `:nota` ou `:ideia` | salva direto em **Ideias & Notas Rápidas** daquela frente em vez de virar tarefa com prazo |
| `:rapida`, `:media`, `:longa` | define o tamanho do esforço da tarefa |
| `toda seg`, `todo dia 5`, `todo dia 15`, `a cada 2 semanas na terça` | tarefa recorrente (contabilidade, fornecedor, fechamento) |

Frente que não existe: avisa, nunca chuta. Texto sem nada disso vai direto pro **Inbox** para eu analisar em casa depois.

Testes que precisam passar:

```text
"mandar relatorio de vendas pra contabilidade #divino todo dia 5 !!" → Divino Pão, repete todo dia 5, prioridade alta
"pagar fornecedor de embalagens #bendito sex :rapida"               → Bendito Sabor, sexta-feira, esforço rápido
"dentista 25/11 14h #pessoal"                                       → Vida Pessoal, dia 25/11 às 14h
"testar novo combo de lanche da tarde #divino :ideia"               → Cria nota em Ideias & Notas da Divino Pão
"comprar peça do forno"                                             → Inbox (para triar em casa)
```

## 6. Técnico

- Web App responsivo (PWA): abre no navegador do computador e instala na tela inicial do iPhone como aplicativo, pra capturar na rua e analisar em casa.
- Tecnologia: **Next.js + Supabase** (banco PostgreSQL sincronizado em tempo real para usar no PC e no celular sem perder nada).
- Autenticação simples ou chave única persistente no dispositivo: nunca pedir login toda vez que abrir o app na correria.
- git desde o primeiro dia: um ponto salvo (commit) antes de cada mudança, e nada mexido além do que foi pedido.
- Backup automático: todo dia quando abrir no computador, salva uma cópia JSON/SQL dos dados numa pasta local escolhida, guardando os últimos 30 dias. Antes de importar um backup, guarda uma cópia do banco atual.

## 7. Visual

**Modo escuro obrigatório** (`#0D0D0F` ou similar), interface limpa e silenciosa, onde apenas as cores das frentes chamam atenção:
- **Divino Pão:** Âmbar / Dourado (`#F59E0B`)
- **Bendito Sabor:** Vermelho / Coral (`#EF4444`)
- **Projetos:** Roxo / Violeta (`#8B5CF6`)
- **Vida Pessoal:** Azul / Ciano (`#06B6D4`)

## 8. Fases

1. Captura rápida + Hoje + Inbox (funcionando no PC e no celular com Supabase)
2. Modo Foco (com micro-etapas anti-travamento e links úteis), nível de esforço e tarefas que se repetem
3. Board por empresa/frente, Semana e Página da Frente
4. Ideias & Notas Rápidas (substituto do WhatsApp) + Calendário de Rotinas & Vencimentos (contabilidade, fornecedores, compromissos)
5. Configurações, backup automático local, exportar/importar e cópia de demonstração

Uma fase por vez. Usa na rotina real antes de pedir a próxima: o que incomodar na semana vira o próximo ajuste. No fim de cada fase, o Antigravity salva um ponto (commit) e diz em 5 linhas como abrir, o que testar e o que ficou pra depois.