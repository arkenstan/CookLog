import type { Database } from './database.types';

type Tables = Database['public']['Tables'];
type Views = Database['public']['Views'];

export type Profile = Tables['profiles']['Row'];
export type Household = Tables['households']['Row'];
export type Meal = Tables['meals']['Row'];
export type Rsvp = Tables['rsvps']['Row'];
export type Item = Tables['items']['Row'];
export type Regular = Tables['regulars']['Row'];
export type EventEntry = Tables['event_entries']['Row'];
/** A row of the shared pantry ledger (the household grocery list). */
export type GroceryItem = Tables['inventory']['Row'];
export type DocketRow = Views['daily_kitchen_docket']['Row'];
export type DocketItem = Views['docket_items']['Row'];

export type UserRole = Database['public']['Enums']['user_role'];
export type MealType = Database['public']['Enums']['meal_type'];
export type RsvpStatus = Database['public']['Enums']['rsvp_status'];
export type ItemKind = Database['public']['Enums']['item_kind'];
export type StockStatus = Database['public']['Enums']['stock_status'];

/** Result of a mutating store call: `error` is null on success. */
export interface ActionResult {
  error: string | null;
  needsConfirmation?: boolean;
  /** Set by calls that create a row (e.g. a new meal event). */
  id?: string;
}
