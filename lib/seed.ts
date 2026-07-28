// Fallback snapshot of the live Supabase tables — 28 Jul 2026, taken directly from
// inventory_live + facility_wise_drr. Used only when a Supabase read fails (e.g. the
// anon read policy is missing), so the app always renders something truthful.
//
// Aggregated over the ACTIVE facilities only (LUH / BLR / MUM). Decommissioned
// facilities and the Pending_GRN / In-Transit buckets are handled exactly the way the
// live loader handles them — see lib/facilities.ts.

import type { FacilityKey } from "./facilities";

export type SkuAgg = {
  sku: string;
  avail: number;    // sellable units across active facilities
  grn: number;      // Pending_GRN
  transit: number;  // In-Transit
  blocked: number;
  bad: number;
  fac: Partial<Record<FacilityKey, number>>; // sellable units per active facility
};

// [rank, lifetime sales ₹] from hero_sku.xlsx
export const HERO: Record<string, [number, number]> = {
  "MHB0003SH-BK":[1,1770880],"MHB0098SH-IV":[2,1768418],"MHB0067CB-BR":[3,1732694],
  "MHB0004HB-BK":[4,1724996],"MHB0019MI-BL":[5,1723681],"MHB0056TO-BK":[6,1643215],
  "MHB0093SH-WN":[7,1579186],"MHB0077TO-WN":[8,1549953],"MHB0015MI-IV":[9,1544590],
  "MHB0076TO-BK":[10,1539772],"MHB0054TO-BK":[11,1538587],"MHB0074SC-IV":[12,1526651],
  "MHB0085SC-IV":[13,1526432],"MHB0026WL-IV":[14,1512574],"MHB0006HB-BR":[15,1483465],
  "MHB0025TO-BG":[16,1474020],"MHB0008HB-IV":[17,1460445],"MHB0098SH-BR":[18,1398183],
  "MHB0081TO-IV":[19,1393481],"MHB0108SH-RD":[20,1373675],"MHB0005LP-BK":[21,1365955],
  "MHB0005LP-IV":[22,1362489],"MHB0004BP-BK":[23,1340844],"MHB0084TO-BR":[24,1338533],
  "MHB0090CB-BK":[25,1320500],"MHB0065TO-BR":[26,1306810],"MHB0052SH-IV":[27,1290805],
  "MHB0015HB-BR":[28,1257008],"MHB0042SC-BK":[29,1246169],"MHB0076TO-BR":[30,1241505],
  "MHB0021WL-GR":[31,1237881],"MHB0076TO-DB":[32,1216802],"MHB0072SC-WN":[33,1207299],
  "MHB0072SC-BG":[34,1188367],"MHB0074SC-WN":[35,1177015],"MHB0033SH-WN":[36,1164997],
  "MHB0066SH-WN":[37,1164338],"MHB0082SC-WN":[38,1130234],"MHB0069TO-WN":[39,1124553],
  "MHB0036TO-BK":[40,1121060],"MHB0003LP-GR":[41,1114653],"MHB0025MI-RD":[42,1104947],
  "MHB0064CB-IV":[43,1064348],"MHB0077SH-GR":[44,1055147],"MHB0003LP-BK":[45,1043064],
  "MHB0036TO-GR":[46,1037819],"MHB0040CB-PK":[47,1034114],"MHB0108SH-BK":[48,1028880],
  "MHB0028WL-GR":[49,1021526],"MHB0056TO-BG":[50,987870],"MHB0063TO-BK":[51,971051],
  "MHB0030WL-RD":[52,956942],"MHB0059SC-IV":[53,954191],"MHB0009MI-BR":[54,950131],
  "MHB0033TO-TN":[55,943652]
};

export const SEED_TS = "2026-07-28T00:00:00+00:00";

