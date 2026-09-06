package com.atybuslab.dieta;

import android.app.Activity;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class BillingBridge implements PurchasesUpdatedListener {
    private static final String PRODUCT_PLUS = "plus";
    private static final String PRODUCT_VIP = "vip";
    private static final String[] PRODUCT_IDS = new String[]{PRODUCT_PLUS, PRODUCT_VIP};
    private static final String BASE_PLAN_ID = "monthly";

    private final Activity activity;
    private final WebView webView;
    private final BillingClient billingClient;
    private final Map<String, ProductDetails> productDetails = new HashMap<>();
    private final List<Purchase> cachedPurchases = new ArrayList<>();
    private boolean connecting = false;
    private String pendingPurchaseProductId = "";

    public BillingBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.billingClient = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .build();
        connect();
    }

    private void connect() {
        if (billingClient.isReady() || connecting) return;
        connecting = true;
        billingClient.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                connecting = false;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    emitState(true);
                    queryProductsInternal();
                } else {
                    emitState(false);
                    emitBillingError("SETUP_FAILED", result);
                }
            }
            @Override public void onBillingServiceDisconnected() {
                connecting = false;
                emitState(false);
            }
        });
    }

    @JavascriptInterface public boolean isReady() { return billingClient.isReady(); }

    @JavascriptInterface public void queryProducts() {
        activity.runOnUiThread(() -> {
            if (!billingClient.isReady()) { connect(); return; }
            queryProductsInternal();
        });
    }

    @JavascriptInterface public void purchase(String productId) {
        activity.runOnUiThread(() -> preparePurchase(productId));
    }

    @JavascriptInterface public void restorePurchases() {
        activity.runOnUiThread(() -> {
            if (!billingClient.isReady()) {
                connect();
                emitError("BILLING_NOT_READY", "Google Play Billing nie jest jeszcze gotowy.");
                return;
            }
            queryPurchasesInternal(true);
        });
    }

    private void queryProductsInternal() {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : PRODUCT_IDS) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id).setProductType(BillingClient.ProductType.SUBS).build());
        }
        billingClient.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build(), (result, detailsResult) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                emitBillingError("PRODUCT_QUERY_FAILED", result); return;
            }
            productDetails.clear();
            JSONArray out = new JSONArray();
            for (ProductDetails details : detailsResult.getProductDetailsList()) {
                ProductDetails.SubscriptionOfferDetails offer = findMonthlyOffer(details);
                if (offer == null || offer.getPricingPhases().getPricingPhaseList().isEmpty()) continue;
                productDetails.put(details.getProductId(), details);
                try {
                    ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                    JSONObject p = new JSONObject();
                    p.put("productId", details.getProductId()); p.put("name", details.getName());
                    p.put("description", details.getDescription()); p.put("basePlanId", offer.getBasePlanId());
                    p.put("formattedPrice", phase.getFormattedPrice()); p.put("priceAmountMicros", phase.getPriceAmountMicros());
                    p.put("priceCurrencyCode", phase.getPriceCurrencyCode()); p.put("billingPeriod", phase.getBillingPeriod()); out.put(p);
                } catch (Exception ignored) {}
            }
            emitProducts(out);
            queryPurchasesInternal(false);
        });
    }

    private ProductDetails.SubscriptionOfferDetails findMonthlyOffer(ProductDetails details) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) if (BASE_PLAN_ID.equals(offer.getBasePlanId())) return offer;
        return null;
    }

    private void preparePurchase(String rawProductId) {
        String productId = normalizeProductId(rawProductId);
        if (productId.isEmpty()) { emitError("UNKNOWN_PRODUCT", String.valueOf(rawProductId)); return; }
        if (!billingClient.isReady()) { connect(); emitError("BILLING_NOT_READY", "Google Play Billing nie jest jeszcze gotowy."); return; }
        if (!productDetails.containsKey(productId)) { queryProductsInternal(); emitError("PRODUCT_NOT_READY", "Odświeżam dane planu. Spróbuj ponownie za chwilę."); return; }

        // Zawsze pobieramy świeży stan Google Play bezpośrednio przed zmianą planu.
        // Nie wolno opierać upgrade/downgrade na cache z chwili uruchomienia aplikacji.
        pendingPurchaseProductId = productId;
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build();
        billingClient.queryPurchasesAsync(params, (result, purchases) -> activity.runOnUiThread(() -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                pendingPurchaseProductId = ""; emitBillingError("PURCHASE_STATE_REFRESH_FAILED", result); return;
            }
            cachePurchases(purchases);
            String target = pendingPurchaseProductId;
            pendingPurchaseProductId = "";
            launchPurchaseWithFreshState(target);
        }));
    }

    private void launchPurchaseWithFreshState(String productId) {
        ProductDetails details = productDetails.get(productId);
        ProductDetails.SubscriptionOfferDetails offer = details == null ? null : findMonthlyOffer(details);
        if (details == null || offer == null) { emitError("NO_MONTHLY_OFFER", "Brak aktywnego abonamentu monthly dla " + productId + "."); return; }

        Purchase current = findCurrentPurchasedSubscription();
        String currentProductId = current == null ? "" : findKnownProductId(current);
        if (productId.equals(currentProductId)) { emitError("ALREADY_SUBSCRIBED", "Ten plan jest już aktywny w Google Play."); return; }

        BillingFlowParams.ProductDetailsParams.Builder productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details).setOfferToken(offer.getOfferToken());
        BillingFlowParams.Builder flow = BillingFlowParams.newBuilder();

        if (current != null && !currentProductId.isEmpty()) {
            int mode = PRODUCT_VIP.equals(productId)
                    ? BillingFlowParams.ProductDetailsParams.SubscriptionProductReplacementParams.ReplacementMode.CHARGE_PRORATED_PRICE
                    : BillingFlowParams.ProductDetailsParams.SubscriptionProductReplacementParams.ReplacementMode.DEFERRED;
            productParams.setSubscriptionProductReplacementParams(
                    BillingFlowParams.ProductDetailsParams.SubscriptionProductReplacementParams.newBuilder()
                            .setOldProductId(currentProductId).setReplacementMode(mode).build());
            flow.setSubscriptionUpdateParams(BillingFlowParams.SubscriptionUpdateParams.newBuilder()
                    .setOldPurchaseToken(current.getPurchaseToken()).build());
        }

        BillingResult result = billingClient.launchBillingFlow(activity,
                flow.setProductDetailsParamsList(Collections.singletonList(productParams.build())).build());
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) emitBillingError("PURCHASE_FLOW_FAILED", result);
    }

    private String normalizeProductId(String raw) {
        String id = raw == null ? "" : raw.trim().toLowerCase();
        return PRODUCT_PLUS.equals(id) || PRODUCT_VIP.equals(id) ? id : "";
    }

    private String findKnownProductId(Purchase purchase) {
        if (purchase == null) return "";
        for (String product : purchase.getProducts()) { String id = normalizeProductId(product); if (!id.isEmpty()) return id; }
        return "";
    }

    private Purchase findCurrentPurchasedSubscription() {
        Purchase best = null;
        for (Purchase p : cachedPurchases) {
            if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED || findKnownProductId(p).isEmpty()) continue;
            if (best == null || p.getPurchaseTime() > best.getPurchaseTime()) best = p;
        }
        return best;
    }

    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) { emitError("USER_CANCELED", "Zakup anulowany."); return; }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { emitBillingError("PURCHASE_UPDATE_FAILED", result); return; }
        cachePurchases(purchases); emitPurchases(purchases, false);
    }

    private void queryPurchasesInternal(boolean restore) {
        if (!billingClient.isReady()) { connect(); if (restore) emitError("BILLING_NOT_READY", "Google Play Billing nie jest jeszcze gotowy."); return; }
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build();
        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) { cachePurchases(purchases); if (restore) emitPurchases(purchases, true); }
            else emitBillingError(restore ? "RESTORE_FAILED" : "PURCHASE_QUERY_FAILED", result);
        });
    }

    private void cachePurchases(List<Purchase> purchases) { cachedPurchases.clear(); if (purchases != null) cachedPurchases.addAll(purchases); }

    private void emitPurchases(List<Purchase> purchases, boolean restore) {
        JSONArray list = new JSONArray();
        if (purchases != null) for (Purchase purchase : purchases) try {
            JSONObject item = new JSONObject(); JSONArray products = new JSONArray();
            for (String product : purchase.getProducts()) products.put(product);
            item.put("products", products); item.put("purchaseToken", purchase.getPurchaseToken());
            item.put("purchaseState", purchase.getPurchaseState()); item.put("purchaseTime", purchase.getPurchaseTime());
            item.put("purchased", purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED);
            item.put("pending", purchase.getPurchaseState() == Purchase.PurchaseState.PENDING);
            item.put("acknowledged", purchase.isAcknowledged()); item.put("autoRenewing", purchase.isAutoRenewing());
            item.put("orderId", purchase.getOrderId() == null ? JSONObject.NULL : purchase.getOrderId()); list.put(item);
        } catch (Exception ignored) {}
        try {
            JSONObject payload = new JSONObject(); payload.put("restore", restore); payload.put("purchases", list);
            emit("window.__wczBillingPurchase&&window.__wczBillingPurchase(" + payload + ");");
        } catch (Exception ignored) {}
    }

    private void emitProducts(JSONArray products) { emit("window.__wczBillingProducts&&window.__wczBillingProducts(" + products + ");"); }
    private void emitState(boolean ready) { emit("window.__wczBillingState&&window.__wczBillingState(" + ready + ");"); }

    private void emitBillingError(String code, BillingResult result) {
        String message = (result == null ? "" : result.getDebugMessage());
        int responseCode = result == null ? -999 : result.getResponseCode();
        emitError(code, message + " [Google Play code: " + responseCode + "]");
    }

    private void emitError(String code, String message) {
        try {
            JSONObject payload = new JSONObject(); payload.put("code", code == null ? "BILLING_ERROR" : code); payload.put("message", message == null ? "" : message);
            emit("window.__wczBillingError&&window.__wczBillingError(" + payload + ");");
        } catch (Exception ignored) {}
    }

    private void emit(String js) { if (webView != null) webView.post(() -> webView.evaluateJavascript(js, null)); }

    public void destroy() {
        pendingPurchaseProductId = "";
        if (billingClient.isReady()) billingClient.endConnection();
        cachedPurchases.clear(); productDetails.clear();
    }
}
