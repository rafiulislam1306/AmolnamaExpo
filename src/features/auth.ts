import { auth } from '../config/firebase';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithCredential, User } from "firebase/auth";
import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { AppState } from '../core/state';

// Initialize the Google SDK
GoogleSignin.configure({
  // Use the WEB client ID from your screenshot
  webClientId: '283254200113-d2k3jbln87k4v5r1g2p3o4n5m6l7.apps.googleusercontent.com', 
  offlineAccess: true,
});

export function initAuth(onLoginSuccess: (user: User) => void, onLogout: () => void) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            (AppState as any).currentUser = user;
            AppState.userDisplayName = user.displayName || 'User';
            onLoginSuccess(user);
        } else {
            (AppState as any).currentUser = null;
            onLogout();
        }
    });
}

export async function signInWithGoogleNative() {
    try {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        
        // New version of the library uses this check
        if (isSuccessResponse(response)) {
          const idToken = response.data.idToken;
          if (!idToken) throw new Error("No ID Token found");
          
          const credential = GoogleAuthProvider.credential(idToken);
          return signInWithCredential(auth, credential);
        } else {
          throw new Error("Sign in was cancelled or failed");
        }
    } catch (error) {
        console.error("Native Google Sign-In Error:", error);
        throw error;
    }
}

export function logoutUser() {
    signOut(auth).then(() => {
        GoogleSignin.signOut();
    }).catch((error) => {
        console.error("Error signing out:", error);
    });
}