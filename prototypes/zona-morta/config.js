// PROTOTYPE - NOT FOR PRODUCTION
// Question: saquear cidades sob pressão de fome, sede e do barulho que atrai infectados é tenso e divertido por 15 minutos?
// Date: 2026-11-15
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- Player movement (metres per second) ----
  walk_speed: { value: 3.4, min: 1, max: 8, step: 0.1 },
  sprint_speed: { value: 6.2, min: 3, max: 12, step: 0.1 },
  crouch_speed: { value: 1.7, min: 0.5, max: 4, step: 0.1 },
  mouse_sens: { value: 0.0025, min: 0.0005, max: 0.008, step: 0.0005 }, // radians per pixel
  key_turn_speed: { value: 2.2, min: 0.5, max: 5, step: 0.1 },        // radians per second (arrow keys)

  // ---- Needs (points per second; bars are 0-100) ----
  start_food: { value: 70, min: 10, max: 100, step: 5 },
  start_water: { value: 60, min: 10, max: 100, step: 5 },
  food_drain: { value: 0.10, min: 0, max: 1, step: 0.01 },
  water_drain: { value: 0.15, min: 0, max: 1, step: 0.01 },
  sprint_need_mult: { value: 2.2, min: 1, max: 5, step: 0.1 },        // drain multiplier while sprinting
  starve_damage: { value: 0.6, min: 0, max: 5, step: 0.1 },           // health/s at 0 food or 0 water
  bleed_damage: { value: 0.7, min: 0, max: 5, step: 0.1 },            // health/s per open wound
  regen_rate: { value: 0.25, min: 0, max: 2, step: 0.05 },            // health/s when fed and watered
  regen_threshold: { value: 55, min: 0, max: 100, step: 5 },          // food and water above this to regen
  cold_damage: { value: 0.18, min: 0, max: 2, step: 0.02 },           // health/s at night away from a fire
  fire_heal: { value: 0.8, min: 0, max: 3, step: 0.1 },               // health/s by a fire
  fire_radius: { value: 5, min: 2, max: 12, step: 0.5 },
  fire_burn_time: { value: 120, min: 20, max: 400, step: 10 },        // seconds

  // ---- Noise (radius in metres that infected can hear) ----
  noise_crouch: { value: 3, min: 0, max: 20, step: 0.5 },
  noise_walk: { value: 9, min: 0, max: 30, step: 0.5 },
  noise_sprint: { value: 22, min: 0, max: 60, step: 1 },
  noise_melee: { value: 11, min: 0, max: 40, step: 1 },
  noise_gunshot: { value: 70, min: 10, max: 150, step: 5 },
  noise_force_door: { value: 28, min: 5, max: 80, step: 1 },
  noise_kick_door: { value: 38, min: 5, max: 80, step: 1 },
  noise_can: { value: 20, min: 5, max: 60, step: 1 },                 // a thrown empty can landing
  noise_radio: { value: 90, min: 20, max: 200, step: 5 },             // each pulse of the radio
  throw_range: { value: 14, min: 4, max: 30, step: 1 },

  // ---- Infected ----
  sight_day: { value: 20, min: 5, max: 50, step: 1 },                 // metres, in a 120 degree cone
  sight_night: { value: 9, min: 3, max: 30, step: 1 },
  flashlight_sight_mult: { value: 1.8, min: 1, max: 3, step: 0.1 },   // flashlight on at night makes you seen farther
  crouch_sight_mult: { value: 0.55, min: 0.2, max: 1, step: 0.05 },
  lose_track_time: { value: 5, min: 1, max: 15, step: 0.5 },          // seconds without seeing you before they search
  walker_speed: { value: 3.0, min: 1, max: 8, step: 0.1 },            // chase speed
  walker_hp: { value: 60, min: 10, max: 300, step: 5 },
  walker_damage: { value: 10, min: 1, max: 50, step: 1 },
  runner_speed: { value: 5.6, min: 2, max: 10, step: 0.1 },
  runner_hp: { value: 40, min: 10, max: 300, step: 5 },
  runner_damage: { value: 8, min: 1, max: 50, step: 1 },
  soldier_speed: { value: 2.5, min: 1, max: 8, step: 0.1 },
  soldier_hp: { value: 170, min: 20, max: 500, step: 5 },
  soldier_damage: { value: 20, min: 1, max: 60, step: 1 },
  soldier_armor: { value: 0.5, min: 0, max: 0.9, step: 0.05 },        // fraction of melee damage the vest stops
  bleed_chance: { value: 0.35, min: 0, max: 1, step: 0.05 },          // chance a hit opens a wound
  attack_windup: { value: 0.55, min: 0.1, max: 2, step: 0.05 },       // seconds between the lunge and the hit

  // ---- Weapons ----
  fist_damage: { value: 9, min: 1, max: 50, step: 1 },
  crowbar_damage: { value: 26, min: 1, max: 100, step: 1 },
  axe_damage: { value: 38, min: 1, max: 100, step: 1 },
  spear_damage: { value: 30, min: 1, max: 100, step: 1 },
  pistol_damage: { value: 70, min: 10, max: 200, step: 5 },
  pistol_range: { value: 45, min: 10, max: 100, step: 5 },

  // ---- World and pacing ----
  day_start_hour: { value: 7, min: 0, max: 23, step: 0.5 },
  dusk_minute: { value: 10, min: 1, max: 30, step: 0.5 },             // real minutes until 19:00 (dusk)
  night_spawn_every: { value: 18, min: 4, max: 60, step: 1 },         // seconds between night wanderers
  zombie_cap: { value: 70, min: 10, max: 150, step: 5 },
  radio_hold_time: { value: 60, min: 10, max: 180, step: 5 },         // seconds to hold out after the call
  radio_wave_every: { value: 5, min: 1, max: 20, step: 0.5 },         // seconds between infected during the hold
  heli_wait: { value: 25, min: 5, max: 60, step: 1 },                 // seconds the helicopter waits on the pad
  backpack_slots: { value: 14, min: 4, max: 40, step: 1 },
};
