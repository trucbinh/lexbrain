package com.lexbrain.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BuildInfoPlugin.class);
        registerPlugin(SelectionCapturePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
