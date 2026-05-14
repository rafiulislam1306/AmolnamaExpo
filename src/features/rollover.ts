import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from '../config/firebase';

// Helper: Get DD/MM/YYYY exactly like the PWA
const getStrictDate = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Helper: Calculate inventory math
const getInventoryChange = (tx: any) => {
    if (!tx.trackAs || tx.trackAs === 'Physical Cash' || tx.trackAs === 'ERS Flexiload') return 0;
    const q = Math.abs(tx.qty || 0);
    // Transfers in and positive adjustments add to stock. Sales and transfers out reduce stock.
    if (tx.type === 'transfer_in' || tx.type === 'adjustment') return q;
    return -q; 
};

export async function bootSystemRollover() {
    const todayStr = getStrictDate();
    
    try {
        console.log("Checking system boot status...");
        
        // OPTIMIZATION: Check if system already rolled over today (Costs 1 read instead of 20+)
        const sysDocRef = doc(db, 'global', 'system_status');
        const sysSnap = await getDoc(sysDocRef);
        
        if (sysSnap.exists() && sysSnap.data().lastRolloverDate === todayStr) {
            console.log("System already rolled over for today. Boot sequence complete.");
            return; // Exit silently!
        }

        console.log("Initiating Morning Rollover Sequence...");
        const desksSnap = await getDocs(collection(db, 'desks'));

        for (const deskDoc of desksSnap.docs) {
            const deskId = deskDoc.id;
            const deskData = deskDoc.data();
            let currentSessId = deskData.currentSessionId;
            
            let lastSession = null;
            let lastSessionId = null;
            let needsRollover = false;

            // 1. Determine if the current pointer is old
            if (currentSessId && currentSessId !== 'null') {
                const sessSnap = await getDoc(doc(db, 'sessions', currentSessId));
                if (sessSnap.exists()) {
                    const sData = sessSnap.data();
                    if (sData.dateStr !== todayStr) {
                        lastSession = sData;
                        lastSessionId = currentSessId;
                        needsRollover = true;
                    }
                }
            } else {
                needsRollover = true;
            }

            if (needsRollover) {
                // 2. Find the most recent session from the past
                if (!lastSession) {
                    const pastSnap = await getDocs(query(collection(db, 'sessions'), where('deskId', '==', deskId)));
                    let maxTime = 0;
                    
                    pastSnap.forEach(docSnap => {
                        let s = docSnap.data();
                        if (s.dateStr === todayStr) return; // Ignore today's blanks
                        
                        let t = (s.openedAt?.toMillis && s.openedAt.toMillis()) || 0;
                        if (t === 0 && s.dateStr) {
                            let pts = s.dateStr.split('/');
                            if (pts.length === 3) t = new Date(`${pts[2]}-${pts[1]}-${pts[0]}`).getTime();
                        }
                        
                        if (t > maxTime) {
                            maxTime = t;
                            lastSession = s;
                            lastSessionId = docSnap.id;
                        }
                    });
                }

                let carryOverInv: any = {};
                let carryOverCash = 0;

                // 3. Calculate leftovers from history
                if (lastSession && lastSessionId) {
                    carryOverInv = { ...(lastSession.openingBalances?.inventory || {}) };
                    if (lastSession.status === 'open') carryOverCash = parseFloat(lastSession.openingBalances?.cash) || 0;

                    const txSnap = await getDocs(query(collection(db, 'transactions'), where('sessionId', '==', lastSessionId), where('isDeleted', '==', false)));
                    txSnap.forEach(tDoc => {
                        let tx = tDoc.data();
                        let change = getInventoryChange(tx);
                        if (change !== 0) carryOverInv[tx.trackAs] = (carryOverInv[tx.trackAs] || 0) + change;
                        if (lastSession?.status === 'open') carryOverCash += (tx.cashAmt || 0);
                    });

                    // Seal the old session if it was left open
                    if (lastSession.status === 'open') {
                        let finalCash = carryOverCash;
                        if (finalCash > 0) {
                            // Auto-Drop the cash to the manager
                            await setDoc(doc(collection(db, 'transactions')), {
                                id: Date.now() + Math.floor(Math.random() * 1000),
                                receiptNo: `SYS-${Date.now().toString().slice(-4)}`,
                                type: 'adjustment', name: 'System Auto-Handover',
                                trackAs: 'Physical Cash', amount: finalCash, qty: 1,
                                payment: 'Auto-Dropped to Manager', cashAmt: -Math.abs(finalCash), mfsAmt: 0,
                                isDeleted: false, time: '11:59 PM', dateStr: lastSession.dateStr,
                                deskId: deskId, sessionId: lastSessionId, agentId: 'system',
                                agentName: 'System Auto-Close', timestamp: serverTimestamp()
                            });
                        }
                        await updateDoc(doc(db, 'sessions', lastSessionId), {
                            status: 'closed_by_system', closedAt: serverTimestamp(),
                            expectedClosing: { cash: 0, inventory: carryOverInv }
                        });
                        carryOverCash = 0; // Drawer is empty for the next day
                    }
                }

                // 4. Create the new session for today
                const todayQuery = await getDocs(query(collection(db, 'sessions'), where('deskId', '==', deskId), where('dateStr', '==', todayStr)));
                let newSessionId;
                let newStatus = (lastSession && lastSession.status === 'open') ? 'open' : 'closed';

                if (!todayQuery.empty) {
                    newSessionId = todayQuery.docs[0].id;
                    await updateDoc(doc(db, 'sessions', newSessionId), {
                        openingBalances: { cash: carryOverCash, inventory: carryOverInv }
                    });
                } else {
                    const newSessionRef = doc(collection(db, 'sessions'));
                    newSessionId = newSessionRef.id;
                    await setDoc(newSessionRef, {
                        deskId: deskId, dateStr: todayStr, 
                        openedBy: 'System Auto-Rollover', openedByUid: 'system', openedAt: serverTimestamp(),
                        status: newStatus, openingBalances: { cash: carryOverCash, inventory: carryOverInv }
                    });
                }

                // 5. Finalize Desk Pointer
                await updateDoc(doc(db, 'desks', deskId), { status: newStatus, currentSessionId: newSessionId }, { merge: true });
            }
        }
        
        // Mark rollover as complete globally!
        await setDoc(doc(db, 'global', 'system_status'), { lastRolloverDate: todayStr }, { merge: true });
        console.log("Morning Rollover Complete!");

    } catch(e) { 
        console.error("Rollover system failed:", e); 
    }
}