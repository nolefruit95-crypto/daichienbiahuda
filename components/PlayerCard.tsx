import React, { useRef } from 'react';
import { Player } from '../types';
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
}

const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  isLoser, 
  isWinner, 
  totalBeers,
  isEditable,
  onUploadImage,
  onNameChange,
  onRemove
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRankBadge = (rank: number) => {
    const baseClasses = "absolute -top-1 -right-1 md:-top-3 md:-right-3 w-4 h-4 md:w-8 md:h-8 font-bold rounded-full flex items-center justify-center shadow-lg ring-1 md:ring-2 ring-white z-30 text-[8px] md:text-base";
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
  // Calculates CSS transforms/filters based on beer level
  const getDrunkStyle = () => {
    const level = player.beerLevel;
    if (level <= 0) return {}; // Sober/Dead/Done
    
    if (level > 70) return {}; // Sober
    
    if (level > 30) {
        // Tipsy
        return {
            filter: 'sepia(0.3) hue-rotate(-10deg) saturate(1.5)',
            transform: 'rotate(3deg)',
            transition: 'all 0.5s ease'
        };
    } else {
        // DRUNK
        return {
            filter: 'blur(0.5px) sepia(0.6) hue-rotate(-30deg) saturate(2) contrast(1.2)',
            animation: 'wobble 2s infinite ease-in-out'
        };
    }
  };

  // Funny comments based on total beer count
  const getDrunkComment = (count: number) => {
      if (count === 0) return "Chưa nhấp môi";
      if (count < 3) return `${player.name} mới uống ${count} ly thôi, chưa xi-nhê!`;
      if (count < 5) return `${player.name} bắt đầu ngấm rồi, mặt đỏ kìa!`;
      if (count < 8) return `${player.name} uống ${count} ly rồi, nhìn 1 thành 2!`;
      return `${player.name} nốc ${count} ly rồi, gọi xe cẩu về!`;
  };

  const drunkStyle = getDrunkStyle();
  const showPrize = player.prizeMoney && player.prizeMoney > 0;

  return (
    <div className={`
      relative flex flex-col items-center p-1 md:p-4 rounded-lg md:rounded-xl transition-all duration-300 group/card
      ${isLoser ? 'bg-red-900/50 ring-1 md:ring-4 ring-red-500 scale-105 z-10' : ''}
      ${isWinner ? 'bg-yellow-900/30 ring-1 md:ring-2 ring-yellow-400 scale-105 z-10' : 'bg-slate-800/50'}
      hover:bg-slate-700/50
    `}>
      
      {/* --- GLOBAL STYLE FOR WOBBLE --- */}
      <style>{`
        @keyframes wobble {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
          75% { transform: rotate(-3deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>

      {/* Delete Button */}
      {isEditable && onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -left-1 md:-right-2 md:left-auto w-4 h-4 md:w-7 md:h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md z-50 opacity-100 md:opacity-0 group-hover/card:opacity-100 transition-opacity"
          title="Xóa người chơi"
        >
          <X className="w-2 h-2 md:w-4 md:h-4" />
        </button>
      )}

      {player.rank && getRankBadge(player.rank)}
      
      {/* Prize Money Badge */}
      {showPrize && (
        <div className="absolute -top-2 md:-top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[7px] md:text-xs font-bold px-1 md:px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5 z-40 whitespace-nowrap animate-bounce">
            <DollarSign className="w-1.5 h-1.5 md:w-3 md:h-3" />
            +{player.prizeMoney! / 1000}k
        </div>
      )}
      
      {/* Avatar Circle - Extremely compact for 8 players */}
      <div className="relative">
          <div 
            className={`w-8 h-8 md:w-20 md:h-20 rounded-full mb-1 md:mb-3 border border-white/20 flex items-center justify-center shadow-inner relative overflow-hidden group ${onUploadImage ? 'cursor-pointer hover:border-amber-400' : ''}`}
            style={{ 
                backgroundColor: player.imageUrl ? 'transparent' : player.avatarColor,
                ...drunkStyle
            }}
            onClick={handleAvatarClick}
          >
            {player.imageUrl ? (
              <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] md:text-2xl font-hand">{player.name.substring(0, 2)}</span>
            )}

            {/* Drunk Overlay Blush */}
            {player.beerLevel > 0 && player.beerLevel < 30 && (
                 <div className="absolute inset-0 bg-red-500/30 mix-blend-overlay rounded-full pointer-events-none"></div>
            )}

            {/* Upload Overlay - Desktop only primarily */}
            {onUploadImage && (
              <div className="hidden md:flex absolute inset-0 bg-black/50 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
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

      <div className="mb-0.5 md:mb-2 w-full flex justify-center">
        <BeerGlass level={player.beerLevel} isFinished={player.beerLevel <= 0} />
      </div>

      {/* Editable Name */}
      {isEditable && onNameChange ? (
        <div className="w-full relative group/edit">
          <input 
            type="text" 
            value={player.name} 
            onChange={(e) => onNameChange(e.target.value)}
            className="text-[9px] md:text-lg font-bold w-full text-center bg-transparent border-b border-transparent hover:border-slate-500 focus:border-amber-400 outline-none text-amber-100 pb-0 md:pb-1 transition-colors"
            placeholder="Tên..."
          />
          <Edit2 className="w-2 h-2 md:w-3 md:h-3 text-slate-500 absolute right-0 bottom-0 md:bottom-2 opacity-0 group-hover/edit:opacity-100 pointer-events-none" />
        </div>
      ) : (
        <h3 className="text-[9px] md:text-lg font-bold truncate w-full text-center text-slate-100 leading-tight px-0.5">
          {player.name}
        </h3>
      )}
      
      {/* Status Text / Beer Count */}
      <div className="mt-1 flex flex-col items-center">
        {/* Current Glass Status */}
        <div className="h-3 md:h-4 mb-0.5">
            {player.beerLevel <= 0 ? (
                <span className="text-[7px] md:text-[10px] font-bold text-green-400 uppercase tracking-wider">Đã xong</span>
            ) : (
                <span className="text-[7px] md:text-[10px] text-amber-400 font-mono">{Math.round(player.beerLevel)}%</span>
            )}
        </div>

        {/* Total Beer Stats & Funny Comment */}
        <div className="bg-slate-900/60 rounded px-2 py-1 mt-1 border border-slate-700 w-full text-center">
            <div className="text-amber-300 font-bold text-[9px] md:text-sm mb-0.5">
                🍺 x {totalBeers}
            </div>
            <p className="text-[7px] md:text-[10px] text-slate-400 italic leading-tight line-clamp-2 h-4 md:h-6">
                {getDrunkComment(totalBeers)}
            </p>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;