import Capacitor
import Foundation

@objc(SelectionCapturePlugin)
public class SelectionCapturePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SelectionCapturePlugin"
    public let jsName = "SelectionCapture"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "close", returnType: CAPPluginReturnPromise)
    ]

    private let defaults = UserDefaults(suiteName: "group.datamerge.xyz.lexbrain.app")

    @objc public func getPendingText(_ call: CAPPluginCall) {
        guard let defaults else {
            call.reject("LexBrain shared storage is unavailable")
            return
        }

        let text = defaults.string(forKey: "pendingText") ?? ""
        let source = defaults.string(forKey: "pendingSource")
        let subject = defaults.string(forKey: "pendingSubject")
        let sourceUrl = defaults.string(forKey: "pendingSourceUrl")

        defaults.removeObject(forKey: "pendingText")
        defaults.removeObject(forKey: "pendingSource")
        defaults.removeObject(forKey: "pendingSubject")
        defaults.removeObject(forKey: "pendingSourceUrl")

        var result: [String: Any] = ["text": text]
        if let source { result["source"] = source }
        if let subject { result["subject"] = subject }
        if let sourceUrl { result["sourceUrl"] = sourceUrl }
        call.resolve(result)
    }

    @objc public func close(_ call: CAPPluginCall) {
        call.resolve()
    }
}