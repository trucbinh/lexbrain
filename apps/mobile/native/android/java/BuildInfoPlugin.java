package com.lexbrain.app;

import android.content.pm.ApplicationInfo;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BuildInfo")
public class BuildInfoPlugin extends Plugin {
    @PluginMethod
    public void getBuildInfo(PluginCall call) {
        JSObject result = new JSObject();
        boolean debugBuild = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        result.put("debugBuild", debugBuild);
        call.resolve(result);
    }
}