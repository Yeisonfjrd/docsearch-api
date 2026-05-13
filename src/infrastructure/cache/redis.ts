import Redis from "ioredis";
import { getConfig } from "../config.js";

let _client: Redis | undefined;

export function getRedisClient(): Redis {
  if (_client) return _client;

  const { REDIS_URL } = getConfig();

  _client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });

  _client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  return _client;
}

export async function disconnectRedis(): Promise<void> {
  await _client?.quit();
  _client = undefined;
}

// ─── Token Bucket Rate Limiter ────────────────────────────────────────────────

const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill tokens since last check
local elapsed = now - last_refill
local refill = elapsed * refill_rate
tokens = math.min(capacity, tokens + refill)

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 60)
  return 1
else
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 60)
  return 0
end
`;

export async function checkRateLimit(
  key: string,
  capacityPerMinute: number
): Promise<boolean> {
  const redis = getRedisClient();
  const now = Date.now() / 1000;
  const refillRate = capacityPerMinute / 60;

  const result = await redis.eval(
    RATE_LIMIT_SCRIPT,
    1,
    `rl:${key}`,
    capacityPerMinute,
    refillRate,
    now,
    1
  );

  return result === 1;
}
