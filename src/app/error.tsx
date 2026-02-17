"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * Error Boundary
 *
 * Catches errors in the application and displays a user-friendly error message.
 * Provides a "Try again" button to reset the error boundary.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console (can't use server-only logger in client component)
    console.error("Application error:", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription className="mt-2">
            We encountered an unexpected error. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {error.digest && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">
                Error ID: <span className="font-mono">{error.digest}</span>
              </p>
            </div>
          )}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 rounded-md bg-muted p-3 text-left">
              <p className="text-xs font-semibold text-foreground">
                Development Error:
              </p>
              <p className="mt-1 text-xs text-muted-foreground font-mono break-all">
                {error.message}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={reset} className="w-full sm:w-auto">
            Try again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
