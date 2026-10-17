"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface PWAContextValue {
  isIOS: boolean;
  installApp: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const PWAContext = createContext<PWAContextValue | null>(null);

export function PWAProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(
      //checks if device is ios
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );

    const handleBeforeInstallPrompt = (event: Event) => {
      //used to capture browser install event
      event.preventDefault();

      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener(
      //listen for browser event, then capture and store it
      "beforeinstallprompt",
      handleBeforeInstallPrompt,
    );

    return () => {
      window.removeEventListener(
        //on unmount, remove listener
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const installApp = useCallback(async () => {
    //install pwa function
    if (!installPrompt) {
      //did not capture any event fired by browser
      return "unavailable" as const;
    }

    setInstallPrompt(null); //consume the event sot hat its not reused

    const result = await installPrompt.prompt(); //prompt user to install pwa

    return result.outcome;
  }, [installPrompt]);

  return (
    <PWAContext.Provider
      value={{
        isIOS,
        installApp,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);

  if (!context) {
    throw new Error("An error occurred while getting PWA context");
  }

  return context;
}
