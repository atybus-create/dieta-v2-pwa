package com.atybuslab.dieta;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.android.billingclient.api.Purchase;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class MainActivity extends Activity {
    private static final String LOCAL_APP_URL = "https://appassets.androidplatform.net/assets/www/index.html";
    private static final int FILE_CHOOSER_REQUEST = 501;
    private static final String PLUS_PRODUCT = "wczai_plus_monthly";
    private static final String VIP_PRODUCT = "wczai_vip_monthly";

    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private Uri cameraOutputUri;
    private WebViewAssetLoader assetLoader;
    private BillingClient billingClient;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.parseColor("#071014"));
        getWindow().setNavigationBarColor(Color.parseColor("#071014"));
        assetLoader = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView = new WebView(this); setContentView(webView);
        WebSettings settings = webView.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true); settings.setDatabaseEnabled(true); settings.setAllowContentAccess(true); settings.setAllowFileAccess(false); settings.setMediaPlaybackRequiresUserGesture(false); settings.setBuiltInZoomControls(false); settings.setDisplayZoomControls(false); settings.setUserAgentString(settings.getUserAgentString()+" DietaV2Native/1.2.0 StandaloneBundle/3");
        webView.addJavascriptInterface(new BillingBridge(), "AndroidBilling");
        CookieManager cm=CookieManager.getInstance(); cm.setAcceptCookie(true); cm.setAcceptThirdPartyCookies(webView,true);
        setupBilling();
        webView.setWebViewClient(new WebViewClient(){
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, android.webkit.WebResourceRequest request){return assetLoader.shouldInterceptRequest(request.getUrl());}
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){super.onPageStarted(view,url,favicon);view.evaluateJavascript("window.__AI_MONITOR_NATIVE__=true;window.__AI_MONITOR_STANDALONE_BUNDLE__=true;",null);}
            @Override public void onPageFinished(WebView view,String url){super.onPageFinished(view,url);view.evaluateJavascript("window.__AI_MONITOR_NATIVE__=true;window.__AI_MONITOR_STANDALONE_BUNDLE__=true;document.documentElement.classList.add('native-wrapper');['installFirstBtn','installHint','installBtn'].forEach(function(id){var e=document.getElementById(id);if(e)e.remove();});",null); restorePurchases();}
            @Override public boolean shouldOverrideUrlLoading(WebView view,android.webkit.WebResourceRequest request){Uri uri=request.getUrl();String scheme=uri.getScheme(),host=uri.getHost();if(("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme))&&host!=null&&(host.equals("appassets.androidplatform.net")||host.equals("api.atybuslab.com")))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}return true;}
        });
        webView.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams p){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;launchCamera();return true;}});
        if(savedInstanceState==null)webView.loadUrl(LOCAL_APP_URL);else webView.restoreState(savedInstanceState);
    }

    private void setupBilling(){
        billingClient=BillingClient.newBuilder(this).setListener((result,purchases)->{if(result.getResponseCode()==BillingClient.BillingResponseCode.OK&&purchases!=null)for(Purchase p:purchases)sendPurchaseToWeb(p);}).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build();
        billingClient.startConnection(new BillingClientStateListener(){@Override public void onBillingSetupFinished(BillingResult r){if(r.getResponseCode()==BillingClient.BillingResponseCode.OK)restorePurchases();}@Override public void onBillingServiceDisconnected(){}});
    }

    private void launchSubscription(String productId,String requestedPlan){
        if(billingClient==null||!billingClient.isReady()){setupBilling();toastBilling("Łączę z Google Play. Spróbuj ponownie za chwilę.");return;}
        QueryProductDetailsParams.Product product=QueryProductDetailsParams.Product.newBuilder().setProductId(productId).setProductType(BillingClient.ProductType.SUBS).build();
        QueryProductDetailsParams params=QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(product)).build();
        billingClient.queryProductDetailsAsync(params,(result,queryResult)->{
            if(result.getResponseCode()!=BillingClient.BillingResponseCode.OK||queryResult.getProductDetailsList().isEmpty()){toastBilling("Subskrypcja nie jest jeszcze dostępna w Google Play.");return;}
            ProductDetails pd=queryResult.getProductDetailsList().get(0); List<ProductDetails.SubscriptionOfferDetails> offers=pd.getSubscriptionOfferDetails(); if(offers==null||offers.isEmpty()){toastBilling("Brak aktywnej oferty subskrypcji.");return;}
            String offerToken=offers.get(0).getOfferToken(); BillingFlowParams.ProductDetailsParams dp=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(pd).setOfferToken(offerToken).build();
            BillingFlowParams flow=BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(dp)).build(); billingClient.launchBillingFlow(this,flow);
        });
    }

    private void restorePurchases(){if(billingClient==null||!billingClient.isReady())return;QueryPurchasesParams q=QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build();billingClient.queryPurchasesAsync(q,(r,list)->{if(r.getResponseCode()==BillingClient.BillingResponseCode.OK)for(Purchase p:list)sendPurchaseToWeb(p);});}
    private void sendPurchaseToWeb(Purchase p){String product=p.getProducts().isEmpty()?"":p.getProducts().get(0);String plan=VIP_PRODUCT.equals(product)?"vip":PLUS_PRODUCT.equals(product)?"plus":"";if(plan.isEmpty())return;String js="window.dispatchEvent(new CustomEvent('google-play-purchase',{detail:{productId:"+quote(product)+",plan:"+quote(plan)+",purchaseToken:"+quote(p.getPurchaseToken())+",purchaseState:"+p.getPurchaseState()+",acknowledged:"+p.isAcknowledged()+"}}));";runOnUiThread(()->webView.evaluateJavascript(js,null));}
    private String quote(String s){return "'"+(s==null?"":s.replace("\\","\\\\").replace("'","\\'").replace("\n",""))+"'";}
    private void toastBilling(String msg){runOnUiThread(()->webView.evaluateJavascript("if(window.toast)toast("+quote(msg)+");else alert("+quote(msg)+");",null));}

    public class BillingBridge {@JavascriptInterface public void purchase(String productId,String plan){runOnUiThread(()->launchSubscription(productId,plan));}@JavascriptInterface public void restore(){runOnUiThread(()->restorePurchases());}}

    private void launchCamera(){Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);cameraOutputUri=createCameraOutputUri();if(cameraOutputUri==null||i.resolveActivity(getPackageManager())==null){if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}cameraOutputUri=null;return;}i.putExtra(MediaStore.EXTRA_OUTPUT,cameraOutputUri);i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivityForResult(i,FILE_CHOOSER_REQUEST);}
    private Uri createCameraOutputUri(){try{ContentValues v=new ContentValues();v.put(MediaStore.Images.Media.DISPLAY_NAME,"meal_"+System.currentTimeMillis()+".jpg");v.put(MediaStore.Images.Media.MIME_TYPE,"image/jpeg");v.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/WiemCoZremAI");return getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,v);}catch(Exception e){return null;}}
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode!=FILE_CHOOSER_REQUEST||fileCallback==null)return;Uri[] result=null;if(resultCode==RESULT_OK&&cameraOutputUri!=null)result=new Uri[]{cameraOutputUri};fileCallback.onReceiveValue(result);fileCallback=null;cameraOutputUri=null;}
    @Override protected void onSaveInstanceState(Bundle outState){webView.saveState(outState);super.onSaveInstanceState(outState);}
    @Override protected void onDestroy(){if(billingClient!=null)billingClient.endConnection();super.onDestroy();}
    @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
}
