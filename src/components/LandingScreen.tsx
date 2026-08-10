import React from 'react';

interface LandingScreenProps {
  onLoginClick: () => void;
  onSignUpClick: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onLoginClick,
  onSignUpClick,
}) => {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      {/* Prototype Card */}
      <div className="bg-[#1F5274] w-full max-w-[520px] rounded-[24px] shadow-2xl p-10 sm:p-14 text-center flex flex-col items-center justify-center border border-white/10">
        
        {/* Custom PharmaTrack Logo Image */}
        <div className="mb-6 flex justify-center items-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 relative flex items-center justify-center">
            <img 
              src="/logo/logo.png" 
              alt="PharmaTrack Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-10">
          PharmaTrack
        </h1>

        {/* Action Pill Buttons */}
        <div className="flex flex-row items-center justify-center gap-6 sm:gap-8 w-full">
          <button
            type="button"
            onClick={onLoginClick}
            className="px-8 sm:px-10 py-2.5 sm:py-3 bg-white text-slate-900 font-medium text-sm sm:text-base rounded-full shadow-md hover:bg-slate-100 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer min-w-[120px] sm:min-w-[140px]"
          >
            Login
          </button>

          <button
            type="button"
            onClick={onSignUpClick}
            className="px-8 sm:px-10 py-2.5 sm:py-3 bg-white text-slate-900 font-medium text-sm sm:text-base rounded-full shadow-md hover:bg-slate-100 transition-all hover:scale-[1.03] active:scale-95 cursor-pointer min-w-[120px] sm:min-w-[140px]"
          >
            Sign Up
          </button>
        </div>

      </div>
    </div>
  );
};
