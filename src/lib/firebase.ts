import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider, OAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = 'tr';
export const db = getFirestore(app);

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('read:user');
githubProvider.addScope('user:email');

export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('User.Read');

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('public_profile');
facebookProvider.addScope('email');
facebookProvider.setCustomParameters({
  'display': 'popup'
});
