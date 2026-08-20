package com.atybuslab.dieta;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private static final String LOCAL_APP_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int FILE_CHOOSER_REQUEST = 501;

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraOutputUri;
    private WebViewAssetLoader assetLoader;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor("#071014"));
        getWindow().setNavigationBarColor(Color.parseColor("#071014"));

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " DietaV2Native/1.1.0 StandaloneBundle/1");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                view.evaluateJavascript("window.__AI_MONITOR_NATIVE__=true;window.__AI_MONITOR_STANDALONE_BUNDLE__=true;", null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                view.evaluateJavascript(
                        "window.__AI_MONITOR_NATIVE__=true;" +
                        "window.__AI_MONITOR_STANDALONE_BUNDLE__=true;" +
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

        if (savedInstanceState == null) {
            webView.loadUrl(LOCAL_APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
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
