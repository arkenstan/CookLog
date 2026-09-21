import type { Database } from './database.types';

type Tables = Database['public']['Tables'];

export type Profile = Tables['profiles']['Row'];
export type Household = Tables['households']['Row'];
export type Meal = Tables['meals']['Row'];
export type MenuItem = Tables['menu_items']['Row'];
export type Rsvp = Tables['rsvps']['Row'];
export type DocketRow = Database['public']['Views']['daily_kitchen_docket']['Row'];
export type UserRole = Database['public']['Enums']['user_role'];
export type RsvpStatus = Database['public']['Enums']['rsvp_status'];

/** Result of a mutating store call: `error` is null on success. */
export interface ActionResult {
  error: string | null;
  needsConfirmation?: boolean;
}
