package com.atybuslab.dieta;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import android.content.pm.PackageManager;

public class ReminderAwareActivity extends MainActivity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 702;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ReminderReceiver.scheduleAll(this);
        requestNotificationPermissionIfNeeded();
    }

    @Override
    protected void onResume() {
        super.onResume();
        ReminderReceiver.markAppForeground(this, true);
        ReminderReceiver.scheduleAll(this);
    }

    @Override
    protected void onPause() {
        ReminderReceiver.markAppForeground(this, false);
        super.onPause();
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_REQUEST
            );
        }
    }
}
