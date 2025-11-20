import React from 'react';

interface BeerGlassProps {
  level: number; // 0 to 100
  isFinished: boolean;
}

const BeerGlass: React.FC<BeerGlassProps> = ({ level, isFinished }) => {
  // Smooth transition logic
  const liquidStyle = {
    height: `${level}%`,
    transition: 'height 100ms linear' 
  };

  return (
    // Changed dimensions: w-6 h-10 on mobile (very compact), w-16 h-24 on desktop
    <div className="relative w-6 h-10 md:w-16 md:h-24 mx-auto group">
      {/* Glass Container */}
      <div className="absolute inset-0 border md:border-4 border-slate-300 border-t-0 rounded-b bg-slate-800/30 overflow-hidden backdrop-blur-sm z-10 shadow-sm md:shadow-xl">
        
        {/* The Beer Liquid */}
        <div 
          className={`absolute bottom-0 left-0 w-full bg-gradient-to-t from-amber-600 to-amber-400 ${level > 0 ? 'border-t md:border-t-4 border-white/50' : ''}`}
          style={liquidStyle}
        >
          {/* Wave effect at top of liquid */}
          {level > 0 && level < 100 && (
             <div className="absolute top-0 left-0 w-full h-0.5 md:h-2 bg-white/20 animate-pulse origin-center scale-110"></div>
          )}

          {/* Bubbles inside beer - Hidden on mobile to save space/performance */}
          {level > 5 && (
            <div className="hidden md:block">
               <div className="absolute bottom-2 left-2 w-2 h-2 bg-white/40 rounded-full animate-bubble" style={{ animationDelay: '0s' }}></div>
               <div className="absolute bottom-4 right-3 w-1.5 h-1.5 bg-white/40 rounded-full animate-bubble" style={{ animationDelay: '0.5s' }}></div>
            </div>
          )}
        </div>

        {/* Empty State Text */}
        {isFinished && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-[1px] animate-fade-in">
                <span className="text-green-400 font-bold text-[10px] md:text-xl drop-shadow-md rotate-[-10deg] border border-green-400 rounded px-0.5">HẾT</span>
            </div>
        )}
      </div>

      {/* Handle of the mug */}
      <div className="absolute top-1 md:top-4 -right-1.5 md:-right-4 w-2 md:w-6 h-6 md:h-12 border md:border-4 border-l-0 border-slate-300 rounded-r md:rounded-r-lg z-0"></div>
    </div>
  );
};

export default BeerGlass;