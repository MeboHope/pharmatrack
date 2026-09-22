import React from "react";
import {
  LogOut,
  AlertTriangle,
  X,
} from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
  userName?: string;
}

export const LogoutModal: React.FC<
  LogoutModalProps
> = ({
  isOpen,
  onClose,
  onConfirmLogout,
  userName = "Practitioner",
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close logout confirmation"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Logout icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#22577A]/15 bg-[#22577A]/10 text-[#22577A]">
            <LogOut className="h-7 w-7 stroke-[2.2]" />
          </div>

          <div>
            <h3
              id="logout-dialog-title"
              className="text-xl font-bold tracking-tight text-slate-900"
            >
              Log Out of PharmaTrack?
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Are you sure you want to log out,{" "}
              <strong className="text-slate-800">
                {userName}
              </strong>
              ? You will need to log in again to access
              dispensing controls and patient management.
            </p>
          </div>

          {/* Buttons */}
          <div className="grid w-full grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 sm:text-sm"
            >
              <AlertTriangle className="h-4 w-4 text-slate-500" />
              <span>Cancel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onConfirmLogout();
                onClose();
              }}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#22577A] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#1b4662] sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;