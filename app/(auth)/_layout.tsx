// expo-router: (auth) layout
import { Stack } from 'expo-router';

// routers are used to define the layout of the app
export default function AuthLayout() {
  // Stack is used to create a stack navigator
  // screenOptions is used to define the options for the stack navigator
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign in',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Sign up',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: 'Forgot Password',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          title: 'Welcome',
          headerShown: false,
          gestureEnabled: false,
          presentation: 'card',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}
