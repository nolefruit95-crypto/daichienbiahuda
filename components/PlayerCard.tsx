import React, { useRef } from 'react';
import { Player, GameState } from '../types';
import BeerGlass from './BeerGlass';
import { Camera, DollarSign, X, Edit2 } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  isLoser?: boolean;
  isWinner?: boolean;
  totalBeers: number;
  isEditable?: boolean;
  onUploadImage?: (file: File) => void;
  onNameChange?: (name: string) => void;
  onRemove?: () => void;
  gameState?: GameState;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  isLoser, 
  isWinner, 
  totalBeers,
  isEditable,
  onUploadImage,
  onNameChange,
  onRemove,
  gameState
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRankBadge = (rank: number) => {
    const baseClasses = "absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 md:w-12 md:h-12 font-bold rounded-full flex items-center justify-center shadow-xl ring-2 ring-white z-50 text-sm md:text-xl animate-bounce";
    switch(rank) {
      case 1: return <span className={`${baseClasses} bg-yellow-400 text-yellow-900`}>1</span>;
      case 2: return <span className={`${baseClasses} bg-gray-300 text-gray-800`}>2</span>;
      case 3: return <span className={`${baseClasses} bg-amber-700 text-amber-100`}>3</span>;
      default: return <span className={`${baseClasses} bg-slate-600 text-white`}>{rank}</span>;
    }
  };

  const handleAvatarClick = () => {
    if (onUploadImage && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
    if (event.target.value) {
      event.target.value = '';
    }
  };

  // --- DRUNK FACE LOGIC ---
  const getDrunkStyle = () => {
    if (gameState === GameState.RACING) return {}; // Serious face when drinking
    const level = player.beerLevel;
    if (level <= 0 && gameState === GameState.FINISHED) {
        // Finished/Happy
        return {
            transform: 'scale(1.1)',
            filter: 'contrast(1.1)'
        };
    }
    return {};
  };

  // Funny comments based on total beer count
  const getDrunkComment = (count: number) => {
      if (count === 0) return "Chưa nhấp môi";
      if (count < 3) return "Mới khởi động";
      if (count < 5) return "Hơi phê phê";
      if (count < 8) return "Nhìn 1 thành 2";
      return "Gọi huệ đi!";
  };

  const drunkStyle = getDrunkStyle();
  const showPrize = player.prizeMoney && player.prizeMoney > 0;

  // 3D DRINKING ANIMATION
  // When racing, the glass tilts UP towards the face
  // Calculate tilt based on remaining beer? Or just a constant drinking animation?
  // Let's make it tilt based on state
  const isDrinking = gameState === GameState.RACING && player.beerLevel > 0;
  const armRotation = isDrinking ? 'rotate-[-110deg]' : 'rotate-[-10deg]';
  const glassTilt = isDrinking ? 'rotate-[80deg] translate-y-[-10px]' : 'rotate-[0deg]';
  
  // Body color derived from avatar color but darker
  const bodyColor = player.avatarColor;

  return (
    <div className={`
      group/card relative flex flex-col items-center justify-end
      transition-all duration-500 preserve-3d
      ${isLoser ? 'z-10 scale-110' : 'z-0'}
    `}
    style={{
        width: '80px', // Fixed width for the "seat"
        height: '280px',
    }}
    >
      {/* Delete Button */}
      {isEditable && onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-0 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md z-50 opacity-0 group-hover/card:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {player.rank && getRankBadge(player.rank)}
      
      {/* Prize Money Badge */}
      {showPrize && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-0.5 z-40 whitespace-nowrap animate-bounce">
            <DollarSign className="w-3 h-3" />
            +{player.prizeMoney! / 1000}k
        </div>
      )}
      
      {/* --- THE 3D CHARACTER --- */}
      <div className="relative flex flex-col items-center w-full h-full justify-end">
        
        {/* 1. HEAD (Avatar) */}
        <div className="relative z-20 mb-[-5px] transition-transform duration-500" 
             style={{ 
                 transform: isDrinking ? 'translateY(5px) rotateX(10deg)' : 'translateY(0)',
                 transformOrigin: 'bottom center'
             }}>
             <div 
                className={`w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-white/20 shadow-2xl relative overflow-hidden bg-slate-800 ${onUploadImage ? 'cursor-pointer hover:border-amber-400' : ''}`}
                style={{ 
                    backgroundColor: player.imageUrl ? 'transparent' : player.avatarColor,
                    ...drunkStyle
                }}
                onClick={handleAvatarClick}
            >
                {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                <span className="flex items-center justify-center h-full w-full text-2xl md:text-4xl font-hand text-white drop-shadow-md">
                    {player.name.substring(0, 2)}
                </span>
                )}
                 
                 {/* Upload Overlay */}
                {onUploadImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                    </div>
                )}
            </div>
        </div>

        {/* 2. BODY (Torso) */}
        <div className="w-12 h-16 md:w-20 md:h-24 rounded-t-3xl rounded-b-xl shadow-inner relative z-10 flex justify-center"
             style={{ backgroundColor: bodyColor, filter: 'brightness(0.7)' }}>
             {/* Name Tag */}
             <div className="mt-3 px-1 w-full text-center">
                {isEditable && onNameChange ? (
                    <input 
                        type="text" 
                        value={player.name} 
                        onChange={(e) => onNameChange(e.target.value)}
                        className="w-full bg-black/20 rounded text-white text-[10px] md:text-sm font-bold text-center outline-none"
                    />
                ) : (
                    <div className="bg-black/20 rounded px-1 py-0.5 text-white text-[10px] md:text-sm font-bold truncate">
                        {player.name}
                    </div>
                )}
                {/* Beer Count Badge */}
                {isLoser && (
                    <div className="mt-1 bg-red-600 text-white text-[9px] font-bold rounded px-1 animate-pulse">
                        THUA CUỘC
                    </div>
                )}
                 <div className="mt-1 text-[8px] md:text-[10px] text-white/80 font-mono bg-black/30 rounded inline-block px-1">
                    🍺 {totalBeers}
                </div>
             </div>
        </div>

        {/* 3. ARM & HAND HOLDING BEER */}
        <div className="absolute bottom-4 left-1/2 ml-2 md:ml-4 z-30 w-4 h-24 md:w-6 md:h-32 origin-bottom transition-transform duration-[2000ms] ease-in-out"
             style={{ transform: armRotation }}>
             
             {/* The Arm */}
             <div className="w-full h-full rounded-full shadow-lg absolute bottom-0 left-0"
                  style={{ backgroundColor: bodyColor, filter: 'brightness(0.85)' }}></div>

             {/* The Hand (Circle at end of arm) */}
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full absolute -top-2 -left-2 md:-left-2 shadow-md"
                   style={{ backgroundColor: '#fca5a5' }}></div> {/* Skin color approx */}

             {/* The Beer Glass attached to Hand */}
             <div className="absolute -top-16 left-1 md:-top-24 md:-left-4 transition-transform duration-[2000ms] ease-in-out origin-bottom"
                  style={{ transform: glassTilt }}>
                 <BeerGlass level={player.beerLevel} isFinished={player.beerLevel <= 0} />
             </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Floor Shadow */}
      <div className="absolute bottom-0 w-20 h-4 bg-black/50 blur-md rounded-[100%] transform scale-y-50 translate-y-2 z-0"></div>
    </div>
  );
};

export default PlayerCard;