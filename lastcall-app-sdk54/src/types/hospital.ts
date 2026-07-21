export type Hospital = {
  hpid: string;
  hospitalName: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  latitude: number;
  longitude: number;
  availableBeds: number;
  operatingRooms: number;
  neuroIcuBeds: number;
  neonatalIcuBeds: number;
  chestIcuBeds: number;
  generalIcuBeds: number;
  inpatientBeds: number;
  ctAvailable: boolean;
  mriAvailable: boolean;
  angiographyAvailable: boolean;
  ventilatorAvailable: boolean;
  ambulanceAvailable: boolean;
  pediatricVentilatorAvailable: boolean;
  incubatorAvailable: boolean;
  severeCapabilities: string[];
  departments?: string;
  distance: number;
  recommendScore: number;
  matchedDepartments: string;
};

export function toHospitalDetailParams(hospital: Hospital) {
  return {
    hpid: hospital.hpid,
    hospitalName: hospital.hospitalName,
    address: hospital.address,
    phone: hospital.phone ?? "",
    emergencyPhone: hospital.emergencyPhone ?? "",
    latitude: String(hospital.latitude),
    longitude: String(hospital.longitude),
    distance: String(hospital.distance),
    availableBeds: String(hospital.availableBeds),
    operatingRooms: String(hospital.operatingRooms ?? 0),
    neuroIcuBeds: String(hospital.neuroIcuBeds ?? 0),
    neonatalIcuBeds: String(hospital.neonatalIcuBeds ?? 0),
    chestIcuBeds: String(hospital.chestIcuBeds ?? 0),
    generalIcuBeds: String(hospital.generalIcuBeds ?? 0),
    inpatientBeds: String(hospital.inpatientBeds ?? 0),
    ctAvailable: String(Boolean(hospital.ctAvailable)),
    mriAvailable: String(Boolean(hospital.mriAvailable)),
    angiographyAvailable: String(Boolean(hospital.angiographyAvailable)),
    ventilatorAvailable: String(Boolean(hospital.ventilatorAvailable)),
    ambulanceAvailable: String(Boolean(hospital.ambulanceAvailable)),
    pediatricVentilatorAvailable: String(Boolean(hospital.pediatricVentilatorAvailable)),
    incubatorAvailable: String(Boolean(hospital.incubatorAvailable)),
    severeCapabilities: (hospital.severeCapabilities ?? []).join(","),
    departments: hospital.departments ?? "",
  };
}
