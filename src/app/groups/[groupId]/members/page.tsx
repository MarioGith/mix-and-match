"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { GroupMember, Group } from "@/lib/types";
import { Users, Crown } from "lucide-react";

interface MemberWithStats extends GroupMember {
  swipeCount: number;
}

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { user, loading: authLoading } = useAuth();

  const [members, setMembers] = useState<MemberWithStats[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (groupDoc.exists()) {
        setGroup({ id: groupDoc.id, ...groupDoc.data() } as Group);
      }

      const membersQuery = query(
        collection(db, "groupMembers"),
        where("groupId", "==", groupId),
        orderBy("joinedAt", "asc")
      );

      const membersSnapshot = await getDocs(membersQuery);

      const membersData = await Promise.all(
        membersSnapshot.docs.map(async (memberDoc) => {
          const data = memberDoc.data() as GroupMember;

          const swipesQuery = query(
            collection(db, "swipes"),
            where("userId", "==", data.userId),
            where("groupId", "==", groupId)
          );
          const swipesSnapshot = await getDocs(swipesQuery);

          return {
            ...data,
            swipeCount: swipesSnapshot.size,
          };
        })
      );

      membersData.sort((a, b) => b.swipeCount - a.swipeCount);
      setMembers(membersData);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  }, [user, groupId]);

  useEffect(() => {
    if (user) {
      loadMembers();
    }
  }, [user, loadMembers]);

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50 p-4">
        <Skeleton className="h-10 w-20 mb-6" />
        <Skeleton className="h-8 w-48 mx-auto mb-6" />
        <div className="space-y-3 max-w-md mx-auto">
          {[1, 2, 3].map((i) => (
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="p-4">
        <Button variant="ghost" onClick={() => router.push(`/groups/${groupId}`)}>
          ← Back
        </Button>
      </div>

      <div className="max-w-md mx-auto px-4 pb-8">
        <h1 className="text-2xl font-bold text-center mb-2">
          {group?.name || "Group"} Members
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          {members.length} member{members.length !== 1 && "s"}
        </p>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Users}
                title="No members"
                description="This group has no members yet."
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {members.map((member, index) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                      {index === 0 ? (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.userName}
                        {member.userId === user?.uid && (
                          <span className="text-muted-foreground text-sm ml-1">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{member.swipeCount}</p>
                    <p className="text-xs text-muted-foreground">swipes</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
