package com.atybuslab.dieta;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.webkit.WebViewAssetLoader;

import com.google.android.gms.ads.AdError;
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

public class MainActivity extends Activity {
    private static final String LOCAL_APP_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int FILE_CHOOSER_REQUEST = 501;

    // Oficjalne demonstracyjne jednostki reklamowe Google. Nigdy nie zastępują produkcyjnych ID.
    private static final String TEST_REWARDED_ID = "ca-app-pub-3940256099942544/5224354917";
    private static final String TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";
    private static final String TEST_NATIVE_ID = "ca-app-pub-3940256099942544/2247696110";

    private WebView webView;
    private FrameLayout nativeAdContainer;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraOutputUri;
    private WebViewAssetLoader assetLoader;
    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;
    private NativeAd currentNativeAd;
    private boolean rewardedEarned;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor("#071014"));
        getWindow().setNavigationBarColor(Color.parseColor("#071014"));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#071014"));

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
        ));

        nativeAdContainer = new FrameLayout(this);
        nativeAdContainer.setVisibility(View.GONE);
        root.addView(nativeAdContainer, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        setContentView(root);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " DietaV2Native/1.1.2 StandaloneBundle/2 TestAds/1");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new AdsBridge(), "AndroidAds");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                view.evaluateJavascript("window.__AI_MONITOR_NATIVE__=true;window.__AI_MONITOR_STANDALONE_BUNDLE__=true;window.__AI_MONITOR_TEST_ADS__=true;", null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                        "window.__AI_MONITOR_NATIVE__=true;" +
                        "window.__AI_MONITOR_STANDALONE_BUNDLE__=true;" +
                        "window.__AI_MONITOR_TEST_ADS__=true;" +
                        "document.documentElement.classList.add('native-wrapper');" +
                        "['installFirstBtn','installHint','installBtn'].forEach(function(id){var e=document.getElementById(id);if(e)e.remove();});",
                        null
                );
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

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {

                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }

                fileCallback = filePathCallback;
                launchCamera();
                return true;
            }
        });

        MobileAds.initialize(this, initializationStatus -> {
            preloadRewarded();
            preloadInterstitial();
        });

        if (savedInstanceState == null) {
            webView.loadUrl(LOCAL_APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void preloadRewarded() {
        RewardedAd.load(
                this,
                TEST_REWARDED_ID,
                new AdRequest.Builder().build(),
                new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(RewardedAd ad) {
                        rewardedAd = ad;
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        rewardedAd = null;
                    }
                }
        );
    }

    private void preloadInterstitial() {
        InterstitialAd.load(
                this,
                TEST_INTERSTITIAL_ID,
                new AdRequest.Builder().build(),
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd ad) {
                        interstitialAd = ad;
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        interstitialAd = null;
                    }
                }
        );
    }

    private void showRewardedAd() {
        runOnUiThread(() -> {
            if (rewardedAd == null) {
                preloadRewarded();
                notifyJavascript("onRewardedUnavailable", "");
                return;
            }

            RewardedAd ad = rewardedAd;
            rewardedAd = null;
            rewardedEarned = false;

            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                    notifyJavascript("onRewardedResult", rewardedEarned ? "true" : "false");
                    preloadRewarded();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(AdError adError) {
                    notifyJavascript("onRewardedResult", "false");
                    preloadRewarded();
                }
            });

            ad.show(this, rewardItem -> rewardedEarned = true);
        });
    }

    private void showInterstitialAd() {
        runOnUiThread(() -> {
            if (interstitialAd == null) {
                preloadInterstitial();
                notifyJavascript("onInterstitialResult", "false");
                return;
            }

            InterstitialAd ad = interstitialAd;
            interstitialAd = null;
            ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdShowedFullScreenContent() {
                    notifyJavascript("onInterstitialShown", "");
                }

                @Override
                public void onAdDismissedFullScreenContent() {
                    notifyJavascript("onInterstitialResult", "true");
                    preloadInterstitial();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(AdError adError) {
                    notifyJavascript("onInterstitialResult", "false");
                    preloadInterstitial();
                }
            });
            ad.show(this);
        });
    }

    private void showNativeAd() {
        runOnUiThread(() -> {
            AdLoader loader = new AdLoader.Builder(this, TEST_NATIVE_ID)
                    .forNativeAd(nativeAd -> {
                        if (isFinishing() || isDestroyed()) {
                            nativeAd.destroy();
                            return;
                        }
                        if (currentNativeAd != null) currentNativeAd.destroy();
                        currentNativeAd = nativeAd;
                        renderNativeAd(nativeAd);
                        notifyJavascript("onNativeShown", "");
                    })
                    .build();
            loader.loadAd(new AdRequest.Builder().build());
        });
    }

    private void renderNativeAd(NativeAd nativeAd) {
        NativeAdView adView = new NativeAdView(this);
        adView.setBackgroundColor(Color.parseColor("#0D1A1F"));
        int padding = dp(12);
        adView.setPadding(padding, dp(8), padding, dp(8));

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setGravity(Gravity.CENTER_VERTICAL);

        TextView label = new TextView(this);
        label.setText("REKLAMA TESTOWA");
        label.setTextColor(Color.parseColor("#69E1D1"));
        label.setTextSize(10);
        label.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        row.addView(label);

        TextView headline = new TextView(this);
        headline.setText(nativeAd.getHeadline());
        headline.setTextColor(Color.WHITE);
        headline.setTextSize(14);
        headline.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        row.addView(headline);
        adView.setHeadlineView(headline);

        TextView body = new TextView(this);
        body.setText(nativeAd.getBody() == null ? "" : nativeAd.getBody());
        body.setTextColor(Color.parseColor("#B9CBCE"));
        body.setTextSize(12);
        body.setMaxLines(2);
        row.addView(body);
        adView.setBodyView(body);

        if (nativeAd.getCallToAction() != null) {
            Button cta = new Button(this);
            cta.setText(nativeAd.getCallToAction());
            cta.setAllCaps(false);
            row.addView(cta, new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
            ));
            adView.setCallToActionView(cta);
        }

        adView.addView(row, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
        ));
        adView.setNativeAd(nativeAd);

        nativeAdContainer.removeAllViews();
        nativeAdContainer.addView(adView);
        nativeAdContainer.setVisibility(View.VISIBLE);
        nativeAdContainer.postDelayed(this::hideNativeAd, 10000);
    }

    private void hideNativeAd() {
        nativeAdContainer.setVisibility(View.GONE);
        nativeAdContainer.removeAllViews();
        if (currentNativeAd != null) {
            currentNativeAd.destroy();
            currentNativeAd = null;
        }
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void notifyJavascript(String method, String argumentLiteral) {
        runOnUiThread(() -> {
            String call = "window.WCZMonetization&&window.WCZMonetization." + method + "(" + argumentLiteral + ");";
            webView.evaluateJavascript(call, null);
        });
    }

    public class AdsBridge {
        @JavascriptInterface
        public void showRewarded() {
            showRewardedAd();
        }

        @JavascriptInterface
        public void showInterstitial() {
            showInterstitialAd();
        }

        @JavascriptInterface
        public void showNative() {
            showNativeAd();
        }

        @JavascriptInterface
        public boolean isTestMode() {
            return true;
        }
    }

    private void launchCamera() {
        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        cameraOutputUri = createCameraOutputUri();

        if (cameraOutputUri == null || cameraIntent.resolveActivity(getPackageManager()) == null) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(null);
                fileCallback = null;
            }
            cameraOutputUri = null;
            return;
        }

        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraOutputUri);
        cameraIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivityForResult(cameraIntent, FILE_CHOOSER_REQUEST);
    }

    private Uri createCameraOutputUri() {
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME, "meal_" + System.currentTimeMillis() + ".jpg");
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

        if (requestCode != FILE_CHOOSER_REQUEST || fileCallback == null) {
            return;
        }

        Uri[] result = null;
        if (resultCode == RESULT_OK && cameraOutputUri != null) {
            result = new Uri[]{cameraOutputUri};
        }

        fileCallback.onReceiveValue(result);
        fileCallback = null;
        cameraOutputUri = null;
    }

    @Override
    protected void onDestroy() {
        if (currentNativeAd != null) {
            currentNativeAd.destroy();
            currentNativeAd = null;
        }
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidAds");
            webView.destroy();
        }
        super.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
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
