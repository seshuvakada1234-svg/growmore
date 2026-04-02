/**
 * cartStorage.ts
 *
 * Single source of truth for all localStorage cart operations.
 */

export const CART_KEY = "plantshop_cart";

export interface CartItem {
  id: string;
  quantity: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const isBrowser = () => typeof window !== "undefined";

/**
 * Normalize any legacy item shape → canonical { id, quantity }
 */
export function normalizeItem(raw: any): CartItem | null {
  if (!raw) return null;

  const id: string = raw.id || raw.productId || raw.plantId || "";
  const quantity: number = Number(raw.quantity ?? raw.qty ?? 1);

  if (!id) return null;

  return {
    id,
    quantity: Math.max(1, quantity),
  };
}

/**
 * Deduplicate items by ID (merge quantities)
 */
function dedupeCart(items: CartItem[]): CartItem[] {
  const map = new Map<string, number>();

  for (const item of items) {
    map.set(item.id, (map.get(item.id) || 0) + item.quantity);
  }

  return Array.from(map.entries()).map(([id, quantity]) => ({
    id,
    quantity,
  }));
}

// ─────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────

/** Read cart safely */
export function lsReadCart(): CartItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];

    const parsed: any[] = JSON.parse(raw);

    const normalized = parsed
      .map(normalizeItem)
      .filter(Boolean) as CartItem[];

    return dedupeCart(normalized);
  } catch (e) {
    console.warn("[Cart] Read error:", e);
    return [];
  }
}

/** Write cart safely */
export function lsWriteCart(items: CartItem[]): void {
  if (!isBrowser()) return;

  try {
    const clean = dedupeCart(items);

    localStorage.setItem(CART_KEY, JSON.stringify(clean));
    window.dispatchEvent(new Event("cart-updated"));

    console.log("[Cart] Saved:", clean);
  } catch (e) {
    console.error("[Cart] Write error:", e);
  }
}

/** Add item */
export function lsAddItem(productId: string, quantity = 1): void {
  const cart = lsReadCart();

  const idx = cart.findIndex((i) => i.id === productId);

  if (idx !== -1) {
    cart[idx].quantity += quantity;
  } else {
    cart.push({ id: productId, quantity });
  }

  lsWriteCart(cart);
}

/** Set exact quantity */
export function lsSetQty(productId: string, quantity: number): void {
  let cart = lsReadCart();

  if (quantity < 1) {
    cart = cart.filter((i) => i.id !== productId);
  } else {
    const idx = cart.findIndex((i) => i.id === productId);

    if (idx !== -1) {
      cart[idx].quantity = quantity;
    } else {
      cart.push({ id: productId, quantity });
    }
  }

  lsWriteCart(cart);
}

/** Remove item */
export function lsRemoveItem(productId: string): void {
  const cart = lsReadCart().filter((i) => i.id !== productId);
  lsWriteCart(cart);
}

/** Clear cart */
export function lsClearCart(): void {
  if (!isBrowser()) return;

  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("cart-updated"));

  console.log("[Cart] Cleared");
}

// ─────────────────────────────────────────────────────────────
// Migration
// ─────────────────────────────────────────────────────────────

export function migrateLegacyCartKeys(): void {
  if (!isBrowser()) return;

  const LEGACY_KEYS = ["cart", "monterra_cart", "guestCart", "guest_cart"];

  const existing = lsReadCart();

  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed: any[] = JSON.parse(raw);

      const items = parsed
        .map(normalizeItem)
        .filter(Boolean) as CartItem[];

      if (items.length === 0) {
        localStorage.removeItem(key);
        continue;
      }

      if (existing.length === 0) {
        console.log(`[Cart] Migrating "${key}" → "${CART_KEY}"`, items);
        lsWriteCart(items);
      } else {
        console.warn(`[Cart] Skipping "${key}" (already has data)`);
      }

      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[Cart] Migration error for "${key}"`, e);
      localStorage.removeItem(key);
    }
  }
}