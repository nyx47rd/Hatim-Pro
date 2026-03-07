import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield, Book } from 'lucide-react';

interface LegalPageProps {
  type: 'privacy' | 'terms';
  onBack: () => void;
}

export function LegalPage({ type, onBack }: LegalPageProps) {
  const isPrivacy = type === 'privacy';
  const title = isPrivacy ? 'Gizlilik Politikası' : 'Kullanım Koşulları';
  const Icon = isPrivacy ? Shield : Book;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-sage-50 dark:bg-black pb-20"
    >
      <header className="bg-white dark:bg-neutral-900 border-b border-sage-100 dark:border-neutral-800 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-sage-50 dark:hover:bg-neutral-800 rounded-xl transition-colors text-sage-600 dark:text-neutral-400"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2 text-sage-800 dark:text-white font-bold text-lg">
            <Icon size={20} className="text-sage-500" />
            <h1>{title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-10 shadow-sm border border-sage-100 dark:border-neutral-800">
          <div className="prose dark:prose-invert max-w-none text-sage-700 dark:text-neutral-300">
            {isPrivacy ? (
              <>
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">1. Veri Toplama</h3>
                <p className="mb-6 leading-relaxed">HatimPro, kullanıcı deneyimini geliştirmek amacıyla ad, e-posta adresi ve profil fotoğrafı gibi temel profil bilgilerinizi toplar. Ayrıca, uygulama içindeki hatim ve zikir ilerlemeleriniz bulut sunucularımızda (Firebase) güvenle saklanır.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">2. Veri Kullanımı</h3>
                <p className="mb-6 leading-relaxed">Toplanan veriler yalnızca size hizmet sunmak, ilerlemenizi cihazlar arasında senkronize etmek ve arkadaşlarınızla ortak zikir odaları oluşturabilmeniz için kullanılır. Verileriniz kesinlikle üçüncü taraf reklam şirketleriyle paylaşılmaz.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">3. Veri Güvenliği</h3>
                <p className="mb-6 leading-relaxed">Kullanıcı verileri, endüstri standardı şifreleme yöntemleriyle korunmaktadır. Şifreleriniz hash'lenerek saklanır ve tarafımızca görülemez. Google, Facebook, Apple veya Microsoft gibi üçüncü taraf giriş yöntemleri kullanıldığında, bu platformların güvenlik standartları geçerlidir.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">4. Hesap Silme</h3>
                <p className="mb-6 leading-relaxed">Kullanıcılar diledikleri zaman "Ayarlar" menüsünden hesaplarını ve tüm ilişkili verilerini kalıcı olarak silebilirler. Bu işlem geri alınamaz.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">5. İletişim</h3>
                <p className="mb-6 leading-relaxed">Gizlilik politikamızla ilgili sorularınız için hatimpro.app@gmail.com adresinden bizimle iletişime geçebilirsiniz.</p>
                
                <div className="mt-12 pt-6 border-t border-sage-100 dark:border-neutral-800 text-sm text-sage-500">
                  Son Güncelleme: 7 Mart 2026
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">1. Hizmetin Kullanımı</h3>
                <p className="mb-6 leading-relaxed">HatimPro uygulamasını kullanarak bu koşulları kabul etmiş sayılırsınız. Uygulama, kişisel ibadet takibi ve sosyal zikir odaları oluşturma amacıyla sunulmaktadır.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">2. Kullanıcı Sorumlulukları</h3>
                <p className="mb-6 leading-relaxed">Kullanıcılar, hesaplarının güvenliğinden kendileri sorumludur. Ortak zikir odalarında diğer kullanıcılara saygılı davranılması esastır. Rahatsız edici veya uygunsuz davranışlarda bulunan hesaplar askıya alınabilir.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">3. Hizmet Kesintileri</h3>
                <p className="mb-6 leading-relaxed">HatimPro, hizmetin kesintisiz çalışması için çaba gösterir ancak teknik arızalar, bakım çalışmaları veya mücbir sebeplerden dolayı oluşabilecek veri kayıpları veya kesintilerden sorumlu tutulamaz.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">4. Fikri Mülkiyet</h3>
                <p className="mb-6 leading-relaxed">Uygulamanın tasarımı, kodları ve içerikleri HatimPro'ya aittir. İzinsiz kopyalanamaz veya çoğaltılamaz.</p>
                
                <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">5. Değişiklikler</h3>
                <p className="mb-6 leading-relaxed">HatimPro, bu kullanım koşullarını dilediği zaman değiştirme hakkını saklı tutar. Önemli değişiklikler kullanıcılara bildirilecektir.</p>
                
                <div className="mt-12 pt-6 border-t border-sage-100 dark:border-neutral-800 text-sm text-sage-500">
                  Son Güncelleme: 7 Mart 2026
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </motion.div>
  );
}
