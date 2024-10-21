import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import './globals.css'; 
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'


const inter = Inter({ subsets: ['latin'] })


export const metadata: Metadata = {
  title: 'ChatSync',
  description: 'A real-time chat application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
      <body className={inter.className}>
        <div className='bg-gradient-to-br from-indigo-100 to-purple-100 absolute top-1 right-1'>
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        </div>

            {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
