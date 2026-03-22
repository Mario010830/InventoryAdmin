/**
 * Grupos de etiquetas para el TagSelector del formulario de producto.
 * Cada grupo define nombre, color y los slugs de las tags que lo componen.
 * Las tags que vienen del API se asignan al grupo cuyo tagSlugs contiene su slug.
 */

export interface TagGroupConfig {
  name: string;
  color: string;
  tagSlugs: string[];
}

export const TAG_GROUPS: TagGroupConfig[] = [
  {
    name: "Alimentación y bebidas",
    color: "#639922",
    tagSlugs: [
      "vegano",
      "vegetariano",
      "organico",
      "artesanal",
      "bebida-alcoholica",
      "para-celiacos",
      "apto-diabeticos",
      "sin-gluten",
      "sin-lactosa",
      "kosher",
      "halal",
    ],
  },
  {
    name: "Electrónica y tecnología",
    color: "#185FA5",
    tagSlugs: [
      "nuevo-en-caja",
      "reacondicionado",
      "con-garantia",
      "inalambrico",
      "bluetooth",
      "wifi",
      "usb-c",
      "premium",
    ],
  },
  {
    name: "Estado y condición",
    color: "#0f766e",
    tagSlugs: [
      "oferta",
      "liquidacion",
      "edicion-limitada",
      "nuevo",
      "seminuevo",
    ],
  },
  {
    name: "Otros",
    color: "#64748b",
    tagSlugs: [], // Las tags del API que no coincidan con ningún grupo se muestran aquí
  },
];
