# 🤖 Amolnama POS: Native Expo AI Developer Manual
**Version:** 4.1 (Native Android Port) | **Last Updated:** Session 14

> **⚠️ AI SYSTEM DIRECTIVE:**
> You are acting as the Lead Android Developer for **Amolnama** — a native Point of Sale (POS) application built with **Expo, React Native, TypeScript, and Firebase**.
>
> The human user is **not a coding expert.** Your job is to make changes safely, completely, and without breaking the native build.
>
> **Before every session:** The user will give you this README. Read it fully before doing anything.
> **After every session:** Check if anything changed (new file, new function, new package). Output the exact markdown blocks the user needs to paste in to keep this README current.

---

## 🔴 Current Status

- **Last completed session:** 16
- **Last feature built:** Native Profile Hub with Sign Out and Desk Release logic
- **Next to build:** Unknown — confirm with user
- **Known bugs / open TODOs:** Sync Section 1 Architecture Map with recent ports
- **Packages added last session:** None

---

## 📋 Table of Contents
1. [Architecture & Directory Map](#1-architecture--directory-map)
2. [Project File Tree](#2-project-file-tree)
3. [Native Tech Stack Standards](#3-native-tech-stack-standards)
4. [Critical Patterns & Rules](#4-critical-patterns--rules)
5. [Firestore Data Models](#5-firestore-data-models)
6. [Installed Packages](#6-installed-packages)
7. [AI Interaction Protocol](#7-ai-interaction-protocol)
8. [README Maintenance & Git Protocol](#8-readme-maintenance--git-protocol)
9. [Session Logs](#9-session-logs)

---

## 1. Architecture & Directory Map

Tracks both the legacy web app (source of logic) and the new native app (destination).

### 🏛️ Legacy Web App Reference (`Amolnama-v2` PWA)

> **⚠️ Rule 6 applies here.** Before porting any feature, identify which legacy file owns it from the table and tree below, then ask the user to paste that file's contents. Never write native port code without seeing the legacy source first.

**Port status legend:** ✅ Ported | 🔄 Partially ported | ⏳ Not yet ported

| File | Responsibility | Port Status |
|---|---|---|
| `index.html` | Entire DOM structure, static modals, tab layout, bottom nav | ✅ Ported |
| `src/main.js` | Entry point, `window.*` bindings, `switchTab()`, auth listener | ✅ Ported |
| `src/config/firebase.js` | Firebase initialization | ✅ Ported → `src/config/firebase.ts` |
| `src/core/state.js` | Global AppState object — all shared variables | ✅ Ported → `src/core/StateContext.tsx` |
| `src/core/constants.js` | Fixed app-wide constants | ⏳ Not yet ported |
| `src/core/app-init.js` | App bootstrap logic, initial data loading | ⏳ Not yet ported |
| `src/features/auth.js` | Google Sign-In, Logout, Profile Hub modal | ✅ Ported → `src/features/auth.ts` & `app/(tabs)/index.tsx` |
| `src/features/catalog.js` | Store tab UI, item rendering | ✅ Ported → `app/(tabs)/explore.tsx` |
| `src/features/transactions.js` | POS engine — ERS keypad, saving sales, editing, split payments, trash | 🔄 Partially ported → `src/features/transactions.ts` |
| `src/features/inventory.js` | Stock calculation, `passStockFirewall` | ✅ Ported → `src/utils/inventory.ts` |
| `src/features/desk.js` | Floor map, opening/closing desks, shift reconciliation | 🔄 Partially ported → `src/features/desk.ts` |
| `src/features/reports.js` | Ledger fetching, Drawer dashboard, personal reports, PDF generation | ✅ Ported → `app/(tabs)/report.tsx` |
| `src/features/transfers.js` | Cash actions (drops/floats), main stock in/out, desk-to-desk transfers | ✅ Ported → `app/(tabs)/drawer.tsx` |
| `src/features/admin.js` | Admin panel, user management, danger zone, CSV export | ⏳ Not yet ported |
| `src/utils/helpers.js` | Date formatting, receipt generation | ✅ Ported → `src/utils/helpers.ts` |
| `src/utils/ui-helpers.js` | Web modals, alerts, flash messages | ✅ Replaced by native `Alert.alert` and `<Modal>` |

**Legacy File Tree** *(for reference — port-relevant files only)*
```
Amolnama-v2/
├── src/
│   ├── config/
│   │   └── firebase.js
│   ├── core/
│   │   ├── app-init.js
│   │   ├── constants.js
│   │   └── state.js
│   ├── features/
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── catalog.js
│   │   ├── desk.js
│   │   ├── inventory.js
│   │   ├── reports.js
│   │   ├── transactions.js
│   │   └── transfers.js
│   ├── utils/
│   │   ├── helpers.js
│   │   └── ui-helpers.js
│   └── main.js
└── index.html
```

---

### 📱 New Native App (`AmolnamaExpo`)
*Uses Expo Router for file-based UI routing and a decoupled `src/` directory for logic.*

| File / Folder | Responsibility |
|---|---|
| **`app/`** | **UI & Routing (Expo Router)** |
| `app/_layout.tsx` | Root layout. Global `SafeAreaProvider` and Auth Gate |
| `app/login.tsx` | Native Google Sign-In screen |
| `app/(tabs)/_layout.tsx` | Bottom tab navigator configuration |
| `app/(tabs)/index.tsx` | ERS Dashboard + Keypad screen |
| `app/(tabs)/explore.tsx` | Store/Catalog screen with Quantity Modal keypad |
| `app/(tabs)/drawer.tsx` | Cash actions, stock transfers, ledger, Edit/Trash modals, real-time Firestore listener |
| `app/(tabs)/floor.tsx` | Floor Map screen — desk selection, desk seeding, close desk |
| **`src/`** | **Core System & Features** |
| `src/config/firebase.ts` | Firebase initialization and modular SDK exports |
| `src/core/StateContext.tsx` | Global AppState context. `useAppState()` hook. Wraps entire app |
| `src/features/auth.ts` | Native Google Sign-In logic, token handling, auth state listeners |
| `src/features/transactions.ts` | `addTransactionToCloud`, `deleteTransaction`, `saveTxEdit` |
| `src/features/desk.ts` | `handleDeskSelect`, `submitClosingReport` — desk engine |
| `src/utils/helpers.ts` | `generateReceiptNo`, `getStrictDate` — strictly typed utilities |
| `src/utils/inventory.ts` | `getPhysicalItems`, `passStockFirewall` — stock validation |
| **`root/`** | **Project Root** |
| `tree.js` | File tree generator script. Run `npm run tree` to regenerate `filetree.txt` |

---

## 2. Project File Tree

> ⚠️ **This section is maintained manually by the user.**
> Run `npm run tree` after any session where files were created, deleted, or renamed.
> Copy the output from `filetree.txt` and paste it below, replacing the old tree.

> **Last updated:** Session 14

```
AmolnamaExpo/
├── app/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── explore.tsx
│       ├── drawer.tsx
│       └── floor.tsx
├── src/
│   ├── config/
│   │   └── firebase.ts
│   ├── core/
│   │   └── StateContext.tsx
│   ├── features/
│   │   ├── auth.ts
│   │   ├── transactions.ts
│   │   └── desk.ts
│   └── utils/
│       ├── helpers.ts
│       └── inventory.ts
├── tree.js
├── filetree.txt
├── package.json
└── README.md
```

> **How to set up `npm run tree`:** Create `tree.js` in your project root with the script below, then add `"tree": "node tree.js"` to the `scripts` block in `package.json`.

```js
// tree.js — paste this into your project root
const fs = require("fs");
const path = require("path");

const IGNORE = ["node_modules", ".git", ".expo", "dist", "build", ".DS_Store"];

function buildTree(dir, prefix = "") {
  let output = "";
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => !IGNORE.includes(e.name))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    output += prefix + connector + entry.name + "\n";
    if (entry.isDirectory()) {
      output += buildTree(path.join(dir, entry.name), prefix + childPrefix);
    }
  });
  return output;
}

const tree = "AmolnamaExpo/\n" + buildTree(".");
console.log(tree);
fs.writeFileSync("filetree.txt", tree);
console.log("\n✅ Saved to filetree.txt");
```

---

## 3. Native Tech Stack Standards

- **Routing:** Expo Router. Use `<Link>` or `useRouter()` for navigation.
- **Styling:** Native `StyleSheet.create({})`. No Tailwind.
- **State Management:** React paradigm. `useState` for local screen state. React Context (`useAppState`) for global state so the UI reacts automatically.
- **Icons:** `@expo/vector-icons` (Feather, FontAwesome). Do not use raw SVG strings in JSX.
- **Language:** TypeScript. Use basic types/interfaces for all data models.

---

## 4. Critical Patterns & Rules

Violating these rules will cause native crashes or unhandled exceptions.

### 🔴 Rule 1: No DOM Manipulation
This is React Native, not a web browser.
- **NEVER** use `document.getElementById`, `window.*`, or `localStorage`.
- **NEVER** use raw HTML tags (`<div>`, `<p>`, `<span>`).
- **ALWAYS** use React Native primitives (`<View>`, `<Text>`, `<TouchableOpacity>`).

### 🔴 Rule 2: Safe Area Management
Native phones have camera notches and system navigation bars.
- **Raw Screens** (Login, modals) must be wrapped in `<SafeAreaView edges={['top']}>`.
- **Navigators** (`<Stack>`, `<Tabs>`) must **NEVER** be wrapped in `SafeAreaView` or the bottom tab bar will float unnaturally.

### 🔴 Rule 3: Firebase Modular SDK Only
- ✅ **CORRECT:** `import { doc, updateDoc } from "firebase/firestore";`
- ❌ **WRONG:** `db.collection('...').doc('...').update(...)` — V8 syntax will crash.

### 🟡 Rule 4: State Drives UI
Never manually trigger UI re-renders (e.g. the legacy `renderAppUI()` function). Update the React state variable (`setTransactions()`), and let React natively re-render the components.

### 🟡 Rule 5: Ask Before Assuming
If a file is not pasted in the current session, always ask the user for it before writing any code that modifies it. Never reconstruct file contents from memory or session history.

### 🟡 Rule 6: Always Read the Legacy Source Before Porting
Before writing any native port code for a feature:
1. Identify the legacy file that owns that feature using the legacy table and tree in Section 1.
2. Ask the user to paste that legacy file's contents.
3. Only after reading the legacy source — write the native implementation.
- *Format:* "To port this feature I need to see the legacy source. Please paste **[legacy filename]**."
- **Never assume** how a legacy function works from its name alone. The legacy code may have constraints, firewall checks, or multi-write logic that are not obvious without reading it.

---

## 5. Firestore Data Models

> ⚠️ This section is **append-only**. Never delete a field — only add new ones.
> Fields are tagged with the session they were confirmed in.
> ⚠️ = newly added, not present in older Firestore records.

### Transaction Document
*(Collection path: confirm with user)*

| Field | Type | Status |
|---|---|---|
| `receiptNo` | `string` | ✅ confirmed Session 8 |
| `agentId` | `string` | ✅ confirmed Session 6 |
| `deskId` | `string` | ✅ confirmed Session 6 |
| `sessionId` | `string` | ✅ confirmed Session 6 |
| `timestamp` | `Firestore Timestamp` | ✅ confirmed Session 8 |
| `amount` | `number` | ✅ confirmed Session 11 |
| `type` | `string` — see values below | ✅ confirmed Session 7 |
| `isMfs` | `boolean` | ✅ confirmed Session 10 |
| `agentName` | `string` | ✅ confirmed Session 11 |
| `agentPhoto` | `string` (URL) | ✅ confirmed Session 11 |

**Known `type` values:**
- `"ERS"` — airtime sale (Session 11)
- `"cash_drop"` — cash drop action (Session 6)
- `"float"` — float action (Session 6)
- `"transfer_send"` — desk-to-desk send (Session 7)
- `"transfer_pull"` — desk-to-desk pull (Session 7)
- `"main_stock_in"` — stock received from main (Session 7)
- `"return_stock"` — stock returned to main (Session 7)
- `"store_sale"` — catalog item sale (Session 12)

---

### AppState (from `StateContext.tsx`)

| Field | Type | Status |
|---|---|---|
| `user.uid` | `string` | ✅ confirmed Session 5 |
| `user.name` | `string` | ✅ confirmed Session 5 |
| `user.photo` | `string` (URL) | ✅ confirmed Session 11 |
| `user.role` | `string` | ✅ confirmed Session 5 |
| `deskId` | `string` | ✅ confirmed Session 6 |
| `sessionId` | `string` | ✅ confirmed Session 6 |
| `isMfs` | `boolean` | ✅ confirmed Session 10 |

---

### Desk Document
*(Collection path: confirm with user)*

| Field | Type | Status |
|---|---|---|
| `deskId` | `string` | ✅ confirmed Session 13 |
| `isOpen` | `boolean` | ✅ confirmed Session 13 |
| `agentId` | `string` | ✅ confirmed Session 13 |
| `openedAt` | `Firestore Timestamp` | ✅ confirmed Session 13 |

---

## 6. Installed Packages

| Package | Purpose |
|---|---|
| `expo` | Core Expo SDK |
| `expo-router` | File-based navigation |
| `react-native` | Core React Native primitives |
| `firebase` | Firestore, Auth — modular SDK v9+ |
| `@expo/vector-icons` | Feather, FontAwesome icon sets |
| `expo-auth-session` | Google OAuth token handling |
| `expo-web-browser` | Required by `expo-auth-session` for OAuth flow |
| `react-native-safe-area-context` | `SafeAreaView` and `SafeAreaProvider` |

> ⚠️ If you install a new package during a session, add it here before closing.

---

## 7. AI Interaction Protocol

When the user requests a change, follow these steps strictly:

1. **Analyze & Locate:** Identify which files own the feature using the Directory Map and File Tree.
2. **Request Files:** Ask the user to paste the contents of the target files before writing any code.
   - *Format:* "To do this, I need to see **[filename]**. Please paste it here."
3. **Provide Find & Replace:** Give the user exact, word-for-word code replacements. Do not say "modify the function" — give the exact block to overwrite.
   - *Format:* "Open **[filename]**. Find this exact code: `[old code]`. Replace it with: `[new code]`."
4. **Never Guess File Contents:** If a file has not been pasted in this session, always ask for it. Never reconstruct it from memory or session history (Rule 5).
5. **Always Read Legacy Source Before Porting:** Identify the legacy file from Section 1, ask the user to paste it, then write the native code (Rule 6).

---

## 8. README Maintenance & Git Protocol

### At the End of Every Code Session:

1. **Check for Architectural Changes:** New file created? New package installed? New Firestore field used? New rule needed? If yes, output the exact markdown to update the relevant section.
2. **File Tree:** If any file was created, deleted, or renamed — remind the user to run `npm run tree` and update Section 2.
3. **Data Models:** If any new Firestore field was written — add it to Section 5 with the session number and ⚠️ marker.
4. **Current Status:** Always output an updated `## 🔴 Current Status` block.
5. **Provide Git Commit:** One clean line for GitHub Desktop.
   - *Format:* `Action: brief description of native change`

---

## 9. Session Logs

### Session 4: Drawer Tab Migration
- **Files changed:** `app/(tabs)/drawer.tsx`
- **Files created:** `app/(tabs)/drawer.tsx`
- **Packages added:** None
- **Rules applied:** Rule 2, Rule 4
- **Notes:** Built real-time Firestore listener. Replaced legacy HTML string injection with React `useState` array mapping. Fixed `SafeAreaView edges={['top']}` to prevent tab bar clipping.

### Session 5: Global AppState Context
- **Files changed:** `app/_layout.tsx`
- **Files created:** `src/context/StateContext.tsx`
- **Packages added:** None
- **Rules applied:** Rule 4
- **Notes:** Converted legacy `state.js` into native React `createContext`. App wrapped in `<AppStateProvider>`. Any screen can now call `useAppState()` for global state.

### Session 6: Native Cash Actions Modal
- **Files changed:** `app/(tabs)/drawer.tsx`
- **Files created:** None
- **Packages added:** None
- **Rules applied:** Rule 1, Rule 4
- **Notes:** Embedded `<Modal>` into `drawer.tsx`. Replaced dropdown HTML with native `TouchableOpacity` segments. Used `Alert.alert` instead of flash messages. Attached `deskId` and `sessionId` from `useAppState` to new Firebase transactions.

### Session 7: Complete Drawer Actions
- **Files changed:** `app/(tabs)/drawer.tsx`
- **Files created:** None
- **Packages added:** None
- **Rules applied:** Rule 1
- **Notes:** Added `<Modal>` components for Main Stock, Return Stock, Desk Transfer. Replaced `<select>` tags with horizontal `<ScrollView>` pill buttons. Ported double-write Firebase send/pull transfer logic. Added `createBaseTx()` utility inside `drawer.tsx`.

### Session 8: Native Utilities Port
- **Files changed:** `app/(tabs)/drawer.tsx`
- **Files created:** `src/utils/helpers.ts`
- **Packages added:** None
- **Rules applied:** Rule 3
- **Notes:** Ported `helpers.js` to strictly-typed `helpers.ts`. Wired `generateReceiptNo` and `getStrictDate` into `drawer.tsx`. Fixed temporary timestamp bug. Restored legacy parity for official transaction receipts.

### Session 9: Inventory & Stock Firewall
- **Files changed:** `app/(tabs)/drawer.tsx`
- **Files created:** `src/utils/inventory.ts`
- **Packages added:** None
- **Rules applied:** Rule 1, Rule 4
- **Notes:** Ported `inventory.js` to `inventory.ts`. Refactored functions to accept `appState` natively instead of a global DOM singleton. Replaced dummy item lists in `drawer.tsx` with dynamic `getPhysicalItems` calls. Activated `passStockFirewall`.

### Session 10: Store / Catalog Port
- **Files changed:** `app/(tabs)/explore.tsx`
- **Files created:** None
- **Packages added:** None
- **Rules applied:** Rule 1, Rule 4
- **Notes:** Integrated `explore.tsx` with `useAppState`. Removed legacy `catalog.js` DOM generation and `pointerdown` hack timers. Switched to native `onPress` / `onLongPress`. Synced Cash/MFS toggle with global `appState.isMfs`.

### Session 11: ERS Keypad & Transaction Engine
- **Files changed:** `app/(tabs)/index.tsx`
- **Files created:** `src/features/transactions.ts`
- **Packages added:** None
- **Rules applied:** Rule 4
- **Notes:** Extracted `addTransactionToCloud` into `transactions.ts`. Wired ERS keypad in `index.tsx` to `useAppState` for live user data. Saved ERS sales to Firestore correctly. Handled 5-digit max constraint natively in React state.

### Session 12: Complete Store Transaction Flow
- **Files changed:** `app/(tabs)/explore.tsx`
- **Files created:** None
- **Packages added:** None
- **Rules applied:** Rule 1, Rule 4
- **Notes:** Embedded native Quantity Modal keypad into `explore.tsx`. Connected `handleItemPress` (Instant Save) and `handleSaveQuantity` to `addTransactionToCloud`. Store items verified by `passStockFirewall` before saving.

### Session 13: Floor Map & Desk Engine
- **Files changed:** `app/(tabs)/_layout.tsx`
- **Files created:** `app/(tabs)/floor.tsx`, `src/features/desk.ts`
- **Packages added:** None
- **Rules applied:** Rule 1, Rule 2, Rule 3
- **Notes:** Extracted `handleDeskSelect` and `submitClosingReport` into `desk.ts`. Built Floor Tab with native UI. Added automatic default desk seeding if Firestore collection is empty. Added `expo-router` push to Drawer tab after joining a desk. Wired native close desk confirmation alert.

### Session 14: Native Edits & Trash Modals
- **Files changed:** `app/(tabs)/drawer.tsx`, `src/features/transactions.ts`
- **Files created:** None
- **Packages added:** None
- **Rules applied:** Rule 1, Rule 3
- **Notes:** Added `deleteTransaction` and `saveTxEdit` to `transactions.ts` using Firebase `updateDoc`. Added Edit Modal and inline Edit/Trash action buttons to ledger cards in `drawer.tsx`. Used `Alert.alert` for confirmation dialogues.

### Session 15: Native Reporting Dashboard
* **Native Implementation:** Built real-time report logic in `report.tsx` with high-performance state derivation.
* **Standard Enforced:** Rule 1 & 4. Replaced legacy manual HTML string injection and `document.getElementById` calls with unified React state.
* **Feature Ported:** Implemented the "Personal" vs "Center" report toggle with automatic role-based defaults.
* **Export Strategy:** Integrated the native Android `Share` API for text-based reports, replacing legacy web-only PDF/Image libraries.

### Session 16: Native Profile Hub
* **Native Implementation:** Integrated a high-performance `<Modal>` Profile Hub into `index.tsx`.
* **Standard Enforced:** Rule 1 & 4. Removed placeholder Alerts. Replicated legacy role-badge logic and color mapping natively.
* **Feature Ported:** Implemented native Sign Out and Desk Release (Switch Desk) logic, including Firestore user document updates.

---

> **AI ACKNOWLEDGEMENT:** If you have fully read this manual, reply with:
> *"Native Amolnama Developer Manual v4.1 loaded. Ready — what would you like to build next?"*
