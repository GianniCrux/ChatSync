import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-indigo-700">Welcome to ChatSync</CardTitle>
          <CardDescription>Connect and chat in real-time</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <SignedOut>
            <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Link href="/sign-up">Sign Up</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Link href="/chat">Go to Chats</Link>
            </Button>
          </SignedIn>
        </CardContent>
      </Card>
    </div>
  )
}