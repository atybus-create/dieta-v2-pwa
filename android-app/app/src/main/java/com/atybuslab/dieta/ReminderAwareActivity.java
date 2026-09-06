package com.atybuslab.dieta;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import java.lang.reflect.Field;

public class ReminderAwareActivity extends MainActivity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 702;
    private BillingBridge billingBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        attachBillingBridge();
        ReminderReceiver.scheduleAll(this);
        requestNotificationPermissionIfNeeded();
    }

    private void attachBillingBridge() {
        try {
            Field webViewField = MainActivity.class.getDeclaredField("webView");
            webViewField.setAccessible(true);
            WebView webView = (WebView) webViewField.get(this);
            if (webView == null) return;
            billingBridge = new BillingBridge(this, webView);
            webView.addJavascriptInterface(billingBridge, "AndroidBilling");
        } catch (Exception ignored) {
        }
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

    @Override
    protected void onDestroy() {
        if (billingBridge != null) billingBridge.destroy();
        super.onDestroy();
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
