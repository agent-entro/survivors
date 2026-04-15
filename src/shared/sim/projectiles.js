// Projectile movement, range cleanup, enemy collision, and obstacle
// blocking. Pure sim; damage routes through damage.js + events.
import { damageEnemy } from './damage.js';
import { applyStatus } from './enemies.js';
import { circleRectCollision, buildSpatialHash, HASH_CELL, HASH_KEY_STRIDE } from './collision.js';
import { PROJECTILE_BLOCKERS } from '../maps.js';

export function updateProjectiles(g, dt) {
  const obstacles = g.obstacles;
  // Build enemy hash once per tick — reduces bullet×enemy checks from
  // O(shots×n) to O(shots×k) where k is enemies in 9 nearby cells.
  // damageEnemy only sets e.dying (no splice), so the hash stays valid
  // for the entire projectile pass.
  const enemyHash = buildSpatialHash(g.enemies);

  for (let i = g.projectiles.length - 1; i >= 0; i--) {
    const proj = g.projectiles[i];
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.dist += proj.speed * dt;

    if (proj.dist > proj.range) {
      g.projectiles.splice(i, 1);
      continue;
    }

    // Wall / pillar / tomb absorb projectiles. Trees pass through.
    let blocked = false;
    if (obstacles && obstacles.length > 0) {
      for (const obs of obstacles) {
        if (!PROJECTILE_BLOCKERS.has(obs.type)) continue;
        if (circleRectCollision(proj.x, proj.y, proj.radius, obs.x, obs.y, obs.w, obs.h)) {
          blocked = true;
          break;
        }
      }
    }
    if (blocked) {
      g.projectiles.splice(i, 1);
      continue;
    }

    // Look up owner once per projectile, not per enemy collision.
    const owner = g.players.find(p => p.id === proj.owner);
    const dmg = proj.damage * (owner ? owner.damageMulti : 1);

    // Query only the 9 cells surrounding this projectile's position.
    // Skip enemies this projectile has already hit — otherwise a
    // fast projectile burns one pierce per frame while overlapping
    // a single big enemy (tank/boss), so pierce never actually
    // reaches enemies behind the first target. Reported by
    // barronn85 in #playtest. proj.hit is allocated lazily — most
    // projectiles never need it (pierce 1 dies on first contact).
    const cx = Math.floor(proj.x / HASH_CELL);
    const cy = Math.floor(proj.y / HASH_CELL);
    outer: for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const bucket = enemyHash.get((cx + dx) * HASH_KEY_STRIDE + (cy + dy));
        if (!bucket) continue;
        for (const e of bucket) {
          if (proj.hit && proj.hit.has(e)) continue;
          const edx = proj.x - e.x;
          const edy = proj.y - e.y;
          if (edx * edx + edy * edy < (proj.radius + e.radius) ** 2) {
            damageEnemy(g, e, dmg, proj.owner);
            if (proj.statusOnHit) applyStatus(g, e, proj.statusOnHit);
            proj.pierce--;
            if (proj.pierce <= 0) {
              g.projectiles.splice(i, 1);
              break outer; // projectile consumed — exit all cell loops
            }
            if (!proj.hit) proj.hit = new Set();
            proj.hit.add(e);
          }
        }
      }
    }
  }
}
