import React from 'react';
import { PakistanLabourCommunityLogo } from '../lib/logo';

export const LoadingSkeleton: React.FC<{ message?: string }> = ({ 
  message = "Verifying community credentials..." 
}) => {
  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-amber-900/10 max-w-sm w-full text-center flex flex-col items-center">
        <div className="animate-pulse mb-4">
          <PakistanLabourCommunityLogo size={64} />
        </div>
        <h2 className="text-xl font-bold text-[#071F25] mb-2 font-heading">
          Pakistan Labour Community
        </h2>
        <div className="flex items-center justify-center space-x-2 my-4">
          <div className="w-2.5 h-2.5 bg-[#0D5A31] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2.5 h-2.5 bg-[#E4AE2F] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2.5 h-2.5 bg-[#071F25] rounded-full animate-bounce"></div>
        </div>
        <p className="text-sm text-stone-600 font-medium">{message}</p>
      </div>
    </div>
  );
};
