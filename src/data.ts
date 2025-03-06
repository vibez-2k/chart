import { DataNode } from "./types";

export const initialData: DataNode[] = [
  {
    id: "1",
    type: "parent",
    label: "Data Maps",
    expanded: false,
    children: [
      {
        id: "2",
        type: "schema",
        label: "Param_Schema_ADSAF",
        parentId: "1",
        sameLevelParentId: "",
        expanded: false,
        children: [
          {
            id: "6",
            type: "table",
            label: "LAMSAN02",
            parentId: "2",
            sameLevelParentId: "",
            expanded: false,
            children: [
              {
                id: "10",
                type: "column",
                label: "AN_INS_ADDR_LINE_l1",
                parentId: "6",
                sameLevelParentId: "",
              },
            ],
          },
        ],
      },
      {
        id: "3",
        type: "schema",
        label: "Param_Schema_SDV",
        parentId: "1",
        sameLevelParentId: "2",
        expanded: false,
        children: [
          {
            id: "7",
            type: "table",
            label: "S_AUTO_INSUR_TRACKING_AAF",
            parentId: "3",
            sameLevelParentId: "6",
            expanded: false,
            children: [
              {
                id: "11",
                type: "column",
                label: "AN_INS_ADDR_LINE_l2",
                parentId: "7",
                sameLevelParentId: "10",
              },
            ],
          },
        ],
      },
      {
        id: "4",
        type: "schema",
        label: "RDV",
        parentId: "1",
        sameLevelParentId: "3",
        expanded: false,
        children: [
          {
            id: "8",
            type: "table",
            label: "PIXL_AUTO_INSUR_TRACKING",
            parentId: "4",
            sameLevelParentId: "7",
            expanded: false,
            children: [
              {
                id: "12",
                type: "column",
                label: "AN_INS_ADDR_LINE_l3",
                parentId: "8",
                sameLevelParentId: "11",
              },
            ],
          },
        ],
      },
      {
        id: "5",
        type: "schema",
        label: "PIXL",
        parentId: "1",
        sameLevelParentId: "4",
        expanded: false,
        children: [
          {
            id: "9",
            type: "table",
            label: "PIXL_AUTO_INSUR_TRACKING",
            parentId: "5",
            sameLevelParentId: "8",
            expanded: false,
            children: [
              {
                id: "13",
                type: "column",
                label: "AN_INS_ADDR_LINE_l4",
                parentId: "9",
                sameLevelParentId: "12",
              },
            ],
          },
        ],
      },
    ],
  },
];
