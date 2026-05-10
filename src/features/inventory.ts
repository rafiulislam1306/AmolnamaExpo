import { Alert } from 'react-native';

export function getPhysicalItems(appState: any): string[] { 
    return appState.globalInventoryGroups || []; 
}

export function getInventoryChange(tx: any, globalInventoryGroups: string[]): number {
    if (!tx.trackAs || !globalInventoryGroups.includes(tx.trackAs)) return 0;
    if (tx.name === 'Physical Cash' || tx.name === 'ERS Flexiload') return 0;
    
    let q = Math.abs(parseInt(tx.qty) || 0); 
    
    if (tx.type === 'transfer_in') return q;           
    if (tx.type === 'transfer_out') return -q;         
    if (tx.type === 'adjustment') return parseInt(tx.qty) || 0; 
    
    return -q; 
}

export function getAvailableStock(itemName: string, appState: any): number {
    let catItem = Object.values(appState.globalCatalog || {}).find((c: any) => c.name === itemName) as any;
    let trackAs = catItem ? (catItem.trackAs || itemName) : itemName; 
    
    if (!appState.globalInventoryGroups?.includes(trackAs)) return Infinity; 

    let stock = appState.currentOpeningInv?.[trackAs] || 0; 

    (appState.transactions || []).forEach((tx: any) => {
        if (tx.sessionId === appState.currentSessionId && !tx.isDeleted && tx.trackAs === trackAs) {
            stock += getInventoryChange(tx, appState.globalInventoryGroups); 
        }
    });
    return stock;
}

export function passStockFirewall(itemName: string, requestedQty: number, appState: any): boolean {
    let catItem = Object.values(appState.globalCatalog || {}).find((c: any) => c.name === itemName) as any;
    let trackAs = catItem ? (catItem.trackAs || itemName) : itemName; 
    
    if (!appState.globalInventoryGroups?.includes(trackAs)) return true; 

    let available = getAvailableStock(itemName, appState);
    if (available < requestedQty) {
        Alert.alert(
            "Insufficient Stock", 
            `You only have ${available}x ${trackAs} available in your drawer. You cannot complete this transaction.`
        );
        return false; 
    }
    return true; 
}