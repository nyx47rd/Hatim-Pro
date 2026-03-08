import React, { useEffect } from 'react';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    google: any;
  }
}

export const GoogleOneTap: React.FC = () => {
  const { user } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (user || !clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false, // Otomatik giriş yapmasın, kullanıcı seçsin
          cancel_on_tap_outside: false, // Dışarı tıklayınca kapanmasın (isteğe bağlı)
          context: 'signin', // 'signin' | 'signup' | 'use'
          ux_mode: 'popup', // 'popup' | 'redirect' (popup daha iyi deneyim sunar)
        });
        
        // One Tap prompt'unu göster
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // console.log('One Tap skipped or not displayed:', notification);
            // Burada bir şey yapmaya gerek yok, kullanıcı manuel giriş yapabilir
          }
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (window.google) {
        window.google.accounts.id.cancel();
      }
      document.body.removeChild(script);
    };
  }, [user, clientId]);

  const handleCredentialResponse = async (response: any) => {
    try {
      const credential = GoogleAuthProvider.credential(response.credential);
      await signInWithCredential(auth, credential);
      // Başarılı giriş sonrası ses çalabiliriz ama burada hook kullanamayız, App.tsx halleder
    } catch (error) {
      console.error("Google One Tap Error:", error);
    }
  };

  return null; // Bu bileşen UI render etmez, sadece script çalıştırır
};
