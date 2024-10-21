'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser, RedirectToSignIn } from '@clerk/nextjs';
import { doc, setDoc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send } from 'lucide-react';
import ChatSidebar from '../components/ChatSidebar';

interface Message {
  content: string;
  createdAt: Date;
  userId: string;
  userName: string;
}

export default function ChatPage() {
  const { isSignedIn, user } = useUser();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Sync user to Firestore when logged in
  useEffect(() => {
    if (user) {
      const syncUserToFirestore = async () => {
        const userDocRef = doc(db, 'users', user.id);
        const userSnapshot = await getDoc(userDocRef);
        
        if (userSnapshot.exists()) {
          // Update isLoggedIn status
          await updateDoc(userDocRef, { isLoggedIn: true });
        } else {
          // Create new user document
          await setDoc(userDocRef, {
            id: user.id,
            fullName: user.fullName,
            email: user.primaryEmailAddress?.emailAddress,
            isLoggedIn: true,
          });
        }
      };

      syncUserToFirestore();
    }
  }, [user]);

  // Handle logout to update Firestore when the user signs out
  useEffect(() => {
    const handleLogout = async () => {
      if (user && !isSignedIn) {
        try {
          const userDocRef = doc(db, 'users', user);
          await updateDoc(userDocRef, { isLoggedIn: false });
        } catch (error) {
          console.error('Error updating user logout status:', error);
        }
      }
    };

    handleLogout();
  }, [isSignedIn, user]);

  // Fetch messages for the selected chat
  useEffect(() => {
    if (selectedChatId) {
      const chatDocRef = doc(db, 'chats', selectedChatId);

      const unsubscribe = onSnapshot(chatDocRef, (docSnapshot) => {
        const data = docSnapshot.data();
        if (data && data.messages) {
          setMessages(data.messages);
        }
      });

      return () => unsubscribe();
    }
  }, [selectedChatId]);

  // Scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Send a message to the selected chat
  const handleSendMessage = async () => {
    if (message.trim() && selectedChatId && user?.id && user?.fullName) {
      try {
        const chatDocRef = doc(db, 'chats', selectedChatId);
        const newMessage: Message = {
          content: message,
          createdAt: new Date(),
          userId: user.id,
          userName: user.fullName,
        };

        // Update the messages array in the chat document
        await updateDoc(chatDocRef, {
          messages: [...messages, newMessage],
        });

        setMessage('');
      } catch (error) {
        console.error('Error sending message: ', error);
      }
    }
  };

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <ChatSidebar onSelectChat={(chatId, chatName) => {
        setSelectedChatId(chatId);
        setSelectedChatName(chatName);
      }} />
      <div className="flex-grow flex items-center justify-center p-4">
        {selectedChatId ? (
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-indigo-700">Chat with {selectedChatName}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] pr-4" ref={scrollAreaRef}>
                {messages.map((msg, index) => (
                  <div key={index} className="mb-4">
                    {index === 0 || msg.userId !== messages[index - 1].userId ? (
                      <div className="flex items-center mb-2">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${msg.userName}`} />
                          <AvatarFallback>{msg.userName[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-indigo-700">{msg.userName}</span>
                      </div>
                    ) : null}
                    <div className={`p-3 rounded-lg ${msg.userId === user?.id ? 'bg-indigo-500 text-white ml-8' : 'bg-white text-gray-800 mr-8'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
            <Separator />
            <CardFooter className="p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex w-full space-x-2">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-grow"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        ) : (
          <h2 className="text-2xl text-gray-600">Select a chat to start messaging</h2>
        )}
      </div>
    </div>
  );
}
