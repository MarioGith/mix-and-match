"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Swipe, Ingredient } from "@/lib/types";
import { History, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";

interface SwipeWithIngredients extends Swipe {
  ingredient1: Ingredient;
  ingredient2: Ingredient;
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { user, loading: authLoading } = useAuth();

  const [swipes, setSwipes] = useState<SwipeWithIngredients[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const swipesQuery = query(
        collection(db, "swipes"),
        where("userId", "==", user.uid),
        where("groupId", "==", groupId),
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(swipesQuery);
      const ingredientsCache: Record<string, Ingredient> = {};

      const swipesData = await Promise.all(
        snapshot.docs.map(async (swipeDoc) => {
          const data = swipeDoc.data() as Swipe;

          if (!ingredientsCache[data.ingredient1Id]) {
            const ing1Doc = await getDoc(doc(db, "ingredients", data.ingredient1Id));
            if (ing1Doc.exists()) {
              ingredientsCache[data.ingredient1Id] = {
                id: ing1Doc.id,
                ...ing1Doc.data(),
              } as Ingredient;
            }
          }

          if (!ingredientsCache[data.ingredient2Id]) {
            const ing2Doc = await getDoc(doc(db, "ingredients", data.ingredient2Id));
            if (ing2Doc.exists()) {
              ingredientsCache[data.ingredient2Id] = {
                id: ing2Doc.id,
                ...ing2Doc.data(),
              } as Ingredient;
            }
          }

          return {
            ...data,
            id: swipeDoc.id,
            ingredient1: ingredientsCache[data.ingredient1Id],
            ingredient2: ingredientsCache[data.ingredient2Id],
          };
        })
      );

      setSwipes(swipesData.filter((s) => s.ingredient1 && s.ingredient2));
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  const formatTime = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getVoteIcon = (vote: string) => {
    switch (vote) {
      case "like":
        return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case "dislike":
        return <ThumbsDown className="w-4 h-4 text-destructive" />;
      default:
        return <ArrowRight className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-orange-50 to-pink-50 p-4">
        <Skeleton className="h-10 w-20 mb-6" />
        <Skeleton className="h-8 w-48 mx-auto mb-6" />
        <div className="space-y-3 max-w-md mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.push(`/groups/${groupId}`)}>
          ← Back
        </Button>
      </div>

      <div className="max-w-md mx-auto px-4 pb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Your History</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : swipes.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={History}
                title="No history yet"
                description="Start swiping to see your history here!"
              >
                <Button onClick={() => router.push(`/groups/${groupId}`)}>
                  Start Swiping
                </Button>
              </EmptyState>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {swipes.length} combination{swipes.length !== 1 && "s"} rated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {swipes.map((swipe) => (
                <div
                  key={swipe.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{swipe.ingredient1.emoji}</span>
                    <span className="text-muted-foreground">+</span>
                    <span className="text-2xl">{swipe.ingredient2.emoji}</span>
                    <div className="ml-2">
                      <p className="text-sm font-medium">
                        {swipe.ingredient1.name} & {swipe.ingredient2.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(swipe.timestamp)}
                      </p>
                    </div>
                  </div>
                  {getVoteIcon(swipe.vote)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
