package com.velologiclabs.wisp;

import android.os.Bundle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // This app targets SDK 36, so Android 15+ forces edge-to-edge: the WebView
        // draws UNDER the system navigation bar. Android WebView does NOT expose the
        // nav-bar height to CSS env(safe-area-inset-bottom), so our fixed bottom nav
        // sat beneath the system 3-button bar — and its centered Home button
        // swallowed every tap on the centered "Mixes" tab (Sounds/Settings on the
        // sides still worked). Inset the WebView by the system-bar bottom so the
        // app's UI stays inside the safe area and the bottom nav clears the system
        // bar. The top inset is reported correctly via CSS env() (display cutout),
        // so only the bottom is applied here.
        // Pad the WebView's PARENT (not the WebView itself): padding a WebView
        // doesn't move CSS position:fixed; bottom:0, but shrinking its parent
        // container shrinks the WebView's pixel size, so its CSS viewport reflects
        // the safe area and the fixed bottom nav clears the system bar.
        final android.view.View host = (android.view.View) getBridge().getWebView().getParent();
        ViewCompat.setOnApplyWindowInsetsListener(host, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(0, 0, 0, bars.bottom);
            return insets;
        });
        // Insets may have already been dispatched before the listener attached, so
        // ask for a fresh pass — otherwise the padding is never applied.
        ViewCompat.requestApplyInsets(host);
    }
}
