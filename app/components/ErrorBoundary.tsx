import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOffline: boolean;
}

/**
 * Error Boundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI instead of the component tree that crashed.
 * It also checks if the device is offline and displays a appropriate message.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isOffline: false,
  };

  // Check network status when component mounts
  componentDidMount() {
    this.checkNetworkStatus();

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      const isOffline = !state.isConnected || state.isInternetReachable === false;
      if (this.state.isOffline !== isOffline) {
        this.setState({ isOffline });
      }
    });
  }

  componentWillUnmount() {
    // Clean up network listener
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  // This lifecycle method catches errors during rendering
  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error,
    };
  }

  // This lifecycle method logs the error
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  // Reset the error state
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  // Check the network status
  checkNetworkStatus = async () => {
    try {
      const networkState = await NetInfo.fetch();
      this.setState({
        isOffline: !networkState.isConnected || networkState.isInternetReachable === false,
      });
    } catch (error) {
      console.error('Error checking network status:', error);
    }
  };

  // Override the unsubscribe type to match NetInfo's return type
  unsubscribe: (() => void) | null = null;

  render() {
    // If we've got an error, show the fallback UI
    if (this.state.hasError) {
      // If a custom fallback component is provided, use that
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      // Otherwise, show our default fallback UI
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            {this.state.isOffline
              ? 'You appear to be offline. Please check your internet connection.'
              : 'An unexpected error occurred in the application.'}
          </Text>
          {this.state.error && (
            <Text style={styles.errorMessage}>{this.state.error.toString()}</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If there's no error, render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196f3',
    borderRadius: 5,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorMessage: {
    backgroundColor: '#ffebee',
    borderRadius: 5,
    color: '#d32f2f',
    fontSize: 14,
    marginVertical: 10,
    maxWidth: '100%',
    overflow: 'hidden',
    padding: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#555',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default ErrorBoundary;
