# **High-Level Design (HLD): CookBook**

# **1\. System Architecture Overview**

The CookBook application follows a Client-Server architecture utilizing a Backend-as-a-Service (BaaS) for rapid deployment and real-time state synchronization.

- **Frontend:** Responsive Web Application (React, Angular, or Next.js) tailored with mobile-first CSS for the Resident view, and a high-contrast, grid-based layout for the Cook's interface.  
- **Backend & Database:** Supabase (PostgreSQL).  
- **Sync & State:** Supabase Realtime for WebSocket-based live updates, combined with basic local state management.  
- **Notifications:** Web Push API or lightweight third-party integration (e.g., WhatsApp/Twilio) as a fallback for reliable ping delivery.  
- **Authentication:** Google SSO only. A first-time user picks a unique username and a role; `public.profiles` stores no name, email or avatar, so nothing in the app's own tables ties a row to a real-world person. Supabase's `auth` schema still holds the Google email as GoTrue's identity key.

# **2\. Core Database Schema & Supabase Strategy**

The relational data model leverages PostgreSQL features natively within Supabase.

## **Tables**

- Users: user\_id, name, role (resident/cook)  
- Preferences: user\_id, default\_roti\_count, default\_rice\_portion  
- Meals: meal\_id, date, type (lunch/dinner), status  
- RSVPs: meal\_id, user\_id, status (in/out)  
- Inventory: item\_id, name, status (stocked/missing)

## **SQL Views**

A daily\_kitchen\_docket view joins the RSVPs, Users, and Preferences tables. This view automatically calculates exact totals (e.g., total rotis, rice portions) based solely on users marked as "In."

## **Row Level Security (RLS)**

- **Resident Role:** Read/write access to their own preferences and RSVPs.  
- **Cook Role:** Read-only access to the daily\_kitchen\_docket view; write-only access to update the Inventory table.

# **3\. High-Level Workflows**

## **A. The Meal Prep Lifecycle**

1. **Daily Trigger:** The RSVP board defaults to "In". Residents have until the cutoff time to toggle "Out".  
2. **Lock & Calculate:** A scheduled backend function locks the meal status. The database view automatically aggregates the totals.  
3. **Display:** The Cook's App (subscribed via WebSocket) fetches the locked docket, displaying only the final aggregated numbers. Last-minute changes reflect instantly without a page refresh.

## **B. The Communication & Ledger Loop**

1. **Trigger:** The cook taps "\[ Missing Ingredient \]" (e.g., "Atta").  
2. **Database Write:** The Inventory table updates the item to status \= missing.  
3. **Alert:** A database trigger fires a push notification or webhook message to the residents.  
4. **Resolution:** A resident purchases the item and checks it off. A webhook exports this expense data to external multi-currency expense-splitting applications (such as Dutch) for automatic debt settlement.

# **4\. Web-Specific Considerations**

- **Notification Delivery:** If iOS Safari Web Push is unreliable for the cook's pings, a webhook fallback to a shared messaging group (WhatsApp/Telegram) will be implemented to ensure the residents' lock screens are reached.  
- **KDS Interface Lock:** The Cook's UI will be designed to prevent accidental pull-to-refresh or back-button navigation to avoid disrupting the kitchen workflow.  
* &nbsp;

&nbsp;