// PROTOTYPE - NOT FOR PRODUCTION
// Question: Andar em primeira pessoa por uma cidadezinha vasculhando casas atrás de comida e água, com fome e sede caindo, já é tenso e divertido?
// Date: 2026-11-20
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)

  // --- Necessidades (100 = cheio). Começo calmo: drenam devagar. ---
  hunger_drain: { value: 6, min: 1, max: 30, step: 0.5 },     // pontos por minuto real (~16 min de cheio a zero)
  thirst_drain: { value: 9, min: 1, max: 30, step: 0.5 },     // pontos por minuto real (~11 min)
  run_thirst_mult: { value: 2, min: 1, max: 4, step: 0.25 },  // correr gasta sede mais rápido
  starve_damage: { value: 12, min: 2, max: 60, step: 1 },     // saúde perdida por minuto por necessidade zerada
  regen_threshold: { value: 60, min: 20, max: 95, step: 5 },  // fome e sede acima disto: a saúde volta
  regen_rate: { value: 4, min: 0, max: 20, step: 0.5 },       // saúde recuperada por minuto
  start_hunger: { value: 85, min: 10, max: 100, step: 5 },
  start_thirst: { value: 85, min: 10, max: 100, step: 5 },

  // --- Tempo ---
  day_length: { value: 600, min: 120, max: 1800, step: 30 },  // segundos reais por dia de jogo (24 h)
  start_hour: { value: 8, min: 0, max: 23, step: 1 },          // hora em que a partida começa

  // --- Saque ---
  search_time: { value: 2.2, min: 0.5, max: 6, step: 0.1 },   // segundos segurando E para vasculhar
  slots: { value: 6, min: 3, max: 9, step: 1 },                // espaços na mochila
  loot_mult: { value: 1, min: 0.25, max: 2, step: 0.05 },     // multiplica a quantidade máxima por móvel
  refill_days: { value: 1.5, min: 0.5, max: 5, step: 0.25 },  // dias até um móvel vazio poder ter algo de novo
  refill_chance: { value: 0.45, min: 0, max: 1, step: 0.05 }, // chance de ter algo quando reabastece
  locked_chance: { value: 0.2, min: 0, max: 0.8, step: 0.05 },// casas trancadas com tábuas

  // --- Fabricação ---
  stack_max: { value: 5, min: 1, max: 20, step: 1 },           // materiais por espaço da mochila
  chop_time: { value: 3.5, min: 0.5, max: 10, step: 0.25 },     // segundos segurando E numa árvore para 1 lenha
  chop_reach: { value: 1.6, min: 0.8, max: 3, step: 0.1 },      // m até o tronco
  craft_extra_slots: { value: 3, min: 1, max: 6, step: 1 },     // espaços a mais da mochila reforçada
  fire_hours: { value: 6, min: 1, max: 24, step: 0.5 },         // horas de jogo que a fogueira fica acesa
  fire_reach: { value: 3, min: 1, max: 8, step: 0.25 },         // m da fogueira para cozinhar
  fire_light: { value: 22, min: 2, max: 80, step: 1 },          // força da luz da fogueira
  beans_cooked_food: { value: 55, min: 0, max: 100, step: 1 },  // feijão quente
  sardine_cooked_food: { value: 35, min: 0, max: 100, step: 1 },// sardinha assada (sem risco)

  // --- Itens: quanto cada um enche (pontos) ---
  beans_food: { value: 35, min: 0, max: 100, step: 1 },       // lata de feijão
  beans_thirst: { value: -5, min: -30, max: 30, step: 1 },
  bar_food: { value: 15, min: 0, max: 100, step: 1 },         // barra de cereal
  apple_food: { value: 10, min: 0, max: 100, step: 1 },       // maçã
  apple_thirst: { value: 6, min: 0, max: 100, step: 1 },
  water_thirst: { value: 40, min: 0, max: 100, step: 1 },     // garrafa d'água
  soda_thirst: { value: 25, min: 0, max: 100, step: 1 },      // refrigerante
  soda_food: { value: 5, min: 0, max: 100, step: 1 },
  bandage_health: { value: 25, min: 0, max: 100, step: 1 },   // curativo
  sardine_food: { value: 30, min: 0, max: 100, step: 1 },     // sardinha vencida
  spoiled_sick_chance: { value: 0.35, min: 0, max: 1, step: 0.05 }, // chance de passar mal com a sardinha
  sick_time: { value: 60, min: 10, max: 300, step: 5 },       // segundos doente
  sick_damage: { value: 15, min: 0, max: 60, step: 1 },       // saúde perdida por minuto doente

  // --- Física ---
  jump_speed: { value: 4.8, min: 2, max: 9, step: 0.1 },        // m/s para cima ao pular
  fall_safe_speed: { value: 8, min: 3, max: 20, step: 0.5 },    // m/s de queda sem se machucar (~3 m)
  fall_damage: { value: 7, min: 0, max: 30, step: 0.5 },        // saúde por m/s acima do seguro
  grab_reach: { value: 2.2, min: 1, max: 4, step: 0.1 },        // m até um objeto para pegar
  throw_speed: { value: 9, min: 2, max: 25, step: 0.5 },        // m/s ao jogar

  // --- Carros ---
  car_reach: { value: 2.8, min: 1.5, max: 5, step: 0.1 },       // m do carro para entrar
  engine_force: { value: 320, min: 50, max: 3000, step: 10 },
  car_top_speed: { value: 95, min: 20, max: 250, step: 5 },     // km/h
  brake_force: { value: 12, min: 1, max: 60, step: 1 },
  handbrake_force: { value: 30, min: 1, max: 100, step: 1 },
  idle_brake: { value: 1.5, min: 0, max: 10, step: 0.5 },      // freio leve sem acelerar
  max_steer: { value: 0.55, min: 0.2, max: 0.9, step: 0.05 },   // rad
  fuel_use: { value: 0.8, min: 0, max: 5, step: 0.1 },          // % do tanque por segundo acelerando
  can_fuel: { value: 40, min: 5, max: 100, step: 5 },           // % que um galão põe no tanque
  car_start_fuel_max: { value: 30, min: 0, max: 100, step: 5 }, // cada carro começa com 0 até isto %

  // --- Armas ---
  ammo_stack: { value: 60, min: 10, max: 200, step: 5 },        // balas por espaço da mochila
  ammo_chance: { value: 0.3, min: 0, max: 1, step: 0.05 },      // chance de um armário ter munição
  gun_find_mult: { value: 1, min: 0, max: 5, step: 0.1 },       // multiplica a chance de achar armas
  max_decals: { value: 80, min: 10, max: 300, step: 10 },       // marcas de tiro no mundo

  // --- Câmera em terceira pessoa ---
  cam_distance: { value: 2.8, min: 1, max: 6, step: 0.1 },    // m atrás do personagem
  cam_shoulder: { value: 0.55, min: -1.5, max: 1.5, step: 0.05 }, // m para o lado (positivo: ombro direito)
  cam_height: { value: 0.3, min: -0.5, max: 2, step: 0.05 },   // m acima da cabeça
  reach_3p: { value: 2.0, min: 1, max: 3.5, step: 0.1 },       // m até onde alcança um móvel na frente

  // --- Movimento ---
  walk_speed: { value: 3.2, min: 1, max: 8, step: 0.1 },      // m/s
  run_speed: { value: 5.6, min: 2, max: 12, step: 0.1 },      // m/s com Shift
  turn_speed: { value: 2.2, min: 0.5, max: 5, step: 0.1 },    // rad/s nas setas
  mouse_sens: { value: 0.0022, min: 0.0005, max: 0.006, step: 0.0001 },
  touch_look_sens: { value: 0.0045, min: 0.001, max: 0.012, step: 0.0005 }, // rad por pixel arrastado no celular
  player_radius: { value: 0.35, min: 0.2, max: 0.6, step: 0.05 }, // m

  // --- Mundo ---
  flashlight_power: { value: 60, min: 5, max: 150, step: 5 },
  fog_day_far: { value: 150, min: 40, max: 250, step: 5 },    // m de visibilidade de dia
  mobile_resolution: { value: 0.85, min: 0.4, max: 1, step: 0.05 }, // resolução no celular (1 = nativa)
  stream_radius: { value: 180, min: 60, max: 600, step: 10 },       // m: quadrados do mapa ativos em volta (computador)
  stream_radius_mobile: { value: 120, min: 40, max: 400, step: 10 },// m: o mesmo no celular
  fog_night_far: { value: 50, min: 15, max: 150, step: 5 },   // m à noite

  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // Armas: carregador (mag), dano, tempo entre tiros (s), abertura (rad), alcance (m), recarga (s),
  // chumbos por tiro, força do impacto, coice (rad), raio do barulho (m), chance de achar por móvel,
  // balas por achado [mín, máx]; auto = segura o gatilho; zoom = campo de visão com luneta.
  guns: {
    pistola: { mag: 25, damage: 28, rate: 0.22, spread: 0.018, range: 70, reload: 1.4, pellets: 1, force: 3, recoil: 0.025, noise: 120, find: 0.035, ammo_find: [8, 20] },
    escopeta: { mag: 12, damage: 14, rate: 0.85, spread: 0.07, range: 30, reload: 2.6, pellets: 8, force: 2, recoil: 0.09, noise: 160, find: 0.02, ammo_find: [4, 10] },
    sniper: { mag: 6, damage: 140, rate: 1.4, spread: 0.002, range: 400, reload: 2.8, pellets: 1, force: 8, recoil: 0.12, noise: 300, find: 0.008, ammo_find: [3, 8], zoom: 14 },
    fuzil: { mag: 30, damage: 32, rate: 0.1, spread: 0.022, range: 150, reload: 2.2, pellets: 1, force: 4, recoil: 0.03, noise: 200, find: 0.012, ammo_find: [10, 30], auto: true },
  },

  // Tabelas de saque por tipo de móvel: [item, peso], e quantos itens (mín..máx).
  loot: {
    geladeira: { min: 0, max: 2, items: [['agua', 4], ['refri', 3], ['maca', 2], ['sardinha', 1]] },
    armario: { min: 0, max: 2, items: [['feijao', 3], ['cereal', 3], ['sardinha', 2], ['agua', 1], ['pano', 2], ['fita', 1], ['fosforos', 1]] },
    caixa: { min: 0, max: 2, items: [['cereal', 2], ['agua', 2], ['curativo', 1], ['feijao', 1], ['fita', 2], ['pano', 2], ['fosforos', 1], ['galao', 1]] },
    comoda: { min: 0, max: 2, items: [['curativo', 2], ['cereal', 2], ['maca', 1], ['pano', 3], ['fosforos', 2]] },
    pilha: { min: 2, max: 4, items: [['lenha', 1]] },
    prateleira: { min: 0, max: 3, items: [['feijao', 3], ['cereal', 2], ['agua', 3], ['refri', 2], ['sardinha', 2], ['fosforos', 1], ['fita', 1], ['galao', 2]] },
  },
};
