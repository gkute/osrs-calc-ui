export interface HiscoreEntry {
  skillName: string;
  rank: number;
  level: number;
  experience: number;
}

export interface SkillAction {
  name: string;
  category: string;
  levelRequired: number;
  experience?: number;
  members?: boolean;
  notes?: string;
  itemId?: number;
  // Farming-specific
  plantXp?: number;
  harvestXp?: number;
  totalXp?: number;
  growthTime?: string;
  payment?: string;
  paymentQuantity?: number;
  saplingItemId?: number;
  paymentItemId?: number;
  // Herblore-specific
  ingredients?: Ingredient[];
  outputItemId?: number;
  // Smithing-specific
  questRequirement?: string;
}

export interface Ingredient {
  name: string;
  itemId?: number;
  quantity: number;
}

export interface FarmingPatch {
  location: string;
  patchType: string;
  farmingLevelRequired: number;
  questRequired?: string;
  otherSkillLevel?: number;
  otherSkillName?: string;
  patchCount: number;
}

export interface FarmingPatches {
  treePatches: FarmingPatch[];
  fruitTreePatches: FarmingPatch[];
  herbPatches: FarmingPatch[];
  hardwoodPatches: FarmingPatch[];
  specialPatches: FarmingPatch[];
}

export interface OutfitPiece {
  name: string;
  bonusPercent: number;
}

export interface OutfitDefinition {
  outfitName: string;
  pieces: OutfitPiece[];
  fullSetBonusPercent: number;
  notes?: string;
}

export interface PrayerBonus {
  name: string;
  multiplier: number;
  description: string;
}
