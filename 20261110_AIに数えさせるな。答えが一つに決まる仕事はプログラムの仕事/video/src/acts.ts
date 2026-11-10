import React from 'react';
import {ActA, ActB} from './actAB';
import {ActC} from './actC';
import {ActD, ActE, ActF} from './actDEF';

export const ACTS: React.FC<{T: number}>[] = [ActA, ActB, ActC, ActD, ActE, ActF];
