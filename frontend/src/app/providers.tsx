import React from "react";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { AuthProvider } from "../features/auth/context/AuthContext";
import { ToastProvider } from "../components/ui/toast";
import { CustomizerProvider, ThemeCustomizerDrawer } from "../features/customizer";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CustomizerProvider>
          <ToastProvider defaultPosition="top-right">
            {children}
            <ThemeCustomizerDrawer />
          </ToastProvider>
        </CustomizerProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
