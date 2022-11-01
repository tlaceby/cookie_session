import { cyan, red, yellow } from "https://deno.land/std@0.154.0/fmt/colors.ts";
import {
  ConnectOptions,
  MongoClient,
} from "https://deno.land/x/mongo@v0.31.1/mod.ts";
import { StoreAdapter } from "./session_store.ts";

export interface MongoCookieSessionOptions {
  // If this is not passed in then mongoSession will create a new table called
  // `cookie_auth_sessions_store` and a collection called `sessions` to use a storage.
  // However if you pass in a custom database and collection name it will be used instead.
  database?: {
    database: string;
    collection: string;
  };

  // Will show some basic logs in stdout
  debug?: boolean;
}

async function mongoSessionStore(
  config: ConnectOptions | string,
  options: MongoCookieSessionOptions = {},
): Promise<StoreAdapter> {
  const client = new MongoClient();
  await client.connect(config || "mongodb://127.0.0.1:27017");

  const debug = options.debug || false;
  const collection_name = options.database?.collection || "sessions";
  const database_name = options.database?.database ||
    "cookie_auth_sessions_store";

  const db = client.database(database_name);
  const sessions = db.collection(collection_name);

  if (debug) {
    console.log(`[${cyan(`MongoDB`)}: session_ready]`);
  }

  // Checks the store for a valid sessionID
  const has = async (sid: string) => {
    try {
      const data = await sessions.findOne({ sid });
      return (data !== undefined);
    } catch (err) {
      return false;
    }
  };

  // Given a session ID will return the collection containing it
  const get = async (sid: string) => {
    return await sessions.findOne({ sid }) as any;
  };

  // Updates a session by a sessionID. If one is not provided will create the new document
  const set = async (sid: string, data: any) => {
    if (await has(sid)) {
      await sessions
        .updateOne(
          { sid },
          { $set: data },
        );
    } else sessions.insertOne(data);
  };

  // Remove session reference from the collection
  const remove = async (sid: string): Promise<boolean> => {
    return await sessions.deleteOne({ sid }) == 1;
  };

  // Remove all values from the collection.
  const eraseAll = async () => {
    if (debug) {
      console.log(`[${yellow(`MongoDB`)}: clear_sessions]`);
    }
    await sessions.deleteMany({});
  };

  return { has, set, get, remove, eraseAll };
}

export default mongoSessionStore;
