// deno-lint-ignore-file
import { Opine, OpineResponse } from "https://deno.land/x/opine@2.2.0/mod.ts";
import { getCookies } from "https://deno.land/std@0.161.0/http/cookie.ts";
import MemorySessionStore, { StoreAdapter } from "./stores/session_store.ts";

declare module "https://deno.land/x/opine@2.2.0/mod.ts" {
  interface OpineRequest {
    session: RouteSession;
  }
}

let storage: StoreAdapter;

export type SameSitePolicy = "None" | "Lax" | "Strict";

export interface CookieSesssionOptions {
  // Defaults to: 60 * 60 * 12 -> Half Day
  maxAge?: number;
  // Defaults to: false
  httpOnly?: boolean;
  // Defaults to true
  secure?: boolean;
  // Defaults to "None"
  sameSite?: SameSitePolicy;
  // Defaults to in memory storage
  store?: StoreAdapter;
}

function cookieSession(
  opine: Opine,
  config: CookieSesssionOptions = {},
) {
  let { store } = config;
  const httpOnly = config.httpOnly || false;
  const maxAge = config.maxAge || 60 * 60 * 12;
  const secure = config.secure || false;
  const sameSite = config.sameSite || "Lax";
  storage = store || new MemorySessionStore();

  opine.use(async (req, res, next) => {
    let currentSession: any;
    let sid: string;
    const cookies = getCookies(req.headers);
    if ((sid = cookies["sid"]) && await storage.has(sid)) {
      sid = cookies["sid"];
    } else {
      sid = crypto.randomUUID();
      currentSession = {};
      storage.set(sid, currentSession);

      res.cookie({
        secure,
        httpOnly,
        name: "sid",
        value: sid,
        sameSite,
        maxAge,
      });
    }

    req.session = await routeSession(sid, res);
    next();
  });
}

export default cookieSession;

interface RouteSession {
  get: (key: string) => any;
  has: (key: string) => boolean;
  remove: (key: string) => void;
  keys: () => string[];
  insert: (key: string, value: any) => void;
  all: () => any;
  save: () => Promise<void>;
  clear: () => Promise<void>;
  sessionID: () => string;
}

async function routeSession(sid: string, res: OpineResponse) {
  const response = res;
  const data = new Map();

  const cached = await storage.get(sid);
  for (const key of Object.keys(cached)) {
    data.set(key, cached[key]);
  }

  const get = (key: string) => {
    return data.get(key);
  };

  const has = (key: string) => {
    return data.has(key);
  };

  const remove = (key: string) => {
    data.delete(key);
  };

  const keys = (): string[] => {
    let keys: string[] = [];
    for (const [key, _] of Object.entries(data)) {
      keys.push(key);
    }

    return keys;
  };

  /**
   * Inserts or edits the current session. For changes to be reflected in
   * subsequent requests call .save() after making any modifications.
   */
  const insert = (key: string, value: any) => {
    data.set(key, value);
  };

  /**
   * Gets all data from current session.
   */
  const all = () => {
    return Object.fromEntries(data.entries());
  };

  /**
   * Save the values of the current session folr use later.
   */
  const save = async () => {
    const data = all();
    await storage.set(sid, data);
  };

  /**
   * Removes all data from the session. This also calls save() in the process */
  const clear = async () => {
    data.clear();
    await storage.remove(sid);
    response.clearCookie("sid");
  };

  /**
   * Retrieves the sid value from the session token
   */
  const sessionID = () => {
    return sid;
  };

  return { get, has, remove, keys, insert, all, save, clear, sessionID };
}
