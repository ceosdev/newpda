# Spec: Gerar mensalidades

## Problema
Para não ocasionar o lançamento manual de jogador por jogador, será preciso que eu tenha um mecanismo de gerar todas as mensalidades do mês para facilitar a experiência do administrador da pelada.

## Solução proposta
Criar um botão chamado "Gerar mensalidades", de uso exclusivo do administrador, posicionado ao lado do botão "Novo lançamento" na tela de finanças e com cor distinta dele para diferenciação visual. O botão segue a mesma regra de exibição/ocultação do botão "Novo lançamento" (visível apenas para admin).

Ao ser clicado, o botão abre um modal (desktop ≥ 640px) ou sheet ancorada na base (mobile < 640px), apresentando um `select` de mês para que o administrador escolha o mês a lançar. O ano é determinado pelo sistema (ver Regras de negócio).

O ato de gerar as mensalidades faz um lançamento para cada **jogador ativo** (`player_status` igual a `active` ou `injured`/DM, não arquivado), **exceto goleiros** (`preferred_position = 'goalkeeper'`), com o valor baseado no `suggested_amount_cents` do tipo de lançamento "Mensalidade". Jogadores sem posição definida são incluídos. Espectadores não entram — não possuem registro em `players`.

Caso o sistema não encontre um tipo de lançamento **ativo** cuja descrição corresponda a "Mensalidade", deve apresentar mensagem informando que não é possível gerar as mensalidades por não existir esse tipo de lançamento.

## Comportamento esperado

### Fluxo feliz
- Administrador clica no botão "Gerar mensalidades".
- O modal/sheet é apresentado já com o mês corrente pré-selecionado.
- O administrador confirma o mês e clica no botão "Gerar" do modal.
- O sistema apresenta um diálogo de confirmação.
- Após confirmar, o sistema gera as mensalidades — uma por jogador ativo (exceto goleiros) — como tipo RECEITA (`operation = 'income'`) e com status aberto (sem baixa: `paid_amount_cents` e `paid_on` nulos), com `occurred_on` no dia 1 do mês/ano alvo.
- O botão "Gerar" exibe feedback visual de carregamento durante a operação.
- Ao final, é exibido um toast de sucesso informando quantas mensalidades foram geradas, e a lista de lançamentos é recarregada.

### Fluxos alternativos
- **Tipo "Mensalidade" inexistente ou inativo:** o sistema apresenta a mensagem "Não será possível gerar as mensalidades por não existir um tipo de lançamento ativo chamado 'Mensalidade'."
- **Tipo "Mensalidade" sem valor sugerido:** caso o tipo exista e esteja ativo, mas não tenha `suggested_amount_cents` configurado, o sistema apresenta a mensagem "O tipo de lançamento 'Mensalidade' não possui valor sugerido configurado. Configure um valor antes de gerar as mensalidades."
- **Nenhum jogador elegível:** caso não exista nenhum jogador ativo (não-goleiro), o sistema apresenta a mensagem "Não há jogadores ativos para gerar mensalidades."
- **Mensalidades já geradas no mês alvo:** ver Regras de negócio (confirmação adicional encadeada).

### Regras de negócio
- Todas as mensalidades são lançadas como receita (`operation = 'income'`) e com status aberto.
- O tipo de lançamento "Mensalidade" é localizado de forma case-insensitive: `lower(btrim(description)) = 'mensalidade'`, e deve estar ativo (`is_active = true`).
- **Determinação do ano:** por padrão usa-se o ano corrente. **Exceção de dezembro:** quando o mês corrente é dezembro e o mês selecionado é janeiro, o ano usado é o ano corrente + 1 (para suportar a geração antecipada do mês seguinte na virada do ano). Nos demais casos usa-se sempre o ano corrente.
- **Garantia de lançamento único por jogador:** antes de gerar, o sistema verifica, para cada jogador, se já existe um lançamento do tipo "Mensalidade" no mês/ano alvo. Jogadores que já possuem mensalidade no período são ignorados — nunca se gera uma segunda mensalidade para o mesmo jogador no mesmo mês/ano. O toast de sucesso informa quantas foram geradas e quantas foram ignoradas por já existirem.
- **Confirmação adicional de duplicidade:** é normal o usuário gerar as mensalidades do próximo mês ainda no fim do mês anterior. Para mitigar geração em duplicidade, se já existir **pelo menos uma** mensalidade lançada para o mês/ano alvo, o sistema exibe uma segunda confirmação encadeada: "Você já gerou as mensalidades deste mês. Tem certeza que deseja continuar?".
- A operação de geração é atômica: ou todas as mensalidades elegíveis são criadas, ou nenhuma é (executada via RPC `security definer` com checagem de admin no servidor).

## Fora de escopo
- Marcação de origem do lançamento (distinguir mensalidade gerada em lote de lançamento manual).
- Desfazer/reverter uma geração de mensalidades.
- Geração para meses de anos arbitrários (apenas ano corrente, com a exceção de dezembro descrita acima).

## Critérios de aceite
- [ ] Gerar todas as mensalidades para o mês selecionado, uma por jogador ativo, excluindo goleiros.
- [ ] Não gerar mensalidade duplicada para um mesmo jogador no mesmo mês/ano.
- [ ] Exibir confirmação adicional quando já existir pelo menos uma mensalidade no mês/ano alvo.
- [ ] Mensalidades geradas no ano corrente (ou ano seguinte, na exceção de dezembro→janeiro), no mês selecionado, no dia 1.
- [ ] Mensalidades geradas como receita, status aberto.
- [ ] Tratar tipo "Mensalidade" inexistente/inativo, sem valor sugerido, e ausência de jogadores elegíveis com mensagens próprias.
- [ ] Botão exclusivo de admin, posicionado ao lado de "Novo lançamento" e com cor distinta.
