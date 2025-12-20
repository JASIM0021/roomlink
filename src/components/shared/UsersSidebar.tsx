'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User } from '@/types';

interface UsersSidebarProps {
  users: User[];
  currentUserId: string;
  onClose: () => void;
}

export function UsersSidebar({ users, currentUserId, onClose }: UsersSidebarProps) {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-72 border-l border-border bg-background flex flex-col"
    >
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <h2 className="font-semibold">People</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Users List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {users.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="relative">
                <Avatar>
                  <AvatarFallback style={{ backgroundColor: user.color }}>
                    {user.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{user.name}</span>
                  {user.id === currentUserId && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      You
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          {users.length} {users.length === 1 ? 'person' : 'people'} in this room
        </p>
      </div>
    </motion.div>
  );
}
