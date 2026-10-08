import React from 'react';
import {CamKeys} from '../../lib/rig';
import {C01, cam1, hits1} from './C01';
import {C02, cam2, hits2} from './C02';
import {C03, cam3, hits3} from './C03';
import {C04, cam4, hits4} from './C04';
import {C05, cam5, hits5} from './C05';
import {C06, cam6, hits6} from './C06';
import {C07, cam7, hits7} from './C07';
import {C08, cam8, hits8} from './C08';
import {C09, cam9, hits9} from './C09';
import {C10, cam10, hits10} from './C10';

export type CutDef = {n: number; C: React.FC<{t: number}>; cam: CamKeys; hits: number[]};

export const CUTS: CutDef[] = [
  {n: 1, C: C01, cam: cam1, hits: hits1},
  {n: 2, C: C02, cam: cam2, hits: hits2},
  {n: 3, C: C03, cam: cam3, hits: hits3},
  {n: 4, C: C04, cam: cam4, hits: hits4},
  {n: 5, C: C05, cam: cam5, hits: hits5},
  {n: 6, C: C06, cam: cam6, hits: hits6},
  {n: 7, C: C07, cam: cam7, hits: hits7},
  {n: 8, C: C08, cam: cam8, hits: hits8},
  {n: 9, C: C09, cam: cam9, hits: hits9},
  {n: 10, C: C10, cam: cam10, hits: hits10},
];
