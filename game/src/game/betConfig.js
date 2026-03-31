function toInt(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBetLevels(rawLevels) {
  if (!Array.isArray(rawLevels)) return [];
  return rawLevels
    .map((level) => {
      if (typeof level === "number" || typeof level === "string") return toInt(level);
      if (level && typeof level === "object") {
        return toInt(level.value ?? level.bet ?? level.amount);
      }
      return null;
    })
    .filter((level) => Number.isInteger(level) && level > 0)
    .sort((a, b) => a - b);
}

function normalizeSideBetConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== "object") return null;
  const normalized = {
    minBet: toInt(rawConfig.minBet),
    maxBet: toInt(rawConfig.maxBet),
    stepBet: toInt(rawConfig.stepBet),
    defaultBetLevel: toInt(rawConfig.defaultBetLevel),
    betLevels: normalizeBetLevels(rawConfig.betLevels),
  };

  if (!normalized.defaultBetLevel && normalized.betLevels.length > 0) {
    normalized.defaultBetLevel = normalized.betLevels[0];
  }
  if (!normalized.defaultBetLevel && normalized.minBet) {
    normalized.defaultBetLevel = normalized.minBet;
  }

  return normalized;
}

export function normalizeStakeConfig(config = {}) {
  const normalized = {
    minBet: toInt(config.minBet),
    maxBet: toInt(config.maxBet),
    stepBet: toInt(config.stepBet),
    defaultBetLevel: toInt(config.defaultBetLevel),
    betLevels: normalizeBetLevels(config.betLevels),
    sideBets: {
      pp: normalizeSideBetConfig(config.sideBets?.pp),
      t: normalizeSideBetConfig(config.sideBets?.t),
    },
  };

  if (!normalized.defaultBetLevel && normalized.betLevels.length > 0) {
    normalized.defaultBetLevel = normalized.betLevels[0];
  }
  if (!normalized.defaultBetLevel && normalized.minBet) {
    normalized.defaultBetLevel = normalized.minBet;
  }

  return normalized;
}

export function isAllowedStakeBet(amount, config) {
  if (!Number.isInteger(amount) || amount <= 0) return false;
  if (!config) return true;

  if (config.betLevels?.length) {
    return config.betLevels.includes(amount);
  }

  if (config.minBet != null && amount < config.minBet) return false;
  if (config.maxBet != null && amount > config.maxBet) return false;

  if (config.stepBet != null && config.stepBet > 0) {
    const base = config.minBet ?? 0;
    return (amount - base) % config.stepBet === 0;
  }

  return true;
}

export function isAllowedStakeSideBet(amount, key, config) {
  if (amount === 0) return true;
  return isAllowedStakeBet(amount, config?.sideBets?.[key] ?? null);
}

export function resolveDefaultStakeBet(config, fallbackAmount) {
  if (config?.defaultBetLevel) return config.defaultBetLevel;
  if (config?.betLevels?.length) return config.betLevels[0];
  if (config?.minBet) return config.minBet;
  return fallbackAmount;
}
