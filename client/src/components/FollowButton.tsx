/**
 * FollowButton — Toggle follow/unfollow for a user.
 * Story 2.7: Community & Social Features (AC4)
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
}

export default function FollowButton({ targetUserId, className }: FollowButtonProps) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [optimisticFollowing, setOptimisticFollowing] = useState<boolean | null>(null);

  const followStatusQuery = useQuery({
    queryKey: ["follow-status", targetUserId],
    queryFn: () => api.follow.isFollowing(targetUserId),
    enabled: isAuthenticated && !!targetUserId && targetUserId !== userId,
  });

  const followMutation = useMutation({
    mutationFn: () => api.follow.follow(targetUserId),
    onMutate: () => setOptimisticFollowing(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
    onError: () => setOptimisticFollowing(null),
    onSettled: () => setOptimisticFollowing(null),
  });

  const unfollowMutation = useMutation({
    mutationFn: () => api.follow.unfollow(targetUserId),
    onMutate: () => setOptimisticFollowing(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-status", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
    },
    onError: () => setOptimisticFollowing(null),
    onSettled: () => setOptimisticFollowing(null),
  });

  if (!isAuthenticated || targetUserId === userId) return null;

  const isFollowing = optimisticFollowing ?? followStatusQuery.data?.isFollowing ?? false;
  const isLoading = followMutation.isPending || unfollowMutation.isPending || followStatusQuery.isLoading;

  const handleClick = () => {
    if (isLoading) return;
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4 mr-1" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
}
