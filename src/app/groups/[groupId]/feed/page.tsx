"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Ingredient, Swipe } from "@/lib/types";
import { Rss, ThumbsUp, ThumbsDown, ArrowRight } from "lucide-react";

interface FeedItem extends Swipe {
  ingredient1: Ingredient;
  ingredient2: Ingredient;
}

export default function GroupFeedPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { user, loading } = useAuth();

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [ingredients, setIngredients] = useState<Map<string, Ingredient>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIngredients();
  }, []);

  useEffect(() => {
    if (ingredients.size === 0) return;

    const swipesQuery = query(
      collection(db, "swipes"),
      where("groupId", "==", groupId),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(swipesQuery, (snapshot) => {
      const items: FeedItem[] = [];

      snapshot.docs.forEach((doc) => {
        const swipe = doc.data() as Swipe;
        const ing1 = ingredients.get(swipe.ingredient1Id);
        const ing2 = ingredients.get(swipe.ingredient2Id);

        if (ing1 && ing2) {
          items.push({
            ...swipe,
            id: doc.id,
            ingredient1: ing1,
            ingredient2: ing2,
          });
        }
      });

      setFeedItems(items);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, ingredients]);

  const loadIngredients = async () => {
    const ingredientsQuery = collection(db, "ingredients");
    const unsubscribe = onSnapshot(ingredientsQuery, (snapshot) => {
      const map = new Map<string, Ingredient>();
      snapshot.docs.forEach((doc) => {
        map.set(doc.id, { id: doc.id, ...doc.data() } as Ingredient);
      });
      setIngredients(map);
    });

    return () => unsubscribe();
  };

  const getVoteIcon = (vote: string) => {
    switch (vote) {
      case "like":
        return <ThumbsUp className="w-5 h-5" />;
      case "dislike":
        return <ThumbsDown className="w-5 h-5" />;
      default:
        return <ArrowRight className="w-5 h-5" />;
    }
  };

  const getVoteColor = (vote: string) => {
    switch (vote) {
      case "like":
        return "text-green-500 bg-green-500/10";
      case "dislike":
        return "text-destructive bg-destructive/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const formatTimestamp = (timestamp: { toDate: () => Date }) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-orange-50 to-pink-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-10 w-32" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-orange-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => router.push(`/groups/${groupId}`)}
          >
            ← Back
          </Button>
        </div>

        {/* Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="w-5 h-5" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedItems.length === 0 ? (
              <EmptyState
                icon={Rss}
                title="No activity yet"
                description="Start swiping to see the group's activity here!"
              >
                <Button onClick={() => router.push(`/groups/${groupId}`)}>
                  Start Swiping
                </Button>
              </EmptyState>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-hide">
                {feedItems.map((item, idx) => (
                  <div
                    key={`${item.id}_${idx}`}
                    className="flex items-center justify-between p-3 border rounded-xl bg-background hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`p-2 rounded-full ${getVoteColor(item.vote)}`}
                      >
                        {getVoteIcon(item.vote)}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.ingredient1.emoji}</span>
                        <span className="text-muted-foreground">+</span>
                        <span className="text-xl">{item.ingredient2.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          <span className="font-semibold">{item.userName}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            {item.vote === "like"
                              ? "liked"
                              : item.vote === "dislike"
                              ? "disliked"
                              : "passed on"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.ingredient1.name} + {item.ingredient2.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
