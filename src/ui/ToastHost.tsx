import { useStore } from 'zustand';
import { dismissToast, toastStore } from './toast';
import './toast.css';

export function ToastHost() {
  const toast = useStore(toastStore, (s) => s.toast);
  return (
    <div className="toast-host">
      {toast && (
        <div key={toast.id} className="toast" role="group" aria-label="Notification">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                dismissToast();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
