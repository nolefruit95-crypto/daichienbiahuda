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
    // Dimensions tailored for the "Arm" component
    <div className="relative w-8 h-16 md:w-12 md:h-24 group preserve-3d">
      
      {/* Glass Container - Cylinder Effect */}
      <div className="absolute inset-0 rounded-b-lg border-2 md:border-4 border-white/40 border-t-0 overflow-hidden z-10 shadow-[inset_-5px_0_10px_rgba(0,0,0,0.2)] backdrop-blur-[2px]"
           style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.2) 100%)' }}>
        
        {/* The Beer Liquid */}
        <div 
          className={`absolute bottom-0 left-0 w-full transition-all ${level > 0 ? 'border-t-2 border-white/50' : ''}`}
          style={{ 
              ...liquidStyle,
              background: 'linear-gradient(90deg, #d97706 0%, #f59e0b 40%, #d97706 100%)' // Amber gradient for cylinder effect
          }}
        >
          {/* Bubbles inside beer */}
          {level > 5 && (
            <div className="w-full h-full relative overflow-hidden">
               <div className="absolute bottom-2 left-2 w-1 h-1 bg-white/40 rounded-full animate-bubble" style={{ animationDelay: '0s' }}></div>
               <div className="absolute bottom-6 left-1/2 w-1.5 h-1.5 bg-white/40 rounded-full animate-bubble" style={{ animationDelay: '0.5s' }}></div>
               <div className="absolute bottom-4 right-2 w-1 h-1 bg-white/40 rounded-full animate-bubble" style={{ animationDelay: '1.2s' }}></div>
            </div>
          )}
        </div>

        {/* Empty State Text */}
        {isFinished && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/10">
                <span className="text-green-300 font-bold text-[10px] md:text-xs drop-shadow-md -rotate-12 border border-green-300 px-1 rounded">HẾT</span>
            </div>
        )}
      </div>

      {/* Handle of the mug - Side perspective */}
      <div className="absolute top-3 -right-2 w-4 h-10 md:top-4 md:-right-3 md:w-6 md:h-14 border-4 border-l-0 border-white/40 rounded-r-xl z-0 shadow-md"></div>
      
      {/* Reflection Highlight */}
      <div className="absolute top-1 left-1 w-1 h-[90%] bg-white/20 rounded-full z-20 pointer-events-none blur-[1px]"></div>
    </div>
  );
};

export default BeerGlass;