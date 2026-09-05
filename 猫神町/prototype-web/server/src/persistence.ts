import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { GameStateSchema, type GameState } from "../../packages/shared/src/index.ts";

export interface GameStore {
  load(): GameState | null;
  save(state: GameState): void;
}
export class MemoryGameStore implements GameStore {
  private state: GameState | null = null;

  load(): GameState | null {
    return this.state ? structuredClone(this.state) : null;
  }

  save(state: GameState): void {
    this.state = structuredClone(state);
  }
}

export class SqliteGameStore implements GameStore {
  private readonly database: DatabaseSync;

  constructor(databasePath?: string) {
    const dataDirectory = fileURLToPath(new URL("../../.data/", import.meta.url));
    mkdirSync(dataDirectory, { recursive: true });

    this.database = new DatabaseSync(
      databasePath ?? fileURLToPath(new URL("../../.data/sunset-case-v1.sqlite", import.meta.url))
    );
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS game_save (
        slot_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  load(): GameState | null {
    const row = this.database
      .prepare("SELECT payload FROM game_save WHERE slot_id = ?")
      .get("default") as { payload?: string } | undefined;

    if (!row?.payload) return null;

    // Corrupt or incompatible saves must never be silently overwritten.
    return GameStateSchema.parse(JSON.parse(row.payload));
  }

  save(state: GameState): void {
    const validated = GameStateSchema.parse(state);
    this.database
      .prepare(`
        INSERT INTO game_save (slot_id, payload, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(slot_id) DO UPDATE SET
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `)
      .run("default", JSON.stringify(validated), new Date().toISOString());
  }

  close(): void { this.database.close(); }
}
