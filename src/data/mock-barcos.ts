import type { Barco } from "@/types/barco";

export const mockBarcos: Barco[] = [
  {
    id: 1,
    nombre: "La Brisa",
    identidad: "EMB-2019-044",
    matricula: "CU-HAB-044",
    tipo: "Deportiva fibra",
    propietario: "Ana López García",
    puertoBase: "La Habana",
  },
  {
    id: 2,
    nombre: "Pescador III",
    identidad: "COM-7788",
    matricula: "CU-MTZ-7788",
    tipo: "Comercial arrastre",
    propietario: "Empresa Pesquera Norte",
    puertoBase: "Matanzas",
  },
  {
    id: 3,
    nombre: "El Delfín",
    identidad: "EMB-2021-102",
    matricula: "CU-VCL-102",
    tipo: "Deportiva vela",
    propietario: "Jorge Castillo Núñez",
    puertoBase: "Villa Clara",
  },
  {
    id: 4,
    nombre: "Estatal-04",
    identidad: "EST-004",
    matricula: "CU-EST-004",
    tipo: "Patrulla",
    propietario: "Inst. estatal",
    puertoBase: "Cienfuegos",
  },
  {
    id: 5,
    nombre: "Atarraya I",
    identidad: "COM-9901",
    matricula: "CU-HOL-9901",
    tipo: "Comercial artesanal",
    propietario: "Cooperativa Mar Azul",
    puertoBase: "Holguín",
  },
];
