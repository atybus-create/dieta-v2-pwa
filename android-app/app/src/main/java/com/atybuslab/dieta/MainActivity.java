package com.atybuslab.dieta;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.webkit.WebViewAssetLoader;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdView;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

public class MainActivity extends Activity {
    private static final String LOCAL_APP_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int CAMERA_REQUEST = 703;
    private static final int MAX_EDGE = 1280;

    // Identyfikatory AdMob są dostarczane przez BuildConfig per buildType:
    // debug = oficjalne testowe Google, release = produkcyjne jednostki aplikacji.
    private static final String REWARDED_AD_ID = BuildConfig.ADMOB_REWARDED_ID;
    private static final String INTERSTITIAL_AD_ID = BuildConfig.ADMOB_INTERSTITIAL_ID;
    private static final String NATIVE_AD_ID = BuildConfig.ADMOB_NATIVE_ID;

    private WebView webView;
    private FrameLayout rootFrame;
    private WebViewAssetLoader assetLoader;
    private Uri cameraOutputUri;

    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;
    private boolean rewardedLoading = false;
    private boolean interstitialLoading = false;
    private NativeAd currentNativeAd;
    private View nativeAdContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor("#071014"));
        getWindow().setNavigationBarColor(Color.parseColor("#071014"));

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        rootFrame = new FrameLayout(this);
        webView = new WebView(this);
        rootFrame.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        setContentView(rootFrame);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(
                settings.getUserAgentString()
                        + " DietaV2Native/" + getAppVersionName()
                        + " StandaloneBundle/4 NativeBridge/1 MonetizationTest/"
                        + (BuildConfig.MONETIZATION_TEST_MODE ? "1" : "0")
        );

        // Mosty są rejestrowane przed loadUrl. Frontend nie czeka na timeout ani wstrzykiwany listener.
        webView.addJavascriptInterface(new AppBridge(), "AndroidApp");
        webView.addJavascriptInterface(new CameraBridge(), "AndroidCamera");
        webView.addJavascriptInterface(new MonetizationBridge(), "AndroidMonetization");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        MobileAds.initialize(this, initializationStatus -> {
            preloadRewarded(false);
            preloadInterstitial(false);
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                String host = uri.getHost();

                if (("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                        && host != null
                        && (host.equals("appassets.androidplatform.net") || host.equals("api.atybuslab.com"))) {
                    return false;
                }

                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                }
                return true;
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(LOCAL_APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private String getAppVersionName() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return info.versionName == null || info.versionName.trim().isEmpty()
                    ? "unknown"
                    : info.versionName;
        } catch (Exception e) {
            return "unknown";
        }
    }

    private long getAppVersionCode() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return info.getLongVersionCode();
            }
            return info.versionCode;
        } catch (Exception e) {
            return 0L;
        }
    }

    private final class AppBridge {
        @JavascriptInterface
        public String getCapabilities() {
            try {
                JSONObject result = new JSONObject();
                result.put("platform", "android");
                result.put("native", true);
                result.put("camera", true);
                result.put("reminders", true);
                result.put("monetization", true);
                result.put("monetizationTest", BuildConfig.MONETIZATION_TEST_MODE);
                result.put("standalone", true);
                result.put("appVersion", getAppVersionName());
                result.put("versionCode", getAppVersionCode());
                result.put("sdk", Build.VERSION.SDK_INT);
                return result.toString();
            } catch (Exception e) {
                return "{\"platform\":\"android\",\"native\":true}";
            }
        }
    }

    private final class CameraBridge {
        @JavascriptInterface
        public void captureMealPhoto() {
            runOnUiThread(MainActivity.this::launchCamera);
        }
    }

    private final class MonetizationBridge {
        @JavascriptInterface
        public void showRewarded() {
            runOnUiThread(() -> showRewardedInternal());
        }

        @JavascriptInterface
        public void showInterstitial() {
            runOnUiThread(() -> showInterstitialInternal());
        }

        @JavascriptInterface
        public void showIngredientNative() {
            runOnUiThread(() -> showNativeInternal());
        }
    }

    private void preloadRewarded(boolean showAfterLoad) {
        if (rewardedLoading) return;
        if (rewardedAd != null) {
            if (showAfterLoad) showRewardedInternal();
            return;
        }
        rewardedLoading = true;
        RewardedAd.load(this, REWARDED_AD_ID, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull RewardedAd ad) {
                rewardedLoading = false;
                rewardedAd = ad;
                if (showAfterLoad) showRewardedInternal();
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                rewardedLoading = false;
                rewardedAd = null;
                if (showAfterLoad) notifyAdResult("rewarded", false);
            }
        });
    }

    private void showRewardedInternal() {
        if (rewardedAd == null) {
            preloadRewarded(true);
            return;
        }

        RewardedAd ad = rewardedAd;
        rewardedAd = null;
        final boolean[] rewardEarned = {false};
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                notifyAdResult("rewarded", rewardEarned[0]);
                preloadRewarded(false);
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                notifyAdResult("rewarded", false);
                preloadRewarded(false);
            }
        });
        ad.show(this, rewardItem -> rewardEarned[0] = true);
    }

    private void preloadInterstitial(boolean showAfterLoad) {
        if (interstitialLoading) return;
        if (interstitialAd != null) {
            if (showAfterLoad) showInterstitialInternal();
            return;
        }
        interstitialLoading = true;
        InterstitialAd.load(this, INTERSTITIAL_AD_ID, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull InterstitialAd ad) {
                interstitialLoading = false;
                interstitialAd = ad;
                if (showAfterLoad) showInterstitialInternal();
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                interstitialLoading = false;
                interstitialAd = null;
                if (showAfterLoad) notifyAdResult("interstitial", false);
            }
        });
    }

    private void showInterstitialInternal() {
        if (interstitialAd == null) {
            preloadInterstitial(true);
            return;
        }
        InterstitialAd ad = interstitialAd;
        interstitialAd = null;
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                notifyAdResult("interstitial", true);
                preloadInterstitial(false);
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                notifyAdResult("interstitial", false);
                preloadInterstitial(false);
            }
        });
        ad.show(this);
    }

    private void showNativeInternal() {
        AdLoader loader = new AdLoader.Builder(this, NATIVE_AD_ID)
                .forNativeAd(nativeAd -> {
                    if (isFinishing() || isDestroyed()) {
                        nativeAd.destroy();
                        notifyAdResult("native", false);
                        return;
                    }
                    renderNativeAd(nativeAd);
                    notifyAdResult("native", true);
                })
                .withAdListener(new AdListener() {
                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError error) {
                        notifyAdResult("native", false);
                    }
                })
                .build();
        loader.loadAd(new AdRequest.Builder().build());
    }

    private void renderNativeAd(NativeAd nativeAd) {
        removeNativeAd();
        currentNativeAd = nativeAd;

        NativeAdView adView = new NativeAdView(this);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.parseColor("#102027"));
        background.setCornerRadius(dp(18));
        background.setStroke(dp(1), Color.parseColor("#2F746C"));
        adView.setBackground(background);
        adView.setPadding(dp(14), dp(10), dp(14), dp(10));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        adView.addView(row, new NativeAdView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        LinearLayout textColumn = new LinearLayout(this);
        textColumn.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams textParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        row.addView(textColumn, textParams);

        TextView label = new TextView(this);
        label.setText(BuildConfig.MONETIZATION_TEST_MODE ? "REKLAMA TESTOWA" : "REKLAMA");
        label.setTextColor(Color.parseColor("#63DECE"));
        label.setTextSize(10);
        textColumn.addView(label);

        TextView headline = new TextView(this);
        headline.setTextColor(Color.WHITE);
        headline.setTextSize(15);
        headline.setTypeface(null, android.graphics.Typeface.BOLD);
        headline.setText(nativeAd.getHeadline());
        textColumn.addView(headline);
        adView.setHeadlineView(headline);

        TextView body = new TextView(this);
        body.setTextColor(Color.parseColor("#A9BFC0"));
        body.setTextSize(12);
        if (nativeAd.getBody() != null) {
            body.setText(nativeAd.getBody());
            textColumn.addView(body);
            adView.setBodyView(body);
        }

        Button cta = new Button(this);
        cta.setAllCaps(false);
        cta.setText(nativeAd.getCallToAction() == null ? "Więcej" : nativeAd.getCallToAction());
        row.addView(cta, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(44)));
        adView.setCallToActionView(cta);

        TextView close = new TextView(this);
        close.setText("  ×  ");
        close.setTextColor(Color.WHITE);
        close.setTextSize(22);
        close.setGravity(Gravity.CENTER);
        close.setOnClickListener(v -> removeNativeAd());
        row.addView(close, new LinearLayout.LayoutParams(dp(44), dp(44)));

        adView.setNativeAd(nativeAd);

        FrameLayout container = new FrameLayout(this);
        container.setPadding(dp(10), dp(6), dp(10), dp(12));
        container.addView(adView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
        );
        rootFrame.addView(container, params);
        nativeAdContainer = container;

        container.postDelayed(() -> {
            if (nativeAdContainer == container) removeNativeAd();
        }, 20000);
    }

    private void removeNativeAd() {
        if (nativeAdContainer != null) {
            rootFrame.removeView(nativeAdContainer);
            nativeAdContainer = null;
        }
        if (currentNativeAd != null) {
            currentNativeAd.destroy();
            currentNativeAd = null;
        }
    }

    private void notifyAdResult(String type, boolean success) {
        if (webView == null) return;
        String safeType = type.replace("'", "");
        webView.post(() -> webView.evaluateJavascript(
                "window.__wczMonetizationAdResult&&window.__wczMonetizationAdResult('" + safeType + "'," + (success ? "true" : "false") + ");",
                null
        ));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void launchCamera() {
        if (cameraOutputUri != null) {
            emitCameraEvent("camera_error", "CAMERA_BUSY", "Aparat jest już uruchomiony.", 0);
            return;
        }

        emitCameraEvent("camera_open", null, null, 0);
        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraOutputUri = createCameraOutputUri();

        if (cameraOutputUri == null || cameraIntent.resolveActivity(getPackageManager()) == null) {
            emitCameraEvent("camera_error", "CAMERA_UNAVAILABLE", "Nie udało się uruchomić aparatu.", 0);
            deleteCameraOutputIfPresent();
            clearCameraUri();
            return;
        }

        final int grantFlags = Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION;
        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
        cameraIntent.setClipData(ClipData.newRawUri("meal-photo", cameraOutputUri));
        cameraIntent.addFlags(grantFlags);

        List<ResolveInfo> cameraApps = getPackageManager().queryIntentActivities(cameraIntent, PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo info : cameraApps) {
            if (info.activityInfo != null && info.activityInfo.packageName != null) {
                grantUriPermission(info.activityInfo.packageName, cameraOutputUri, grantFlags);
            }
        }

        try {
            startActivityForResult(cameraIntent, CAMERA_REQUEST);
        } catch (Exception e) {
            emitCameraEvent("camera_error", "CAMERA_LAUNCH_FAILED", "Nie udało się uruchomić aparatu.", 0);
            deleteCameraOutputIfPresent();
            revokeAndClearCameraUri();
        }
    }

    private Uri createCameraOutputUri() {
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "meal_native_" + System.currentTimeMillis() + ".jpg");
            values.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/WiemCoZremAI");
            return getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != CAMERA_REQUEST) return;

        emitCameraEvent("camera_result", resultCode == RESULT_OK ? "OK" : "CANCELLED", null, 0);

        Uri returnedUri = data != null ? data.getData() : null;
        Uri usableUri = resultCode == RESULT_OK && hasContent(cameraOutputUri)
                ? cameraOutputUri
                : (resultCode == RESULT_OK && hasContent(returnedUri) ? returnedUri : null);

        if (usableUri == null) {
            boolean cancelled = resultCode == RESULT_CANCELED;
            emitCameraEvent(
                    cancelled ? "camera_cancelled" : "camera_error",
                    cancelled ? "USER_CANCELLED" : "NO_IMAGE",
                    cancelled ? "Anulowano robienie zdjęcia." : "Aparat nie zwrócił poprawnego zdjęcia.",
                    0
            );
            deleteCameraOutputIfPresent();
            revokeAndClearCameraUri();
            return;
        }

        final Uri photoUri = usableUri;
        new Thread(() -> {
            try {
                byte[] jpeg = normalizeCameraPhoto(photoUri);
                if (jpeg == null || jpeg.length == 0) throw new IllegalStateException("Puste zdjęcie");
                emitCameraEvent("photo_prepared", "OK", null, jpeg.length);
                String base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP);
                deliverPhotoToJavascript(base64);
            } catch (Exception e) {
                emitCameraEvent("camera_error", "PHOTO_PREPARE_FAILED", "Nie udało się przygotować zdjęcia do analizy.", 0);
            } finally {
                revokeAndClearCameraUri();
            }
        }, "meal-camera-normalize").start();
    }

    private boolean hasContent(Uri uri) {
        if (uri == null) return false;
        try (InputStream stream = getContentResolver().openInputStream(uri)) {
            return stream != null && stream.read() != -1;
        } catch (Exception e) {
            return false;
        }
    }

    private byte[] normalizeCameraPhoto(Uri uri) throws Exception {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        try (InputStream stream = getContentResolver().openInputStream(uri)) {
            BitmapFactory.decodeStream(stream, null, bounds);
        }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw new IllegalStateException("Nieprawidłowe wymiary zdjęcia");
        }

        int sample = 1;
        while (Math.max(bounds.outWidth / sample, bounds.outHeight / sample) > MAX_EDGE * 2) {
            sample *= 2;
        }

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inSampleSize = Math.max(1, sample);
        Bitmap bitmap;
        try (InputStream stream = getContentResolver().openInputStream(uri)) {
            bitmap = BitmapFactory.decodeStream(stream, null, options);
        }
        if (bitmap == null) throw new IllegalStateException("Nie udało się odczytać zdjęcia");

        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        float scale = Math.min(1f, (float) MAX_EDGE / Math.max(width, height));
        Bitmap output = bitmap;
        if (scale < 1f) {
            int targetWidth = Math.max(1, Math.round(width * scale));
            int targetHeight = Math.max(1, Math.round(height * scale));
            output = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);
        }

        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        boolean ok = output.compress(Bitmap.CompressFormat.JPEG, 80, bytes);
        if (output != bitmap) output.recycle();
        bitmap.recycle();
        if (!ok) throw new IllegalStateException("Nie udało się zakodować zdjęcia");
        return bytes.toByteArray();
    }

    private void deliverPhotoToJavascript(String base64) {
        if (webView == null) return;
        String js = "window.__wczNativeCameraPhoto&&window.__wczNativeCameraPhoto("
                + JSONObject.quote(base64) + ","
                + JSONObject.quote("image/jpeg") + ","
                + JSONObject.quote("meal.jpg") + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void emitCameraEvent(String stage, String code, String message, int bytes) {
        if (webView == null) return;
        try {
            JSONObject event = new JSONObject();
            event.put("stage", stage);
            if (code != null) event.put("code", code);
            if (message != null) event.put("message", message);
            if (bytes > 0) event.put("bytes", bytes);
            String js = "window.__wczNativeCameraEvent&&window.__wczNativeCameraEvent(" + event.toString() + ");";
            webView.post(() -> webView.evaluateJavascript(js, null));
        } catch (Exception ignored) {
        }
    }

    private void deleteCameraOutputIfPresent() {
        if (cameraOutputUri == null) return;
        try {
            getContentResolver().delete(cameraOutputUri, null, null);
        } catch (Exception ignored) {
        }
    }

    private void clearCameraUri() {
        cameraOutputUri = null;
    }

    private void revokeAndClearCameraUri() {
        if (cameraOutputUri != null) {
            int flags = Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION;
            try {
                revokeUriPermission(cameraOutputUri, flags);
            } catch (Exception ignored) {
            }
        }
        cameraOutputUri = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        removeNativeAd();
        if (cameraOutputUri != null) {
            deleteCameraOutputIfPresent();
            revokeAndClearCameraUri();
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
