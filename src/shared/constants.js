// World/player constants. Both v1a and (eventually) v1b's JS port read
// from here so balance changes hit one place.

export const WORLD_W = 3000;
export const WORLD_H = 3000;
export const PLAYER_SPEED = 150;
export const PLAYER_RADIUS = 14;
export const PLAYER_MAX_HP = 100;

export const XP_RADIUS = 6;
export const XP_MAGNET_RANGE = 80;
export const XP_MAGNET_SPEED = 400;

// XP level-up curve — one source of truth for SP, MP, and prestige
// headstart calculation. Changing either value here propagates to all
// three sites (gems.js live level-up, main.js headstart, server.mjs
// headstart) automatically.
export const XP_START = 45;        // xpToLevel at level 1
export const XP_LEVEL_SCALE = 1.22; // geometric multiplier applied each level-up