export const SEED: SkuAgg[] = [
{sku:"MHB0003LP-BK",avail:331,grn:9,transit:0,blocked:0,bad:2,fac:{LUH:330,BLR:1,MUM:0}},
{sku:"MHB0003LP-GR",avail:165,grn:8,transit:0,blocked:0,bad:6,fac:{LUH:145,BLR:18,MUM:2}},
{sku:"MHB0003SH-BK",avail:948,grn:31,transit:0,blocked:27,bad:15,fac:{LUH:832,BLR:115,MUM:1}},
{sku:"MHB0004BP-BK",avail:6,grn:13,transit:0,blocked:0,bad:4,fac:{LUH:6,BLR:0,MUM:0}},
{sku:"MHB0004HB-BK",avail:1,grn:0,transit:0,blocked:21,bad:13,fac:{LUH:0,BLR:0,MUM:1}},
{sku:"MHB0005LP-BK",avail:79,grn:4,transit:0,blocked:76,bad:5,fac:{LUH:78,BLR:1,MUM:0}},
{sku:"MHB0005LP-IV",avail:333,grn:7,transit:0,blocked:21,bad:5,fac:{LUH:312,BLR:20,MUM:1}},
{sku:"MHB0006HB-BR",avail:290,grn:75,transit:0,blocked:43,bad:14,fac:{LUH:289,BLR:0,MUM:1}},
{sku:"MHB0008HB-IV",avail:4,grn:14,transit:0,blocked:0,bad:6,fac:{LUH:4,BLR:0,MUM:0}},
{sku:"MHB0009MI-BR",avail:176,grn:32,transit:0,blocked:1,bad:6,fac:{LUH:8,BLR:168,MUM:0}},
{sku:"MHB0015HB-BR",avail:18,grn:5,transit:0,blocked:27,bad:16,fac:{LUH:12,BLR:2,MUM:4}},
{sku:"MHB0015MI-IV",avail:85,grn:9,transit:0,blocked:1,bad:8,fac:{LUH:85,BLR:0,MUM:0}},
{sku:"MHB0019MI-BL",avail:538,grn:57,transit:0,blocked:27,bad:9,fac:{LUH:536,BLR:2,MUM:0}},
{sku:"MHB0021WL-GR",avail:4,grn:10,transit:0,blocked:0,bad:12,fac:{LUH:3,BLR:0,MUM:1}},
{sku:"MHB0025MI-RD",avail:7,grn:11,transit:0,blocked:37,bad:8,fac:{LUH:6,BLR:0,MUM:1}},
{sku:"MHB0025TO-BG",avail:194,grn:9,transit:0,blocked:37,bad:16,fac:{LUH:190,BLR:2,MUM:2}},
{sku:"MHB0026WL-IV",avail:328,grn:0,transit:0,blocked:2,bad:8,fac:{LUH:328,BLR:0,MUM:0}},
{sku:"MHB0028WL-GR",avail:131,grn:2,transit:1,blocked:35,bad:21,fac:{LUH:131,BLR:0,MUM:0}},
{sku:"MHB0030WL-RD",avail:98,grn:2,transit:0,blocked:0,bad:5,fac:{LUH:97,BLR:0,MUM:1}},
{sku:"MHB0033SH-WN",avail:314,grn:7,transit:0,blocked:0,bad:7,fac:{LUH:314,BLR:0,MUM:0}},
{sku:"MHB0033TO-TN",avail:359,grn:5,transit:0,blocked:1,bad:3,fac:{LUH:312,BLR:10,MUM:37}},
{sku:"MHB0036TO-BK",avail:361,grn:29,transit:0,blocked:1,bad:11,fac:{LUH:343,BLR:16,MUM:2}},
{sku:"MHB0036TO-GR",avail:201,grn:36,transit:0,blocked:0,bad:6,fac:{LUH:199,BLR:2,MUM:0}},
{sku:"MHB0040CB-PK",avail:59,grn:8,transit:0,blocked:29,bad:7,fac:{LUH:59,BLR:0,MUM:0}},
{sku:"MHB0042SC-BK",avail:235,grn:13,transit:1,blocked:33,bad:5,fac:{LUH:51,BLR:183,MUM:1}},
{sku:"MHB0052SH-IV",avail:819,grn:8,transit:0,blocked:1,bad:11,fac:{LUH:408,BLR:199,MUM:212}},
{sku:"MHB0054TO-BK",avail:38,grn:26,transit:0,blocked:0,bad:11,fac:{LUH:36,BLR:2,MUM:0}},
{sku:"MHB0056TO-BG",avail:89,grn:15,transit:0,blocked:0,bad:18,fac:{LUH:81,BLR:4,MUM:4}},
{sku:"MHB0056TO-BK",avail:241,grn:8,transit:2,blocked:0,bad:13,fac:{LUH:241,BLR:0,MUM:0}},
{sku:"MHB0059SC-IV",avail:774,grn:14,transit:0,blocked:22,bad:10,fac:{LUH:539,BLR:101,MUM:134}},
{sku:"MHB0063TO-BK",avail:37,grn:6,transit:0,blocked:0,bad:6,fac:{LUH:33,BLR:2,MUM:2}},
{sku:"MHB0064CB-IV",avail:201,grn:7,transit:0,blocked:0,bad:8,fac:{LUH:1,BLR:1,MUM:199}},
{sku:"MHB0065TO-BR",avail:584,grn:16,transit:0,blocked:0,bad:14,fac:{LUH:567,BLR:17,MUM:0}},
{sku:"MHB0066SH-WN",avail:454,grn:11,transit:0,blocked:0,bad:5,fac:{LUH:398,BLR:39,MUM:17}},
{sku:"MHB0067CB-BR",avail:1,grn:12,transit:0,blocked:0,bad:9,fac:{LUH:0,BLR:1,MUM:0}},
{sku:"MHB0069TO-WN",avail:7,grn:10,transit:0,blocked:0,bad:7,fac:{LUH:7,BLR:0,MUM:0}},
{sku:"MHB0072SC-BG",avail:53,grn:27,transit:0,blocked:0,bad:12,fac:{LUH:53,BLR:0,MUM:0}},
{sku:"MHB0072SC-WN",avail:160,grn:8,transit:0,blocked:2,bad:7,fac:{LUH:0,BLR:160,MUM:0}},
{sku:"MHB0074SC-IV",avail:83,grn:569,transit:0,blocked:0,bad:5,fac:{LUH:82,BLR:0,MUM:1}},
{sku:"MHB0074SC-WN",avail:123,grn:15,transit:0,blocked:0,bad:3,fac:{LUH:122,BLR:1,MUM:0}},
{sku:"MHB0076TO-BK",avail:4,grn:8,transit:0,blocked:12,bad:14,fac:{LUH:4,BLR:0,MUM:0}},
{sku:"MHB0076TO-BR",avail:12,grn:7,transit:0,blocked:0,bad:11,fac:{LUH:12,BLR:0,MUM:0}},
{sku:"MHB0076TO-DB",avail:5,grn:62,transit:0,blocked:34,bad:24,fac:{LUH:5,BLR:0,MUM:0}},
{sku:"MHB0077SH-GR",avail:211,grn:3,transit:0,blocked:0,bad:5,fac:{LUH:211,BLR:0,MUM:0}},
{sku:"MHB0077TO-WN",avail:3,grn:454,transit:0,blocked:0,bad:6,fac:{LUH:3,BLR:0,MUM:0}},
{sku:"MHB0081TO-IV",avail:232,grn:8,transit:1,blocked:0,bad:8,fac:{LUH:232,BLR:0,MUM:0}},
{sku:"MHB0082SC-WN",avail:96,grn:5,transit:0,blocked:0,bad:5,fac:{LUH:96,BLR:0,MUM:0}},
{sku:"MHB0084TO-BR",avail:31,grn:3,transit:0,blocked:19,bad:17,fac:{LUH:31,BLR:0,MUM:0}},
{sku:"MHB0085SC-IV",avail:3,grn:1,transit:0,blocked:20,bad:6,fac:{LUH:0,BLR:1,MUM:2}},
{sku:"MHB0090CB-BK",avail:189,grn:2,transit:2,blocked:0,bad:3,fac:{LUH:187,BLR:0,MUM:2}},
{sku:"MHB0093SH-WN",avail:5,grn:20,transit:0,blocked:0,bad:5,fac:{LUH:3,BLR:0,MUM:2}},
{sku:"MHB0098SH-BR",avail:25,grn:562,transit:0,blocked:30,bad:13,fac:{LUH:0,BLR:23,MUM:2}},
{sku:"MHB0098SH-IV",avail:61,grn:482,transit:0,blocked:30,bad:17,fac:{LUH:61,BLR:0,MUM:0}},
{sku:"MHB0108SH-BK",avail:0,grn:4,transit:0,blocked:26,bad:7,fac:{LUH:0,BLR:0,MUM:0}},
{sku:"MHB0108SH-RD",avail:3,grn:10,transit:0,blocked:26,bad:4,fac:{LUH:3,BLR:0,MUM:0}}
];

