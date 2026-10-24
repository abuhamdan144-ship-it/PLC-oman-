import React from 'react';
import { MemberNotification } from '../types';
import { Bell, Check, X, ShieldAlert, CheckCircle, Info } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: MemberNotification[];
  onMarkAsRead: (id: string) => Promise<void>;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
      >
        {/* Header */}
        <div className="bg-[#071F25] text-white px-5 py-4 flex items-center justify-between border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center text-[#E4AE2F]">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 id="notifications-title" className="font-semibold text-base leading-tight">
                Community Notifications
              </h3>
              <p className="text-xs text-stone-300">
                Official alerts and registration updates
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1 divide-y divide-stone-100">
          {notifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 stroke-1" />
              </div>
              <p className="text-sm font-semibold text-[#071F25]">No notifications yet</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                Official announcements and updates regarding your membership review will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = !notif.read;
              return (
                <div 
                  key={notif.id} 
                  className={`pt-3 first:pt-0 pb-1 rounded-xl p-3 transition-colors ${
                    isUnread ? 'bg-amber-50/60 border border-amber-200/60' : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'approval' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : notif.type === 'alert' ? (
                        <ShieldAlert className="w-5 h-5 text-red-600" />
                      ) : (
                        <Info className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-[#071F25] truncate">
                          {notif.title}
                        </h4>
                        <span className="text-[11px] text-stone-600 shrink-0">
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                        {notif.body}
                      </p>
                      {isUnread && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => onMarkAsRead(notif.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark as read
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 p-3 text-center border-t border-stone-200">
          <button
            onClick={onClose}
            className="w-full py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
