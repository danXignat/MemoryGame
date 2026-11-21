// ============================================================================
//  cars.js  —  THE 5 CARS. Each has its own engine character and handling.
//  Figures are APPROXIMATE (rounded, tuned for fun and for learning), not
//  factory data. Edit a number here and that car drives differently.
//
//   massKg      heavier = slower to start, slower to stop, slower to turn
//   powerKw     engine power (more = quicker acceleration, esp. at speed)
//   engineType  how power is delivered:
//        diesel  strong in the middle of the rev range, calm
//        petrol  linear and friendly
//        vtec    weak at low revs, wakes up high up (rewards smooth, higher revs)
//        v8      big flat torque, always there
//        turbo   a short "lag", then a strong push
//   traction    most acceleration the tyres can put down at low speed (m/s²)
//   brake       strongest braking (m/s²)
//   maxSteer    wheel angle at standstill (rad);  gripLat = cornering grip (m/s²)
//   steerTime   seconds from straight to full lock (higher = lazier, heavier)
//   l100        fuel use at a steady cruise (litres per 100 km), tankL = tank size
// ============================================================================

export const CARS = {
  passat: {
    id: 'passat',
    name: 'Passat B5.5',
    maker: 'Volkswagen',
    engine: '1.9 TDI · 130 hp diesel',
    difficulty: 'Easy',
    blurb: 'Smooth cruiser. Steady diesel torque, predictable brakes and steering. Forgiving when you are learning.',
    color: '#4a6a8a',
    length: 4.68, width: 1.74, wheelbase: 2.7,
    massKg: 1450, powerKw: 96, topKmh: 200, engineType: 'diesel',
    traction: 2.9, brake: 8.4, maxSteer: 0.58, gripLat: 6.9, steerTime: 0.3, steerReturn: 0.22,
    tankL: 62, l100: 5.8, redline: 4500, idle: 850,
    stats: { accel: 3, top: 3, handling: 3, braking: 3, economy: 5 },
  },
  golf5: {
    id: 'golf5',
    name: 'Golf 5',
    maker: 'Volkswagen',
    engine: '1.6 FSI · 115 hp petrol',
    difficulty: 'Easy',
    blurb: 'Light and nimble hatchback. Quick turn-in and easy throttle and brake control. Very beginner friendly.',
    color: '#c8ccd2',
    length: 4.24, width: 1.76, wheelbase: 2.58,
    massKg: 1300, powerKw: 85, topKmh: 195, engineType: 'petrol',
    traction: 3.0, brake: 9.2, maxSteer: 0.62, gripLat: 7.4, steerTime: 0.24, steerReturn: 0.2,
    tankL: 55, l100: 7.0, redline: 6200, idle: 800,
    stats: { accel: 3, top: 3, handling: 4, braking: 4, economy: 4 },
  },
  x5: {
    id: 'x5',
    name: 'BMW X5',
    maker: 'BMW',
    engine: '3.0d · 218 hp diesel',
    difficulty: 'Challenging',
    blurb: 'Heavy SUV with lots of torque. It is wide, it keeps rolling, and it needs much earlier braking and turning.',
    color: '#26292e',
    length: 4.86, width: 1.93, wheelbase: 2.82,
    massKg: 2150, powerKw: 160, topKmh: 220, engineType: 'diesel',
    traction: 3.1, brake: 7.0, maxSteer: 0.52, gripLat: 6.0, steerTime: 0.42, steerReturn: 0.3,
    tankL: 93, l100: 10.8, redline: 4800, idle: 750,
    stats: { accel: 4, top: 4, handling: 1, braking: 1, economy: 1 },
  },
  civic: {
    id: 'civic',
    name: 'Honda Civic',
    maker: 'Honda',
    engine: '1.8 i-VTEC · 140 hp petrol',
    difficulty: 'Medium',
    blurb: 'Light, rev-happy compact. Sharp steering and brisk acceleration, but it only wakes up at high revs. Reward it with smooth inputs.',
    color: '#b0262b',
    length: 4.25, width: 1.75, wheelbase: 2.7,
    massKg: 1250, powerKw: 103, topKmh: 205, engineType: 'vtec',
    traction: 3.3, brake: 9.4, maxSteer: 0.64, gripLat: 7.8, steerTime: 0.2, steerReturn: 0.18,
    tankL: 50, l100: 7.5, redline: 7000, idle: 850,
    stats: { accel: 4, top: 4, handling: 5, braking: 4, economy: 3 },
  },
  octavia: {
    id: 'octavia',
    name: 'Škoda Octavia 2 vRS',
    maker: 'Škoda',
    engine: '2.0 TFSI · 200 hp turbo petrol',
    difficulty: 'Challenging',
    blurb: 'Punchy sport model. A short turbo lag, then a big shove. Firm handling, but speed builds so fast that limits and braking distances need real attention.',
    color: '#d5d8dc',
    length: 4.57, width: 1.77, wheelbase: 2.58,
    massKg: 1400, powerKw: 147, topKmh: 235, engineType: 'turbo',
    traction: 3.9, brake: 9.5, maxSteer: 0.6, gripLat: 8.2, steerTime: 0.22, steerReturn: 0.18,
    tankL: 55, l100: 9.6, redline: 6500, idle: 850,
    stats: { accel: 5, top: 5, handling: 4, braking: 4, economy: 2 },
  },
};

export const CAR_ORDER = ['golf5', 'passat', 'civic', 'octavia', 'x5'];

/** Share of full power at a given rev level (0..1); `boost` is the turbo's spool (0..1). */
export function powerCurve(type, rpmFrac, boost) {
  switch (type) {
    case 'diesel':
      return 0.78 + 0.34 * Math.sin(Math.PI * Math.min(1, rpmFrac * 1.05)) - 0.15 * Math.max(0, rpmFrac - 0.8);
    case 'petrol':
      return 0.72 + 0.32 * rpmFrac;
    case 'vtec':
      return 0.5 + 0.62 * rpmFrac * rpmFrac + (rpmFrac > 0.62 ? 0.18 : 0);
    case 'v8':
      return 1.02 - 0.1 * Math.max(0, rpmFrac - 0.85);
    case 'turbo':
      return 0.55 + 0.6 * boost;
    default:
      return 1;
  }
}

/** Speed (km/h) at which each of the 6 gears hits the rev limit. */
export function gearTopKmh(spec) {
  const f = [0.2, 0.34, 0.5, 0.67, 0.84, 1.0];
  return f.map((x) => x * Math.min(spec.topKmh, 190) * 0.78);
}
