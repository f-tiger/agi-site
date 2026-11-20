import {seriesTools,pairedTools} from './tables-series.mjs';
import {qualityTools} from './tables-quality.mjs';
import {shapeTools,groupTools} from './tables-shape.mjs';
import {relationTools} from './tables-relational.mjs';
import {matrixTools} from './tables-matrix.mjs';
import {sheetTools} from './tables-sheet.mjs';

export const tools=[
  ...seriesTools,...pairedTools,...qualityTools,...shapeTools,...groupTools,...relationTools,...matrixTools,...sheetTools,
];
