import Foundation
import SafariServices

private let appGroup = "group.datamerge.xyz.lexbrain.app"

final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let response = NSExtensionItem()
        guard
            let item = context.inputItems.first as? NSExtensionItem,
            let message = item.userInfo?[SFExtensionMessageKey] as? [String: Any],
            let text = message["text"] as? String,
            !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            let defaults = UserDefaults(suiteName: appGroup)
        else {
            response.userInfo = [SFExtensionMessageKey: ["ok": false]]
            context.completeRequest(returningItems: [response])
            return
        }

        defaults.set(text, forKey: "pendingText")
        defaults.set("safari", forKey: "pendingSource")
        defaults.set(message["title"] as? String, forKey: "pendingSubject")
        defaults.set(message["url"] as? String, forKey: "pendingSourceUrl")
        response.userInfo = [SFExtensionMessageKey: ["ok": true]]
        context.completeRequest(returningItems: [response])
    }
}