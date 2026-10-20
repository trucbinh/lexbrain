package com.lexbrain.app;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Translucent activity that appears over the browser / PDF reader when the user chooses
 * "Add to LexBrain" in the text-selection menu. It hosts the same React app, which detects
 * the pending text and renders only the capture sheet.
 */
public class CaptureActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SelectionCapturePlugin.class);
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
        }
    }
}
