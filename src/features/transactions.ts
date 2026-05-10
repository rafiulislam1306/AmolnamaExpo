import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { auth, db } from '../config/firebase';
import { generateReceiptNo, getStrictDate } from '../utils/helpers';
import { passStockFirewall } from './inventory';

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

export async function deleteTransaction(tx: any, appState: any) {
    if (!auth.currentUser) return;
    
    if (tx.type === 'transfer_out' || tx.type === 'transfer_in') {
        Alert.alert("Action Blocked", "Remote transfers cannot be deleted via the Trash bin to prevent stock duplication. Please issue a reverse transfer instead.");
        return;
    }

    Alert.alert(
        "Move to Trash", 
        "Are you sure you want to move this transaction to the trash?", 
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Trash", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await updateDoc(doc(db, 'transactions', tx.docId), { 
                            isDeleted: true, 
                            deletedBy: appState.userNickname || appState.userDisplayName || 'Agent', 
                            deletedByUid: auth.currentUser?.uid, 
                            deletedAt: new Date().toISOString() 
                        });
                    } catch (e) {
                        Alert.alert("Error", "Could not delete transaction.");
                    }
                }
            }
        ]
    );
}

export async function saveTxEdit(
    tx: any, 
    newQty: number, 
    newAmount: number, 
    method: string, 
    finalCash: number, 
    finalMfs: number, 
    appState: any
): Promise<boolean> {
    if (!auth.currentUser) return false;
    
    if (newQty <= 0 || newAmount < 0) {
        Alert.alert("Invalid Edit", "Quantities must be 1 or greater, and amounts cannot be negative.");
        return false;
    }
    
    let diff = newQty - tx.qty;
    if (diff > 0 && !passStockFirewall(tx.name, diff, appState)) return false;

    if (method === 'Split' && Math.abs((finalCash + finalMfs) - newAmount) > 0.01) { 
        Alert.alert("Error", "Cash + MFS must equal Total Tk."); 
        return false; 
    }

    let prevTxState = {
        qty: tx.qty, amount: tx.amount, payment: tx.payment, cashAmt: tx.cashAmt, mfsAmt: tx.mfsAmt,
        editedAt: new Date().toISOString(), editedBy: appState.userNickname || appState.userDisplayName || 'Agent', editedByUid: auth.currentUser.uid
    };
    
    let updatedEditHistory = tx.editHistory ? [...tx.editHistory, prevTxState] : [prevTxState];

    try {
        await updateDoc(doc(db, 'transactions', tx.docId), { 
            qty: newQty, amount: newAmount, payment: method, cashAmt: finalCash, mfsAmt: finalMfs, isEdited: true, editHistory: updatedEditHistory 
        });
        Alert.alert("Success", `${tx.name} Updated!`);
        return true;
    } catch (e) {
        Alert.alert("Error", "Could not update transaction.");
        return false;
    }
}