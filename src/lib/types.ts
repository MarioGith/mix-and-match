import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  displayName: string;
  email: string;
  createdAt: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  createdAt: Timestamp;
  memberCount: number;
}

export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  createdAt: Timestamp;
}

export type VoteType = 'like' | 'dislike' | 'pass';

export interface Swipe {
  id: string;
  userId: string;
  userName: string;
  groupId: string;
  ingredient1Id: string;
  ingredient2Id: string;
  vote: VoteType;
  timestamp: Timestamp;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  userName: string;
  joinedAt: Timestamp;
}

export interface CombinationStats {
  ingredient1: Ingredient;
  ingredient2: Ingredient;
  likes: number;
  dislikes: number;
  passes: number;
  total: number;
  likePercentage: number;
}
