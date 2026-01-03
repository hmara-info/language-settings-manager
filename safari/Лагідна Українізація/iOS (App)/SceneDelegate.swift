//
//  SceneDelegate.swift
//  iOS (App)
//
//  Created by Yaroslav Korshak on 03/01/2026.
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let _ = (scene as? UIWindowScene) else { return }

        // Open Safari specifically (not the default browser) using x-safari URL scheme
        if let url = URL(string: "x-safari-https://hmara.info/onboarding/ios-safari.html") {
            UIApplication.shared.open(url)
        }
    }

}
