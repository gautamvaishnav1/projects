globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((b) => { this.result = b; this.onloadend?.(); });
  }
};

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { towerApi, bridgeHero, dataCenterCube, broadcastMast, craneConstruction } from './builders/t1-landmarks.mjs';
import { factoryService, warehouseDb, officeTowerA, officeTowerB, officeTowerC, serverFarm } from './builders/t2-buildings.mjs';
import { carFast, carMid, carSlow, carPending, carIdle, deliveryTruck, bus, ambulance, towTruck, newsHelicopter } from './builders/t3-fleet.mjs';
import { lampSingle, lampDouble, trafficLight, busStop, bench, hydrant, trashBin, mailbox, phoneBooth, kiosk, fountain } from './builders/t4-street.mjs';
import { coneCluster, roadBarrier, warningSign, bollard, manhole, rooftopAC, waterTank, fireEscape, satelliteDish, antennaWhip, billboard, planter, cratesStack, serverRack, transformerBox } from './builders/t5-props.mjs';

const REGISTRY = {
  'tower-api': towerApi,
  'bridge-hero': bridgeHero,
  'data-center-cube': dataCenterCube,
  'broadcast-mast': broadcastMast,
  'crane-construction': craneConstruction,
  'factory-service': factoryService,
  'warehouse-db': warehouseDb,
  'office-tower-a': officeTowerA,
  'office-tower-b': officeTowerB,
  'office-tower-c': officeTowerC,
  'server-farm': serverFarm,
  'car-request-fast': carFast,
  'car-request-mid': carMid,
  'car-request-slow': carSlow,
  'car-request-pending': carPending,
  'car-idle': carIdle,
  'delivery-truck': deliveryTruck,
  'bus': bus,
  'ambulance': ambulance,
  'tow-truck': towTruck,
  'news-helicopter': newsHelicopter,
  'lamp-single': lampSingle,
  'lamp-double': lampDouble,
  'traffic-light': trafficLight,
  'bus-stop': busStop,
  'bench': bench,
  'hydrant': hydrant,
  'trash-bin': trashBin,
  'mailbox': mailbox,
  'phone-booth': phoneBooth,
  'kiosk': kiosk,
  'fountain': fountain,
  'cone-cluster': coneCluster,
  'road-barrier': roadBarrier,
  'warning-sign': warningSign,
  'bollard': bollard,
  'manhole': manhole,
  'rooftop-ac': rooftopAC,
  'water-tank': waterTank,
  'fire-escape': fireEscape,
  'satellite-dish': satelliteDish,
  'antenna-whip': antennaWhip,
  'billboard': billboard,
  'planter': planter,
  'crates-stack': cratesStack,
  'server-rack': serverRack,
  'transformer-box': transformerBox,
};

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '../../models/generated');
fs.mkdirSync(outDir, { recursive: true });

const exporter = new GLTFExporter();
let okCount = 0;
const manifest = [];
for (const [name, build] of Object.entries(REGISTRY)) {
  try {
    const obj = build();
    obj.name = name;
    const buf = await exporter.parseAsync(obj, { binary: true });
    const file = path.join(outDir, `${name}.glb`);
    fs.writeFileSync(file, Buffer.from(buf));
    manifest.push({ name, file: `${name}.glb`, bytes: buf.byteLength });
    console.log(`${name}.glb  ${(buf.byteLength / 1024).toFixed(1)} KB`);
    okCount++;
  } catch (e) {
    console.error(`FAIL ${name}:`, e.message);
  }
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\n${okCount}/${Object.keys(REGISTRY).length} models exported to ${outDir}`);
