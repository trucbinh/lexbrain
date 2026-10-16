import Capacitor

@objc(BuildInfoPlugin)
public class BuildInfoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BuildInfoPlugin"
    public let jsName = "BuildInfo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getBuildInfo", returnType: CAPPluginReturnPromise)
    ]

    @objc func getBuildInfo(_ call: CAPPluginCall) {
        #if DEBUG
        call.resolve(["debugBuild": true])
        #else
        call.resolve(["debugBuild": false])
        #endif
    }
}
