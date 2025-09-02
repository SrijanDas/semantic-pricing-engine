import { Database as DB } from "./database.types";

export type Material = DB["public"]["Tables"]["materials"]["Row"];
export type Quote = DB["public"]["Tables"]["quotes"]["Row"];
export type Feedback = DB["public"]["Tables"]["feedback"]["Row"];
