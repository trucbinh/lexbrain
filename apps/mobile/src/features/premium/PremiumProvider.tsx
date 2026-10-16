import { Capacitor } from '@capacitor/core';
import { Purchases, type PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BuildInfo } from '../../plugins/buildInfo';

const PRO_ENTITLEMENT = 'pro';

interface PremiumState {
  ready: boolean;
  debugBuild: boolean;
  isPro: boolean;
  unlimited: boolean;
  purchasesConfigured: boolean;
  lifetimePackage: PurchasesPackage | null;
  error: string | null;
  buyPro: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const PremiumContext = createContext<PremiumState | null>(null);
let configurePromise: Promise<void> | null = null;

function hasProEntitlement(customerInfo: { entitlements: { active: Record<string, unknown> } }): boolean {
  return PRO_ENTITLEMENT in customerInfo.entitlements.active;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [debugBuild, setDebugBuild] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [purchasesConfigured, setPurchasesConfigured] = useState(false);
  const [lifetimePackage, setLifetimePackage] = useState<PurchasesPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let isDebug = !Capacitor.isNativePlatform() && import.meta.env.DEV;
      try {
        isDebug = (await BuildInfo.getBuildInfo()).debugBuild;
      } catch {
        // Fail closed on native builds if debug status cannot be determined.
      }
      if (cancelled) return;
      setDebugBuild(isDebug);
      if (isDebug) {
        setReady(true);
        return;
      }

      const platform = Capacitor.getPlatform();
      const apiKey = platform === 'ios'
        ? import.meta.env.VITE_REVENUECAT_IOS_API_KEY
        : platform === 'android'
          ? import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY
          : undefined;
      if (!apiKey) {
        setError('In-app purchases are not configured for this build.');
        setReady(true);
        return;
      }

      try {
        configurePromise ??= Purchases.configure({ apiKey });
        await configurePromise;
        if (cancelled) return;
        setPurchasesConfigured(true);
        const [{ customerInfo }, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (cancelled) return;
        setIsPro(hasProEntitlement(customerInfo));
        setLifetimePackage(offerings.current?.lifetime ?? null);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not verify store purchases.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buyPro = async () => {
    if (!purchasesConfigured || !lifetimePackage) throw new Error('The Pro lifetime purchase is unavailable.');
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: lifetimePackage });
    const active = hasProEntitlement(customerInfo);
    setIsPro(active);
    if (!active) throw new Error('The purchase completed, but the Pro entitlement was not activated.');
    setError(null);
  };

  const restorePurchases = async () => {
    if (!purchasesConfigured) throw new Error('Store purchases are not configured for this build.');
    const { customerInfo } = await Purchases.restorePurchases();
    const active = hasProEntitlement(customerInfo);
    setIsPro(active);
    setError(active ? null : 'No LexBrain Pro purchase was found for this store account.');
  };

  return (
    <PremiumContext.Provider
      value={{
        ready,
        debugBuild,
        isPro,
        unlimited: debugBuild || isPro,
        purchasesConfigured,
        lifetimePackage,
        error,
        buyPro,
        restorePurchases,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium(): PremiumState {
  const state = useContext(PremiumContext);
  if (!state) throw new Error('usePremium must be used inside PremiumProvider.');
  return state;
}
