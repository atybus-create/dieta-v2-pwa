package com.atybuslab.dieta;

import android.Manifest;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

public class ReminderAwareActivity extends MainActivity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 702;
    private static final int DIRECT_CAMERA_REQUEST = 703;
    private static final int MAX_EDGE = 1280;

    private WebView nativeCameraWebView;
    private Uri directCameraUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ReminderReceiver.scheduleAll(this);
        requestNotificationPermissionIfNeeded();
        installNativeCameraBridge();
    }

    @Override
    protected void onResume() {
        super.onResume();
        ReminderReceiver.markAppForeground(this, true);
        ReminderReceiver.scheduleAll(this);
        if (nativeCameraWebView != null) {
            nativeCameraWebView.postDelayed(this::installNativeCameraJavascript, 250);
        }
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

    private void installNativeCameraBridge() {
        View root = findViewById(android.R.id.content);
        nativeCameraWebView = findWebView(root);
        if (nativeCameraWebView == null) return;

        nativeCameraWebView.addJavascriptInterface(new CameraBridge(), "AndroidCamera");
        nativeCameraWebView.postDelayed(this::installNativeCameraJavascript, 350);
        nativeCameraWebView.postDelayed(this::installNativeCameraJavascript, 1200);
    }

    private WebView findWebView(View view) {
        if (view instanceof WebView) return (WebView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                WebView found = findWebView(group.getChildAt(i));
                if (found != null) return found;
            }
        }
        return null;
    }

    private final class CameraBridge {
        @JavascriptInterface
        public void openCamera() {
            runOnUiThread(() -> launchDirectCamera());
        }
    }

    private void installNativeCameraJavascript() {
        if (nativeCameraWebView == null) return;

        String js = "(function(){"
                + "if(!window.AndroidCamera||typeof window.AndroidCamera.openCamera!=='function')return;"
                + "var input=document.getElementById('photoInput');if(!input)return;"
                + "var tile=input.closest('.upload-photo')||input.parentElement;if(!tile)return;"
                + "if(tile.dataset.nativeCameraBound!=='1'){"
                + "tile.dataset.nativeCameraBound='1';"
                + "tile.addEventListener('click',function(e){"
                + "e.preventDefault();e.stopImmediatePropagation();"
                + "try{if(typeof loading==='function')loading(true,'Uruchamiam aparat…','Po zrobieniu zdjęcia rozpocznie się analiza AI.');window.AndroidCamera.openCamera();}"
                + "catch(err){if(typeof loading==='function')loading(false);if(typeof toast==='function')toast('Nie udało się uruchomić aparatu.');}"
                + "},true);"
                + "}"
                + "window.__nativeMealCameraError=function(msg){if(typeof loading==='function')loading(false);if(msg&&typeof toast==='function')toast(msg);};"
                + "window.__nativeMealPhoto=async function(b64,mime,name){try{"
                + "var raw=atob(b64),len=raw.length,bytes=new Uint8Array(len);for(var i=0;i<len;i++)bytes[i]=raw.charCodeAt(i);"
                + "var file=new File([bytes],name||'meal.jpg',{type:mime||'image/jpeg',lastModified:Date.now()});"
                + "if(typeof window.analyzePhoto==='function')await window.analyzePhoto(file);"
                + "else if(typeof analyzePhoto==='function')await analyzePhoto(file);"
                + "else throw new Error('Brak funkcji analizy zdjęcia.');"
                + "}catch(err){if(typeof loading==='function')loading(false);if(typeof toast==='function')toast(err&&err.message?err.message:'Nie udało się przekazać zdjęcia do analizy.');}};"
                + "})();";

        nativeCameraWebView.evaluateJavascript(js, null);
    }

    private void launchDirectCamera() {
        if (directCameraUri != null) {
            deleteDirectCameraUri();
        }

        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        directCameraUri = createDirectCameraUri();

        if (directCameraUri == null || cameraIntent.resolveActivity(getPackageManager()) == null) {
            notifyCameraError("Nie udało się uruchomić aparatu.");
            deleteDirectCameraUri();
            return;
        }

        int flags = Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION;
        cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, directCameraUri);
        cameraIntent.setClipData(ClipData.newRawUri("meal-photo", directCameraUri));
        cameraIntent.addFlags(flags);

        List<ResolveInfo> cameraApps = getPackageManager().queryIntentActivities(cameraIntent, PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo info : cameraApps) {
            if (info.activityInfo != null && info.activityInfo.packageName != null) {
                grantUriPermission(info.activityInfo.packageName, directCameraUri, flags);
            }
        }

        try {
            startActivityForResult(cameraIntent, DIRECT_CAMERA_REQUEST);
        } catch (Exception e) {
            notifyCameraError("Nie udało się uruchomić aparatu.");
            deleteDirectCameraUri();
        }
    }

    private Uri createDirectCameraUri() {
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
        if (requestCode != DIRECT_CAMERA_REQUEST) return;

        Uri returnedUri = data != null ? data.getData() : null;
        Uri usableUri = resultCode == RESULT_OK && hasContent(directCameraUri)
                ? directCameraUri
                : (resultCode == RESULT_OK && hasContent(returnedUri) ? returnedUri : null);

        if (usableUri == null) {
            notifyCameraError(resultCode == RESULT_CANCELED ? "Anulowano robienie zdjęcia." : "Aparat nie zwrócił poprawnego zdjęcia.");
            deleteDirectCameraUri();
            return;
        }

        final Uri photoUri = usableUri;
        new Thread(() -> {
            try {
                byte[] jpeg = normalizeCameraPhoto(photoUri);
                if (jpeg == null || jpeg.length == 0) throw new IllegalStateException("Puste zdjęcie");
                String base64 = Base64.encodeToString(jpeg, Base64.NO_WRAP);
                deliverPhotoToJavascript(base64);
            } catch (Exception e) {
                notifyCameraError("Nie udało się przygotować zdjęcia do analizy.");
            } finally {
                revokeAndClearDirectCameraUri();
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
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw new IllegalStateException("Nieprawidłowe wymiary zdjęcia");

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
        if (nativeCameraWebView == null) return;
        String js = "window.__nativeMealPhoto&&window.__nativeMealPhoto("
                + JSONObject.quote(base64) + "," + JSONObject.quote("image/jpeg") + "," + JSONObject.quote("meal.jpg") + ");";
        nativeCameraWebView.post(() -> nativeCameraWebView.evaluateJavascript(js, null));
    }

    private void notifyCameraError(String message) {
        if (nativeCameraWebView == null) return;
        String js = "window.__nativeMealCameraError&&window.__nativeMealCameraError(" + JSONObject.quote(message) + ");";
        nativeCameraWebView.post(() -> nativeCameraWebView.evaluateJavascript(js, null));
    }

    private void revokeAndClearDirectCameraUri() {
        if (directCameraUri != null) {
            int flags = Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION;
            try {
                revokeUriPermission(directCameraUri, flags);
            } catch (Exception ignored) {
            }
        }
        directCameraUri = null;
    }

    private void deleteDirectCameraUri() {
        if (directCameraUri != null) {
            try {
                getContentResolver().delete(directCameraUri, null, null);
            } catch (Exception ignored) {
            }
        }
        revokeAndClearDirectCameraUri();
    }
}
