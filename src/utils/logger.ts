type LogFields = Record<string, unknown>;

function removeUndefinedFields(fields: LogFields) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
}

function writeLog(
  level: "info" | "warn" | "error",
  message: string,
  fields: LogFields = {}
) {
  const payload = removeUndefinedFields({
    time: new Date().toISOString(),
    level,
    ...fields
  });

  console[level](message, payload);
}

export const logger = {
  info(message: string, fields?: LogFields) {
    writeLog("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    writeLog("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    writeLog("error", message, fields);
  }
};

export function errorToLogFields(error: unknown): LogFields {
  if (!(error instanceof Error)) {
    return {
      error
    };
  }

  const errorRecord = error as Error & Record<string, unknown>;
  const data =
    typeof errorRecord.data === "object" && errorRecord.data !== null
      ? (errorRecord.data as Record<string, unknown>)
      : undefined;

  return removeUndefinedFields({
    errorName: error.name,
    errorMessage: error.message,
    errorCode: errorRecord.code,
    statusCode: errorRecord.statusCode ?? data?.statusCode,
    httpCode: errorRecord.httpCode ?? data?.httpCode,
    requestId: errorRecord.requestId ?? data?.requestId
  });
}
