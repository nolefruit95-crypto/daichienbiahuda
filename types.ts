export enum GameState {
  IDLE = 'IDLE',
  RACING = 'RACING',
  FINISHED = 'FINISHED'
}

export interface Player {
  id: string;
  name: string;
  beerLevel: number; // 100 (full) to 0 (empty)
  rank: number | null; // 1st, 2nd, etc.
  speedFactor: number; // Random speed multiplier
  avatarColor: string;
  imageUrl?: string; // URL for the player's uploaded photo
  prizeMoney?: number; // Amount won in VND
}

export const DEFAULT_PLAYER_NAMES = ['Cheo', 'Ụ', 'Đức', 'Tin', 'Thi', 'Thầy Tài'];

export const BET_OPTIONS = [10000, 20000, 30000, 50000, 100000, 200000, 500000];