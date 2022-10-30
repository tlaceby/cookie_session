import {
  ConnectOptions,
  MongoClient,
} from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { StoreAdapter } from "./session_store.ts";

async function mongoSessionStore(
  config: ConnectOptions | string,
): Promise<StoreAdapter> {
  const client = new MongoClient();
  await client.connect(config);
  const db = client.database("cookie_auth_sessions_store");
  const sessions = db.collection("sessions");

  const has = async (session_id: string): Promise<boolean> => {
    const exists = (await sessions.findOne({ session_id }) != undefined)
      ? true
      : false;
    return exists;
  };

  const set = async (session_id: string, data: any) => {
    throw "";
  };

  const get = async (session_id: string) => {
    throw "";
  };

  const remove = async (session_id: string): Promise<boolean> => {
    throw "";
  };

  return { has, set, get, remove };
}

export default mongoSessionStore;
