// deno-lint-ignore-file
import { Opine, OpineResponse } from "https://deno.land/x/opine@2.2.0/mod.ts";
import { getCookies } from "https://deno.land/std@0.161.0/http/cookie.ts";

declare module "https://deno.land/x/opine@2.2.0/mod.ts" {
  interface OpineRequest {
    session: RouteSession;
  }
}

const storage = new Map<string, any>();

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
}

function cookieSession(
  opine: Opine,
  config: CookieSesssionOptions = {},
) {
  let { maxAge, httpOnly, secure, sameSite } = config;
  httpOnly ??= true;
  maxAge ??= 60 * 60 * 12; // 12 Hours
  secure ??= false;
  sameSite ??= "Lax";

  opine.use((req, res, next) => {
    let currentSession: any;
    let sid: string;
    const cookies = getCookies(req.headers);
    if ((sid = cookies["sid"]) && storage.has(sid)) {
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

    req.session = new RouteSession(sid, res);
    next();
  });
}

export default cookieSession;

class RouteSession {
  private sid: string;
  private data: Map<string, any>;
  private response: OpineResponse;
  constructor(sid: string, res: OpineResponse) {
    this.response = res;
    this.data = new Map();
    const cached = storage.get(sid);
    for (const key of Object.keys(cached)) {
      this.data.set(key, cached[key]);
    }
    this.sid = sid;
  }

  public get(key: string) {
    return this.data.get(key);
  }

  public has(key: string) {
    return this.data.has(key);
  }

  /**
   * Renoves a single entry from the session
   */
  public remove(key: string) {
    this.data.delete(key);
    return this;
  }

  /**
   * Returns a list of keys on this session.
   */
  public keys(): string[] {
    let keys: string[] = [];
    for (const [key, _] of Object.entries(this.data)) {
      keys.push(key);
    }

    return keys;
  }

  /**
   * Inserts or edits the current session. For changes to be reflected in
   * subsequent requests call .save() after making any modifications.
   */
  public insert(key: string, value: any) {
    this.data.set(key, value);
    return this;
  }

  /**
   * Save the values of the current session folr use later.
   */
  public save() {
    const data = this.all();
    storage.set(this.sid, data);
    return this;
  }

  /**
   * Removes all data from the session. This also calls save() in the process */
  public clear() {
    this.data.clear();
    storage.delete(this.sid);
    this.response.clearCookie("sid");
    return this;
  }

  /**
   * Gets all data from current session.
   */
  public all() {
    return Object.fromEntries(this.data.entries());
  }

  /**
   * Retrieves the sid value from the session token
   */
  public sessionID(): string {
    return this.sid;
  }
}
