// ============================================================================
//  map.js  —  THE TRAINING TRACK (roads, junctions, where every sign stands)
//
//  Coordinates are in METRES. x grows to the right, y grows DOWN the screen.
//  Angles are in degrees: 0 = east, 90 = south, 180 = west, 270 (or -90) = north.
//
//  The TEST ROUTE is a one-lap path made of named pieces (`route.segments`).
//  Signs are placed by saying  at: ['piece-name', metres-from-the-start-of-that-piece]
//  so you can reshape the road without recomputing sign positions.
//
//  Map picture (not to scale), the route goes clockwise:
//
//        ┌──────── top1 ──[T1]── top1 ───────┐
//        │            ▲ street               │
//     top2          START                  right
//        │      stub L ─┘   ┌─ ring ─┐  └─ stub R
//        └─── bottom2 ─────(  )──── bottom1 ──┘
// ============================================================================

export const MAP = {
  roadWidth: 8, // two lanes of 4 m

  // ---- the route (open path: START ... FINISH) --------------------------------
  route: {
    start: [220, 170],
    segments: [
      // A minor street heading north up to the main road (a STOP sign waits there)
      { id: 'street', type: 'line', to: [220, 8] },
      { id: 'fillet', type: 'arc', center: [228, 8], radius: 8, from: 180, to: 270 },
      // Main road, clockwise lap
      { id: 'top1', type: 'line', to: [404, 0] },
      { id: 'tr', type: 'arc', center: [404, 36], radius: 36, from: 270, to: 360 },
      { id: 'right', type: 'line', to: [440, 224] },
      { id: 'br', type: 'arc', center: [404, 224], radius: 36, from: 0, to: 90 },
      { id: 'bottom1', type: 'line', to: [240, 260] },
      // Half way round the roundabout (counter-clockwise = angle goes DOWN)
      { id: 'ring', type: 'arc', center: [220, 260], radius: 20, from: 0, to: -180 },
      { id: 'bottom2', type: 'line', to: [36, 260] },
      { id: 'bl', type: 'arc', center: [36, 224], radius: 36, from: 90, to: 180 },
      { id: 'left', type: 'line', to: [0, 36] },
      { id: 'tl', type: 'arc', center: [36, 36], radius: 36, from: 180, to: 270 },
      { id: 'top2', type: 'line', to: [200, 0] }, // <- FINISH LINE at the end of this piece
    ],
  },

  // ---- other roads you can drive in free roam (not part of the test route) -----
  extraRoads: [
    { id: 'top-link', points: [[200, 0], [228, 0]], lane: true }, // top road through the junction
    { id: 'street-south', points: [[220, 170], [220, 240]], lane: true }, // down to the roundabout
    { id: 'south-stub', points: [[220, 280], [220, 322]] }, // 4th arm of the roundabout
    { id: 'stub-left', points: [[0, 130], [110, 130]] }, // side street ("No entry")
    { id: 'stub-right', points: [[440, 130], [330, 130]] }, // side street
  ],

  rings: [{ cx: 220, cy: 260, r: 20 }], // roundabout (grass island inside)

  // ---- the signs ---------------------------------------------------------------
  //  sign:  key from signs.js
  //  at:    [route piece, metres from the start of that piece]
  //  side:  'right' (default) or 'left' of the direction of travel
  //  zones: (only for "zones" rules) world spots {x, y, r}:  pass = must go there,
  //         fail = must NOT go there
  //  until: (roundabout) where the rule stops
  //  test:  override the default rule numbers from signs.js, e.g. { maxKmh: 20 }
  signs: [
    // --- junction with the main road: turn right, after a full stop ---
    { sign: 'turnRight', at: ['street', 128], zones: { pass: { x: 252, y: 0, r: 9 }, fail: { x: 188, y: 0, r: 9 } } },
    { sign: 'stop', at: ['street', 152] },

    // --- top road ---
    { sign: 'priorityRoad', at: ['top1', 22] },
    { sign: 'speed50', at: ['top1', 62] },
    { sign: 'pedestrian', at: ['top1', 96] },
    { sign: 'curveRight', at: ['top1', 140] },

    // --- right road (school zone) ---
    { sign: 'children', at: ['right', 10] },
    { sign: 'speed30', at: ['right', 48] },

    // --- bottom road, towards the roundabout ---
    { sign: 'speed50', at: ['bottom1', 8] },
    { sign: 'noOvertaking', at: ['bottom1', 22] },
    { sign: 'endNoOvertaking', at: ['bottom1', 104] },
    { sign: 'roundabout', at: ['bottom1', 120], until: ['ring', 62.8] },
    { sign: 'giveWay', at: ['bottom1', 140] },

    // --- after the roundabout ---
    { sign: 'parking', at: ['bottom2', 40] },
    { sign: 'noStopping', at: ['bottom2', 80] },

    // --- left road ---
    { sign: 'oneWay', at: ['left', 24] },
    { sign: 'noEntry', at: ['left', 84], zones: { fail: { x: 18, y: 130, r: 8 } } },
  ],

  // ---- slow cars (Test mode only) ------------------------------------------------
  //  The car appears far ahead (out of sight) when you are `spawnBefore` metres behind it.
  traffic: [
    { id: 'slowcar', at: ['bottom1', 34], kmh: 14, spawnBefore: 70, color: '#2b6fd6' },
  ],
};
