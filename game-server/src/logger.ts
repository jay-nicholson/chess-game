type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

const emit = (level: LogLevel, message: string, payload: LogPayload = {}) => {
  const row = {
    t: new Date().toISOString(),
    level,
    message,
    ...payload,
  };
  const line = JSON.stringify(row);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
};

export const logger = {
  info: (message: string, payload?: LogPayload) => emit("info", message, payload),
  warn: (message: string, payload?: LogPayload) => emit("warn", message, payload),
  error: (message: string, payload?: LogPayload) => emit("error", message, payload),
};
