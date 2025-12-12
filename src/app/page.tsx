"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Users, Settings } from "lucide-react";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;

    setIsCreating(true);
    try {
      const groupRef = await addDoc(collection(db, "groups"), {
        name: groupName,
        createdAt: Timestamp.now(),
        memberCount: 1,
      });

      await setDoc(doc(db, "groupMembers", `${groupRef.id}_${user.uid}`), {
        groupId: groupRef.id,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        joinedAt: Timestamp.now(),
      });

      router.push(`/groups/${groupRef.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const joinGroup = async () => {
    if (!groupName.trim() || !user) return;

    setIsCreating(true);
    try {
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("name", "==", groupName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Group not found. Please create it instead.");
        setIsCreating(false);
        return;
      }

      const groupDoc = querySnapshot.docs[0];
      const groupId = groupDoc.id;

      await setDoc(doc(db, "groupMembers", `${groupId}_${user.uid}`), {
        groupId,
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        joinedAt: Timestamp.now(),
      });

      router.push(`/groups/${groupId}`);
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-10 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-pink-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl mb-2">Mix & Match</CardTitle>
            <CardDescription>
              Discover amazing ingredient combinations with your friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={signInWithGoogle} className="w-full" size="lg">
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-pink-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl mb-2">Welcome back!</CardTitle>
          <CardDescription>
            Create a new group or join an existing one
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
              className="text-lg"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createGroup}
              disabled={!groupName.trim() || isCreating}
              className="flex-1"
              size="lg"
            >
              Create Group
            </Button>
            <Button
              onClick={joinGroup}
              disabled={!groupName.trim() || isCreating}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Join Group
            </Button>
          </div>

          <div className="pt-4 border-t space-y-2">
            <Link href="/my-groups" className="block">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                My Groups
              </Button>
            </Link>
            <Link href="/admin/ingredients" className="block">
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Manage Ingredients
              </Button>
            </Link>
          </div>

          <p className="text-sm text-center text-muted-foreground pt-2">
            Signed in as {user.displayName}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
