import { createLogger, format, transports } from "winston";

const { combine, timestamp, colorize, printf } = format;

const lineFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp}  [${level}]  ${message}`;
});

export const logger = createLogger({
  level: "info",
  format: combine(colorize({ all: true }), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), lineFormat),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: "agent.log",
      format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), lineFormat),
    }),
  ],
});
