package com.solidrix.chakkibook;

import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.webkit.CookieManager;
import android.content.pm.PackageManager;
import android.Manifest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQ_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure status bar and navigation bar have clean spacing and visible icons
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                getWindow().setNavigationBarColor(android.graphics.Color.parseColor("#ffffff"));
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
            getWindow().setStatusBarColor(android.graphics.Color.parseColor("#ffffff"));
        }

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(this.getBridge().getWebView(), true);
        }

        // Prevent WebView from drawing under system status/notification bar
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            this.getBridge().getWebView().setFitsSystemWindows(true);

            // Enable file download handling so clicks on .apk or files open system browser/DownloadManager
            this.getBridge().getWebView().setDownloadListener(new android.webkit.DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                        intent.setData(android.net.Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            });

            // Expose installed native app version and helper to client JavaScript
            this.getBridge().getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public String getAppVersion() {
                    try {
                        return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
                    } catch (Exception e) {
                        return "2.8.8";
                    }
                }
                @android.webkit.JavascriptInterface
                public int getVersionCode() {
                    try {
                        return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
                    } catch (Exception e) {
                        return 10;
                    }
                }
                @android.webkit.JavascriptInterface
                public boolean isNativeApp() {
                    return true;
                }
                @android.webkit.JavascriptInterface
                public void openExternalUrl(String url) {
                    try {
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                        intent.setData(android.net.Uri.parse(url));
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            }, "AndroidAppInfo");
        }

        requestAppPermissions();
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            List<String> needed = new ArrayList<>();
            String[] perms;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                perms = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.BLUETOOTH_SCAN,
                    Manifest.permission.BLUETOOTH_CONNECT
                };
            } else {
                perms = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.ACCESS_FINE_LOCATION
                };
            }

            for (String p : perms) {
                if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(p);
                }
            }

            if (!needed.isEmpty()) {
                ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), PERMISSION_REQ_CODE);
            }
        }
    }
}
