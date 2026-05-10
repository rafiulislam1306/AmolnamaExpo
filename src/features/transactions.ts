import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../config/firebase';
import { generateReceiptNo, getStrictDate } from '../utils/helpers';

export async function addTransactionToCloud(
    type: string, 
    name: string, 
    amount: number, 
    qty: number, 
    payment: string, 
    appState: any, 
    cashAmt: number = 0, 
    mfsAmt: number = 0
): Promise<boolean> {
    if (!auth.currentUser) return false;

    // Prevent transactions if the desk hasn't been opened
    if (!appState.currentSessionId && appState.currentDeskId !== 'sandbox') {
        Alert.alert("Desk Closed", "You must open your desk and verify your float before making transactions.");
        return false;
    }

    let finalCash = payment === 'Cash' ? amount : cashAmt;
    let finalMfs = payment === 'MFS' ? amount : mfsAmt;

    let catItem = Object.values(appState.globalCatalog || {}).find((c: any) => c.name === name) as any;
    let trackAs = catItem ? (catItem.trackAs || name) : name;

    const tx = {
        id: Date.now(),
        receiptNo: generateReceiptNo(),
        type: type,
        name: name,
        trackAs: trackAs,
        amount: amount,
        qty: qty,
        payment: payment,
        cashAmt: finalCash,
        mfsAmt: finalMfs,
        isDeleted: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dateStr: getStrictDate(),
        deskId: appState.currentDeskId || 'unknown',
        sessionId: appState.currentSessionId || 'unknown',
        agentId: auth.currentUser.uid,
        agentName: appState.userNickname || appState.userDisplayName || 'Agent',
        timestamp: serverTimestamp()
    };

    try {
        await addDoc(collection(db, 'transactions'), tx);
        let confirmMsg = type === 'ERS' ? `ERS ${amount} Tk Logged!` : `${qty}x ${name} Logged!`;
        Alert.alert("Success", confirmMsg);
        return true;
    } catch (e) {
        console.error("Storage Error:", e);
        Alert.alert("Error", "Could not save transaction. Check your connection.");
        return false;
    }
}