import fs from 'node:fs/promises';

const path = 'android-app/app/src/main/java/com/atybuslab/dieta/MainActivity.java';
let source = await fs.readFile(path, 'utf8');

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  const first = source.indexOf(from);
  const last = source.lastIndexOf(from);
  if (first < 0) throw new Error(`Camera lifecycle patch: missing anchor: ${label}`);
  if (first !== last) throw new Error(`Camera lifecycle patch: anchor is not unique: ${label}`);
  source = source.replace(from, to);
};

replaceOnce(
`    private static final int CAMERA_REQUEST = 703;\n    private static final int MAX_EDGE = 1280;`,
`    private static final int CAMERA_REQUEST = 703;\n    private static final int MAX_EDGE = 1280;\n    private static final String STATE_CAMERA_OUTPUT_URI = "state_camera_output_uri";\n    private static final String STATE_CAMERA_IN_PROGRESS = "state_camera_in_progress";`,
'camera state constants'
);

replaceOnce(
`    private WebViewAssetLoader assetLoader;\n    private Uri cameraOutputUri;`,
`    private WebViewAssetLoader assetLoader;\n    private Uri cameraOutputUri;\n    private boolean cameraCaptureInProgress = false;\n    private boolean cameraPhotoProcessing = false;\n    private boolean webViewReady = false;\n    private String pendingCameraPhotoBase64;`,
'camera lifecycle fields'
);

replaceOnce(
`    protected void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n\n        getWindow().setStatusBarColor`,
`    protected void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n\n        if (savedInstanceState != null) {\n            String restoredCameraUri = savedInstanceState.getString(STATE_CAMERA_OUTPUT_URI);\n            if (restoredCameraUri != null && !restoredCameraUri.trim().isEmpty()) {\n                try {\n                    cameraOutputUri = Uri.parse(restoredCameraUri);\n                } catch (Exception ignored) {\n                    cameraOutputUri = null;\n                }\n            }\n            cameraCaptureInProgress = savedInstanceState.getBoolean(STATE_CAMERA_IN_PROGRESS, false);\n        }\n\n        getWindow().setStatusBarColor`,
'restore camera state in onCreate'
);

replaceOnce(
`        webView.setWebViewClient(new WebViewClient() {\n            @Override\n            public android.webkit.WebResourceResponse shouldInterceptRequest(`,
`        webView.setWebViewClient(new WebViewClient() {\n            @Override\n            public void onPageStarted(WebView view, String url, Bitmap favicon) {\n                webViewReady = false;\n                super.onPageStarted(view, url, favicon);\n            }\n\n            @Override\n            public void onPageFinished(WebView view, String url) {\n                super.onPageFinished(view, url);\n                webViewReady = true;\n                flushPendingCameraPhoto();\n                notifyPrivacyOptionsAvailability();\n            }\n\n            @Override\n            public android.webkit.WebResourceResponse shouldInterceptRequest(`,
'WebView ready callbacks'
);

replaceOnce(
`    private void launchCamera() {\n        if (cameraOutputUri != null) {`,
`    private void launchCamera() {\n        if (cameraCaptureInProgress || cameraOutputUri != null) {`,
'camera busy guard'
);

replaceOnce(
`        try {\n            startActivityForResult(cameraIntent, CAMERA_REQUEST);\n        } catch (Exception e) {`,
`        try {\n            cameraCaptureInProgress = true;\n            startActivityForResult(cameraIntent, CAMERA_REQUEST);\n        } catch (Exception e) {\n            cameraCaptureInProgress = false;`,
'mark capture in progress'
);

replaceOnce(
`        super.onActivityResult(requestCode, resultCode, data);\n        if (requestCode != CAMERA_REQUEST) return;\n\n        emitCameraEvent`,
`        super.onActivityResult(requestCode, resultCode, data);\n        if (requestCode != CAMERA_REQUEST) return;\n\n        cameraCaptureInProgress = false;\n        emitCameraEvent`,
'clear capture flag on result'
);

replaceOnce(
`        final Uri photoUri = usableUri;\n        new Thread(() -> {`,
`        final Uri photoUri = usableUri;\n        cameraPhotoProcessing = true;\n        new Thread(() -> {`,
'mark camera photo processing'
);

