import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
  isOffline: boolean;
  isLoading: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    isOffline: false,
    isLoading: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? true;
      // Treat null reachability as online to avoid false positives on mount
      const reachable = state.isInternetReachable ?? true;
      setStatus({
        isConnected: connected,
        isInternetReachable: reachable,
        isOffline: !connected || !reachable,
        isLoading: false,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
