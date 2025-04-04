// This file is responsible for managing notifications in the app.
// It uses the Expo Notifications API to request permissions, schedule notifications, and cancel them.
// The NotificationService class provides static methods to handle these tasks.
// The requestPermissions method requests permission to send notifications.
import * as Notifications from 'expo-notifications';
//import { Platform } from 'react-native';

export class NotificationService {
  static async requestPermissions() {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  static async scheduleNotification(title: string, body: string, trigger?: any) {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger,
    });
  }

  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
