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

    public BillingBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        this.billingClient = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(
                        PendingPurchasesParams.newBuilder()
                                .enableOneTimeProducts()
                                .build()
                )
                .build();
        connect();
    }

    private void connect() {
        if (billingClient.isReady() || connecting) return;
        connecting = true;
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                connecting = false;
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    emitState(true);
                } else {
                    emitState(false);
                    emitError("SETUP_FAILED", billingResult.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                connecting = false;
                emitState(false);
            }
        });
    }

    @JavascriptInterface
    public boolean isReady() {
        return billingClient.isReady();
    }

    @JavascriptInterface
    public void queryProducts() {
        activity.runOnUiThread(() -> {
            if (!billingClient.isReady()) {
                connect();
                return;
            }
            queryProductsInternal();
        });
    }

    @JavascriptInterface
    public void purchase(String productId) {
        activity.runOnUiThread(() -> launchPurchase(productId));
    }

    @JavascriptInterface
    public void restorePurchases() {
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
        for (String productId : PRODUCT_IDS) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(productId)
                    .setProductType(BillingClient.ProductType.SUBS)
                    .build());
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, result) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                emitError("PRODUCT_QUERY_FAILED", billingResult.getDebugMessage());
                return;
            }

            productDetails.clear();
            JSONArray out = new JSONArray();
            for (ProductDetails details : result.getProductDetailsList()) {
                ProductDetails.SubscriptionOfferDetails offer = findMonthlyOffer(details);
                if (offer == null || offer.getPricingPhases().getPricingPhaseList().isEmpty()) continue;

                productDetails.put(details.getProductId(), details);
                try {
                    ProductDetails.PricingPhase phase = offer.getPricingPhases().getPricingPhaseList().get(0);
                    JSONObject p = new JSONObject();
                    p.put("productId", details.getProductId());
                    p.put("name", details.getName());
                    p.put("description", details.getDescription());
                    p.put("basePlanId", offer.getBasePlanId());
                    p.put("formattedPrice", phase.getFormattedPrice());
                    p.put("priceAmountMicros", phase.getPriceAmountMicros());
                    p.put("priceCurrencyCode", phase.getPriceCurrencyCode());
                    p.put("billingPeriod", phase.getBillingPeriod());
                    out.put(p);
                } catch (Exception ignored) {
                }
            }

            emitProducts(out);
            queryPurchasesInternal(false);
        });
    }

    private ProductDetails.SubscriptionOfferDetails findMonthlyOffer(ProductDetails details) {
        List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) return null;
        for (ProductDetails.SubscriptionOfferDetails offer : offers) {
            if (BASE_PLAN_ID.equals(offer.getBasePlanId())) return offer;
        }
        return null;
    }

    private void launchPurchase(String rawProductId) {
        String productId = normalizeProductId(rawProductId);
        if (productId.isEmpty()) {
            emitError("UNKNOWN_PRODUCT", rawProductId == null ? "" : rawProductId);
            return;
        }
        if (!billingClient.isReady()) {
            connect();
            emitError("BILLING_NOT_READY", "Google Play Billing nie jest jeszcze gotowy.");
            return;
        }

        ProductDetails details = productDetails.get(productId);
        if (details == null) {
            queryProductsInternal();
            emitError("PRODUCT_NOT_READY", "Dane planu są odświeżane. Spróbuj ponownie za chwilę.");
            return;
        }

        ProductDetails.SubscriptionOfferDetails offer = findMonthlyOffer(details);
        if (offer == null) {
            emitError("NO_MONTHLY_OFFER", "Brak aktywnego abonamentu monthly dla " + productId + ".");
            return;
        }

        Purchase current = findCurrentPurchasedSubscription();
        String currentProductId = current == null ? "" : findKnownProductId(current);
        if (productId.equals(currentProductId)) {
            emitError("ALREADY_SUBSCRIBED", "Ten plan jest już aktywny w Google Play.");
            return;
        }

        BillingFlowParams.ProductDetailsParams.Builder productParamsBuilder =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(details)
                        .setOfferToken(offer.getOfferToken());

        BillingFlowParams.Builder flowBuilder = BillingFlowParams.newBuilder();

        if (current != null && !currentProductId.isEmpty()) {
            int replacementMode = PRODUCT_VIP.equals(productId)
                    ? BillingFlowParams.ProductDetailsParams.SubscriptionProductReplacementParams.ReplacementMode.CHARGE_PRORATED_PRICE
                    : BillingFlowParams.ProductDetailsParams.SubscriptionProductReplacementParams.ReplacementMode.DEFERRED;

            productParamsBuilder.setSubscriptionProductReplacementParams(
                    BillingFlowParams.ProductDetailsParams.SubscriptionProductReplacementParams.newBuilder()
                            .setOldProductId(currentProductId)
                            .setReplacementMode(replacementMode)
                            .build()
            );

            flowBuilder.setSubscriptionUpdateParams(
                    BillingFlowParams.SubscriptionUpdateParams.newBuilder()
                            .setOldPurchaseToken(current.getPurchaseToken())
                            .build()
            );
        }

        BillingFlowParams flowParams = flowBuilder
                .setProductDetailsParamsList(Collections.singletonList(productParamsBuilder.build()))
                .build();

        BillingResult result = billingClient.launchBillingFlow(activity, flowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            emitError("PURCHASE_FLOW_FAILED", result.getDebugMessage());
        }
    }

    private String normalizeProductId(String rawProductId) {
        String productId = rawProductId == null ? "" : rawProductId.trim().toLowerCase();
        if (PRODUCT_PLUS.equals(productId) || PRODUCT_VIP.equals(productId)) return productId;
        return "";
    }

    private String findKnownProductId(Purchase purchase) {
        if (purchase == null) return "";
        for (String product : purchase.getProducts()) {
            String normalized = normalizeProductId(product);
            if (!normalized.isEmpty()) return normalized;
        }
        return "";
    }

    private Purchase findCurrentPurchasedSubscription() {
        for (Purchase purchase : cachedPurchases) {
            if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
            if (!findKnownProductId(purchase).isEmpty()) return purchase;
        }
        return null;
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            emitError("USER_CANCELED", "Zakup anulowany.");
            return;
        }
        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            emitError("PURCHASE_UPDATE_FAILED", billingResult.getDebugMessage());
            return;
        }
        cachePurchases(purchases);
        emitPurchases(purchases, false);
    }

    private void queryPurchasesInternal(boolean restore) {
        if (!billingClient.isReady()) {
            connect();
            return;
        }
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();
        billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
            if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                cachePurchases(purchases);
                if (restore) emitPurchases(purchases, true);
            } else {
                emitError(restore ? "RESTORE_FAILED" : "PURCHASE_QUERY_FAILED", billingResult.getDebugMessage());
            }
        });
    }

    private void cachePurchases(List<Purchase> purchases) {
        cachedPurchases.clear();
        if (purchases != null) cachedPurchases.addAll(purchases);
    }

    private void emitPurchases(List<Purchase> purchases, boolean restore) {
        JSONArray list = new JSONArray();
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                try {
                    JSONObject item = new JSONObject();
                    JSONArray products = new JSONArray();
                    for (String product : purchase.getProducts()) products.put(product);
                    item.put("products", products);
                    item.put("purchaseToken", purchase.getPurchaseToken());
                    item.put("purchaseState", purchase.getPurchaseState());
                    item.put("purchased", purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED);
                    item.put("pending", purchase.getPurchaseState() == Purchase.PurchaseState.PENDING);
                    item.put("acknowledged", purchase.isAcknowledged());
                    item.put("autoRenewing", purchase.isAutoRenewing());
                    item.put("orderId", purchase.getOrderId() == null ? JSONObject.NULL : purchase.getOrderId());
                    list.put(item);
                } catch (Exception ignored) {
                }
            }
        }
        try {
            JSONObject payload = new JSONObject();
            payload.put("restore", restore);
            payload.put("purchases", list);
            emit("window.__wczBillingPurchase&&window.__wczBillingPurchase(" + payload.toString() + ");");
        } catch (Exception ignored) {
        }
    }

    private void emitProducts(JSONArray products) {
        emit("window.__wczBillingProducts&&window.__wczBillingProducts(" + products.toString() + ");");
    }

    private void emitState(boolean ready) {
        emit("window.__wczBillingState&&window.__wczBillingState(" + (ready ? "true" : "false") + ");");
    }

    private void emitError(String code, String message) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("code", code == null ? "BILLING_ERROR" : code);
            payload.put("message", message == null ? "" : message);
            emit("window.__wczBillingError&&window.__wczBillingError(" + payload.toString() + ");");
        } catch (Exception ignored) {
        }
    }

    private void emit(String javascript) {
        if (webView == null) return;
        webView.post(() -> webView.evaluateJavascript(javascript, null));
    }

    public void destroy() {
        if (billingClient.isReady()) billingClient.endConnection();
        cachedPurchases.clear();
        productDetails.clear();
    }
}
