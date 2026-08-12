export const NUMERIC_EXIT_TRIGGER_TYPES = new Set([
  'weight',
  'time',
  'pressure',
  'flow',
  'piston_position',
  'power',
]);

export const STRICT_GREATER_THAN = '>';

export function comparisonForDecentCondition(condition) {
  return condition === 'over' ? STRICT_GREATER_THAN : '<=';
}

export function exitTriggersForDecentStep(step) {
  const exitTriggers = [];

  if (step.seconds != 127) {
    exitTriggers.push({
      type: 'time',
      value: parseFloat(step.seconds),
      relative: true,
      comparison: STRICT_GREATER_THAN,
    });
  }

  if (step.exit) {
    exitTriggers.push({
      type: step.exit.type,
      value: parseFloat(step.exit.value),
      relative: false,
      comparison: comparisonForDecentCondition(step.exit.condition),
    });
  }

  return exitTriggers;
}

export function migrateProfileComparisons(profile) {
  if (!profile || !Array.isArray(profile.stages)) {
    return { profile, changed: false };
  }

  let changed = false;
  const stages = profile.stages.map((stage) => {
    if (!stage || !Array.isArray(stage.exit_triggers)) {
      return stage;
    }

    let stageChanged = false;
    const exitTriggers = stage.exit_triggers.map((trigger) => {
      if (
        !trigger ||
        !NUMERIC_EXIT_TRIGGER_TYPES.has(trigger.type) ||
        (trigger.comparison !== '>=' && trigger.comparison !== undefined)
      ) {
        return trigger;
      }

      stageChanged = true;
      return { ...trigger, comparison: STRICT_GREATER_THAN };
    });

    if (!stageChanged) {
      return stage;
    }

    changed = true;
    return { ...stage, exit_triggers: exitTriggers };
  });

  return {
    profile: changed ? { ...profile, stages } : profile,
    changed,
  };
}

export function canonicalizeProfileComparisons(profile) {
  return migrateProfileComparisons(profile).profile;
}