/**
 * Snapshot of facility_wise_drr.actual_30d_drr, folded onto canonical facility keys.
 * Only strictly positive values are stored — a missing key means no demand signal.
 * Ludhiana (LUH) has no non-zero DRR in the source table for any hero SKU.
 */
export const SEED_DRR: Record<string, Partial<Record<FacilityKey, number>>> = {
  "MHB0003LP-GR":{BLR:1.21,MUM:0.17},
  "MHB0003SH-BK":{BLR:3.43,MUM:1},
  "MHB0004HB-BK":{BLR:0.07,MUM:0.1},
  "MHB0005LP-BK":{BLR:0.2,MUM:0.13},
  "MHB0005LP-IV":{BLR:1.03,MUM:0.17},
  "MHB0006HB-BR":{BLR:0.5,MUM:0.23},
  "MHB0009MI-BR":{BLR:1.86,MUM:0.49},
  "MHB0015HB-BR":{BLR:0.38,MUM:0.61},
  "MHB0015MI-IV":{MUM:1.22},
  "MHB0019MI-BL":{BLR:2.54,MUM:2.77},
  "MHB0021WL-GR":{MUM:1.02},
  "MHB0025TO-BG":{BLR:1.8,MUM:0.1},
  "MHB0026WL-IV":{BLR:0.13,MUM:0.78},
  "MHB0028WL-GR":{BLR:0.1,MUM:0.21},
  "MHB0030WL-RD":{BLR:0.03,MUM:0.03},
  "MHB0033TO-TN":{BLR:0.87,MUM:0.37},
  "MHB0036TO-BK":{BLR:1.47,MUM:0.57},
  "MHB0036TO-GR":{BLR:0.38,MUM:0.17},
  "MHB0040CB-PK":{MUM:0.03},
  "MHB0042SC-BK":{BLR:0.69,MUM:0.37},
  "MHB0052SH-IV":{BLR:1.37,MUM:1.2},
  "MHB0056TO-BG":{BLR:0.47,MUM:0.3},
  "MHB0056TO-BK":{BLR:0.03,MUM:0.07},
  "MHB0059SC-IV":{BLR:2.3,MUM:0.63},
  "MHB0063TO-BK":{BLR:0.4,MUM:0.4},
  "MHB0064CB-IV":{BLR:0.03,MUM:2.67},
  "MHB0065TO-BR":{BLR:2.68,MUM:0.47},
  "MHB0066SH-WN":{BLR:1.8,MUM:1.53},
  "MHB0067CB-BR":{BLR:0.03},
  "MHB0072SC-BG":{MUM:0.03},
  "MHB0072SC-WN":{BLR:1.63,MUM:0.51},
  "MHB0074SC-IV":{MUM:0.13},
  "MHB0074SC-WN":{BLR:0.8,MUM:0.37},
  "MHB0076TO-BK":{MUM:0.14},
  "MHB0077SH-GR":{MUM:0.03},
  "MHB0077TO-WN":{MUM:0.03},
  "MHB0081TO-IV":{BLR:2.49,MUM:0.2},
  "MHB0085SC-IV":{MUM:0.07},
  "MHB0090CB-BK":{MUM:0.59},
  "MHB0098SH-BR":{BLR:0.45,MUM:5.21},
  "MHB0098SH-IV":{BLR:0.07,MUM:3.9}
};
