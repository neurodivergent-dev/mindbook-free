// This context is used to manage the state of whether the user has seen the onboarding process or not.
// It provides a way to set and get this state throughout the application.
// It is useful for showing the onboarding process only once to the user when they first use the app.
// The context is created using React's createContext and useContext hooks, allowing for easy access to the state and setter function in any component that needs it.
import React, { createContext, useContext, useState } from 'react';

// Define the shape of the context value
interface OnboardingContextType {
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (value: boolean) => void;
}

// Create the context with a default value
const OnboardingContext = createContext<OnboardingContextType>({
  hasSeenOnboarding: false,
  setHasSeenOnboarding: () => {},
});

// Create a provider component that wraps the application and provides the context value
export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  return (
    <OnboardingContext.Provider value={{ hasSeenOnboarding, setHasSeenOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

// Create a custom hook to use the OnboardingContext
export const useOnboarding = () => useContext(OnboardingContext);
