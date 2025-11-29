import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  price: number;
  configSummary: string;
}

export const OrderModal: React.FC<OrderModalProps> = ({ isOpen, onClose, price, configSummary }) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setStep('success');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        {step === 'form' ? (
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Заявка на расчет</h3>
                <p className="text-slate-500 mt-1">Менеджер свяжется с вами для уточнения деталей.</p>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-100">
               <div className="text-xs text-slate-400 uppercase font-bold mb-1">Предварительный расчет</div>
               <div className="text-2xl font-bold text-teal-700">{price.toLocaleString('ru-RU')} ₽</div>
               <div className="text-xs text-slate-500 mt-2 line-clamp-2">{configSummary}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ваше имя</label>
                <input required type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" placeholder="Александр" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                <input required type="tel" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all" placeholder="+7 (999) 000-00-00" />
              </div>
              
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg mt-2 flex justify-center items-center gap-2 ${loading ? 'opacity-80 cursor-wait' : 'hover:bg-slate-800'}`}
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Отправить заявку'}
              </button>
            </form>
             <p className="text-xs text-slate-400 text-center mt-4">Нажимая кнопку, вы соглашаетесь с политикой обработки персональных данных</p>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
               <Check className="w-8 h-8" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 mb-2">Заявка принята!</h3>
             <p className="text-slate-500 mb-8">Спасибо за обращение. Наш менеджер свяжется с вами в течение 15 минут.</p>
             <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors">
               Закрыть
             </button>
          </div>
        )}
      </div>
    </div>
  );
};