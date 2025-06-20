import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNetworkState, checkAndUpdateOfflineStatus } from '../utils/networkManager';
import OfflineNotice from '../components/OfflineNotice';

interface OfflineContextType {
  isOffline: boolean;
  checkConnection: () => Promise<boolean>;
  dismissNotice: () => void;
  showOfflineNotice: boolean;
}

const OfflineContext = createContext<OfflineContextType>({
  isOffline: false,
  checkConnection: async () => false,
  dismissNotice: () => {},
  showOfflineNotice: false,
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { effectivelyConnected } = useNetworkState();
  const [isOffline, setIsOffline] = useState(!effectivelyConnected);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);

  // Update offline state when network state changes
  useEffect(() => {
    setIsOffline(!effectivelyConnected);

    // Only show the notice when we go offline, not when the component first mounts
    if (!effectivelyConnected) {
      setShowOfflineNotice(true);
    }
  }, [effectivelyConnected]);

  // Check connection status manually
  const checkConnection = async () => {
    const offline = await checkAndUpdateOfflineStatus();
    setIsOffline(offline);
    if (offline) {
      setShowOfflineNotice(true);
    }
    return offline;
  };

  // Dismiss the offline notice
  const dismissNotice = () => {
    setShowOfflineNotice(false);
  };

  return (
    <OfflineContext.Provider
      value={{ isOffline, checkConnection, dismissNotice, showOfflineNotice }}
    >
      {children}
      {showOfflineNotice && <OfflineNotice onDismiss={dismissNotice} />}
    </OfflineContext.Provider>
  );
};
