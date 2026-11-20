// ============================================================================
//  config.js  —  ALL THE "KNOBS" OF THE GAME IN ONE PLACE
//  Change a number here and the game feels different. Nothing else to touch.
//  Units: meters (m), seconds (s), km/h where the name says so.
// ============================================================================

export const CONFIG = {
  // ---- The car ------------------------------------------------------------
  car: {
    length: 4.2,
    width: 1.9,
    wheelbase: 2.7,

    maxSpeedKmh: 80, // top speed
    accel: 3.4, // how strongly the car accelerates (m/s²)
    throttleRise: 3.5, // how fast the gas pedal "builds up" (per second)
    throttleFall: 7, // how fast it falls when you let go

    brake: 9.0, // strongest braking (m/s²)
    brakeStart: 0.3, // first touch of the brake = 30% of full power ...
    brakeBuildTime: 0.8, // ... and it grows to 100% after this many seconds
    engineBrake: 1.2, // slowing down by itself when you let go of the gas
    rolling: 0.25, // constant rolling resistance
    drag: 0.0006, // air resistance (grows with speed)

    reverseAccel: 2.2, // reverse gear power
    maxReverseKmh: 15,
    reverseDelay: 0.35, // hold brake this long at a standstill to start reversing

    maxSteer: 0.62, // maximum wheel angle at a standstill (radians)
    gripLat: 7.0, // how hard the tyres grip in corners (m/s²) — lower = wider turns at speed
    steerTime: 0.45, // seconds from straight to full lock (turning "inertia")
    steerReturnTime: 0.28, // seconds for the wheel to come back to straight
  },

  // ---- Bumping into the road edge (curb) -----------------------------------
  collision: {
    margin: 0.25, // how far the wheels may touch the curb before being pushed back
    speedLoss: 0.5, // 0 = no slowdown on a head-on bump, 1 = full stop
    align: 7, // how fast the car turns to slide along the wall
    scrape: 0.9, // extra slowdown while scraping the wall (per second)
  },

  // ---- World / signs --------------------------------------------------------
  world: {
    laneOffset: 2.0, // where the car starts: metres right of the road centre
    signOffset: 7.4, // signs stand this far from the road centre
    signRadius: 2.3, // drawn size of a sign (bigger than real, to read on a phone)
    signActiveRange: 26, // a sign "wakes up" (highlight + card) at this distance
  },

  // ---- Camera ---------------------------------------------------------------
  camera: {
    portraitMeters: 64, // how many metres fit on screen height (portrait phone)
    landscapeMeters: 40, // same, landscape phone
    zoomOutAtTopSpeed: 0.22, // zoom out by this fraction at top speed
    lookAhead: 0.55, // camera looks ahead of the car by speed * this
    maxLookAhead: 11,
    follow: 6, // camera smoothing (higher = stiffer)
    rotateFollow: 4.5, // smoothing of the rotation
    anchorYPortrait: 0.46, // where the camera point sits on screen (0 top ... 1 bottom);
    anchorYLandscape: 0.52, // the car appears a bit lower because the camera looks ahead
  },

  // ---- Test / Challenge mode rules -------------------------------------------
  test: {
    pointsPerSign: 10,
    stopMaxKmh: 3, // at a STOP you must be slower than this
    speedTolerance: 2, // km/h of forgiveness over a speed limit
    speedGraceSec: 3, // time you get to slow down after a new speed sign
    speedFailSec: 1.5, // how long you may be over the limit before it counts
    noStopKmh: 2, // "stopped" means slower than this
    noStopFailSec: 1.5, // how long you may stand still where stopping is banned
    overtakeMargin: 1.0, // metres past the slow car that count as "overtaken"
  },

  // ---- Other cars on the road (Test mode only) ---------------------------------
  traffic: {
    laneOffset: 2.0,
    afterZoneKmh: 45, // the slow car speeds up once the no-overtaking zone ends
    accel: 1.5,
  },

  // ---- Fuel (the real consumption is multiplied so you notice it in a short game) ----
  fuel: {
    scale: 40,
    startFraction: 0.6, // tank at the start of a level
    lowFraction: 0.15, // low-fuel warning
    pricePerLitre: 7.6, // RON
  },

  // ---- Exam penalty points (DRPCIV style: 21 or more = failed) -------------------------
  //  Figures follow what driving-school guides describe; check the official scale.
  exam: {
    failAt: 21,
    penalty: { stop: 21, slow: 5, speed: 5, noOvertake: 21, noStop: 5, zones: 8, roundabout: 8, quiz: 2, signal: 3, crosswalk: 21, yield: 21, lights: 3, hazard: 2, curb: 1, fuel: 5, pedHit: 21, pickup: 8, stationSpeed: 3, refuel: 5, lane: 3, hazardStop: 5 },
  },

  car2: { capKmh: 140, driveEff: 0.6 }, // game speed limit and how much engine power reaches the road

  // ---- Final Boss story text (change the name here) ----------------------------------------
  story: { passenger: 'Alisia' },

  fixedStep: 1 / 120, // physics step (seconds)
};
