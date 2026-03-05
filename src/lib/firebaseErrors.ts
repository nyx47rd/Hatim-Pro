export const getFirebaseErrorMessage = (error: any): string => {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email': return 'Geçersiz e-posta adresi formatı.';
    case 'auth/user-disabled': return 'Bu kullanıcı hesabı devre dışı bırakılmış.';
    case 'auth/user-not-found': return 'Bu e-posta adresine kayıtlı kullanıcı bulunamadı.';
    case 'auth/wrong-password': return 'Hatalı şifre girdiniz.';
    case 'auth/email-already-in-use': return 'Bu e-posta adresi zaten kullanımda.';
    case 'auth/weak-password': return 'Şifre çok zayıf. En az 6 karakter olmalıdır.';
    case 'auth/invalid-credential': return 'E-posta veya şifre hatalı.';
    case 'auth/account-exists-with-different-credential': return 'Bu e-posta adresi farklı bir giriş yöntemiyle (Google/GitHub vb.) zaten kayıtlı.';
    case 'auth/requires-recent-login': return 'Bu işlem için yeniden giriş yapmanız gerekmektedir.';
    case 'auth/too-many-requests': return 'Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin.';
    case 'auth/popup-closed-by-user': return 'Giriş penceresi kullanıcı tarafından kapatıldı.';
    case 'auth/multi-factor-auth-required': return 'İki faktörlü doğrulama (2FA) gereklidir.';
    case 'auth/invalid-verification-code': return 'Girdiğiniz doğrulama kodu hatalı.';
    case 'auth/missing-verification-code': return 'Lütfen doğrulama kodunu girin.';
    case 'auth/unsupported-tenant-operation': return 'Bu özellik şu anda desteklenmiyor (Identity Platform gerekli).';
    default: return error?.message ? `Bir hata oluştu: ${error.message}` : 'Bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }
};
