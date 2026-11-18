/**
 * Telegram Mini App (TMA) Client-Side SDK Helper
 * BackButton, MainButton, HapticFeedback, ClosingConfirmation, etc.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export const isTMA = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);
};

export const getTMA = () => {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
};

/**
 * TMA boshlang'ich sozlamalari: expand, ready, vertical swipes
 */
export function initTMA(): void {
  const tg = getTMA();
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();
    if (typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }
  } catch (e) {
    console.warn("initTMA xatosi:", e);
  }
}

/**
 * Imtihon paytida tasodifan yopilib ketishdan himoya
 */
export function setClosingConfirmation(enable: boolean): void {
  const tg = getTMA();
  if (!tg) return;

  try {
    if (enable && typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    } else if (!enable && typeof tg.disableClosingConfirmation === 'function') {
      tg.disableClosingConfirmation();
    }
  } catch (e) {
    console.warn("setClosingConfirmation xatosi:", e);
  }
}

/**
 * Haptic Feedback: tebranish signallari
 */
export function triggerHaptic(type: 'impact' | 'notification' | 'selection', style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'error' | 'success' | 'warning' = 'medium'): void {
  const tg = getTMA();
  if (!tg?.HapticFeedback) return;

  try {
    if (type === 'impact') {
      tg.HapticFeedback.impactOccurred(style);
    } else if (type === 'notification') {
      tg.HapticFeedback.notificationOccurred(style as 'error' | 'success' | 'warning');
    } else if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    }
  } catch (e) {
    // Brauzer yoki eski TMA versiyalarida jim o'tkazish
  }
}

/**
 * Telegram BackButton boshqaruvi
 */
export function setBackButton(visible: boolean, onClick?: () => void): void {
  const tg = getTMA();
  if (!tg?.BackButton) return;

  try {
    if (visible) {
      tg.BackButton.show();
      if (onClick) {
        tg.BackButton.onClick(onClick);
      }
    } else {
      tg.BackButton.hide();
    }
  } catch (e) {
    console.warn("setBackButton xatosi:", e);
  }
}

/**
 * Telegram MainButton boshqaruvi
 */
export function setMainButton(params: {
  text?: string;
  color?: string;
  textColor?: string;
  isVisible?: boolean;
  isActive?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
}): void {
  const tg = getTMA();
  if (!tg?.MainButton) return;

  try {
    const mb = tg.MainButton;
    if (params.text) mb.setText(params.text);
    if (params.color) mb.setParams({ color: params.color, text_color: params.textColor });
    if (params.isLoading !== undefined) {
      if (params.isLoading) mb.showProgress();
      else mb.hideProgress();
    }
    if (params.isActive !== undefined) {
      if (params.isActive) mb.enable();
      else mb.disable();
    }
    if (params.isVisible !== undefined) {
      if (params.isVisible) mb.show();
      else mb.hide();
    }
    if (params.onClick) {
      mb.onClick(params.onClick);
    }
  } catch (e) {
    console.warn("setMainButton xatosi:", e);
  }
}
