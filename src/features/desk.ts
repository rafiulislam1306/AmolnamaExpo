import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../config/firebase';
import { getStrictDate } from '../utils/helpers';
import { getInventoryChange } from './inventory';

export async function handleDeskSelect(deskId: string, deskName: string, status: string, sessionId: string, appState: any, auth: any): Promise<boolean> {
    if (!auth.currentUser) return false;

    let activeSessionId = (sessionId === 'null' || sessionId === 'undefined' || !sessionId) ? null : sessionId;

    try {
        if (status !== 'open' && activeSessionId) {
            await updateDoc(doc(db, 'sessions', activeSessionId), {
                status: 'open',
                openedBy: appState.userNickname || appState.userDisplayName || 'Agent',
                openedByUid: auth.currentUser.uid
            });
            await setDoc(doc(db, 'desks', deskId), { status: 'open' }, { merge: true });
        } else if (!activeSessionId) {
            // Fallback: If no session exists, the lazy rollover didn't run. 
            // We'll just alert for now, as rollover logic will be handled at the root level later.
            Alert.alert("Error", "No active session found for this desk. Please refresh.");
            return false;
        }

        const todayStr = getStrictDate();
        await setDoc(doc(db, 'users', auth.currentUser.uid), { assignedDeskId: deskId, assignedDate: todayStr }, { merge: true });

        // Update global state
        let dbCash = 0;
        let dbInv = {};
        const sessionSnap = await getDoc(doc(db, 'sessions', activeSessionId as string));
        
        if (sessionSnap.exists() && sessionSnap.data().openingBalances) {
            dbCash = parseFloat(sessionSnap.data().openingBalances.cash) || 0;
            if (dbCash > 0) {
                // Instantly absorb floating cash into the drawer
                await updateDoc(doc(db, 'sessions', activeSessionId as string), { 'openingBalances.cash': 0 });
                dbCash = 0;
            }
            dbInv = sessionSnap.data().openingBalances.inventory || {};
        }

        appState.updateAppState({
            currentDeskId: deskId,
            currentDeskName: deskName,
            currentSessionId: activeSessionId,
            currentOpeningCash: dbCash,
            currentOpeningInv: dbInv
        });

        Alert.alert("Success", `Joined ${deskName}!`);
        return true;
    } catch (error) {
        console.error("Desk selection failed:", error);
        Alert.alert("Error", "Failed to join desk.");
        return false;
    }
}

export async function submitClosingReport(appState: any, auth: any): Promise<boolean> {
    if (!appState.currentSessionId || !appState.currentDeskId) return false;

    try {
        const sessionSnap = await getDoc(doc(db, 'sessions', appState.currentSessionId));
        if (!sessionSnap.exists()) return false;

        const sessionData = sessionSnap.data();
        let expectedCash = parseFloat(sessionData.openingBalances?.cash) || 0;
        let expectedMfs = 0;
        let expectedInv = { ...(sessionData.openingBalances?.inventory || {}) };

        const txSnap = await getDocs(query(collection(db, 'transactions'), where('sessionId', '==', appState.currentSessionId), where('isDeleted', '==', false)));

        txSnap.forEach(docSnap => {
            let tx = docSnap.data();
            let safeCashAmt = tx.cashAmt !== undefined ? tx.cashAmt : (tx.payment === 'Cash' ? tx.amount : 0);
            expectedCash += safeCashAmt; 
            expectedMfs += (tx.mfsAmt !== undefined ? tx.mfsAmt : (tx.payment === 'MFS' ? tx.amount : 0));
            
            let change = getInventoryChange(tx, appState.globalInventoryGroups);
            if (change !== 0) expectedInv[tx.trackAs] = (expectedInv[tx.trackAs] || 0) + change;
        });

        const stats = { cash: expectedCash, mfs: expectedMfs, inventory: expectedInv };

        await setDoc(doc(collection(db, 'eod_reports')), {
            deskId: appState.currentDeskId,
            sessionId: appState.currentSessionId,
            dateStr: getStrictDate(),
            submittedBy: appState.userNickname || appState.userDisplayName || 'Agent',
            submittedAt: serverTimestamp(),
            expectedClosing: stats,
            actualClosing: stats, // Native 1-click close assumes balance
            variance: 0,
            managerDrop: expectedCash,
            retainedFloat: 0
        });

        await updateDoc(doc(db, 'sessions', appState.currentSessionId), { status: 'closed', closedAt: serverTimestamp() });
        await updateDoc(doc(db, 'desks', appState.currentDeskId), { status: 'closed', currentSessionId: null });
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { assignedDeskId: null, assignedDate: null });

        appState.updateAppState({ currentDeskId: null, currentSessionId: null, currentDeskName: '' });
        
        Alert.alert("Shift Complete", "Desk Sealed and Manager Drop recorded.");
        return true;
    } catch (error) {
        console.error("Closing failed:", error);
        Alert.alert("Error", "Failed to close desk.");
        return false;
    }
}