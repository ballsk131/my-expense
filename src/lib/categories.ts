import type { CategoryId } from "../types";

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  /** CSS custom property holding this category's accent colour. */
  color: string;
  /** Lowercased substrings that hint at this category in receipt text. */
  hints: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: "food",
    label: "อาหาร",
    emoji: "🍜",
    color: "var(--color-cat-food)",
    hints: [
      "ร้านอาหาร", "อาหาร", "กาแฟ", "คาเฟ่", "ก๋วยเตี๋ยว", "ข้าว", "เครื่องดื่ม",
      "restaurant", "cafe", "coffee", "starbucks", "amazon cafe", "mcdonald",
      "kfc", "food", "bakery", "sushi", "pizza",
    ],
  },
  {
    id: "transport",
    label: "เดินทาง",
    emoji: "🚕",
    color: "var(--color-cat-transport)",
    hints: [
      "แท็กซี่", "วิน", "รถไฟฟ้า", "บีทีเอส", "เอ็มอาร์ที", "น้ำมัน", "ปตท",
      "บางจาก", "เชลล์", "ทางด่วน", "ค่าโดยสาร",
      "grab", "bolt", "taxi", "bts", "mrt", "ptt", "shell", "caltex", "fuel",
      "bangchak", "esso", "parking", "toll",
    ],
  },
  {
    id: "shopping",
    label: "ช้อปปิ้ง",
    emoji: "🛍️",
    color: "var(--color-cat-shopping)",
    hints: [
      "เซเว่น", "โลตัส", "บิ๊กซี", "แม็คโคร", "ห้าง", "เสื้อผ้า", "ซูเปอร์",
      // Thai chains print their legal entity, not the brand, on the receipt.
      "ซีพี ออลล์", "เซ็นทรัล", "เดอะมอลล์", "ซีพีเอ็น",
      "7-eleven", "seven", "cp all", "lotus", "big c", "makro", "tops",
      "villa market", "central", "the mall", "robinson", "siam paragon",
      "emquartier", "terminal 21", "uniqlo", "shopee", "lazada",
    ],
  },
  {
    id: "bills",
    label: "บิล/ค่างวด",
    emoji: "🧾",
    color: "var(--color-cat-bills)",
    hints: [
      "ค่าไฟ", "ค่าน้ำ", "ค่าเช่า", "อินเทอร์เน็ต", "ค่าโทรศัพท์", "ประกัน", "ผ่อน",
      "การไฟฟ้า", "การประปา",
      "electric", "water bill", "internet", "true", "ais", "dtac", "rent",
      "insurance", "netflix", "spotify", "subscription",
    ],
  },
  {
    id: "health",
    label: "สุขภาพ",
    emoji: "💊",
    color: "var(--color-cat-health)",
    hints: [
      "โรงพยาบาล", "คลินิก", "ร้านยา", "ยา", "หมอ", "ทันตกรรม", "ฟิตเนส",
      "hospital", "clinic", "pharmacy", "watsons", "boots", "fitness", "gym",
      "dental", "bumrungrad", "bangkok hospital",
    ],
  },
  {
    id: "fun",
    label: "บันเทิง",
    emoji: "🎬",
    color: "var(--color-cat-fun)",
    hints: [
      "หนัง", "โรงหนัง", "เกม", "คอนเสิร์ต", "ท่องเที่ยว", "โรงแรม", "ตั๋ว",
      "major", "sf cinema", "cinema", "movie", "game", "steam", "hotel",
      "ticket", "concert",
    ],
  },
  {
    id: "other",
    label: "อื่น ๆ",
    emoji: "📦",
    color: "var(--color-cat-other)",
    hints: [],
  },
];

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): Category {
  return BY_ID.get(id) ?? CATEGORIES[CATEGORIES.length - 1];
}

/**
 * Pick a category by looking for hint words in receipt text.
 * Longer hints win, so "amazon cafe" beats a bare "cafe" appearing elsewhere.
 */
export function guessCategory(text: string): CategoryId {
  const haystack = text.toLowerCase();
  let best: { id: CategoryId; len: number } | null = null;

  for (const category of CATEGORIES) {
    for (const hint of category.hints) {
      if (haystack.includes(hint) && (!best || hint.length > best.len)) {
        best = { id: category.id, len: hint.length };
      }
    }
  }

  return best?.id ?? "other";
}
