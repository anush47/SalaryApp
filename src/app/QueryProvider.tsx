"use client";

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query";
import React, { useState, Suspense } from "react";
import { signOut } from "next-auth/react";
import ForcePasswordChange from "./clientComponents/ForcePasswordChange";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error: any) => {
            if (
              error?.message?.includes("UserDeleted") ||
              error?.response?.status === 401 ||
              error?.message?.includes("Unauthorized") ||
              error?.statusCode === 401
            ) {
              signOut();
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error: any) => {
            if (
              error?.message?.includes("UserDeleted") ||
              error?.response?.status === 401 ||
              error?.message?.includes("Unauthorized") ||
              error?.statusCode === 401
            ) {
              signOut();
            }
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <ForcePasswordChange />
      </Suspense>
      {children}
    </QueryClientProvider>
  );
}