replaceOnce(
`            } finally {\n                revokeAndClearCameraUri();\n            }\n        }, "meal-camera-normalize").start();`,
`            } finally {\n                cameraPhotoProcessing = false;\n                revokeAndClearCameraUri();\n            }\n        }, "meal-camera-normalize").start();`,
'clear camera photo processing'
);

replaceOnce(
`    private void deliverPhotoToJavascript(String base64) {\n        if (webView == null) return;\n        String js = "window.__wczNativeCameraPhoto&&window.__wczNativeCameraPhoto("\n                + JSONObject.quote(base64) + ","\n                + JSONObject.quote("image/jpeg") + ","\n                + JSONObject.quote("meal.jpg") + ");";\n        webView.post(() -> webView.evaluateJavascript(js, null));\n    }`,
`    private void deliverPhotoToJavascript(String base64) {\n        if (base64 == null || base64.isEmpty()) return;\n        if (webView == null || !webViewReady) {\n            pendingCameraPhotoBase64 = base64;\n            return;\n        }\n\n        pendingCameraPhotoBase64 = null;\n        String js = "(function(b,t,n){var tries=0;function send(){"\n                + "if(typeof window.__wczNativeCameraPhoto==='function'){window.__wczNativeCameraPhoto(b,t,n);return;}"\n                + "if(++tries<50){setTimeout(send,100);}}send();})("\n                + JSONObject.quote(base64) + ","\n                + JSONObject.quote("image/jpeg") + ","\n                + JSONObject.quote("meal.jpg") + ");";\n        webView.post(() -> webView.evaluateJavascript(js, null));\n    }\n\n    private void flushPendingCameraPhoto() {\n        String pending = pendingCameraPhotoBase64;\n        if (pending == null || pending.isEmpty() || webView == null || !webViewReady) return;\n        deliverPhotoToJavascript(pending);\n    }`,
'queue photo until WebView is ready'
);

replaceOnce(
`    private void clearCameraUri() {\n        cameraOutputUri = null;\n    }`,
`    private void clearCameraUri() {\n        cameraCaptureInProgress = false;\n        cameraOutputUri = null;\n    }`,
'clear capture state together with uri'
);

replaceOnce(
`        cameraOutputUri = null;\n    }\n\n    @Override\n    protected void onSaveInstanceState(Bundle outState) {\n        webView.saveState(outState);\n        super.onSaveInstanceState(outState);\n    }`,
`        cameraCaptureInProgress = false;\n        cameraOutputUri = null;\n    }\n\n    @Override\n    protected void onSaveInstanceState(Bundle outState) {\n        if (cameraOutputUri != null) {\n            outState.putString(STATE_CAMERA_OUTPUT_URI, cameraOutputUri.toString());\n        }\n        outState.putBoolean(STATE_CAMERA_IN_PROGRESS, cameraCaptureInProgress);\n        if (webView != null) webView.saveState(outState);\n        super.onSaveInstanceState(outState);\n    }`,
'persist camera state'
);

replaceOnce(
`    protected void onDestroy() {\n        removeNativeAd();\n        if (cameraOutputUri != null) {\n            deleteCameraOutputIfPresent();\n            revokeAndClearCameraUri();\n        }\n        if (webView != null) webView.destroy();`,
`    protected void onDestroy() {\n        removeNativeAd();\n        // Do not delete the pending MediaStore output while an OEM camera has our Activity\n        // recreated in the background. The result/cancel path owns cleanup. This is critical\n        // for devices that destroy the Activity when ACTION_IMAGE_CAPTURE is in foreground.\n        if (isFinishing() && cameraOutputUri != null && !cameraCaptureInProgress && !cameraPhotoProcessing) {\n            deleteCameraOutputIfPresent();\n            revokeAndClearCameraUri();\n        }\n        if (webView != null) webView.destroy();`,
'preserve pending camera output across Activity recreation'
);

await fs.writeFile(path, source, 'utf8');
console.log('Camera lifecycle patch applied: URI state restore, processing guard and WebView delivery queue enabled.');
