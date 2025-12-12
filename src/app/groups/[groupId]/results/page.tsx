"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Ingredient, Swipe, CombinationStats, Group } from "@/lib/types";
import { Share2, Trophy, Grid3X3, List, BarChart3 } from "lucide-react";

export default function GroupResultsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { user, loading } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stats, setStats] = useState<Map<string, CombinationStats>>(new Map());
  const [topCombinations, setTopCombinations] = useState<CombinationStats[]>([]);
  const [showMatrix, setShowMatrix] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const calculateStats = useCallback((
    ingredientsData: Ingredient[],
    swipesData: Swipe[]
  ) => {
    const statsMap = new Map<string, CombinationStats>();

    swipesData.forEach((swipe) => {
      const key1 = `${swipe.ingredient1Id}_${swipe.ingredient2Id}`;
      const key2 = `${swipe.ingredient2Id}_${swipe.ingredient1Id}`;
      const key = statsMap.has(key1) ? key1 : key2;

      if (!statsMap.has(key) && !statsMap.has(key1) && !statsMap.has(key2)) {
        const ing1 = ingredientsData.find((i) => i.id === swipe.ingredient1Id);
        const ing2 = ingredientsData.find((i) => i.id === swipe.ingredient2Id);

        if (ing1 && ing2) {
          statsMap.set(key1, {
            ingredient1: ing1,
            ingredient2: ing2,
            likes: 0,
            dislikes: 0,
            passes: 0,
            total: 0,
            likePercentage: 0,
          });
        }
      }

      const stat = statsMap.get(key) || statsMap.get(key1) || statsMap.get(key2);
      if (stat) {
        if (swipe.vote === "like") stat.likes++;
        else if (swipe.vote === "dislike") stat.dislikes++;
        else if (swipe.vote === "pass") stat.passes++;
        stat.total++;
        stat.likePercentage =
          stat.total > 0 ? (stat.likes / stat.total) * 100 : 0;
      }
    });

    setStats(statsMap);

    const top = Array.from(statsMap.values())
      .filter((s) => s.total >= 3)
      .sort((a, b) => {
        if (b.likePercentage !== a.likePercentage) {
          return b.likePercentage - a.likePercentage;
        }
        return b.total - a.total;
      })
      .slice(0, 10);

    setTopCombinations(top);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (groupDoc.exists()) {
        setGroup({ id: groupDoc.id, ...groupDoc.data() } as Group);
      }

      const ingredientsSnapshot = await getDocs(collection(db, "ingredients"));
      const ingredientsData = ingredientsSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Ingredient[];
      setIngredients(ingredientsData);

      const swipesQuery = query(
        collection(db, "swipes"),
        where("groupId", "==", groupId)
      );
      const swipesSnapshot = await getDocs(swipesQuery);
      const swipesData = swipesSnapshot.docs.map((d) => d.data()) as Swipe[];

      calculateStats(ingredientsData, swipesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, calculateStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCombinationKey = (id1: string, id2: string) => {
    const key1 = `${id1}_${id2}`;
    const key2 = `${id2}_${id1}`;
    return stats.has(key1) ? key1 : key2;
  };

  const getColorForPercentage = (percentage: number, total: number) => {
    if (total < 3) return "bg-muted";
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const shareResults = async () => {
    const shareText = topCombinations.length > 0
      ? `Check out our top ingredient combos in "${group?.name || 'Mix & Match'}"!\n\n${topCombinations
          .slice(0, 5)
          .map(
            (combo, idx) =>
              `${idx + 1}. ${combo.ingredient1.emoji} ${combo.ingredient1.name} + ${combo.ingredient2.emoji} ${combo.ingredient2.name} (${combo.likePercentage.toFixed(0)}%)`
          )
          .join("\n")}\n\nJoin us on Mix & Match!`
      : `Join our group "${group?.name}" on Mix & Match to rate ingredient combinations!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${group?.name || "Mix & Match"} Results`,
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      alert("Results copied to clipboard!");
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-orange-50 to-pink-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push(`/groups/${groupId}`)}
          >
            ← Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={shareResults}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowMatrix(!showMatrix)}
            >
              {showMatrix ? (
                <>
                  <List className="w-4 h-4 mr-2" />
                  List View
                </>
              ) : (
                <>
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Matrix View
                </>
              )}
            </Button>
          </div>
        </div>

        {!showMatrix ? (
          /* Top Combinations */
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Combinations
              </CardTitle>
              <CardDescription>
                Best ingredient pairings in {group?.name || "this group"} (min 3
                votes)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topCombinations.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No results yet"
                  description="Need at least 3 votes on a combination to show up here."
                >
                  <Button onClick={() => router.push(`/groups/${groupId}`)}>
                    Start Swiping
                  </Button>
                </EmptyState>
              ) : (
                <div className="space-y-3">
                  {topCombinations.map((combo, idx) => (
                    <div
                      key={`${combo.ingredient1.id}_${combo.ingredient2.id}`}
                      className="flex items-center justify-between p-4 border rounded-xl bg-background hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground w-8">
                          #{idx + 1}
                        </span>
                        <span className="text-3xl">
                          {combo.ingredient1.emoji}
                        </span>
                        <span className="text-xl text-muted-foreground">+</span>
                        <span className="text-3xl">
                          {combo.ingredient2.emoji}
                        </span>
                        <div className="ml-2">
                          <p className="font-semibold">
                            {combo.ingredient1.name} + {combo.ingredient2.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {combo.likes} likes, {combo.dislikes} dislikes,{" "}
                            {combo.passes} passes
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-2xl font-bold ${
                            combo.likePercentage >= 70
                              ? "text-green-600"
                              : combo.likePercentage >= 40
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {combo.likePercentage.toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {combo.total} votes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Matrix View */
          <Card>
            <CardHeader>
              <CardTitle>Combination Matrix</CardTitle>
              <CardDescription>
                All ingredient combinations with color-coded ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex">
                    <div className="w-16"></div>
                    {ingredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="w-16 h-16 flex items-center justify-center text-2xl"
                      >
                        {ing.emoji}
                      </div>
                    ))}
                  </div>
                  {ingredients.map((ing1) => (
                    <div key={ing1.id} className="flex">
                      <div className="w-16 h-16 flex items-center justify-center text-2xl">
                        {ing1.emoji}
                      </div>
                      {ingredients.map((ing2) => {
                        if (ing1.id === ing2.id) {
                          return (
                            <div
                              key={ing2.id}
                              className="w-16 h-16 bg-muted border border-border"
                            ></div>
                          );
                        }

                        const key = getCombinationKey(ing1.id, ing2.id);
                        const stat = stats.get(key);
                        const colorClass = stat
                          ? getColorForPercentage(stat.likePercentage, stat.total)
                          : "bg-muted/50";

                        return (
                          <div
                            key={ing2.id}
                            className={`w-16 h-16 border border-border ${colorClass} flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}
                            title={
                              stat
                                ? `${stat.ingredient1.name} + ${stat.ingredient2.name}\n${stat.likePercentage.toFixed(0)}% (${stat.total} votes)`
                                : "No votes yet"
                            }
                          >
                            {stat && stat.total >= 3 && (
                              <span className="text-xs font-bold text-white drop-shadow">
                                {stat.likePercentage.toFixed(0)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex gap-4 justify-center text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>Good (70%+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                  <span>Mixed (40-70%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Bad (&lt;40%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-muted rounded border"></div>
                  <span>Not enough votes</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
