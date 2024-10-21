'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, onSnapshot, addDoc, getDocs, where, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { db } from '@/utils/firebase';

interface Chat {
  id: string;
  users: string[];
  isGroup: boolean;
  messages: Message[];
  otherUserFullName?: string;
}

interface Message {
  content: string;
  createdAt: Date;
  userId: string;
  userName: string;
}

interface User {
  id: string;
  fullName: string;
}

interface ChatSidebarProps {
  onSelectChat: (chatId: string, chatName: string) => void;
}

const ChatSidebar = ({ onSelectChat }: ChatSidebarProps) => {
  const { user } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [groups, setGroups] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      // Fetch individual chats the current user is part of
      const individualChatsQuery = query(
        collection(db, 'chats'),
        where('users', 'array-contains', user.id),
        where('isGroup', '==', false)
      );
  
      const unsubscribeChats = onSnapshot(individualChatsQuery, async (querySnapshot) => {
        const fetchedChats: Chat[] = [];
  
        for (const doc of querySnapshot.docs) {
          const data = doc.data() as Chat;
  
          // Find the other user's ID
          const otherUserId = data.users.find((id) => id !== user.id);
          let otherUserFullName = 'Unknown User';
  
          if (otherUserId) {
            // Fetch the other user's full name
            const otherUserDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', otherUserId)));
            if (!otherUserDoc.empty) {
              otherUserFullName = otherUserDoc.docs[0].data().fullName;
            }
          }
  
          fetchedChats.push({
            ...data,
            id: doc.id,
            otherUserFullName,
          });
        }
  
        setChats(fetchedChats);
      });
  
      // Fetch group chats the current user is part of
      const groupChatsQuery = query(
        collection(db, 'chats'),
        where('users', 'array-contains', user.id),
        where('isGroup', '==', true)
      );
  
      const unsubscribeGroups = onSnapshot(groupChatsQuery, (querySnapshot) => {
        const fetchedGroups: Chat[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Chat;
          fetchedGroups.push({
            id: doc.id,
            users: data.users,
            isGroup: data.isGroup,
            messages: data.messages,
          });
        });
        setGroups(fetchedGroups);
      });
  
      // Fetch all available users who are logged in, except the current user
      const usersQuery = query(collection(db, 'users'), where('isLoggedIn', '==', true));
      const usersUnsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
        const fetchedUsers: User[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.id !== user.id) {
            fetchedUsers.push({ id: doc.id, fullName: doc.data().fullName });
          }
        });
        setUsers(fetchedUsers);
      });
  
      return () => {
        unsubscribeChats();
        unsubscribeGroups();
        usersUnsubscribe();
      };
    }
  }, [user]);
  

  // Create or reuse individual chats between two users
  const handleCreateIndividualChat = async (targetUser: User) => {
    if (user) {
      try {
        // Check if a chat between these two users already exists
        const existingChatsQuery = query(
          collection(db, 'chats'),
          where('isGroup', '==', false),
          where('users', 'array-contains', user.id)
        );
        const existingChatsSnapshot = await getDocs(existingChatsQuery);
  
        let existingChat: QueryDocumentSnapshot<DocumentData> | undefined;
        existingChatsSnapshot.forEach((doc) => {
          const data = doc.data() as Chat;
          if (data.users.includes(targetUser.id)) {
            existingChat = doc;
          }
        });
  
        if (existingChat) {
          // A chat already exists between these users
          onSelectChat(existingChat.id, targetUser.fullName);
        } else {
          // Create a new individual chat between the current user and the target user
          const newChatRef = await addDoc(collection(db, 'chats'), {
            users: [user.id, targetUser.id],
            isGroup: false,
            createdAt: new Date(),
            messages: [],
          });
  
          // Select the new chat
          onSelectChat(newChatRef.id, targetUser.fullName);
        }
      } catch (error) {
        console.error('Error creating individual chat: ', error);
      }
    }
  };
  

  return (
    <div className={`bg-white border-r p-4 ${collapsed ? 'w-20' : 'w-64'} transition-width duration-300 ease-in-out`}>
      <Button onClick={() => setCollapsed(!collapsed)} className="mb-4">
        {collapsed ? '>' : '<'}
      </Button>
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Chats</h3>
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id, chat.users.find((id) => id !== user?.id) || 'Unknown User')}
            className="cursor-pointer flex items-center space-x-2 p-2 rounded hover:bg-gray-200 transition"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${chat.users.join('-')}`} />
              <AvatarFallback>{chat.users.length > 1 ? chat.users[0][0] : ''}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold">Chat with {chat.users.find((id) => id !== user?.fullName)}</span>
              </div>
            )}
          </div>
        ))}

        <h3 className="text-lg font-bold mt-4">Groups</h3>
        {groups.map((group) => (
          <div
            key={group.id}
            onClick={() => onSelectChat(group.id, group.id)}
            className="cursor-pointer flex items-center space-x-2 p-2 rounded hover:bg-gray-200 transition"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${group.id}`} />
              <AvatarFallback>G</AvatarFallback>
            </Avatar>
            {!collapsed && <div className="font-semibold">Group Chat {group.id}</div>}
          </div>
        ))}

        <h3 className="text-lg font-bold mt-4">Available Users</h3>
        {users.map((targetUser) => (
          <div
            key={targetUser.id}
            onClick={() => handleCreateIndividualChat(targetUser)}
            className="cursor-pointer flex items-center space-x-2 p-2 rounded hover:bg-gray-200 transition"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${targetUser.fullName}`} />
              <AvatarFallback>{targetUser.fullName[0]}</AvatarFallback>
            </Avatar>
            {!collapsed && <span className="font-semibold">{targetUser.fullName}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
