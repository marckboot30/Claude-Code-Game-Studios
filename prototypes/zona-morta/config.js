// PROTOTYPE - NOT FOR PRODUCTION
// Question: vasculhar a cidade só de cueca, sob a pressão do barulho, do frio e da fome, e montar uma base barricada é tenso e divertido por 20 minutos?
// Date: 2026-11-17
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // time and the world's clock
  day_seconds: { value: 360, min: 120, max: 1440, step: 30 },      // real seconds per 24 game hours
  start_hour: { value: 7, min: 0, max: 23, step: 1 },              // the hour you wake on day 1
  power_off_day: { value: 4, min: 2, max: 10, step: 1 },           // the day the city loses power (08:00)
  water_off_day: { value: 5, min: 2, max: 12, step: 1 },           // the day the taps run dry
  sleep_speed: { value: 14, min: 2, max: 40, step: 1 },            // how much faster time runs while asleep

  // the survivor
  walk_speed: { value: 1.7, min: 0.8, max: 3, step: 0.1 },         // tiles per second
  run_speed: { value: 3.0, min: 1.5, max: 5, step: 0.1 },
  crouch_speed: { value: 0.95, min: 0.4, max: 2, step: 0.05 },
  stamina_run: { value: 11, min: 2, max: 30, step: 1 },            // stamina spent per second of running (of 100)
  stamina_swing: { value: 6, min: 0, max: 20, step: 1 },           // per swing
  stamina_regen: { value: 9, min: 2, max: 30, step: 1 },           // per second while not running
  carry_base: { value: 10, min: 4, max: 30, step: 1 },             // weight carried without slowing
  hunger_rate: { value: 4.2, min: 0, max: 15, step: 0.2 },         // hunger per game hour (100 = starving)
  thirst_rate: { value: 6.5, min: 0, max: 20, step: 0.5 },
  fatigue_rate: { value: 3.2, min: 0, max: 10, step: 0.2 },
  starve_dmg: { value: 6, min: 0, max: 30, step: 1 },              // health per game hour when starving
  thirst_dmg: { value: 10, min: 0, max: 30, step: 1 },
  start_cold: { value: 30, min: 0, max: 80, step: 5 },             // how cold you wake up (0-100)

  // cold
  temp_day: { value: 13, min: -5, max: 30, step: 1 },              // degrees C at midday
  temp_night: { value: 2, min: -15, max: 20, step: 1 },            // degrees C before dawn
  temp_drop_day: { value: 0.6, min: 0, max: 3, step: 0.1 },        // degrees colder each day
  indoor_bonus: { value: 6, min: 0, max: 15, step: 1 },            // degrees gained inside a building
  fire_bonus: { value: 16, min: 0, max: 30, step: 1 },             // degrees gained by a fire within 3 tiles
  comfort_temp: { value: 16, min: 5, max: 25, step: 1 },           // felt temperature below this chills you
  warmth_per_point: { value: 0.28, min: 0.05, max: 1, step: 0.01 },// degrees each point of clothing warmth adds
  chill_rate: { value: 1.1, min: 0.1, max: 4, step: 0.1 },         // cold gained per hour per degree short
  warm_rate: { value: 12, min: 1, max: 40, step: 1 },              // cold lost per hour when comfortable
  cold_dmg: { value: 9, min: 0, max: 30, step: 1 },                // health per game hour at hypothermia

  // wounds and infection
  bleed_dmg: { value: 5, min: 0, max: 20, step: 0.5 },             // health per game hour per open cut or bite
  scratch_dmg: { value: 1.2, min: 0, max: 10, step: 0.2 },
  heal_hours: { value: 16, min: 2, max: 60, step: 1 },             // game hours a bandaged wound takes to close
  infect_scratch: { value: 0.07, min: 0, max: 1, step: 0.01 },
  infect_cut: { value: 0.25, min: 0, max: 1, step: 0.01 },
  infect_anxious_h: { value: 4, min: 0, max: 24, step: 1 },        // hours after infection that anxiety shows
  infect_drain_h: { value: 12, min: 1, max: 72, step: 1 },         // hours before the infection starts to kill
  infect_dmg: { value: 7, min: 1, max: 40, step: 1 },              // health per game hour once it does
  wound_scratch_w: { value: 0.6, min: 0, max: 1, step: 0.05 },
  wound_cut_w: { value: 0.25, min: 0, max: 1, step: 0.05 },
  wound_bite_w: { value: 0.15, min: 0, max: 1, step: 0.05 },

  // zombies
  zumbi_speed: { value: 0.55, min: 0.2, max: 2, step: 0.05 },      // tiles per second
  zumbi_gordo_speed: { value: 0.42, min: 0.2, max: 2, step: 0.05 },
  corredor_speed: { value: 2.3, min: 1, max: 4, step: 0.1 },
  rastejante_speed: { value: 0.3, min: 0.1, max: 1.5, step: 0.05 },
  zombie_windup: { value: 0.8, min: 0.2, max: 2, step: 0.05 },     // seconds a grab takes to land
  zombie_attack_cd: { value: 1.5, min: 0.5, max: 4, step: 0.1 },
  zombie_hit_chance: { value: 0.55, min: 0.1, max: 1, step: 0.05 },
  zombie_hit_dmg: { value: 4, min: 0, max: 20, step: 1 },
  zombie_bash: { value: 1, min: 0.2, max: 5, step: 0.1 },          // damage per blow to doors, windows, planks
  zombie_bash_cd: { value: 1.3, min: 0.4, max: 4, step: 0.1 },
  sight_day: { value: 9, min: 3, max: 20, step: 0.5 },             // tiles a zombie sees by day
  sight_night: { value: 4.5, min: 1, max: 15, step: 0.5 },
  sight_crouch: { value: 0.55, min: 0.2, max: 1, step: 0.05 },
  zombies_start: { value: 330, min: 0, max: 1200, step: 10 },
  zombies_per_day: { value: 50, min: 0, max: 300, step: 5 },       // new zombies wander in each dawn
  horde_base: { value: 6, min: 0, max: 40, step: 1 },              // the night horde drawn to you
  horde_per_day: { value: 3, min: 0, max: 20, step: 1 },
  runner_day: { value: 3, min: 1, max: 10, step: 1 },              // the day runners appear
  runner_chance: { value: 0.15, min: 0, max: 1, step: 0.05 },
  start_safe_radius: { value: 11, min: 4, max: 30, step: 1 },      // no zombie this close to your bed at the start

  // noise, in tiles a zombie hears it from
  noise_walk: { value: 1.6, min: 0, max: 8, step: 0.2 },
  noise_run: { value: 7, min: 1, max: 20, step: 0.5 },
  noise_chop: { value: 10, min: 1, max: 30, step: 1 },
  noise_hammer: { value: 12, min: 1, max: 30, step: 1 },
  noise_glass: { value: 14, min: 1, max: 30, step: 1 },
  noise_bash: { value: 7, min: 1, max: 20, step: 1 },
  noise_generator: { value: 10, min: 0, max: 30, step: 1 },

  // building and breaking
  door_hp: { value: 22, min: 2, max: 100, step: 1 },
  glass_hp: { value: 3, min: 1, max: 20, step: 1 },
  plank_hp: { value: 14, min: 2, max: 60, step: 1 },               // each barricade plank, at carpentry 1
  wall_hp: { value: 40, min: 5, max: 200, step: 5 },               // a built wooden wall, at carpentry 2
  skill_hp_bonus: { value: 0.2, min: 0, max: 1, step: 0.05 },      // extra hp per carpentry level
  tree_hits: { value: 8, min: 2, max: 30, step: 1 },

  // learning
  read_seconds: { value: 28, min: 5, max: 120, step: 1 },          // real seconds to read a book of level 2
  read_per_level: { value: 0.15, min: 0, max: 1, step: 0.05 },     // extra time per level above 2
  tv_seconds: { value: 20, min: 5, max: 120, step: 1 },            // real seconds of a program to learn one level
  tv_max_level: { value: 3, min: 1, max: 10, step: 1 },            // TV teaches up to this level

  // actions (real seconds)
  search_seconds: { value: 1.8, min: 0.2, max: 6, step: 0.1 },
  bandage_seconds: { value: 4, min: 0.5, max: 10, step: 0.5 },
  eat_seconds: { value: 1.5, min: 0.2, max: 6, step: 0.1 },

  // power and the base
  gen_tank: { value: 20, min: 2, max: 60, step: 1 },               // litres
  gen_use: { value: 0.5, min: 0.05, max: 3, step: 0.05 },          // litres per game hour
  gen_radius: { value: 10, min: 3, max: 25, step: 1 },             // tiles it powers
  car_fuel_max: { value: 12, min: 0, max: 40, step: 1 },           // litres a car can hold

  // farms
  animal_eat: { value: 6, min: 0, max: 30, step: 1 },              // trough units used per animal per day
  animal_starve: { value: 3, min: 0, max: 20, step: 0.5 },         // health per game hour with an empty trough
  egg_chance: { value: 0.6, min: 0, max: 1, step: 0.05 },          // per fed chicken per day

  // the view
  flashlight_range: { value: 150, min: 40, max: 300, step: 10 },   // pixels
  night_dark: { value: 0.24, min: 0.05, max: 1, step: 0.01 },      // brightness at the darkest hour
};
