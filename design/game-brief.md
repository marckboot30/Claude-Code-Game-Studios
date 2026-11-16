# Game Brief: Zona Morta

## In your words

"Vamos cria um jogo de sobrevivência no mundo pós apocalipse"
- Resposta: "Tem que ver no estilo do jogo dayz"

**Pitch:** Você acorda na praia de uma região rural arrasada por uma infecção, saqueia casas abandonadas atrás de comida, água e armas, foge e luta contra os infectados e tenta chegar vivo à base militar ao norte, com uma vida só. *(inferred (strong), from DayZ)*

**Genre:** survival em mundo aberto com zumbis (survival-crafting)

**Controls:** WASD andar, Shift correr, C agachar (menos barulho), mouse olhar e atacar, E pegar/abrir, Tab inventário e fabricação, 1-4 trocar item. *(guessed)*

**Question:** saquear cidades sob pressão de fome, sede e do barulho que atrai infectados é tenso e divertido por 15 minutos? *(guessed)*

**Hooks:** o barulho é arma e ameaça: correr, atirar e arrombar atraem infectados; cada tiro é uma decisão; uma vida só faz cada item importar. *(inferred (strong), from DayZ)*

**Intent:**

## Look and references
- Look: low-poly realista e desbotado, luz volumétrica; campos verde-oliva, céu nublado cinza-azulado, casas de tijolo e madeira com telhado vermelho apagado, carros enferrujados na estrada; infectados de pele cinza e roupas rasgadas; detalhe marcante: névoa baixa e o pôr do sol laranja que avisa a noite; every figure drawn, no emoji, no plain circles. *(inferred (strong), from DayZ)*
- References: DayZ (o campo do leste europeu, saque de casas, vida única, fome/sede/sangramento, infectados que ouvem barulho).
- View: 3D · Camera: terceira pessoa por trás do ombro, câmera orbitando com o mouse. *(inferred (strong), from DayZ)*

## First minute
1. Você acorda na praia com uma lanterna e uma camisa; vida, fome e sede aparecem ao lado do personagem.
2. Uma vila a 50 m; um infectado cambaleia na estrada.
3. Você entra agachado numa casa e pega uma lata de feijão, uma garrafa d'água e um pé de cabra.
4. Ao sair correndo, o infectado escuta e vem gritando; você o derruba com o pé de cabra mas leva um arranhão: sangrando.
5. Rasga a camisa em curativo (Tab, fabricar); o sangramento para e a seta no horizonte mostra a base militar ao norte.

## Challenge
O primeiro perigo de verdade vem por volta do minuto 2-3 na primeira vila: um grupo de 3-4 infectados e um corredor que ouve se você correr. Morrer encerra a partida e você recomeça na praia com outro saque. Depois: vilas maiores, o anoitecer por volta do minuto 10 (menos visão, mais infectados) e a base militar cheia de infectados soldados, com o melhor saque. *(guessed)*

## Core loop
- Explorar a próxima construção → saquear comida, água, remédio, armas e munição
- Gerenciar fome, sede, sangue e o barulho que você faz
- Lutar ou fugir dos infectados atraídos pelo barulho
- Fabricar curativo, fogueira (cozinhar e esquentar à noite) e arma improvisada
- Avançar para o norte; morreu, recomeça na praia com outro saque

## Goal & fail state
- Objetivo: chegar à base militar no norte e acionar o rádio de evacuação. *(provisional)*
- Derrota: vida zero (infectados, sangramento, fome ou sede); uma vida só, a partida acaba. *(inferred (strong), from DayZ)*

## Features
- [x] Mapa pequeno: praia, 2 vilas, estrada, floresta e base militar ao norte
- [x] Vida, fome, sede e sangramento visíveis, caindo devagar
- [x] Saque espalhado ao acaso nas casas a cada partida
- [x] Barulho: andar, agachar, correr, atirar e arrombar atraem infectados a distâncias diferentes
- [x] 3 tipos de infectado, cada um atacando diferente: o que anda, o corredor e o soldado blindado
- [x] Combate corpo a corpo e uma pistola com munição rara (e barulhenta)
- [x] Fabricação simples: curativo, fogueira, lança improvisada
- [x] Ciclo de dia e noite curto, anoitecer em cerca de 10 minutos

## Keep
-

## Avoid
- O nome, a arte, o mapa e a interface do DayZ: só o estilo como referência

## Out of scope
- Sobreviver junto com amigos (multiplayer): needs a server, not built yet; aqui você joga sozinho contra a IA
- Construção de base: add it as a feature
- Veículos; clima que molha e esfria: add it as a feature
- Animais que andam sozinhos para caçar: not tested yet

## Build order
1. A fatia: praia → vilas → base militar, com necessidades, saque, barulho, infectados, combate, fabricação, uma vida só e o rádio de evacuação como vitória.

---
**Kill condition:** se saquear casas ficar repetitivo depois de duas rodadas de ajuste. *(guessed)*

**Who it's for / what they feel:** fãs de survival que querem tensão e escassez em sessões de 15-20 minutos. *(guessed)*

**Games you love / don't:** Ama DayZ (vida única, saque, infectados).
