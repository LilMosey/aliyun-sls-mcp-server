function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function buildDefaultEndpoint(region: string) {
  return `${region}.log.aliyuncs.com`;
}

function readPositiveIntegerEnv(name: string, defaultValue: number) {
  const value = process.env[name];
  if (!value) {
    return defaultValue;
  }

  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return numberValue;
}

export function readAliyunLogConfig() {
  const region = readRequiredEnv("ALIYUN_LOG_REGION");

  return {
    accessKeyId: readRequiredEnv("ALIYUN_LOG_ACCESS_KEY_ID"),
    accessKeySecret: readRequiredEnv("ALIYUN_LOG_ACCESS_KEY_SECRET"),
    region,
    endpoint: process.env.ALIYUN_LOG_ENDPOINT ?? buildDefaultEndpoint(region)
  };
}

export function readAliyunLogQueryConfig() {
  const maxPageSize = readPositiveIntegerEnv("ALIYUN_LOG_MAX_PAGE_SIZE", 100);

  if (maxPageSize > 100) {
    throw new Error("ALIYUN_LOG_MAX_PAGE_SIZE cannot be greater than 100.");
  }

  return {
    defaultQueryMinutes: readPositiveIntegerEnv(
      "ALIYUN_LOG_DEFAULT_QUERY_MINUTES",
      15
    ),
    maxQueryMinutes: readPositiveIntegerEnv("ALIYUN_LOG_MAX_QUERY_MINUTES", 30),
    emptyQueryMaxMinutes: readPositiveIntegerEnv(
      "ALIYUN_LOG_EMPTY_QUERY_MAX_MINUTES",
      5
    ),
    defaultPageSize: readPositiveIntegerEnv(
      "ALIYUN_LOG_DEFAULT_PAGE_SIZE",
      50
    ),
    maxPageSize
  };
}
