"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
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
import type { Group } from "@/lib/types";
import { Users, LogOut, ArrowRight } from "lucide-react";
import Link from "next/link";

interface GroupWithMembership extends Group {
  membershipId: string;
}

export default function MyGroupsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupWithMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null);

  const loadMyGroups = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const membershipsQuery = query(
        collection(db, "groupMembers"),
        where("userId", "==", user.uid)
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);

      const groupsData: GroupWithMembership[] = [];

      for (const membershipDoc of membershipsSnapshot.docs) {
        const membership = membershipDoc.data();
        const groupDoc = await getDoc(doc(db, "groups", membership.groupId));

        if (groupDoc.exists()) {
          groupsData.push({
            id: groupDoc.id,
            ...groupDoc.data(),
            membershipId: membershipDoc.id,
          } as GroupWithMembership);
        }
      }

      setGroups(groupsData);
    } catch (error) {
      console.error("Error loading groups:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMyGroups();
    }
  }, [user, loadMyGroups]);

  const leaveGroup = async (group: GroupWithMembership) => {
    if (!user) return;

    setLeavingGroupId(group.id);
    try {
      await deleteDoc(doc(db, "groupMembers", group.membershipId));
      await updateDoc(doc(db, "groups", group.id), {
        memberCount: increment(-1),
      });
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch (error) {
      console.error("Error leaving group:", error);
    } finally {
      setLeavingGroupId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="w-full max-w-md space-y-4 p-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="p-4 flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.push("/")}>
          ← Back
        </Button>
      </div>

      <div className="max-w-md mx-auto px-4 pb-8">
        <h1 className="text-2xl font-bold text-center mb-6">My Groups</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                You haven&apos;t joined any groups yet.
              </p>
              <Link href="/">
                <Button>Create or Join a Group</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {group.memberCount} member{group.memberCount !== 1 && "s"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Link href={`/groups/${group.id}`} className="flex-1">
                    <Button className="w-full" variant="default">
                      Open <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={leavingGroupId === group.id}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave group?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave &quot;{group.name}&quot;? You can
                          always rejoin later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => leaveGroup(group)}>
                          Leave
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
