import { units } from '/sc/index.js';

// Effects
export const effects = {
  damageIndicators: [],
  destructionEffects: [],
  gatheringEffects: [],
  buildEffects: [],
  selectionEffects: [],
  clickEffects: []
};

export function showDamageIndicator(unitId, damage) {
  const unit = units.get(unitId);
  if (unit) {
    effects.damageIndicators.push({
      x: unit.x,
      y: unit.y - 30,
      text: `-${damage}`,
      color: '#e74c3c',
      lifetime: 1000,
      startTime: Date.now(),
      velocityY: -0.05
    });
  }
}

export function showDestructionEffect(x, y) {
  effects.destructionEffects.push({
    x,
    y,
    radius: 5,
    maxRadius: 30,
    color: '#e74c3c',
    lifetime: 500,
    startTime: Date.now()
  });
}

export function showGatheringEffect(x, y, playerId) {
  const color = playerId === 1 ? '#3498db' : '#e74c3c';
  for (let i = 0; i < 5; i++) {
    effects.gatheringEffects.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      color,
      lifetime: 800,
      startTime: Date.now()
    });
  }
}

export function showGatheringParticles(x, y, owner) {
  const color = owner === 1 ? '#3498db' : '#e74c3c';
  for (let i = 0; i < 3; i++) {
    effects.gatheringEffects.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      color,
      lifetime: 400,
      startTime: Date.now()
    });
  }
}

export function showBuildEffect(x, y) {
  effects.buildEffects.push({
    x,
    y,
    radius: 10,
    maxRadius: 50,
    color: '#f1c40f',
    lifetime: 1000,
    startTime: Date.now()
  });
}

export function showCompletionEffect(x, y) {
  effects.buildEffects.push({
    x,
    y,
    radius: 20,
    maxRadius: 100,
    color: '#2ecc71',
    lifetime: 800,
    startTime: Date.now()
  });
}

export function showSelectionEffect(x, y, owner) {
  const color = owner === 1 ? '#3498db' : '#e74c3c';
  effects.selectionEffects.push({
    x,
    y,
    radius: 15,
    maxRadius: 25,
    color,
    lifetime: 300,
    startTime: Date.now()
  });
}

export function showClickEffect(x, y, color = '#f1c40f') {
  effects.clickEffects.push({
    x,
    y,
    radius: 5,
    maxRadius: 20,
    color,
    lifetime: 300,
    startTime: Date.now()
  });
}

export function updateEffects(deltaTime) {
  const now = Date.now();
  
  ['damageIndicators', 'destructionEffects', 'gatheringEffects', 'buildEffects', 'selectionEffects', 'clickEffects'].forEach(effectType => {
    effects[effectType] = effects[effectType].filter(effect => {
      effect.lifetime -= deltaTime;
      
      if (effectType === 'damageIndicators') {
        effect.y += effect.velocityY * deltaTime;
        effect.x += (Math.random() - 0.5) * 0.02 * deltaTime;
      } else if (effectType === 'destructionEffects' || effectType === 'buildEffects' || effectType === 'clickEffects') {
        const progress = 1 - (effect.lifetime / (effect.lifetime + deltaTime));
        if (effectType === 'destructionEffects') {
          effect.radius = effect.maxRadius * progress;
        } else if (effectType === 'buildEffects') {
          effect.radius = effect.maxRadius * (1 - progress);
        } else if (effectType === 'clickEffects') {
          effect.radius = effect.maxRadius * progress;
        }
      } else if (effectType === 'selectionEffects') {
        const progress = effect.lifetime / (effect.lifetime + deltaTime);
        effect.radius = effect.maxRadius * progress;
      }
      
      return effect.lifetime > 0;
    });
  });
}

export function getStateColor(state) {
  switch(state) {
    case 'attacking': return '#e74c3c';
    case 'gathering': return '#f1c40f';
    case 'building': return '#3498db';
    case 'returning_resources': return '#2ecc71';
    case 'moving_to_gather': return '#f39c12';
    case 'moving_to_build': return '#9b59b6';
    default: return '#fff';
  }
}