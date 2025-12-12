"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { Ingredient, VoteType, Swipe } from "@/lib/types";
import Link from "next/link";
import { Sparkles, UtensilsCrossed, History, Users, BarChart3, Rss } from "lucide-react";

interface CombinationPair {
  ingredient1: Ingredient;
  ingredient2: Ingredient;
  key: string;
}

export default function GroupSwipePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { user, loading } = useAuth();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [currentPair, setCurrentPair] = useState<CombinationPair | null>(null);
  const [swipedPairs, setSwipedPairs] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [allPairsSwiped, setAllPairsSwiped] = useState(false);

  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const leftIndicatorOpacity = useTransform(x, [-80, 0], [1, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 80], [0, 1]);

  const getPairKey = (id1: string, id2: string) => {
    return [id1, id2].sort().join("-");
  };

  const loadUserSwipes = useCallback(async () => {
    if (!user) return new Set<string>();

    const swipesQuery = query(
      collection(db, "swipes"),
      where("userId", "==", user.uid),
      where("groupId", "==", groupId)
    );
    const snapshot = await getDocs(swipesQuery);
    const swiped = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as Swipe;
      swiped.add(getPairKey(data.ingredient1Id, data.ingredient2Id));
    });

    return swiped;
  }, [user, groupId]);

  const loadIngredients = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "ingredients"));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Ingredient[];
  }, []);

  useEffect(() => {
    const initialize = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const [ingredientsData, swipedData] = await Promise.all([
          loadIngredients(),
          loadUserSwipes(),
        ]);

        setIngredients(ingredientsData);
        setSwipedPairs(swipedData);
      } catch (error) {
        console.error("Error initializing:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [user, loadIngredients, loadUserSwipes]);

  const generateNewPair = useCallback(() => {
    if (ingredients.length < 2) return;

    const allPairs: CombinationPair[] = [];

    for (let i = 0; i < ingredients.length; i++) {
      for (let j = i + 1; j < ingredients.length; j++) {
        const key = getPairKey(ingredients[i].id, ingredients[j].id);
        if (!swipedPairs.has(key)) {
          allPairs.push({
            ingredient1: ingredients[i],
            ingredient2: ingredients[j],
            key,
          });
        }
      }
    }

    if (allPairs.length === 0) {
      setAllPairsSwiped(true);
      setCurrentPair(null);
      return;
    }

    const randomPair = allPairs[Math.floor(Math.random() * allPairs.length)];
    setCurrentPair(randomPair);
    x.set(0);
  }, [ingredients, swipedPairs, x]);

  useEffect(() => {
    if (!isLoading && ingredients.length >= 2 && !currentPair && !allPairsSwiped) {
      generateNewPair();
    }
  }, [isLoading, ingredients, currentPair, allPairsSwiped, generateNewPair]);

  const checkForMatch = async (vote: VoteType) => {
    if (!currentPair || vote !== "like") return;

    const matchQuery = query(
      collection(db, "swipes"),
      where("groupId", "==", groupId),
      where("vote", "==", "like")
    );

    const snapshot = await getDocs(matchQuery);
    const otherLikes = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return (
        data.userId !== user?.uid &&
        getPairKey(data.ingredient1Id, data.ingredient2Id) === currentPair.key
      );
    });

    if (otherLikes.length > 0) {
      setMatchCount(otherLikes.length + 1);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
  };

  const recordSwipe = async (vote: VoteType) => {
    if (!currentPair || !user) return;

    try {
      await addDoc(collection(db, "swipes"), {
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        groupId,
        ingredient1Id: currentPair.ingredient1.id,
        ingredient2Id: currentPair.ingredient2.id,
        vote,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error recording swipe:", error);
    }
  };

  const handleVote = (vote: VoteType, direction: "left" | "right" | null = null) => {
    if (!currentPair || isAnimating) return;

    setIsAnimating(true);
    setExitDirection(direction || (vote === "like" ? "right" : "left"));

    // Fire and forget - don't wait for database
    recordSwipe(vote);
    checkForMatch(vote);

    // Update local state immediately
    setSwipedPairs((prev) => new Set([...prev, currentPair.key]));
  };

  const handleExitComplete = () => {
    setExitDirection(null);
    setIsAnimating(false);
    generateNewPair();
  };

  const handleDragEnd = () => {
    const xValue = x.get();

    if (xValue > 80) {
      handleVote("like", "right");
    } else if (xValue < -80) {
      handleVote("dislike", "left");
    } else {
      x.set(0);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-dvh flex flex-col bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="p-4 flex justify-between items-center">
          <Skeleton className="h-10 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Skeleton className="w-full max-w-sm h-[500px] rounded-3xl" />
        </div>
        <div className="p-8 flex justify-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-16 h-16 rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  if (ingredients.length < 2) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardContent>
            <EmptyState
              icon={UtensilsCrossed}
              title="No ingredients yet"
              description="Add some ingredients to start matching!"
            >
              <Link href="/admin/ingredients">
                <Button>Go to Admin</Button>
              </Link>
            </EmptyState>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-orange-50 to-pink-50">
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="bg-card p-8 rounded-3xl shadow-2xl text-center"
            >
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">It&apos;s a Match!</h2>
              <p className="text-muted-foreground">
                {matchCount} people love this combo!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-4 flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.push("/my-groups")}>
          ← Groups
        </Button>
        <div className="flex gap-2">
          <Link href={`/groups/${groupId}/history`}>
            <Button variant="outline" size="icon">
              <History className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/groups/${groupId}/members`}>
            <Button variant="outline" size="icon">
              <Users className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/groups/${groupId}/results`}>
            <Button variant="outline" size="icon">
              <BarChart3 className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/groups/${groupId}/feed`}>
            <Button variant="outline" size="icon">
              <Rss className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Swipe Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        {allPairsSwiped ? (
          <Card className="w-full max-w-sm">
            <CardContent>
              <EmptyState
                icon={Sparkles}
                title="All done!"
                description="You've swiped on all combinations. Check out the results!"
              >
                <div className="flex gap-2 justify-center">
                  <Link href={`/groups/${groupId}/results`}>
                    <Button>View Results</Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSwipedPairs(new Set());
                      setAllPairsSwiped(false);
                    }}
                  >
                    Start Over
                  </Button>
                </div>
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <div className="relative w-full max-w-sm h-[500px]">
            <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
              {currentPair && !exitDirection && (
                <motion.div
                  key={currentPair.key}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, x: 0, rotate: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  style={{ x, rotate }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.9}
                  onDragEnd={handleDragEnd}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
                >
                  <div className="w-full h-full bg-card backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl shadow-black/10 p-8 flex flex-col items-center justify-center space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-7xl mb-2">
                          {currentPair.ingredient1.emoji}
                        </div>
                        <p className="text-xl font-semibold">
                          {currentPair.ingredient1.name}
                        </p>
                      </div>
                      <div className="text-4xl">+</div>
                      <div className="text-center">
                        <div className="text-7xl mb-2">
                          {currentPair.ingredient2.emoji}
                        </div>
                        <p className="text-xl font-semibold">
                          {currentPair.ingredient2.name}
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Swipe or tap below
                    </p>
                  </div>

                  {/* Swipe indicators */}
                  <motion.div
                    className="absolute top-12 left-12 text-6xl font-bold text-destructive"
                    style={{ opacity: leftIndicatorOpacity }}
                  >
                    ✗
                  </motion.div>
                  <motion.div
                    className="absolute top-12 right-12 text-6xl font-bold text-green-500"
                    style={{ opacity: rightIndicatorOpacity }}
                  >
                    ✓
                  </motion.div>
                </motion.div>
              )}
              {currentPair && exitDirection && (
                <motion.div
                  key={`${currentPair.key}-exit`}
                  initial={{ x: 0, rotate: 0, opacity: 1 }}
                  animate={{
                    x: exitDirection === "right" ? 400 : -400,
                    rotate: exitDirection === "right" ? 20 : -20,
                    opacity: 0,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0"
                >
                  <div className="w-full h-full bg-card backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl shadow-black/10 p-8 flex flex-col items-center justify-center space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-7xl mb-2">
                          {currentPair.ingredient1.emoji}
                        </div>
                        <p className="text-xl font-semibold">
                          {currentPair.ingredient1.name}
                        </p>
                      </div>
                      <div className="text-4xl">+</div>
                      <div className="text-center">
                        <div className="text-7xl mb-2">
                          {currentPair.ingredient2.emoji}
                        </div>
                        <p className="text-xl font-semibold">
                          {currentPair.ingredient2.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Exit indicator */}
                  <div className={`absolute top-12 ${exitDirection === "right" ? "right-12 text-green-500" : "left-12 text-destructive"} text-6xl font-bold`}>
                    {exitDirection === "right" ? "✓" : "✗"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {!allPairsSwiped && currentPair && (
        <div className="p-8 flex justify-center gap-4">
          <Button
            onClick={() => handleVote("dislike", "left")}
            disabled={isAnimating}
            size="lg"
            variant="destructive"
            className="w-16 h-16 rounded-full text-2xl"
          >
            ✗
          </Button>
          <Button
            onClick={() => handleVote("pass", "left")}
            disabled={isAnimating}
            size="lg"
            variant="outline"
            className="w-16 h-16 rounded-full text-2xl"
          >
            →
          </Button>
          <Button
            onClick={() => handleVote("like", "right")}
            disabled={isAnimating}
            size="lg"
            className="w-16 h-16 rounded-full text-2xl bg-green-500 hover:bg-green-600"
          >
            ✓
          </Button>
        </div>
      )}
    </div>
  );
}
