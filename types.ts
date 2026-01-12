
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

export enum Class {
  FIGHTER_DEFENDER = 'Luchador/Defensor',
  PRIEST = 'Cura',
  MAGE = 'Mago',
  ARCHER_RANGER = 'Arquero/Ranger',
  WAR_GUARDIAN = 'War/Guardian',
  ORACLE_PAGAN = 'Oraculo/Pagano',
  ASSASSIN = 'Asesino',
  HUNTER = 'Hunter'
}

export type LuzClass = 'Luchador/Defensor' | 'Cura' | 'Mago' | 'Arquero/Ranger';
export type FuriaClass = 'War/Guardian' | 'Oraculo/Pagano' | 'Asesino' | 'Hunter';

export const CLASSES_BY_FACTION = {
  [Faction.LIGHT]: ['Luchador/Defensor', 'Cura', 'Mago', 'Arquero/Ranger'] as LuzClass[],
  [Faction.FURY]: ['War/Guardian', 'Oraculo/Pagano', 'Asesino', 'Hunter'] as FuriaClass[],
  [Faction.NEUTRAL]: [] as string[]
};

export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Femenino',
  BOTH = 'Ambos'
}

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
}

export interface StaffApplication {
  id: string;
  username: string;
  discord_id: string;
  discord_user_id: string; // ID numérico para auto-rol
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
