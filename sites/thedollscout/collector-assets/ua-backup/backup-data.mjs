export const providerGuide = "https://xpon.thedigital.gov.ua/";

export const kits = [
  {
    id: "archer-c6-xz000-g3",
    router: {
      name: "TP-Link Archer C6 V3",
      volts: 12,
      amps: 1,
      source: "https://www.tp-link.com/uk-ua/home-networking/wifi-router/archer-c6/v3/",
    },
    onu: {
      name: "TP-Link XZ000-G3",
      volts: 9,
      amps: 0.6,
      source: "https://www.tp-link.com/uk-ua/service-provider/gpon/xz000-g3/",
    },
  },
  {
    id: "archer-ax23-xz000-g7",
    router: {
      name: "TP-Link Archer AX23 V1",
      volts: 12,
      amps: 1,
      source: "https://www.tp-link.com/uk-ua/home-networking/wifi-router/archer-ax23/v1/",
    },
    onu: {
      name: "TP-Link XZ000-G7",
      volts: 9,
      amps: 0.6,
      source: "https://www.tp-link.com/uk-ua/service-provider/gpon/xz000-g7/",
    },
  },
  {
    id: "archer-ax55-xz000-g3",
    router: {
      name: "TP-Link Archer AX55 V1",
      volts: 12,
      amps: 2,
      source: "https://www.tp-link.com/uk-ua/home-networking/wifi-router/archer-ax55/v1/",
    },
    onu: {
      name: "TP-Link XZ000-G3",
      volts: 9,
      amps: 0.6,
      source: "https://www.tp-link.com/uk-ua/service-provider/gpon/xz000-g3/",
    },
  },
];

export const upsModels = [
  {
    id: "marsriva-kp3-ec",
    name: "Marsriva KP3 EC",
    ports: [
      { volts: 12, amps: 1.5, connectors: [], polarity: "" },
      { volts: 9, amps: 2, connectors: [], polarity: "" },
      { volts: 5, amps: 2, connectors: [], polarity: "" },
    ],
    maxWatts: 18,
    wattHours: 29.6,
    source: "https://www.marsriva.com/Products_item_2/158.html",
    store: "https://ktc.ua/goods/dbzh_marsriva_kp3ec_18w_8400mah_white_kp3ec_marsriva.html",
    storeName: "КТС",
    cableNotes: "Виробник не включає адаптер 12 В / 2 А до комплекту KP3 EC. Уточніть розмір штекера й полярність кожного кабелю.",
  },
  {
    id: "marsriva-kp4",
    name: "Marsriva KP4",
    ports: [
      { volts: 12, amps: 1.5, connectors: [], polarity: "" },
      { volts: 9, amps: 2, connectors: [], polarity: "" },
      { volts: 5, amps: 2.1, connectors: [], polarity: "" },
    ],
    maxWatts: 18,
    wattHours: 36,
    source: "https://www.marsriva.com/Products_item_2/160.html",
    store: "https://shop.kyivstar.ua/kompiuterna-tekhnika/kompiuterna-peryferiia/dbzh/dbzh-dlia-routera-marsriva-dc-ups-kp4-10000-mah-li-ion-kp4-marsriva.html",
    storeName: "Київстар · перевірити наявність",
    cableSource: "https://flytec.com.py/download/files/9439.pdf",
    cableNotes: "В інструкції перелічено кабелі DC5525 і перехідник DC35135. Перевірте відповідність штекера й полярності для обох пристроїв.",
  },
];
