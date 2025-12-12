"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SEED_INGREDIENTS } from "@/lib/seed-ingredients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Ingredient } from "@/lib/types";
import { Trash2, UtensilsCrossed, Plus } from "lucide-react";

export default function AdminIngredientsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    setIsLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "ingredients"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Ingredient[];
      setIngredients(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Error loading ingredients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const seedIngredients = async () => {
    setIsSeeding(true);
    try {
      const promises = SEED_INGREDIENTS.map((ingredient) =>
        addDoc(collection(db, "ingredients"), {
          name: ingredient.name,
          emoji: ingredient.emoji,
          createdAt: Timestamp.now(),
        })
      );
      await Promise.all(promises);
      await loadIngredients();
    } catch (error) {
      console.error("Error seeding ingredients:", error);
    } finally {
      setIsSeeding(false);
    }
  };

  const addIngredient = async () => {
    if (!newName.trim() || !newEmoji.trim()) return;

    setIsAdding(true);
    try {
      await addDoc(collection(db, "ingredients"), {
        name: newName,
        emoji: newEmoji,
        createdAt: Timestamp.now(),
      });
      setNewName("");
      setNewEmoji("");
      await loadIngredients();
    } catch (error) {
      console.error("Error adding ingredient:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const deleteIngredient = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "ingredients", id));
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
    } catch (error) {
      console.error("Error deleting ingredient:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh p-4 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-20" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
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
    <div className="min-h-dvh p-4 bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push("/")}>
          ← Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Ingredient Management</CardTitle>
            <CardDescription>
              Add and manage ingredients for the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ingredient name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                className="flex-1"
              />
              <Input
                type="text"
                placeholder="Emoji"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIngredient()}
                className="w-24"
              />
              <Button
                onClick={addIngredient}
                disabled={isAdding || !newName.trim() || !newEmoji.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : ingredients.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="No ingredients yet"
                description="Add ingredients manually or seed the database with defaults."
              >
                <Button onClick={seedIngredients} disabled={isSeeding}>
                  {isSeeding ? "Seeding..." : "Seed Default Ingredients"}
                </Button>
              </EmptyState>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {ingredients.length} ingredient
                    {ingredients.length !== 1 && "s"}
                  </p>
                  {ingredients.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={seedIngredients}
                      disabled={isSeeding}
                    >
                      {isSeeding ? "Adding..." : "Add More Defaults"}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {ingredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="group flex items-center justify-between p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl flex-shrink-0">
                          {ingredient.emoji}
                        </span>
                        <span className="text-sm truncate">
                          {ingredient.name}
                        </span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 flex-shrink-0"
                            disabled={deletingId === ingredient.id}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete ingredient?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{ingredient.emoji}{" "}
                              {ingredient.name}&quot;? This action cannot be undone.
                              Existing swipes using this ingredient will still be
                              preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteIngredient(ingredient.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
