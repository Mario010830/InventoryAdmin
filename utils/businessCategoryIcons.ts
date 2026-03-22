import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Beef,
  CalendarDays,
  Candy,
  Coffee,
  Cpu,
  Croissant,
  Dumbbell,
  Fish,
  Flower,
  Gamepad,
  Gamepad2,
  Gem,
  Glasses,
  GraduationCap,
  IceCreamCone,
  Lamp,
  LayoutGrid,
  Leaf,
  Megaphone,
  Monitor,
  PawPrint,
  Pill,
  Pizza,
  Scissors,
  Shirt,
  Smartphone,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wrench,
  Wine,
} from "lucide-react";

/**
 * Nombre de categoría (como en API / seed) → nombre de export de Lucide.
 * "IceCream" en el mapa usa el componente IceCreamCone (no existe export IceCream en lucide-react).
 */
export const businessCategoryIcons: Record<string, string> = {
  Perfumería: "Sparkles",
  "Tienda general": "Store",
  "Ropa y accesorios": "Shirt",
  Restaurante: "UtensilsCrossed",
  Heladería: "IceCream",
  Farmacia: "Pill",
  Electrónica: "Cpu",
  "Hogar y decoración": "Lamp",
  "Belleza y cuidado personal": "Scissors",
  Panadería: "Croissant",
  Dulcería: "Candy",
  Cafetería: "Coffee",
  Bar: "Wine",
  Pizzería: "Pizza",
  Floristería: "Flower",
  "Joyería y relojería": "Gem",
  Ferretería: "Wrench",
  Juguetería: "Gamepad",
  "Tienda de mascotas": "PawPrint",
  Óptica: "Glasses",
  "Artículos para bebés": "Baby",
  Gimnasio: "Dumbbell",
  Academia: "GraduationCap",
  "Tiendas de videojuegos": "Gamepad2",
  "Servicio informático": "Monitor",
  "Móviles y accesorios": "Smartphone",
  "Marketing y publicidad": "Megaphone",
  "Organización de eventos": "CalendarDays",
  Carnicería: "Beef",
  Pescadería: "Fish",
  "Productos naturales": "Leaf",
  Otros: "LayoutGrid",
};

const LUCIDE_BY_KEY: Record<string, LucideIcon> = {
  Sparkles,
  Store,
  Shirt,
  UtensilsCrossed,
  IceCream: IceCreamCone,
  Pill,
  Cpu,
  Lamp,
  Scissors,
  Croissant,
  Candy,
  Coffee,
  Wine,
  Pizza,
  Flower,
  Gem,
  Wrench,
  Gamepad,
  PawPrint,
  Glasses,
  Baby,
  Dumbbell,
  GraduationCap,
  Gamepad2,
  Monitor,
  Smartphone,
  Megaphone,
  CalendarDays,
  Beef,
  Fish,
  Leaf,
  LayoutGrid,
};

/** Clave Lucide (p. ej. "Store") para el nombre de categoría mostrado. */
export function getBusinessCategoryLucideKey(categoryName: string): string {
  const key = businessCategoryIcons[categoryName.trim()];
  if (key && LUCIDE_BY_KEY[key]) return key;
  return "Store";
}

export function getBusinessCategoryLucideComponent(categoryName: string): LucideIcon {
  const k = getBusinessCategoryLucideKey(categoryName);
  return LUCIDE_BY_KEY[k] ?? Store;
}
