package com.lexbrain.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Bridges text handed over by Android (PROCESS_TEXT selection menu or the share sheet) to the React app.
 * The same plugin is registered in MainActivity (normal launch: no pending text) and CaptureActivity (popup).
 */
@CapacitorPlugin(name = "SelectionCapture")
public class SelectionCapturePlugin extends Plugin {

    @PluginMethod
    public void getPendingText(PluginCall call) {
        Intent intent = getActivity().getIntent();
        String action = intent != null ? intent.getAction() : null;
        String text = null;
        String source = null;
        String subject = null;

        if (Intent.ACTION_PROCESS_TEXT.equals(action)) {
            CharSequence cs = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
            text = cs != null ? cs.toString() : null;
            source = "process_text";
        } else if (Intent.ACTION_SEND.equals(action) && "text/plain".equals(intent.getType())) {
            text = intent.getStringExtra(Intent.EXTRA_TEXT);
            subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
            source = "share";
        }

        JSObject result = new JSObject();
        result.put("text", text != null ? text : "");
        if (source != null) result.put("source", source);
        if (subject != null) result.put("subject", subject);
        call.resolve(result);
    }

    @PluginMethod
    public void close(PluginCall call) {
        // Only the popup activity may be closed from JS; closing MainActivity would exit the app.
        if (getActivity() instanceof CaptureActivity) {
            getActivity().runOnUiThread(() -> getActivity().finish());
        }
        call.resolve();
    }
}
