import type { LicenseResponseDto, ShipDto } from "./api-types";
import { LICENSE_TYPE_SHORE, LICENSE_TYPE_VESSEL } from "./api-types";
import type { AuthUser } from "./auth-types";
import type { Barco } from "@/types/barco";
import type { Licencia } from "@/types/licencia";
import type { TipoLicencia } from "@/types/solicitud";

/** Mapeo aproximado al tipo de UI hasta que existan subtipos en API. */
export function licenseDtoToTipoLicencia(dto: LicenseResponseDto): TipoLicencia {
  if (dto.type === LICENSE_TYPE_SHORE) return "PescaOrilla";
  return "EmbarcacionDeportiva";
}

export function labelLicenseFromApi(dto: LicenseResponseDto): string {
  const n = (dto.typeName || "").toLowerCase();
  if (n === "shore" || dto.type === LICENSE_TYPE_SHORE) return "Orilla";
  if (n === "vessel" || dto.type === LICENSE_TYPE_VESSEL)
    return "Embarcación";
  return dto.typeName || "Licencia";
}

export function mapLicenseDtoToLicencia(
  dto: LicenseResponseDto,
  currentUser: AuthUser | null
): Licencia {
  const tipo = licenseDtoToTipoLicencia(dto);
  const titularNombre =
    currentUser?.fullName ??
    (dto.userId != null ? `Usuario #${dto.userId}` : "—");
  const titularCarnet =
    currentUser?.nationalId ??
    currentUser?.identity ??
    (dto.userId != null ? `id ${dto.userId}` : "—");

  return {
    id: dto.id,
    codigoUnico: `LIC-${dto.id}`,
    tipo,
    userId: dto.userId,
    shipId: dto.shipId,
    fechaEmision: dto.issueDate,
    fechaVencimiento: dto.expirationDate,
    activa: dto.isActive,
    usuario:
      dto.type === LICENSE_TYPE_SHORE || dto.userId != null
        ? { nombre: titularNombre, carnet: titularCarnet }
        : undefined,
    embarcacion:
      dto.shipId != null
        ? {
            nombre: `Embarcación #${dto.shipId}`,
            identidad: dto.shipId.toString(),
          }
        : undefined,
    tipoDisplay: labelLicenseFromApi(dto),
  };
}

export function mapShipDtoToBarco(dto: ShipDto): Barco {
  const propietario =
    dto.owners?.map((o) => o.fullName).filter(Boolean).join(", ") || "—";
  return {
    id: dto.id,
    nombre: dto.name ?? "—",
    identidad: dto.registrationNumber ?? "—",
    matricula: dto.registrationNumber ?? "—",
    tipo: "Embarcación",
    propietario,
    puertoBase: "—",
  };
}

