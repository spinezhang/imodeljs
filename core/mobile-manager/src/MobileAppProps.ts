/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module NativeApp
 */

/** @internal */
export const mobileAppChannel = "mobileApp";
/** @internal */
export const mobileAppNotify = "mobileApp-notify";

export enum Orientation {
  Unknown = 0,
  Portrait = 0x1,
  PortraitUpsideDown = 0x2,
  LandscapeLeft = 0x4,
  LandscapeRight = 0x8,
  FaceUp = 0x10,
  FaceDown = 0x20,
}

export enum BatteryState {
  Unknown = 0,
  Unplugged = 1,
  Charging = 2,
  Full = 3,
}

export interface MobileNotifications {
  notifyMemoryWarning: () => void;
  notifyOrientationChanged: () => void;
  notifyEnterForeground: () => void;
  notifyEnterBackground: () => void;
  notifyWillTerminate: () => void;
}

/**
* The methods that may be invoked via Ipc from the frontend of a Mobile App that are implemented on its backend.
* @internal
*/
export interface MobileAppFunctions {
  reconnect: (connection: number) => Promise<void>;
  /**
   * Initiate a sign in on backend. This will emit an onUserStateChange() event.
   */
  authSignIn: () => Promise<void>;

  /**
   * Sign out the user on the backend. This will emit an onUserStateChange() event.
   */
  authSignOut: () => Promise<void>;

  /**
   * Get access token and perform silent refresh as needed
   * @note returns OIDC token
   */
  authGetAccessToken: () => Promise<string>;

  /**
   * Initialize OIDC client
   * @param _issuer URL for issuer.
   * @param _config configuration for oidc client
   */
  authInitialize: (_issuer: string, _config: any) => Promise<void>;
}
