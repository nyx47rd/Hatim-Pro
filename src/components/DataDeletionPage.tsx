import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface DataDeletionPageProps {
  onBack: () => void;
}

export function DataDeletionPage({ onBack }: DataDeletionPageProps) {
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
            <Trash2 size={20} className="text-sage-500" />
            <h1>Veri Silme Talimatları</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-10 shadow-sm border border-sage-100 dark:border-neutral-800">
          <div className="prose dark:prose-invert max-w-none text-sage-700 dark:text-neutral-300">
            <h3 className="text-xl font-bold text-sage-900 dark:text-white mb-4">Facebook Veri Silme Talimatları</h3>
            <p className="mb-6 leading-relaxed">
              HatimPro, Facebook Platform Kuralları gereği, kullanıcılara verilerini silme hakkı tanır. Eğer Facebook hesabınızla giriş yaptıysanız ve verilerinizin silinmesini istiyorsanız, aşağıdaki adımları izleyebilirsiniz:
            </p>

            <h4 className="text-lg font-bold text-sage-900 dark:text-white mb-2">Yöntem 1: Uygulama İçinden Silme</h4>
            <ol className="list-decimal list-inside mb-6 space-y-2">
              <li>HatimPro uygulamasını açın.</li>
              <li><strong>Ayarlar</strong> menüsüne gidin.</li>
              <li>Sayfanın en altındaki "Tehlikeli Bölge" alanına gelin.</li>
              <li><strong>"Hesabı Sil"</strong> butonuna tıklayın ve onaylayın.</li>
              <li>Bu işlem, tüm verilerinizi veritabanımızdan kalıcı olarak silecektir.</li>
            </ol>

            <h4 className="text-lg font-bold text-sage-900 dark:text-white mb-2">Yöntem 2: Facebook Ayarlarından Kaldırma</h4>
            <ol className="list-decimal list-inside mb-6 space-y-2">
              <li>Facebook hesabınıza gidin ve <strong>Ayarlar ve Gizlilik</strong> &gt; <strong>Ayarlar</strong> menüsüne tıklayın.</li>
              <li>Sol menüden <strong>Uygulamalar ve İnternet Siteleri</strong> seçeneğine gidin.</li>
              <li>Listede <strong>"HatimPro"</strong> uygulamasını bulun.</li>
              <li><strong>"Kaldır"</strong> butonuna tıklayın.</li>
              <li>Açılan pencerede "HatimPro tarafından paylaşılan gönderileri, videoları veya etkinlikleri sil" seçeneğini işaretleyip tekrar "Kaldır"a tıklayın.</li>
            </ol>

            <div className="bg-sage-50 dark:bg-neutral-800 p-4 rounded-xl border border-sage-100 dark:border-neutral-700 mt-8">
              <p className="text-sm font-medium text-sage-800 dark:text-white mb-2">Veri Silme Talep URL'si (Callback)</p>
              <p className="text-xs text-sage-600 dark:text-neutral-400 break-all">
                https://hatimpro.vercel.app/data-deletion
              </p>
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
