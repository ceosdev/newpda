# Regras de UI

## Detalhe sempre em modal no desktop

Telas de **detalhe** abertas a partir de um card ou item de lista devem ser
responsivas:

- **Desktop (≥ 640px, breakpoint `sm`):** `Dialog` (modal centralizado).
- **Mobile (< 640px):** `Sheet` ancorada na base (`side="bottom"`).

A escolha é feita com `useMediaQuery('(min-width: 640px)')` — o mesmo padrão dos
modais de formulário (`transaction-form-modal`, `match-form`) e do detalhe de
jogador (`player-detail-sheet`).

**Nunca** apresentar um detalhe apenas como `Sheet`: no desktop ela deve virar
`Dialog`.
