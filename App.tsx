import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Volume2, VolumeX, Coins, ChevronDown, UserPlus, X, Sparkles, BarChart3, ArrowUpRight, ArrowDownRight, Play, RefreshCw, Beer } from 'lucide-react';
import { Player, GameState, DEFAULT_PLAYER_NAMES, BET_OPTIONS } from './types';
import PlayerCard from './components/PlayerCard';
import { generatePenalty, generateCommentary } from './services/geminiService';

// Helper to get random colors
const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#6366f1', '#a855f7', '#db2777'
];

type FinishedViewMode = 'NONE' | 'WINNERS' | 'PENALTY';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loserPenalty, setLoserPenalty] = useState<string>('');
  const [winnerComment, setWinnerComment] = useState<string>('');
  const [loadingPenalty, setLoadingPenalty] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [finishedView, setFinishedView] = useState<FinishedViewMode>('NONE');
  
  // Betting State
  const [betAmount, setBetAmount] = useState<number>(20000);

  // Stats State
  const [playerStats, setPlayerStats] = useState<Record<string, number>>({}); // Money
  const [beerStats, setBeerStats] = useState<Record<string, number>>({}); // Total Beers drunk
  const [showStats, setShowStats] = useState(false);

  const loopRef = useRef<number | null>(null);

  // --- Audio System (Web Audio API) ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const bubblesGainRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playBubbleSound = () => {
    if (!soundEnabled || !audioContextRef.current) return;

    const bufferSize = 4096;
    const brownNoise = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);
    brownNoise.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; 
        }
    };
    let lastOut = 0;

    const filter = audioContextRef.current.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gainNode = audioContextRef.current.createGain();
    gainNode.gain.value = 0.15;

    brownNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    bubblesGainRef.current = gainNode;
  };

  const stopBubbleSound = () => {
    if (bubblesGainRef.current) {
        const gain = bubblesGainRef.current;
        gain.gain.linearRampToValueAtTime(0, audioContextRef.current!.currentTime + 0.2);
        setTimeout(() => {
            gain.disconnect();
        }, 200);
        bubblesGainRef.current = null;
    }
  };

  const playWinSound = () => {
      if (!soundEnabled || !audioContextRef.current) return;
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioContextRef.current.currentTime); 
      osc.frequency.setValueAtTime(659.25, audioContextRef.current.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, audioContextRef.current.currentTime + 0.2);
      
      gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 1);

      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      osc.start();
      osc.stop(audioContextRef.current.currentTime + 1);
  };
  // ------------------------------------

  // Initialize Players
  useEffect(() => {
    if (players.length === 0) {
        const initialPlayers: Player[] = DEFAULT_PLAYER_NAMES.map((name, index) => ({
            id: `p-${Date.now()}-${index}`,
            name,
            beerLevel: 100,
            rank: null,
            speedFactor: 0.2 + Math.random() * 0.8,
            avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
            prizeMoney: 0
        }));
        setPlayers(initialPlayers);
    }
    
    return () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };
  }, []); 

  const handleImageUpload = (playerId: string, file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
            return { ...p, imageUrl };
        }
        return p;
    }));
  };

  const addPlayer = () => {
    const newId = `p-${Date.now()}`;
    const newPlayer: Player = {
        id: newId,
        name: `P${players.length + 1}`,
        beerLevel: 100,
        rank: null,
        speedFactor: 0.2 + Math.random() * 0.8,
        avatarColor: AVATAR_COLORS[players.length % AVATAR_COLORS.length],
        prizeMoney: 0
    };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const removePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const updatePlayerName = (id: string, newName: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  // Game Loop
  useEffect(() => {
    if (gameState !== GameState.RACING) {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
      stopBubbleSound();
      return;
    }

    initAudio();
    playBubbleSound();

    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      setPlayers(prevPlayers => {
        let newFinishedCount = 0;
        const currentlyFinishedCount = prevPlayers.filter(p => p.beerLevel <= 0).length;
        let nextRank = currentlyFinishedCount + 1;

        const nextPlayers = prevPlayers.map(p => {
          if (p.beerLevel <= 0) {
            return p;
          }

          const instantSpeed = (Math.random() * 1.2 + 0.5) * p.speedFactor; 
          const decrement = instantSpeed * (delta / 1000) * 8; 

          const newLevel = Math.max(0, p.beerLevel - decrement);
          
          if (newLevel <= 0 && p.beerLevel > 0) {
            return { ...p, beerLevel: 0, rank: nextRank++ };
          }

          return { ...p, beerLevel: newLevel };
        });

        if (nextPlayers.every(p => p.beerLevel <= 0)) {
            setGameState(GameState.FINISHED);
        }

        return nextPlayers;
      });

      loopRef.current = requestAnimationFrame(loop);
    };

    loopRef.current = requestAnimationFrame(loop);

    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameState]);


  // Handle Game Finished & Calculate Prizes & Stats
  useEffect(() => {
    if (gameState === GameState.FINISHED) {
      playWinSound();
      
      const totalPot = players.length * betAmount;
      const rawSecond = totalPot * 0.3;
      const rawThird = totalPot * 0.2;
      const roundTo5k = (num: number) => Math.round(num / 5000) * 5000;
      const prizeSecond = roundTo5k(rawSecond);
      const prizeThird = roundTo5k(rawThird);
      const prizeFirst = totalPot - prizeSecond - prizeThird;
      
      // Determine ranks and prizes
      let maxRank = 0;
      players.forEach(p => { if(p.rank && p.rank > maxRank) maxRank = p.rank; });

      const updatedPlayers = players.map(p => {
          let prize = 0;
          if (p.rank === 1) prize = prizeFirst;
          if (p.rank === 2) prize = prizeSecond;
          if (p.rank === 3) prize = prizeThird;
          return { ...p, prizeMoney: prize };
      });

      setPlayers(updatedPlayers);

      // --- UPDATE STATS ---
      setPlayerStats(prevStats => {
        const newStats = { ...prevStats };
        updatedPlayers.forEach(p => {
            const prize = p.prizeMoney || 0;
            const netChange = prize - betAmount;
            newStats[p.id] = (newStats[p.id] || 0) + netChange;
        });
        return newStats;
      });

      // --- UPDATE BEER STATS (ONLY LOSER) ---
      const loser = updatedPlayers.find(p => p.rank === maxRank);
      if (loser) {
          setBeerStats(prev => ({
              ...prev,
              [loser.id]: (prev[loser.id] || 0) + 1
          }));
      }

      const winner = updatedPlayers.find(p => p.rank === 1);
      
      setFinishedView('WINNERS');

      if (loser) {
        setLoadingPenalty(true);
        Promise.all([
            generatePenalty(loser.name),
            winner ? generateCommentary(winner.name) : Promise.resolve("")
        ]).then(([penalty, comment]) => {
            setLoserPenalty(penalty);
            setWinnerComment(comment);
            setLoadingPenalty(false);
        });
      }

      setTimeout(() => {
        setFinishedView('PENALTY');
      }, 4000);
    }
  }, [gameState]);

  const startGame = () => {
    if (players.length < 2) {
        alert("Cần ít nhất 2 người chơi để bắt đầu!");
        return;
    }

    initAudio(); 
    setPlayers(prev => prev.map(p => ({
        ...p,
        beerLevel: 100,
        rank: null,
        prizeMoney: 0,
        speedFactor: 0.5 + Math.random() * 1.5 
    })));
    setLoserPenalty('');
    setWinnerComment('');
    setFinishedView('NONE');
    setGameState(GameState.RACING);
  };

  const resetGame = () => {
    setPlayers(prev => prev.map(p => ({
        ...p,
        beerLevel: 100,
        rank: null,
        prizeMoney: 0,
        speedFactor: 0.2 + Math.random() * 0.8
    })));
    setLoserPenalty('');
    setWinnerComment('');
    setFinishedView('NONE');
    setGameState(GameState.IDLE);
  };

  const loser = players.find(p => p.rank === players.length);
  const winner = players.find(p => p.rank === 1);
  const second = players.find(p => p.rank === 2);
  const third = players.find(p => p.rank === 3);
  const totalPot = players.length * betAmount;

  const formatCurrency = (amount: number) => {
     return (amount / 1000) + 'k';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col overflow-hidden relative">
      
      {/* Background 3D Environment Hints */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-950 to-black opacity-80 pointer-events-none z-0" />
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" 
           style={{ 
             backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)',
             backgroundSize: '50px 50px',
             transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)'
           }} 
      />

      {/* Header */}
      <header className="p-2 text-center bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800 shadow-2xl">
        <h1 className="text-xl md:text-4xl font-hand font-bold text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.5)] flex items-center justify-center gap-2 mb-1 uppercase tracking-wider">
          <Beer className="w-5 h-5 md:w-10 md:h-10 animate-bounce text-yellow-400" />
          Đại Chiến Bia 3D
        </h1>
        
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-4">
            {/* Bet Selection */}
            <div className="bg-slate-800 rounded-full px-2 py-0.5 md:px-4 md:py-2 flex items-center gap-2 border border-slate-700 scale-90 md:scale-100 shadow-inner">
                <span className="text-slate-400 text-xs md:text-sm font-bold">Cược:</span>
                {gameState === GameState.IDLE ? (
                    <select 
                        value={betAmount} 
                        onChange={(e) => setBetAmount(Number(e.target.value))}
                        className="bg-transparent font-bold text-sm md:text-base text-green-400 outline-none cursor-pointer appearance-none text-right pr-1"
                    >
                        {BET_OPTIONS.map(opt => (
                            <option key={opt} value={opt} className="bg-slate-800 text-white">
                                {formatCurrency(opt)}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="font-bold text-sm md:text-base text-green-400">{formatCurrency(betAmount)}</span>
                )}
                 {gameState === GameState.IDLE && <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-slate-500" />}
            </div>

            {/* Total Pot Display */}
            <div className="inline-flex items-center gap-1 md:gap-2 bg-slate-800 px-2 py-0.5 md:px-4 md:py-2 rounded-full border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-90 md:scale-100">
                <Coins className="text-yellow-400 w-4 h-4 md:w-5 md:h-5" />
                <span className="text-yellow-400 font-bold text-sm md:text-lg">
                    {formatCurrency(totalPot)}
                </span>
            </div>
        </div>

        {/* Top Right Controls */}
        <div className="absolute right-2 top-2 md:top-1/2 md:-translate-y-1/2 flex items-center gap-2">
            {/* Stats Toggle */}
            <div className="relative">
                <button 
                    onClick={() => setShowStats(!showStats)}
                    className={`p-1.5 md:p-2 rounded-full transition-colors ${showStats ? 'bg-green-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
                >
                    <BarChart3 className="w-4 h-4 md:w-6 md:h-6" />
                </button>

                {/* Stats Dropdown */}
                {showStats && (
                    <div className="absolute top-full right-0 mt-2 w-56 md:w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 max-h-[60vh] overflow-y-auto">
                        <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase mb-2 pb-2 border-b border-slate-700 flex justify-between items-center">
                            Bảng vàng thành tích
                            <span className="text-[9px] text-slate-500 font-normal">Tích lũy</span>
                        </h3>
                        <div className="space-y-1">
                            {players.map(p => {
                                const balance = playerStats[p.id] || 0;
                                const beers = beerStats[p.id] || 0;
                                return (
                                    <div key={p.id} className="flex justify-between items-center text-xs md:text-sm p-1.5 hover:bg-slate-700/50 rounded border-b border-slate-700/50 last:border-0">
                                        <span className="font-bold truncate w-20 md:w-28">{p.name}</span>
                                        <div className="flex items-center gap-3">
                                            {/* Beers Count */}
                                            <span className="flex items-center text-amber-400 font-mono text-xs">
                                                <Beer className="w-3 h-3 mr-1" />
                                                {beers}
                                            </span>
                                            
                                            {/* Money */}
                                            <span className={`font-mono flex items-center w-16 justify-end ${balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                {balance > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5"/> : balance < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5"/> : null}
                                                {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                             {Object.keys(playerStats).length === 0 && (
                                <p className="text-center text-slate-500 text-xs italic py-2">Chưa có dữ liệu</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 md:p-2 rounded-full hover:bg-slate-800 transition-colors"
            >
                {soundEnabled ? <Volume2 className="w-4 h-4 md:w-6 md:h-6 text-green-400" /> : <VolumeX className="w-4 h-4 md:w-6 md:h-6 text-red-400" />}
            </button>
        </div>
      </header>

      {/* Main Game Area - 3D SPACE */}
      <main className="flex-grow flex flex-col items-center justify-center w-full relative overflow-hidden perspective-container">
        <style>{`
          .perspective-container {
            perspective: 1000px;
            perspective-origin: center 30%;
          }
          .preserve-3d {
            transform-style: preserve-3d;
          }
        `}</style>
        
        {/* WINNERS CELEBRATION OVERLAY */}
        {finishedView === 'WINNERS' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-yellow-400/50 animate-bounce-in text-center shadow-2xl w-[90%] md:w-auto">
                <h2 className="text-2xl md:text-4xl font-hand font-bold text-yellow-400 mb-4 drop-shadow-lg flex items-center justify-center gap-2">
                    <Sparkles className="text-yellow-200" />
                    CHÚC MỪNG
                    <Sparkles className="text-yellow-200" />
                </h2>
                <div className="space-y-3">
                    {winner && (
                        <div className="flex items-center justify-between bg-gradient-to-r from-yellow-600 to-yellow-800 p-2 rounded-lg shadow-lg border border-yellow-300">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🥇</span>
                                <span className="font-bold text-white text-lg">{winner.name}</span>
                            </div>
                            <span className="font-bold text-yellow-100 text-xl">+{formatCurrency(winner.prizeMoney || 0)}</span>
                        </div>
                    )}
                    {second && (
                        <div className="flex items-center justify-between bg-slate-700 p-2 rounded-lg shadow border border-slate-400">
                             <div className="flex items-center gap-2">
                                <span className="text-xl">🥈</span>
                                <span className="font-bold text-slate-200">{second.name}</span>
                            </div>
                            <span className="font-bold text-slate-300">+{formatCurrency(second.prizeMoney || 0)}</span>
                        </div>
                    )}
                    {third && (
                        <div className="flex items-center justify-between bg-orange-900/60 p-2 rounded-lg shadow border border-orange-700">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🥉</span>
                                <span className="font-bold text-orange-100">{third.name}</span>
                            </div>
                            <span className="font-bold text-orange-200">+{formatCurrency(third.prizeMoney || 0)}</span>
                        </div>
                    )}
                </div>
            </div>
          </div>
        )}

        {/* PENALTY MODAL */}
        {finishedView === 'PENALTY' && (
          <div className="w-full max-w-2xl mb-4 animate-fade-in-up absolute z-50 top-10 md:top-20 px-4 md:static">
             <div className="bg-gradient-to-r from-red-900/95 to-slate-900/95 border border-red-500/50 p-4 md:p-6 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-lg">
                <button onClick={resetGame} className="absolute top-2 right-2 p-2 text-slate-400 hover:text-white md:hidden">
                    <X className="w-6 h-6" />
                </button>
                
                <div className="relative z-10 text-center">
                    <h2 className="text-xl md:text-3xl font-bold text-red-400 mb-2">Người Thua: {loser?.name}</h2>
                    {winnerComment && (
                         <p className="text-amber-300 italic text-xs md:text-sm mb-4">🏆 {winner?.name}: "{winnerComment}"</p>
                    )}
                    
                    <div className="bg-black/40 p-4 md:p-6 rounded-xl backdrop-blur-sm border border-white/10">
                        <h3 className="text-base md:text-xl text-slate-300 mb-2 font-semibold">Hình Phạt:</h3>
                        {loadingPenalty ? (
                            <div className="flex justify-center gap-2">
                                <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s'}}></div>
                            </div>
                        ) : (
                            <p className="text-xl md:text-5xl font-hand text-amber-300 leading-relaxed animate-pulse drop-shadow-lg">
                                {loserPenalty}
                            </p>
                        )}
                    </div>
                    <div className="mt-4 md:hidden">
                        <button 
                        onClick={resetGame}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-full shadow-lg flex items-center justify-center gap-2 border border-slate-500 mx-auto"
                        >
                        <RefreshCw className="w-4 h-4" />
                        Làm Ván Mới
                        </button>
                    </div>
                </div>
             </div>
          </div>
        )}

        {/* 3D Player Table Scene */}
        <div className="preserve-3d flex justify-center items-end gap-2 md:gap-8 w-full max-w-6xl px-4 pb-20 transform transition-transform duration-1000 origin-bottom" style={{ transform: gameState === GameState.RACING ? 'rotateX(5deg) translateY(20px)' : 'rotateX(10deg)' }}>
          {players.map(player => (
            <PlayerCard 
                key={player.id} 
                player={player} 
                isLoser={finishedView === 'PENALTY' && player.rank === players.length}
                isWinner={player.rank === 1}
                totalBeers={beerStats[player.id] || 0}
                isEditable={gameState === GameState.IDLE}
                onUploadImage={gameState === GameState.IDLE ? (file) => handleImageUpload(player.id, file) : undefined}
                onRemove={gameState === GameState.IDLE ? () => removePlayer(player.id) : undefined}
                onNameChange={gameState === GameState.IDLE ? (name) => updatePlayerName(player.id, name) : undefined}
                gameState={gameState}
            />
          ))}
          
          {/* Add Player "Seat" */}
          {gameState === GameState.IDLE && (
              <div className="flex flex-col items-center justify-end h-[200px] md:h-[300px] pb-4">
                <button 
                    onClick={addPlayer}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-slate-800/50 border-2 border-dashed border-slate-600 hover:border-green-400 hover:bg-slate-800 flex items-center justify-center group transition-all shadow-xl hover:shadow-green-500/20 hover:-translate-y-2"
                >
                    <UserPlus className="w-6 h-6 md:w-10 md:h-10 text-slate-500 group-hover:text-green-400" />
                </button>
                <span className="mt-2 text-slate-500 text-xs font-bold">Thêm ghế</span>
              </div>
          )}
        </div>

        {/* Controls */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full flex justify-center pointer-events-auto">
          {gameState === GameState.IDLE && (
            <div className="flex flex-col items-center gap-1">
                <button 
                onClick={startGame}
                className="group relative px-8 py-3 md:px-12 md:py-5 bg-gradient-to-b from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white font-bold text-xl md:text-2xl rounded-2xl shadow-[0_10px_30px_rgba(34,197,94,0.4),0_4px_0_#15803d] transition-all hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-none flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap border border-green-400/30"
                disabled={players.length < 2}
                >
                <Play className="w-6 h-6 md:w-8 md:h-8 fill-current" />
                ZÔ 100%
                <span className="absolute -inset-1 rounded-xl bg-white opacity-10 group-hover:animate-pulse"></span>
                </button>
            </div>
          )}

          {gameState === GameState.RACING && (
             <div className="text-xl md:text-3xl font-hand font-bold text-white animate-pulse flex items-center gap-3 bg-black/60 backdrop-blur px-8 py-3 rounded-full border border-green-500/50 shadow-2xl">
                <Beer className="animate-spin w-6 h-6 md:w-8 md:h-8 text-yellow-400" />
                Đang nốc...
             </div>
          )}

          {gameState === GameState.FINISHED && (
            <button 
              onClick={resetGame}
              className="hidden md:flex px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xl rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 items-center gap-3 border border-slate-500"
            >
              <RefreshCw className="w-6 h-6" />
              Làm Ván Mới
            </button>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;