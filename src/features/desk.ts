import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Alert } from 'react-native';
import { db } from '../config/firebase';

// Helper to get DD/MM/YYYY exactly like your PWA
export const getStrictDate = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

export async function joinDesk(desk: any, appState: any, updateAppState: any, router: any) {
  try {
    let activeSessionId = desk.currentSessionId;

    // 1. Wake up the dormant session if it's closed
    if (desk.status !== 'open' && activeSessionId) {
      await updateDoc(doc(db, 'sessions', activeSessionId), {
        status: 'open',
        openedBy: appState.userNickname || appState.userDisplayName || 'Agent',
        openedByUid: appState.currentUser?.uid || 'unknown',
        deskName: desk.name
      });
      await setDoc(doc(db, 'desks', desk.id), { status: 'open' }, { merge: true });
    } else if (!activeSessionId) {
      Alert.alert("Rollover Required", "This desk requires the daily rollover script to run first.");
      return;
    }

    // 2. Assign desk to user profile
    if (appState.currentUser?.uid) {
      await setDoc(doc(db, 'users', appState.currentUser.uid), { 
        assignedDeskId: desk.id, 
        assignedDate: getStrictDate() 
      }, { merge: true });
    }

    // 3. Fetch session balances
    let openingCash = 0;
    let openingInv = {};
    const sessionSnap = await getDoc(doc(db, 'sessions', activeSessionId));
    
    if (sessionSnap.exists() && sessionSnap.data().openingBalances) {
        let dbCash = parseFloat(sessionSnap.data().openingBalances.cash) || 0;
        if (dbCash > 0) {
            await updateDoc(doc(db, 'sessions', activeSessionId), { 'openingBalances.cash': 0 });
            dbCash = 0;
        }
        openingCash = dbCash;
        openingInv = sessionSnap.data().openingBalances.inventory || {}; 
    }

    // 4. Update the Global Context (The Brain)
    updateAppState({
      currentDeskId: desk.id,
      currentDeskName: desk.name,
      currentSessionId: activeSessionId,
      currentOpeningCash: openingCash,
      currentOpeningInv: openingInv
    });

    // 5. Native Flash Message & Routing
    Alert.alert("Success", `Joined ${desk.name}!`);
    router.replace('/'); // This jumps to index.tsx (The ERS Dashboard)

  } catch (error) {
    console.error("Join desk failed:", error);
    Alert.alert("Error", "Could not join desk. Check your connection.");
  }
}