import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { Alert } from 'react-native';
import { db } from '../config/firebase';

// --- Agent Management ---

export async function kickAgent(uid: string) {
    try {
        await updateDoc(doc(db, 'users', uid), { 
            assignedDeskId: null, 
            assignedDate: null 
        });
        Alert.alert("Success", "Agent kicked from desk.");
    } catch (e) {
        Alert.alert("Error", "Could not kick agent.");
    }
}

export async function nukeAgent(uid: string, agentName: string, dateStr: string) {
    Alert.alert(
        "Burn Notice",
        `WARNING: You are about to kick ${agentName} AND permanently delete EVERY transaction they made today. Proceed?`,
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Nuke Data", 
                style: "destructive", 
                onPress: async () => {
                    try {
                        await updateDoc(doc(db, 'users', uid), { assignedDeskId: null, assignedDate: null });
                        const txSnap = await getDocs(query(
                            collection(db, 'transactions'), 
                            where('agentId', '==', uid), 
                            where('dateStr', '==', dateStr)
                        ));
                        for (const tDoc of txSnap.docs) {
                            await deleteDoc(doc(db, 'transactions', tDoc.id));
                        }
                        Alert.alert("Nuked", "Agent cleared and data erased.");
                    } catch (e) {
                        Alert.alert("Error", "Burn Notice failed.");
                    }
                } 
            }
        ]
    );
}

// --- CSV Export (Native Implementation) ---

export async function exportLedgerCSV(dateStr: string) {
    try {
        const txSnap = await getDocs(query(
            collection(db, 'transactions'), 
            where('dateStr', '==', dateStr)
        ));
        
        let csvContent = "ID,Time,Desk,Agent,Type,Item,Qty,TotalAmount,CashAmount,MfsAmount,PaymentMethod\n";
        
        const rows: any[] = [];
        txSnap.forEach(doc => { rows.push(doc.data()); });
        
        rows.sort((a, b) => a.id - b.id).forEach(t => {
            const row = [
                t.id, t.time, t.deskId || 'None', `"${t.agentName || 'Unknown'}"`, t.type || '', 
                `"${t.name}"`, t.qty || 0, t.amount || 0, t.cashAmt || 0, t.mfsAmt || 0, 
                t.payment || ''
            ];
            csvContent += row.join(",") + "\n";
        });

        const fileName = `Amolnama_Ledger_${dateStr.replace(/\//g, '-')}.csv`;
        const fileUri = FileSystem.documentDirectory + fileName;

        await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(fileUri);

    } catch (e) {
        Alert.alert("Export Error", "Could not generate CSV.");
    }
}

// --- Global Danger Zone ---

export async function forceCloseAllDesks() {
    Alert.alert(
        "Force Close All",
        "This will instantly log out every agent on the floor. Proceed?",
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Force Close", 
                style: "destructive", 
                onPress: async () => {
                    const sSnap = await getDocs(query(collection(db, 'sessions'), where('status', '==', 'open')));
                    for (const s of sSnap.docs) {
                        await updateDoc(doc(db, 'sessions', s.id), { status: 'closed', closedBy: 'Admin Override' });
                    }
                    const dSnap = await getDocs(collection(db, 'desks'));
                    for (const d of dSnap.docs) {
                        await updateDoc(doc(db, 'desks', d.id), { status: 'closed', currentSessionId: null });
                    }
                    Alert.alert("Done", "All desks and sessions closed.");
                }
            }
        ]
    );
}