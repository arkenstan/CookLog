# **Product Requirements Document (PRD): CookBook**

# **1\. Executive Summary**

**CookBook** is a household management and kitchen display application designed to streamline meal coordination between shared-living residents and their daily domestic cooks. By automating portion calculations based on real-time RSVPs and providing a zero-typing communication interface for the cook, the application eliminates scheduling conflicts, reduces food waste, and minimizes daily friction over menu selection.

# **2\. Problem Statement**

In a multi-tenant household (e.g., a 3-bedroom apartment with 3 residents) employing a cook who visits twice daily, several operational bottlenecks occur:

&nbsp;

* **Portion Inaccuracy:** Daily fluctuations in resident schedules mean the cook often prepares food for 3 people when only 2 are present, leading to waste.  
* **Variable Baselines:** Each resident consumes different baseline quantities (e.g., Resident A eats 4 rotis, Resident B eats 2). Communicating these exact permutations daily is tedious.  
* **Menu Friction:** Deciding what to cook involves endless back-and-forth messaging, often resulting in delayed cooking or missing ingredients.  
* **Communication Barrier:** Cooks often call residents during work hours for minor clarifications (e.g., missing ingredients, delayed arrival).

# **3\. User Personas**

* **The Resident (Roommate):** Busy professional who wants to lock in their meal preference (In/Out) with a single tap and avoid negotiating the daily menu over text.  
* **The Cook:** Needs clear, aggregated instructions upon arrival. Requires a frictionless, non-text-heavy way to communicate status (arriving, missing items, food ready) to the household.

# **4\. Feature Specifications**

## **Module 1: The Resident Application**

* **Profile & Baseline Preferences:**  
  * Users define their standard meal consumption metrics (e.g., standard roti count, rice portion size, dietary restrictions).  
* **The Daily RSVP Engine:**  
  * A central toggle board for "Today's Lunch" and "Today's Dinner."  
  * **Rule:** Auto-defaults to "In."  
  * **Rule:** RSVPs lock at a predefined cutoff time (e.g., 9:00 AM for Lunch, 4:00 PM for Dinner).  
* **Menu Consensus System:**  
  * **Rotating Dictator:** The app automatically assigns menu-selection duty to one resident per day on a rotating schedule.  
  * **Menu Bank:** Residents select from a pre-populated list of recipes the cook knows how to make.  
* **Shared Pantry Ledger:**  
  * A real-time grocery checklist. When the cook marks an ingredient as missing, it auto-populates here.

## **Module 2: The Cook's Interface (KDS Mode)**

* **Aggregated Daily Docket:**  
  * A high-contrast, visually driven interface displaying the exact output required for the shift.  
  * *Example Output:* "Dinner: 2 People. 6 Rotis Total. 1 Bowl Rice. Dal Tadka." (Calculated dynamically based on active RSVPs and their baseline profiles).  
* **One-Tap Action Grid:**  
  * Large, iconography-driven buttons for status updates:  
    * \[ Arriving in 15 Min \]  
    * \[ Missing Ingredient \] \-\> Opens a visual grid of common items (Oil, Atta, Salt, Milk).  
    * \[ Food is Ready \]  
* **Exception Handling (Menu Fallback):**  
  * If the requested menu is not possible, the cook taps \[ Cannot Make \]. This sends an immediate push notification to the residents requesting a fallback option.

# **5\. Proposed Data Model**

To efficiently handle the aggregation logic, the core entity relationships should be structured as follows:

&nbsp;

| Entity | Attributes |
| :---- | :---- |
| **Users** | user\_id, name, role (resident/cook), device\_token |
| **Preferences** | user\_id, default\_roti\_count, default\_rice\_portion, allergies |
| **Meals** | meal\_id, date, type (lunch/dinner), menu\_item\_id, status (pending/locked/cooked) |
| **RSVPs** | meal\_id, user\_id, status (in/out) |
| **Inventory** | item\_id, name, status (stocked/missing) |

&nbsp;

*Aggregation Logic Example:*  
`SELECT SUM(Preferences.default_roti_count) FROM Users JOIN RSVPs WHERE RSVPs.meal_id = current_meal AND RSVPs.status = 'in'`

# **6\. Technical Stack Recommendations**

To ensure rapid deployment and real-time state synchronization, the following architecture is recommended:

&nbsp;

* **Frontend:** React Native with Expo. This allows for a single codebase to deploy cross-platform for residents (iOS/Android) while offering a highly responsive, app-like web or Android APK experience for the cook's device.  
* **Backend/Database:** Firebase or Supabase. The real-time listener capabilities are critical here; if a resident changes their RSVP at the last minute, the cook's dashboard must update instantly without requiring a manual page refresh.  
* **Push Notifications:** Firebase Cloud Messaging (FCM) to handle the 1-tap pings from the cook to the residents' locked screens.

# **7\. Future Expansions & Integrations**

* **Expense Management Hook:** Missing ingredients from the Shared Pantry Ledger that are purchased by a resident can trigger a webhook. This data can be exported directly into multi-currency expense-splitting applications like Dutch or Splitwise to automatically settle grocery debts among the residents.  
* **Localization:** Providing the Cook's Interface with localized language toggles (e.g., Hindi, Kannada, Tamil) to ensure the UI is fully accessible regardless of English proficiency.

&nbsp;