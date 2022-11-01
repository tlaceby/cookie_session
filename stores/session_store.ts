export * from "./mongoStore.ts";

export interface StoreAdapter {
  has(session_id: string): Promise<boolean>;
  set(session_id: string, data: any): Promise<void>;
  get(session_id: string): Promise<any>;
  remove(session_id: string): Promise<boolean>;
  eraseAll(): Promise<void>;
}

export default class MemorySessionStore implements StoreAdapter {
  private storage = new Map<string, any>();

  async has(session_id: string) {
    return this.storage.has(session_id);
  }

  async set(session_id: string, data: any) {
    this.storage.set(session_id, data);
  }

  async get(session_id: string) {
    return this.storage.get(session_id);
  }

  async remove(session_id: string) {
    return this.storage.delete(session_id);
  }

  async eraseAll(): Promise<void> {
    this.storage.clear();
  }
}
