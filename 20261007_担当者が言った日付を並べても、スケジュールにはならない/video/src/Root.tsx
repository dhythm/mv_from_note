import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Main} from './Main';
const Root:React.FC=()=> <Composition id="Schedule" component={Main} durationInFrames={5940} fps={30} width={1280} height={720}/>;
registerRoot(Root);
