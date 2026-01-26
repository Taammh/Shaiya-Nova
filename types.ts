
export enum Category {
  MOUNT = 'Montura',
  COSTUME = 'Traje',
  TRANSFORMATION = 'Transformación',
  PROMOTION = 'Promoción'
}

export enum Faction {
  LIGHT = 'Luz',
  FURY = 'Furia',
  NEUTRAL = 'Neutral'
}

export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Femenino',
  BOTH = 'Ambos'
}

// Map of classes per faction for filtering costumes
export const CLASSES_BY_FACTION: Record<Faction, string[]> = {
  [Faction.LIGHT]: ['Luchador', 'Guardián', 'Explorador', 'Tirador', 'Mago', 'Oráculo', 'Oraculo/Pagano'],
  [Faction.FURY]: ['Guerrero', 'Guardián', 'Cazador', 'Animista', 'Pagano', 'Oráculo', 'Oraculo/Pagano'],
  [Faction.NEUTRAL]: []
};

export interface GameItem {
  id: string;
  name: string;
  category: Category;
  faction?: Faction;
  image: string;
  description: string;
  hidden_history?: string; 
  stats?: string;
  item_class?: string;
  classes?: string[];
  gender?: Gender;
  price?: string;
  rarity?: ItemRarity; // Añadido para colorear items en la lista principal
}

export interface MapPoint {
  x: number; // Porcentaje 0-100
  y: number; // Porcentaje 0-100
  color: string;
  label: string;
  type?: 'point' | 'area';
  radius?: number; // Porcentaje del ancho del mapa
}

export type ItemRarity = 'Common' | 'Noble' | 'Atroz' | 'Legendary' | 'Diosa' | 'Special' | 'Unique';

export interface DropEntry {
  itemName: string;
  itemImage: string;
  rate: string;
  rarity: ItemRarity;
}

export interface MobEntry {
  id: string;
  name: string;
  level: string;
  image: string;
  mapColor: string;
  drops: DropEntry[];
  points: MapPoint[]; // Ubicaciones en el mapa
}

export interface DropMap {
  id: string;
  name: string;
  category: 'Mapa' | 'Boss';
  faction?: Faction; 
  image: string;
  description: string;
  mobs: MobEntry[];
  created_at: string;
}

export interface StaffApplication {
  id: string;
  username: string;
  discord_id: string;
  discord_user_id: string; 
  position: 'Game Sage' | 'Lider Game Sage' | 'GM';
  answers: {
    experience: string;
    motivation: string;
    conflict: string;
    availability: string;
    contribution: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  avatar_url: string;
  created_at: string;
}

export interface SupportRequest {
  username: string;
  type: 'Bug' | 'Reportar Usuario' | 'Donación' | 'Otro';
  description: string;
  discordId: string;
  avatarUrl?: string;
}
