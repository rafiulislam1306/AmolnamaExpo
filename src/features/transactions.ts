import { doc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../config/firebase';

// Helper for Edit/Delete rules (Matches your PWA's logic)
export const isTransactionModifiable = (tx: any, action: string) => {
    if (tx.type === 'transfer_out' || tx.type === 'transfer_in') {
        Alert.alert("Action Blocked", "Remote stock transfers cannot be modified here.");
        return false;
    }
    if (action === 'edit' && tx.type === 'adjustment') {
        Alert.alert("Action Blocked", "Cash adjustments cannot be edited to protect ledger integrity.");
        return false;
    }
    return true;
};

// Trash a transaction natively
export const deleteTransaction = (tx: any, appState: any) => {
    if (!isTransactionModifiable(tx, 'delete')) return;

    Alert.alert(
        "Move to Trash",
        `Are you sure you want to delete ${tx.qty}x ${tx.name}?`,
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Trash",
                style: "destructive",
                onPress: async () => {
                    try {
                        const nowStr = new Date().toISOString();
                        const agentStr = appState.userNickname || appState.userDisplayName || 'Agent';
                        
                        await updateDoc(doc(db, 'transactions', tx.id), { 
                            isDeleted: true, 
                            deletedBy: agentStr, 
                            deletedByUid: appState.currentUser?.uid || 'unknown', 
                            deletedAt: nowStr 
                        });
                        
                    } catch (error) {
                        console.error("Delete failed:", error);
                        Alert.alert("Error", "Could not delete item.");
                    }
                }
            }
        ]
    );
};