// This file routes to the modal stack. It is used to create a modal stack for the app.
// It is used to create a modal stack for the app.
import { Stack } from 'expo-router';

// This is the main layout for the app. It is used to create a modal stack for the app.
export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen
        name="new-task-list"
        options={{
          title: 'New List',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="task-detail"
        options={{
          title: 'List Detail',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="edit-note"
        options={{
          title: 'Edit Note',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="trash"
        options={{
          title: 'Trash',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="vault"
        options={{
          title: 'Vault',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="archive"
        options={{
          title: 'Archive',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="about"
        options={{
          title: 'About',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="category-input"
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
