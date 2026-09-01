package com.atybuslab.dieta;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.os.Build;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class ReminderReceiver extends BroadcastReceiver {
    static final String PREFS = "meal_reminders_v1";
    static final String PREF_FOREGROUND = "foreground";
    static final String PREF_LAST_ACTIVITY = "last_activity_ms";

    private static final String ACTION_REMINDER = "com.atybuslab.dieta.MEAL_REMINDER";
    private static final String EXTRA_SLOT = "slot";
    private static final String CHANNEL_ID = "meal_diary_reminders";
    private static final int[] REMINDER_HOURS = {12, 16, 20};

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? "" : String.valueOf(intent.getAction());

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            scheduleAll(context);
            return;
        }

        int slot = intent == null ? 0 : intent.getIntExtra(EXTRA_SLOT, 0);
        if (!isKnownSlot(slot)) {
            scheduleAll(context);
            return;
        }

        if (shouldNotify(context, slot) && !alreadyShownToday(context, slot)) {
            showReminder(context, slot);
            rememberShown(context, slot);
        }

        scheduleSlot(context, slot);
    }

    static void markAppForeground(Context context, boolean foreground) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(PREF_FOREGROUND, foreground)
                .putLong(PREF_LAST_ACTIVITY, System.currentTimeMillis())
                .apply();
    }

    static void scheduleAll(Context context) {
        for (int hour : REMINDER_HOURS) {
            scheduleSlot(context, hour);
        }
    }

    private static void scheduleSlot(Context context, int hour) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) {
            next.add(Calendar.DAY_OF_YEAR, 1);
        }

        Intent reminderIntent = new Intent(context, ReminderReceiver.class)
                .setAction(ACTION_REMINDER)
                .putExtra(EXTRA_SLOT, hour);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                7000 + hour,
                reminderIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pendingIntent);
        } else {
            alarmManager.set(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pendingIntent);
        }
    }

    private static boolean shouldNotify(Context context, int hour) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (prefs.getBoolean(PREF_FOREGROUND, false)) return false;

        long lastActivity = prefs.getLong(PREF_LAST_ACTIVITY, 0L);
        Calendar windowStart = Calendar.getInstance();
        windowStart.set(Calendar.HOUR_OF_DAY, Math.max(0, hour - 4));
        windowStart.set(Calendar.MINUTE, 0);
        windowStart.set(Calendar.SECOND, 0);
        windowStart.set(Calendar.MILLISECOND, 0);

        return lastActivity < windowStart.getTimeInMillis();
    }

    private static boolean alreadyShownToday(Context context, int hour) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return todayKey().equals(prefs.getString("shown_" + hour, ""));
    }

    private static void rememberShown(Context context, int hour) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString("shown_" + hour, todayKey())
                .apply();
    }

    private static String todayKey() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(new Date());
    }

    private static boolean isKnownSlot(int slot) {
        for (int hour : REMINDER_HOURS) {
            if (hour == slot) return true;
        }
        return false;
    }

    private static void showReminder(Context context, int hour) {
        if (Build.VERSION.SDK_INT >= 33
                && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        NotificationManager notificationManager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Przypomnienia o dzienniku",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Przypomnienia o uzupełnieniu dziennika posiłków");
            notificationManager.createNotificationChannel(channel);
        }

        Intent openApp = new Intent(context, ReminderAwareActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                context,
                8100 + hour,
                openApp,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String text;
        if (hour == 12) {
            text = "Hej! Pamiętaj o dopisaniu posiłków do dzisiejszego dziennika.";
        } else if (hour == 16) {
            text = "Dziennik czeka. Dopisz dzisiejsze posiłki, zanim wylecą z głowy.";
        } else {
            text = "Ostatnie przypomnienie na dziś — uzupełnij dziennik, jeśli czegoś brakuje.";
        }

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context);

        builder.setSmallIcon(R.drawable.ic_notification_monster)
                .setLargeIcon(BitmapFactory.decodeResource(context.getResources(), R.drawable.monster_launcher))
                .setContentTitle("Wiem co Żre-m z AI")
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setCategory(Notification.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setShowWhen(true);

        notificationManager.notify(9100 + hour, builder.build());
    }
}
