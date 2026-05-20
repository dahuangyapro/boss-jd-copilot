export type MessageType =
  | "DEBUG_LOG"
  | "GENERATE_GREETING"
  | "GET_CACHED_GREETING"

export type ExtensionMessage =
  | { type: "DEBUG_LOG"; payload: unknown }
  | { type: "GENERATE_GREETING"; jobKey: string }
  | { type: "GET_CACHED_GREETING"; jobKey: string }
