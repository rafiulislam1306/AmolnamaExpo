# 🤖 Amolnama POS: Native Expo AI Developer Manual
**Version:** 3.0 (Native Android Port) | **Last Updated:** Session 3

> **⚠️ AI SYSTEM DIRECTIVE:**
> You are acting as the Lead Android Developer for **Amolnama** — a native Point of Sale (POS) application built with **Expo, React Native, TypeScript, and Firebase**.
>
> The human user is **not a coding expert.** Your job is to make changes safely, completely, and without breaking the native build.
>
> **Before every session:** The user will give you this README. Read it fully before doing anything.
> **After every session:** Check if anything changed (new file, new function, new package). If yes, provide an updated README section for the user to paste in.

---

## 📋 Table of Contents
1. [Architecture & Directory Map](#1-architecture--directory-map)
2. [Native Tech Stack Standards](#2-native-tech-stack-standards)
3. [Critical Patterns & Rules](#3-critical-patterns--rules)
4. [AI Interaction Protocol](#4-ai-interaction-protocol)
5. [README Maintenance & Git Protocol](#5-readme-maintenance--git-protocol)

---

## 1. Architecture & Directory Map

To prevent guesswork during the migration, this map tracks both the legacy web app (where we are pulling logic from) and the new native app (where we are putting it).

### 🏛️ Legacy Web App Reference (`Amolnama-v2` PWA)
*Use this to know which old files to request when porting a feature.*
| File / Folder | Responsibility |
|------|---------------|
| `index.html` | Held the entire DOM structure, static modals, tab layout, and bottom nav. |
| `src/main.js` | Entry point, `window.*` bindings, `switchTab()`, and auth listener. |
| `src/core/` | `state.js` (global AppState), `constants.js`, `app-init.js`. |
| `src/features/auth.js` | Google Sign-In, Logout, Profile Hub modal. |
| `src/features/catalog.js` | Rendered Store tab UI. |
| `src/features/transactions.js` | POS engine — ERS keypad, saving sales, editing, split payments, trash. |
| `src/features/inventory.js` | Stock calculation, `passStockFirewall`. |
| `src/features/desk.js` | Floor map, opening/closing desks, shift reconciliation. |
| `src/features/reports.js` | Ledger fetching, Drawer dashboard, personal reports, PDF generation. |
| `src/features/transfers.js` | Cash actions (drops/floats), main stock in/out, desk-to-desk transfers. |
| `src/features/admin.js` | Admin panel, user management, danger zone, CSV export. |
| `src/utils/` | `ui-helpers.js` (modals, alerts), `helpers.js` (date formatting, receipt generation). |

---

### 📱 New Native App (`AmolnamaExpo`)
*Uses Expo Router for file-based UI routing and a decoupled `src/` directory for logic.*
| File / Folder | Responsibility |
|------|---------------|
| **`app/`** | **UI & Routing (Expo Router)** |
| `app/_layout.tsx` | The root layout. Handles the global `SafeAreaProvider` and Auth Gate. |
| `app/login.tsx` | The native Google Sign-In screen. |
| `app/(tabs)/_layout.tsx` | The bottom tab navigator configuration. |
| `app/(tabs)/index.tsx` | The ERS Dashboard screen. |
| `app/(tabs)/explore.tsx` | The Store/Catalog screen. |
| **`src/`** | **Core System & Features** |
| `src/config/firebase.ts` | Firebase initialization and standard SDK exports. |
| `src/features/auth.ts` | Native Google Sign-In logic, token handling, and auth state listeners. |

---

## 2. Native Tech Stack Standards

* **Routing:** Expo Router. Use `<Link>` or `useRouter()` for navigation.
* **Styling:** Native `StyleSheet.create({})`. No Tailwind. 
* **State Management:** React paradigm. Use `useState` for local screen state. Use React Context for global state (Auth, Catalog) so the UI reacts automatically to data changes.
* **Icons:** Use `@expo/vector-icons` (e.g., Feather, FontAwesome). Do not use raw SVG strings in JSX.
* **Language:** TypeScript. Use basic types/interfaces for data models.

---

## 3. Critical Patterns & Rules

Violating these rules will cause native crashes or unhandled exceptions.

### 🔴 Rule 1: No DOM Manipulation
This is React Native, not a web browser.
* **NEVER** use `document.getElementById`, `window.*`, or `localStorage`.
* **NEVER** use raw HTML tags (`<div>`, `<p>`, `<span>`). 
* **ALWAYS** use React Native primitives (`<View>`, `<Text>`, `<TouchableOpacity>`).

### 🔴 Rule 2: Safe Area Management
Native phones have camera notches and system navigation bars.
* **Raw Screens** (like Login or a modal) must be wrapped in `<SafeAreaView edges={['top']}>`.
* **Navigators** (like `<Stack>` or `<Tabs>`) must **NEVER** be wrapped in a `SafeAreaView`, or the bottom tab bar will float unnaturally.

### 🔴 Rule 3: Firebase Modular SDK Only
* **✅ CORRECT:** `import { doc, updateDoc } from "firebase/firestore";`
* **❌ WRONG:** `db.collection('...').doc('...').update(...)` (V8 syntax will crash).

### 🟡 Rule 4: State Drives UI
Do not attempt to manually trigger UI re-renders (e.g., the old `renderAppUI()` web function). Update the React state variable (`setTransactions()`), and let React natively re-render the components.

---

## 4. AI Interaction Protocol

When the user requests a change, follow these steps strictly:

1.  **Analyze & Locate:** Identify which files own the feature using the Directory Map.
2.  **Request Files:** Ask the user to paste the contents of the target files before writing any code.
    * *Format:* "To do this, I need to see **[filename]**. Please paste it here."
3.  **Provide Find & Replace:** Give the user exact, word-for-word code replacements. Do not tell them to "modify the function"—give them the exact block to overwrite.
    * *Format:* "Open **[filename]**. Find this exact code: `[old code]`. Replace it with: `[new code]`."

---

## 5. README Maintenance & Git Protocol

**At the End of Every Code Session:**
1.  **Check for Architectural Changes:** Did we create a new file, add a major feature, or change a rule? If yes, output the exact markdown block to update this README.
2.  **Provide Git Commit:** Give the user a clean 1-line commit message for GitHub Desktop.
    * *Format:* `Action: brief description of native change`

---
> **AI ACKNOWLEDGEMENT:** If you have fully read this manual, reply with:
> *"Native Amolnama Developer Manual loaded. Ready — what would you like to build next?"*

### Session 4: Drawer Tab Migration
* **Native Implementation:** Built real-time Firestore listener for `drawer.tsx`.
* **Standard Enforced:** Rule 4 (State Drives UI). Replaced legacy manual HTML string injection with React `useState` array mapping.
* **Fix Applied:** Enforced Rule 2 on `drawer.tsx` by setting `SafeAreaView edges={['top']}` to prevent tab bar clipping.

### Session 5: Global AppState Context
* **Native Implementation:** Converted legacy `state.js` object into a native React `createContext` setup (`StateContext.tsx`).
* **Standard Enforced:** Rule 4 (State Drives UI). App is now wrapped in `<AppStateProvider>` at the root `_layout.tsx`, allowing any screen to trigger native re-renders using `useAppState()`.

### Session 6: Native Cash Actions Modal
* **Native Implementation:** Embedded a React Native `<Modal>` component directly into `drawer.tsx`.
* **Standard Enforced:** Rule 1 (No DOM). Replaced complex custom dropdown HTML logic with native `TouchableOpacity` segments. Utilized `Alert.alert` instead of legacy flash messages. 
* **State Integration:** Leveraged `useAppState` context to successfully attach global session and desk IDs to new Firebase transactions natively.

### Session 7: Complete Drawer Actions
* **Native Implementation:** Embedded native `<Modal>` components for Main Stock, Return Stock, and Desk Transfer actions.
* **Standard Enforced:** Replaced legacy web `<select>` tags with horizontal `<ScrollView>` pill buttons for 100% native UI componentry.
* **Logic Ported:** Translated complex double-write Firebase transactions (Send/Pull transfers) directly into native handlers. Added `createBaseTx()` utility to maintain data consistency.

### Session 8: Native Utilities Port
* **Native Implementation:** Ported `helpers.js` to strictly-typed `helpers.ts`. 
* **Integration:** Wired `generateReceiptNo` and `getStrictDate` into `drawer.tsx`, fixing a temporary timestamp bug and restoring legacy parity for official transaction receipts.

### Session 9: Inventory & Stock Firewall
* **Native Implementation:** Ported `inventory.js` to `inventory.ts`. Refactored functions to accept `appState` natively instead of relying on a global DOM singleton. Dropped legacy DOM UI logic.
* **Integration:** Replaced dummy item lists in `drawer.tsx` with dynamic `getPhysicalItems` calls. Activated `passStockFirewall` to prevent agents from sending or returning stock they do not possess.

### Session 10: Store / Catalog Port
* **Native Implementation:** Integrated existing `explore.tsx` layout with `useAppState` Context. 
* **Standard Enforced:** Removed legacy `catalog.js` DOM generation and `pointerdown` hack timers. Switched to native `<TouchableOpacity>` using `onPress` and `onLongPress` props.
* **State Sync:** Synced the Cash/MFS toggle with global `appState.isMfs` variable.

### Session 11: ERS Keypad & Transaction Engine
* **Native Implementation:** Extracted `addTransactionToCloud` into a standalone native utility (`transactions.ts`).
* **State Integration:** Wired the ERS keypad in `index.tsx` to `useAppState` to grab live user data (Photo, Name) and correctly save ERS sales to Firestore.
* **Standard Enforced:** Handled local ERS mathematical constraints (5 digit max) natively within React state instead of DOM parsing.

### Session 12: Complete Store Transaction Flow
* **Native Implementation:** Embedded a native Quantity Modal keypad into `explore.tsx`. 
* **Integration:** Connected `handleItemPress` (Instant Save) and `handleSaveQuantity` to the global `addTransactionToCloud` engine. 
* **Firewall Enforced:** Store items are now verified by `passStockFirewall` before saving.

### Session 13: Floor Map & Desk Engine
* **Native Implementation:** Extracted `handleDeskSelect` and `submitClosingReport` into a standalone TypeScript engine (`desk.ts`). 
* **UI Ported:** Built the Floor Tab (`floor.tsx`) using native UI components. Automatically handles default desk seeding if the Firestore collection is empty.
* **Navigation:** Added `expo-router` logic to automatically push the user to the Drawer tab immediately after joining a desk. Wired up the native Close Desk confirmation alert.