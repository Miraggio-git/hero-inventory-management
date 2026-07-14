// Snapshot of inventory_live aggregated per SKU — 14 Jul 2026, 9:00 AM IST.
// Used only as a fallback when the Supabase read fails (e.g. RLS has no read policy yet).

export type SkuAgg = {
  sku: string;
  avail: number;    // sellable units (excludes Pending_GRN & In-Transit)
  grn: number;      // Pending_GRN
  transit: number;  // In-Transit
  blocked: number;
  bad: number;
  fac: Record<string, number>; // sellable units per facility
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

export const SEED_TS = "2026-07-14T00:00:00+00:00";

export const SEED: SkuAgg[] = [
{sku:"MHB0003LP-BK",avail:351,grn:9,transit:0,blocked:0,bad:6,fac:{MG_BNG:1,miraggiolife_luh:350}},
{sku:"MHB0003LP-GR",avail:160,grn:9,transit:0,blocked:0,bad:10,fac:{Miraggio_Mum:1,miraggiolife_luh:153,MG_BNG:6}},
{sku:"MHB0003SH-BK",avail:1009,grn:33,transit:0,blocked:29,bad:46,fac:{Zepto:8,miraggiolife_luh:856,MG_BNG:145}},
{sku:"MHB0004BP-BK",avail:68,grn:13,transit:0,blocked:0,bad:14,fac:{miraggiolife_luh:68}},
{sku:"MHB0004HB-BK",avail:630,grn:0,transit:0,blocked:22,bad:52,fac:{Miraggio_FRK:613,miraggiolife_luh:17}},
{sku:"MHB0005LP-BK",avail:121,grn:4,transit:0,blocked:88,bad:23,fac:{miraggiolife_luh:120,Miraggio_Mum:1}},
{sku:"MHB0005LP-IV",avail:260,grn:6,transit:0,blocked:34,bad:18,fac:{miraggiolife_luh:236,MG_BNG:23,Miraggio_Mum:1}},
{sku:"MHB0006HB-BR",avail:85,grn:19,transit:0,blocked:78,bad:25,fac:{MG_BNG:2,Miraggio_FRK:56,Miraggio_Mum:2,miraggiolife_luh:25}},
{sku:"MHB0008HB-IV",avail:45,grn:14,transit:0,blocked:0,bad:17,fac:{miraggiolife_luh:45}},
{sku:"MHB0009MI-BR",avail:206,grn:32,transit:0,blocked:2,bad:12,fac:{Zepto:5,MG_BNG:197,Miraggio_Mum:1,miraggiolife_luh:3}},
{sku:"MHB0015HB-BR",avail:2,grn:5,transit:0,blocked:28,bad:16,fac:{MG_BNG:1,miraggiolife_luh:1}},
{sku:"MHB0015MI-IV",avail:235,grn:9,transit:0,blocked:2,bad:18,fac:{Miraggio_FRK:100,miraggiolife_luh:135}},
{sku:"MHB0019MI-BL",avail:514,grn:58,transit:0,blocked:32,bad:11,fac:{MG_BNG:17,Miraggio_Mum:7,miraggiolife_luh:490}},
{sku:"MHB0021WL-GR",avail:161,grn:10,transit:0,blocked:1,bad:17,fac:{miraggiolife_luh:161}},
{sku:"MHB0025MI-RD",avail:57,grn:12,transit:0,blocked:40,bad:10,fac:{miraggiolife_luh:57}},
{sku:"MHB0025TO-BG",avail:238,grn:12,transit:0,blocked:37,bad:474,fac:{miraggiolife_luh:234,Miraggio_Mum:2,MG_BNG:2}},
{sku:"MHB0026WL-IV",avail:129,grn:0,transit:0,blocked:0,bad:10,fac:{MG_BNG:1,miraggiolife_luh:126,Miraggio_Mum:2}},
{sku:"MHB0028WL-GR",avail:304,grn:2,transit:1,blocked:36,bad:26,fac:{miraggiolife_luh:304}},
{sku:"MHB0030WL-RD",avail:52,grn:2,transit:0,blocked:0,bad:8,fac:{miraggiolife_luh:52}},
{sku:"MHB0033SH-WN",avail:334,grn:7,transit:0,blocked:0,bad:21,fac:{miraggiolife_luh:334}},
{sku:"MHB0033TO-TN",avail:316,grn:5,transit:0,blocked:0,bad:12,fac:{MG_BNG:14,Miraggio_FRK:16,Miraggio_Mum:39,miraggiolife_luh:247}},
{sku:"MHB0036TO-BK",avail:225,grn:18,transit:0,blocked:0,bad:25,fac:{Miraggio_Mum:2,miraggiolife_luh:198,MG_BNG:25}},
{sku:"MHB0036TO-GR",avail:99,grn:6,transit:0,blocked:2,bad:13,fac:{MG_BNG:2,miraggiolife_luh:97}},
{sku:"MHB0040CB-PK",avail:527,grn:9,transit:0,blocked:33,bad:12,fac:{Miraggio_FRK:430,miraggiolife_luh:97}},
{sku:"MHB0042SC-BK",avail:279,grn:15,transit:1,blocked:34,bad:21,fac:{miraggiolife_luh:81,MG_BNG:196,Miraggio_Mum:2}},
{sku:"MHB0052SH-IV",avail:1174,grn:8,transit:0,blocked:0,bad:29,fac:{Miraggio_Mum:223,Miraggio_FRK:457,MG_BNG:77,miraggiolife_luh:417}},
{sku:"MHB0054TO-BK",avail:2,grn:26,transit:0,blocked:0,bad:14,fac:{MG_BNG:2}},
{sku:"MHB0056TO-BG",avail:180,grn:13,transit:0,blocked:1,bad:22,fac:{miraggiolife_luh:63,MG_BNG:9,Miraggio_FRK:100,Miraggio_Mum:8}},
{sku:"MHB0056TO-BK",avail:260,grn:8,transit:2,blocked:0,bad:16,fac:{miraggiolife_luh:260}},
{sku:"MHB0059SC-IV",avail:722,grn:18,transit:0,blocked:24,bad:23,fac:{MG_BNG:55,miraggiolife_luh:528,Miraggio_Mum:139}},
{sku:"MHB0063TO-BK",avail:265,grn:6,transit:0,blocked:0,bad:15,fac:{miraggiolife_luh:45,MG_BNG:4,Miraggio_FRK:208,Miraggio_Mum:8}},
{sku:"MHB0064CB-IV",avail:237,grn:7,transit:0,blocked:0,bad:11,fac:{MG_BNG:1,miraggiolife_luh:2,Miraggio_Mum:234}},
{sku:"MHB0065TO-BR",avail:583,grn:16,transit:0,blocked:0,bad:32,fac:{MG_BNG:8,Miraggio_Mum:5,miraggiolife_luh:570}},
{sku:"MHB0066SH-WN",avail:475,grn:11,transit:0,blocked:0,bad:6,fac:{miraggiolife_luh:403,MG_BNG:34,Miraggio_Mum:38}},
{sku:"MHB0067CB-BR",avail:10,grn:12,transit:0,blocked:0,bad:15,fac:{miraggiolife_luh:10}},
{sku:"MHB0069TO-WN",avail:117,grn:12,transit:0,blocked:0,bad:20,fac:{Miraggio_FRK:116,miraggiolife_luh:1}},
{sku:"MHB0072SC-BG",avail:520,grn:27,transit:0,blocked:1,bad:24,fac:{Miraggio_FRK:520}},
{sku:"MHB0072SC-WN",avail:337,grn:8,transit:0,blocked:6,bad:50,fac:{MG_BNG:196,Miraggio_FRK:139,miraggiolife_luh:2}},
{sku:"MHB0074SC-IV",avail:590,grn:12,transit:0,blocked:0,bad:51,fac:{miraggiolife_luh:33,Miraggio_FRK:557}},
{sku:"MHB0074SC-WN",avail:111,grn:15,transit:0,blocked:0,bad:44,fac:{miraggiolife_luh:108,MG_BNG:1,Miraggio_Mum:2}},
{sku:"MHB0076TO-BK",avail:3,grn:8,transit:0,blocked:34,bad:15,fac:{miraggiolife_luh:1,Miraggio_Mum:2}},
{sku:"MHB0076TO-BR",avail:8,grn:7,transit:0,blocked:0,bad:17,fac:{miraggiolife_luh:8}},
{sku:"MHB0076TO-DB",avail:85,grn:2,transit:0,blocked:40,bad:32,fac:{Miraggio_FRK:60,miraggiolife_luh:25}},
{sku:"MHB0077SH-GR",avail:469,grn:3,transit:0,blocked:0,bad:10,fac:{miraggiolife_luh:259,Miraggio_FRK:210}},
{sku:"MHB0077TO-WN",avail:0,grn:4,transit:0,blocked:0,bad:17,fac:{}},
{sku:"MHB0081TO-IV",avail:314,grn:8,transit:1,blocked:1,bad:10,fac:{miraggiolife_luh:314}},
{sku:"MHB0082SC-WN",avail:65,grn:5,transit:0,blocked:0,bad:10,fac:{miraggiolife_luh:65}},
{sku:"MHB0084TO-BR",avail:110,grn:3,transit:0,blocked:21,bad:27,fac:{Miraggio_FRK:6,miraggiolife_luh:104}},
{sku:"MHB0085SC-IV",avail:100,grn:1,transit:0,blocked:30,bad:7,fac:{Miraggio_FRK:80,miraggiolife_luh:20}},
{sku:"MHB0090CB-BK",avail:260,grn:2,transit:2,blocked:2,bad:9,fac:{miraggiolife_luh:253,Miraggio_Mum:7}},
{sku:"MHB0093SH-WN",avail:2,grn:20,transit:0,blocked:0,bad:4,fac:{Miraggio_Mum:2}},
{sku:"MHB0098SH-BR",avail:49,grn:12,transit:0,blocked:40,bad:15,fac:{Miraggio_Mum:49}},
{sku:"MHB0098SH-IV",avail:183,grn:2,transit:0,blocked:31,bad:15,fac:{miraggiolife_luh:162,Miraggio_Mum:21}},
{sku:"MHB0108SH-BK",avail:26,grn:5,transit:0,blocked:30,bad:7,fac:{miraggiolife_luh:26}},
{sku:"MHB0108SH-RD",avail:7,grn:10,transit:0,blocked:30,bad:3,fac:{miraggiolife_luh:7}}
];
