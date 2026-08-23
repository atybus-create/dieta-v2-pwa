package com.atybuslab.dieta;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
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
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

import java.util.Collections;
import java.util.List;

public class MainActivity extends Activity {
    private static final String LOCAL_APP_URL="https://appassets.androidplatform.net/assets/www/index.html";
    private static final int FILE_CHOOSER_REQUEST=501;
    private static final String PLUS_PRODUCT="wczai_plus_monthly";
    private static final String VIP_PRODUCT="wczai_vip_monthly";
    // Official Google demo units: safe for RC testing and not connected to the publisher account.
    private static final String TEST_BANNER="ca-app-pub-3940256099942544/6300978111";
    private static final String TEST_INTERSTITIAL="ca-app-pub-3940256099942544/1033173712";
    private static final String TEST_REWARDED="ca-app-pub-3940256099942544/5224354917";

    private WebView webView; private ValueCallback<Uri[]> fileCallback; private Uri cameraOutputUri;
    private WebViewAssetLoader assetLoader; private BillingClient billingClient; private FrameLayout root;
    private AdView bannerView; private InterstitialAd interstitialAd; private RewardedAd rewardedAd;

    @Override protected void onCreate(Bundle savedInstanceState){
        super.onCreate(savedInstanceState); getWindow().setStatusBarColor(Color.parseColor("#071014")); getWindow().setNavigationBarColor(Color.parseColor("#071014"));
        root=new FrameLayout(this); webView=new WebView(this); root.addView(webView,new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT)); setContentView(root);
        assetLoader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        WebSettings s=webView.getSettings(); s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setAllowContentAccess(true);s.setAllowFileAccess(false);s.setMediaPlaybackRequiresUserGesture(false);s.setBuiltInZoomControls(false);s.setDisplayZoomControls(false);s.setUserAgentString(s.getUserAgentString()+" DietaV2Native/1.2.0-rc2 StandaloneBundle/4");
        webView.addJavascriptInterface(new BillingBridge(),"AndroidBilling"); webView.addJavascriptInterface(new AdsBridge(),"AndroidAds");
        CookieManager cm=CookieManager.getInstance();cm.setAcceptCookie(true);cm.setAcceptThirdPartyCookies(webView,true);
        setupBilling(); MobileAds.initialize(this, status->{ preloadInterstitial(); preloadRewarded(); });
        webView.setWebViewClient(new WebViewClient(){
            @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView v,android.webkit.WebResourceRequest r){return assetLoader.shouldInterceptRequest(r.getUrl());}
            @Override public void onPageStarted(WebView v,String u,android.graphics.Bitmap f){super.onPageStarted(v,u,f);v.evaluateJavascript("window.__AI_MONITOR_NATIVE__=true;window.__AI_MONITOR_STANDALONE_BUNDLE__=true;window.__AI_MONITOR_ADS_TEST__=true;",null);}
            @Override public void onPageFinished(WebView v,String u){super.onPageFinished(v,u);v.evaluateJavascript("window.__AI_MONITOR_NATIVE__=true;window.__AI_MONITOR_STANDALONE_BUNDLE__=true;window.__AI_MONITOR_ADS_TEST__=true;document.documentElement.classList.add('native-wrapper');['installFirstBtn','installHint','installBtn'].forEach(function(id){var e=document.getElementById(id);if(e)e.remove();});",null);restorePurchases();}
            @Override public boolean shouldOverrideUrlLoading(WebView v,android.webkit.WebResourceRequest r){Uri uri=r.getUrl();String scheme=uri.getScheme(),host=uri.getHost();if(("http".equalsIgnoreCase(scheme)||"https".equalsIgnoreCase(scheme))&&host!=null&&(host.equals("appassets.androidplatform.net")||host.equals("api.atybuslab.com")))return false;try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}return true;}
        });
        webView.setWebChromeClient(new WebChromeClient(){@Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams p){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;launchCamera();return true;}});
        if(savedInstanceState==null)webView.loadUrl(LOCAL_APP_URL);else webView.restoreState(savedInstanceState);
    }

    private void preloadInterstitial(){InterstitialAd.load(this,TEST_INTERSTITIAL,new AdRequest.Builder().build(),new InterstitialAdLoadCallback(){@Override public void onAdLoaded(@NonNull InterstitialAd ad){interstitialAd=ad;}@Override public void onAdFailedToLoad(@NonNull LoadAdError e){interstitialAd=null;}});}
    private void showInterstitial(){runOnUiThread(()->{if(interstitialAd==null){preloadInterstitial();adsEvent("interstitial_unavailable");return;}InterstitialAd ad=interstitialAd;interstitialAd=null;ad.setFullScreenContentCallback(new FullScreenContentCallback(){@Override public void onAdDismissedFullScreenContent(){adsEvent("interstitial_closed");preloadInterstitial();}});ad.show(this);adsEvent("interstitial_shown");});}
    private void preloadRewarded(){RewardedAd.load(this,TEST_REWARDED,new AdRequest.Builder().build(),new RewardedAdLoadCallback(){@Override public void onAdLoaded(@NonNull RewardedAd ad){rewardedAd=ad;}@Override public void onAdFailedToLoad(@NonNull LoadAdError e){rewardedAd=null;}});}
    private void showRewarded(){runOnUiThread(()->{if(rewardedAd==null){preloadRewarded();adsEvent("rewarded_unavailable");return;}RewardedAd ad=rewardedAd;rewardedAd=null;ad.setFullScreenContentCallback(new FullScreenContentCallback(){@Override public void onAdDismissedFullScreenContent(){adsEvent("rewarded_closed");preloadRewarded();}});ad.show(this,reward->adsEvent("rewarded_complete"));});}
    private void showBanner(){runOnUiThread(()->{hideBanner();bannerView=new AdView(this);bannerView.setAdUnitId(TEST_BANNER);bannerView.setAdSize(AdSize.BANNER);FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT,ViewGroup.LayoutParams.WRAP_CONTENT);lp.gravity=Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL;lp.bottomMargin=18;root.addView(bannerView,lp);bannerView.loadAd(new AdRequest.Builder().build());adsEvent("native_shown");});}
    private void hideBanner(){if(bannerView!=null){root.removeView(bannerView);bannerView.destroy();bannerView=null;}}
    private void adsEvent(String type){if(webView==null)return;runOnUiThread(()->webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('wczai-ad-event',{detail:{type:"+quote(type)+"}}));",null));}
    public class AdsBridge{@JavascriptInterface public void showRewarded(){MainActivity.this.showRewarded();}@JavascriptInterface public void showInterstitial(){MainActivity.this.showInterstitial();}@JavascriptInterface public void showNative(){MainActivity.this.showBanner();}@JavascriptInterface public void hideNative(){runOnUiThread(()->hideBanner());}}

    private void setupBilling(){billingClient=BillingClient.newBuilder(this).setListener((r,p)->{if(r.getResponseCode()==BillingClient.BillingResponseCode.OK&&p!=null)for(Purchase x:p)sendPurchaseToWeb(x);}).enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()).enableAutoServiceReconnection().build();billingClient.startConnection(new BillingClientStateListener(){@Override public void onBillingSetupFinished(BillingResult r){if(r.getResponseCode()==BillingClient.BillingResponseCode.OK)restorePurchases();}@Override public void onBillingServiceDisconnected(){}});}
    private void launchSubscription(String productId,String requestedPlan){if(billingClient==null||!billingClient.isReady()){setupBilling();toastBilling("Łączę z Google Play. Spróbuj ponownie za chwilę.");return;}QueryProductDetailsParams.Product product=QueryProductDetailsParams.Product.newBuilder().setProductId(productId).setProductType(BillingClient.ProductType.SUBS).build();QueryProductDetailsParams params=QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(product)).build();billingClient.queryProductDetailsAsync(params,(r,q)->{if(r.getResponseCode()!=BillingClient.BillingResponseCode.OK||q.getProductDetailsList().isEmpty()){toastBilling("Subskrypcja nie jest jeszcze dostępna w Google Play.");return;}ProductDetails pd=q.getProductDetailsList().get(0);List<ProductDetails.SubscriptionOfferDetails> offers=pd.getSubscriptionOfferDetails();if(offers==null||offers.isEmpty()){toastBilling("Brak aktywnej oferty subskrypcji.");return;}BillingFlowParams.ProductDetailsParams dp=BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(pd).setOfferToken(offers.get(0).getOfferToken()).build();billingClient.launchBillingFlow(this,BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(dp)).build());});}
    private void restorePurchases(){if(billingClient==null||!billingClient.isReady())return;billingClient.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(),(r,list)->{if(r.getResponseCode()==BillingClient.BillingResponseCode.OK)for(Purchase p:list)sendPurchaseToWeb(p);});}
    private void sendPurchaseToWeb(Purchase p){String product=p.getProducts().isEmpty()?"":p.getProducts().get(0);String plan=VIP_PRODUCT.equals(product)?"vip":PLUS_PRODUCT.equals(product)?"plus":"";if(plan.isEmpty())return;String js="window.dispatchEvent(new CustomEvent('google-play-purchase',{detail:{productId:"+quote(product)+",plan:"+quote(plan)+",purchaseToken:"+quote(p.getPurchaseToken())+",purchaseState:"+p.getPurchaseState()+",acknowledged:"+p.isAcknowledged()+"}}));";runOnUiThread(()->webView.evaluateJavascript(js,null));}
    private String quote(String s){return "'"+(s==null?"":s.replace("\\","\\\\").replace("'","\\'").replace("\n",""))+"'";}
    private void toastBilling(String msg){runOnUiThread(()->webView.evaluateJavascript("if(window.toast)toast("+quote(msg)+");else alert("+quote(msg)+");",null));}
    public class BillingBridge{@JavascriptInterface public void purchase(String productId,String plan){runOnUiThread(()->launchSubscription(productId,plan));}@JavascriptInterface public void restore(){runOnUiThread(()->restorePurchases());}}

    private void launchCamera(){Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);cameraOutputUri=createCameraOutputUri();if(cameraOutputUri==null||i.resolveActivity(getPackageManager())==null){if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}cameraOutputUri=null;return;}i.putExtra(MediaStore.EXTRA_OUTPUT,cameraOutputUri);i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivityForResult(i,FILE_CHOOSER_REQUEST);}
    private Uri createCameraOutputUri(){try{ContentValues v=new ContentValues();v.put(MediaStore.Images.Media.DISPLAY_NAME,"meal_"+System.currentTimeMillis()+".jpg");v.put(MediaStore.Images.Media.MIME_TYPE,"image/jpeg");v.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/WiemCoZremAI");return getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,v);}catch(Exception e){return null;}}
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){super.onActivityResult(requestCode,resultCode,data);if(requestCode!=FILE_CHOOSER_REQUEST||fileCallback==null)return;Uri[] result=null;if(resultCode==RESULT_OK&&cameraOutputUri!=null)result=new Uri[]{cameraOutputUri};fileCallback.onReceiveValue(result);fileCallback=null;cameraOutputUri=null;}
    @Override protected void onSaveInstanceState(Bundle outState){webView.saveState(outState);super.onSaveInstanceState(outState);}
    @Override protected void onDestroy(){hideBanner();if(billingClient!=null)billingClient.endConnection();super.onDestroy();}
    @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
}
