package com.atybuslab.dieta;

import android.os.Bundle;
import android.webkit.WebView;

import java.lang.reflect.Field;

public class BillingAwareActivity extends ReminderAwareActivity {
    private BillingBridge billingBridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        attachBillingBridge();
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
    protected void onDestroy() {
        if (billingBridge != null) billingBridge.destroy();
        super.onDestroy();
    }
}
