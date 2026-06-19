import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/useUser';
import { notificationService } from '@/services/notificationService';

export function useNotifications() {
  const user = useUser();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => user ? notificationService.list({ recipientEmail: user.email }) : [],
    enabled: !!user,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.email] });
      queryClient.setQueryData(['notifications', user?.email], old =>
        (old || []).map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead({ recipientEmail: user?.email }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.email] });
      queryClient.setQueryData(['notifications', user?.email], old =>
        (old || []).map(n => ({ ...n, is_read: true }))
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
    isMarkingAll: markAllReadMutation.isPending,
  };
}

// Helper: get all users by role
export async function getUsersByRole(roles) {
  const users = [{ id: 'demo-admin-local', email: 'demo-admin@kkgt.local', role: 'admin', full_name: 'Demo Admin' }];
  return users.filter(u => roles.includes(u.role));
}
